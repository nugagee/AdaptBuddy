import { EmotionAnalysis, EmotionType, RiskLevel } from 'types/ai.types';

// Mock NLP model - In production, connect to Hugging Face/OpenAI
export class EmotionDetector {
  private static positiveWords = [
    'happy', 'good', 'great', 'excited', 'love', 'awesome', 'fun', 'joy',
    'wonderful', 'amazing', 'cool', 'nice', 'better', 'best', 'positive'
  ];
  
  private static negativeWords = [
    'sad', 'bad', 'angry', 'mad', 'hate', 'worried', 'scared', 'afraid',
    'upset', 'frustrated', 'annoyed', 'terrible', 'awful', 'negative'
  ];
  
  private static riskWords = [
    'hurt', 'kill', 'suicide', 'die', 'dead', 'alone', 'end', 'give up',
    'running away', 'escape', 'pain', 'suffer', 'cry', 'tears'
  ];
  
  static analyze(text: string): EmotionAnalysis {
    const words = text.toLowerCase().split(/\W+/);
    const wordCount = words.length;
    
    // Calculate sentiment
    const positiveCount = words.filter(w => this.positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => this.negativeWords.includes(w)).length;
    const riskCount = words.filter(w => this.riskWords.includes(w)).length;
    
    // Sentiment score (-1 to 1)
    const sentimentScore = wordCount > 0 
      ? (positiveCount - negativeCount) / wordCount 
      : 0;
    
    // Determine emotion
    let emotion: EmotionType = 'calm';
    let confidence = 0.6;
    
    if (riskCount > 0) {
      emotion = 'anxious';
      confidence = 0.9;
    } else if (negativeCount > positiveCount * 1.5) {
      emotion = 'sad';
      confidence = 0.8;
    } else if (negativeCount > 0) {
      emotion = 'angry';
      confidence = 0.7;
    } else if (positiveCount > negativeCount * 2) {
      emotion = 'happy';
      confidence = 0.85;
    } else if (positiveCount > 0) {
      emotion = 'calm';
      confidence = 0.75;
    }
    
    // Determine risk level
    let riskLevel: RiskLevel = 'low';
    if (riskCount >= 2) riskLevel = 'high';
    else if (riskCount === 1) riskLevel = 'medium';
    
    return {
      emotion,
      confidence,
      keywords: Array.from(new Set(words.filter(w =>
        this.positiveWords.includes(w) ||
        this.negativeWords.includes(w) ||
        this.riskWords.includes(w)
      ))),
      riskLevel,
      sentimentScore,
      timestamp: new Date()
    };
  }
  
  // Batch analysis for trend detection
  static analyzeBatch(texts: string[]): EmotionAnalysis[] {
    return texts.map(text => this.analyze(text));
  }
  
  // Get emotional trend over time
  static getTrend(analyses: EmotionAnalysis[]): { trend: 'improving' | 'declining' | 'stable'; score: number } {
    if (analyses.length < 2) return { trend: 'stable', score: 0 };
    
    const recent = analyses.slice(-3);
    const old = analyses.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, a) => sum + a.sentimentScore, 0) / recent.length;
    const oldAvg = old.reduce((sum, a) => sum + a.sentimentScore, 0) / old.length;
    
    const difference = recentAvg - oldAvg;
    
    if (difference > 0.2) return { trend: 'improving', score: difference };
    if (difference < -0.2) return { trend: 'declining', score: difference };
    return { trend: 'stable', score: difference };
  }
}