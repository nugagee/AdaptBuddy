import React from 'react';
import { EmotionAnalysis, RiskLevel } from '../../types/ai.types';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface EmotionAnalysisCardProps {
  analysis: EmotionAnalysis;
  showDetails?: boolean;
}

const EmotionAnalysisCard: React.FC<EmotionAnalysisCardProps> = ({ analysis, showDetails = true }) => {
  const getRiskIcon = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getRiskColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getEmoji = (emotion: string) => {
    const emojis: Record<string, string> = {
      happy: '😊',
      sad: '😔',
      angry: '😠',
      anxious: '😰',
      calm: '😌',
      excited: '🤩',
      tired: '😴'
    };
    return emojis[emotion] || '😐';
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{getEmoji(analysis.emotion)}</div>
          <div>
            <h3 className="text-xl font-bold capitalize">{analysis.emotion}</h3>
            <p className="text-gray-600">AI Emotion Detection</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${getRiskColor(analysis.riskLevel)}`}>
          {getRiskIcon(analysis.riskLevel)}
          <span className="font-bold capitalize">{analysis.riskLevel} Risk</span>
        </div>
      </div>

      {showDetails && (
        <>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Confidence Level</span>
              <span className="font-bold text-blue-700">{(analysis.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${analysis.confidence * 100}%` }}
              />
            </div>
          </div>

          {analysis.sentimentScore !== 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Sentiment Score</span>
                <span className={`font-bold ${analysis.sentimentScore > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {analysis.sentimentScore > 0 ? '+' : ''}{analysis.sentimentScore.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${analysis.sentimentScore > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.abs(analysis.sentimentScore) * 50 + 50}%`, marginLeft: '50%', transform: 'translateX(-50%)' }}
                />
              </div>
            </div>
          )}

          {analysis.keywords.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-700 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Detected Keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map((keyword, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 flex justify-between items-center">
            <span>AI Analysis • NLP Model v1.2</span>
            <span>{analysis.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default EmotionAnalysisCard;