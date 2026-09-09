import React from 'react';
import { EmotionAnalysis } from 'types/ai.types';
import { Info } from 'lucide-react';

interface EmotionAnalysisCardProps {
  analysis: EmotionAnalysis;
  showDetails?: boolean;
}

const EmotionAnalysisCard: React.FC<EmotionAnalysisCardProps> = ({ analysis, showDetails = true }) => {
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
            <h3 className="text-xl font-bold">Feeling word suggestion: <span className="capitalize">{analysis.emotion}</span></h3>
            <p className="text-gray-600">Based on simple word-matching rules</p>
          </div>
        </div>

      </div>

      <p className="mb-4 text-sm text-gray-600">
        Words can have different meanings. This suggestion may be wrong and cannot tell how you feel or whether you are safe. You can choose a different feeling or ask a safe adult for help.
      </p>
      {analysis.riskLevel !== 'low' && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Some words may be worth talking about with a safe adult. No email or text alert has been sent.
        </p>
      )}
      {showDetails && (
        <>
          {analysis.keywords.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-700 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Matched words
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
            <span>Local keyword rules</span>
            <span>{analysis.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default EmotionAnalysisCard;