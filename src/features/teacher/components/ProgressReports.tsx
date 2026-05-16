import React, { useState } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { useTheme } from 'hooks/useTheme';

interface ProgressReportsProps {
  classId: string;
  dateRange?: 'week' | 'month' | 'semester';
}

const ProgressReports: React.FC<ProgressReportsProps> = ({ classId, dateRange = 'week' }) => {
  const { theme } = useTheme();
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');

  const generateReport = () => {
    alert(`Generating ${format} report for class ${classId} for ${dateRange}`);
  };

  return (
    <div className={`p-6 rounded-2xl shadow-xl ${
      theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
    }`}>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-neuro-blue" />
        Progress Reports
      </h2>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => setFormat('pdf')}
            className={`flex-1 px-4 py-2 rounded-xl border-2 transition ${
              format === 'pdf' 
                ? 'border-neuro-blue bg-neuro-blue/10 text-neuro-blue' 
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            PDF
          </button>
          <button
            onClick={() => setFormat('csv')}
            className={`flex-1 px-4 py-2 rounded-xl border-2 transition ${
              format === 'csv' 
                ? 'border-neuro-blue bg-neuro-blue/10 text-neuro-blue' 
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            CSV
          </button>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <p className="text-sm mb-2">Report includes:</p>
          <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300">
            <li>Assignment completion rates</li>
            <li>Emotional wellbeing trends</li>
            <li>Attendance patterns</li>
            <li>Neurotype-specific insights</li>
            <li>AI-generated recommendations</li>
          </ul>
        </div>

        <div className="text-sm text-gray-500 mb-2">
          <span className="font-medium">Class ID:</span> {classId} • <span className="font-medium">Period:</span> {dateRange}
        </div>

        <button
          onClick={generateReport}
          className="w-full px-6 py-3 bg-gradient-to-r from-neuro-blue to-neuro-green text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition"
        >
          <Download className="w-4 h-4" />
          Generate Report
        </button>
      </div>
    </div>
  );
};

export default ProgressReports;