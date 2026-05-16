import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { AnalyticsData } from 'types/ai.types';

interface SentimentTrendChartProps {
  data: AnalyticsData[];
  height?: number;
}

const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ data, height = 200 }) => {
  // Add trend line calculation
  const enhancedData = data.map((point, index) => ({
    ...point,
    trend: index > 0 ? point.moodScore - data[index - 1].moodScore : 0
  }));

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-purple-600">📈</span> Emotional Trend Analysis
      </h3>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={enhancedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.split('-').slice(1).join('/')}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Mood Score', angle: -90, position: 'insideLeft', offset: -10 }}
              domain={[0, 10]}
            />
            <Tooltip 
              formatter={(value) => [`${value}`, 'Mood']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="moodScore" 
              stroke="#8b5cf6" 
              fill="#8b5cf6" 
              fillOpacity={0.1}
              strokeWidth={2}
              name="Mood Level"
            />
            <Line 
              type="monotone" 
              dataKey="engagement" 
              stroke="#10b981" 
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="Engagement"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="text-center p-2 bg-purple-50 rounded-lg">
          <div className="font-bold text-purple-700">{data.length}</div>
          <div className="text-gray-600">Data Points</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <div className="font-bold text-green-700">
            {data.length > 0 ? (data.reduce((sum, d) => sum + d.moodScore, 0) / data.length).toFixed(1) : '0.0'}
          </div>
          <div className="text-gray-600">Avg Mood</div>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <div className="font-bold text-blue-700">
            {data.length > 1 ? 
              (data[data.length - 1].moodScore > data[0].moodScore ? '↑' : '↓') : '→'
            }
          </div>
          <div className="text-gray-600">Trend</div>
        </div>
      </div>
    </div>
  );
};

export default SentimentTrendChart;