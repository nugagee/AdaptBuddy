export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'excited' | 'tired';
export type RiskLevel = 'low' | 'medium' | 'high';
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'social';

export interface EmotionAnalysis {
  emotion: EmotionType;
  confidence: number;
  keywords: string[];
  riskLevel: RiskLevel;
  sentimentScore: number;
  timestamp: Date;
}

export interface LearningRecommendation {
  id: string;
  title: string;
  description: string;
  learningStyle: LearningStyle;
  difficulty: number;
  estimatedTime: number;
  neuroProfileMatch: string[];
  aiConfidence: number;
  tags: string[];
}

export interface AnalyticsData {
  date: string;
  moodScore: number;
  engagement: number;
  focusDuration: number;
  activitiesCompleted: number;
}

export interface PredictiveInsight {
  type: 'risk' | 'opportunity' | 'trend';
  title: string;
  description: string;
  confidence: number;
  suggestedAction?: string;
}
