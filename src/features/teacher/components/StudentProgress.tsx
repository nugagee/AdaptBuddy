import React, { useState } from 'react';
import { 
  TrendingUp, Calendar, CheckCircle, AlertCircle,
  Brain, Heart, BookOpen, BarChart3, Download
} from 'lucide-react';
import { useTheme } from 'hooks/useTheme';

interface Student {
  id: string;
  name: string;
  age: number;
  neurotypes: string[];
  avatar?: string;
}

interface ProgressData {
  studentId: string;
  week: string;
  assignments: {
    completed: number;
    total: number;
    bySubject: Record<string, { completed: number; total: number }>;
  };
  emotional: {
    checkins: Array<{
      date: string;
      mood: 'happy' | 'calm' | 'sad' | 'angry' | 'anxious';
      note?: string;
    }>;
    trends: {
      happy: number;
      calm: number;
      sad: number;
      angry: number;
      anxious: number;
    };
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  aiInsights: string[];
}

interface StudentProgressProps {
  classId: string;
  dateRange?: 'week' | 'month' | 'semester';
}

const StudentProgress: React.FC<StudentProgressProps> = ({ classId, dateRange = 'week' }) => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { theme } = useTheme();

  // Mock data
  const students: Student[] = [
    { id: 's1', name: 'Emma Watson', age: 8, neurotypes: ['dyslexia', 'adhd'] },
    { id: 's2', name: 'James Smith', age: 9, neurotypes: ['autism'] },
    { id: 's3', name: 'Sophia Lee', age: 8, neurotypes: ['dysgraphia', 'spd'] },
  ];

  const progressData: Record<string, ProgressData> = {
    s1: {
      studentId: 's1',
      week: '2025-03-20',
      assignments: {
        completed: 15,
        total: 20,
        bySubject: {
          math: { completed: 5, total: 8 },
          reading: { completed: 7, total: 7 },
          writing: { completed: 3, total: 5 }
        }
      },
      emotional: {
        checkins: [
          { date: '2025-03-19', mood: 'happy' },
          { date: '2025-03-18', mood: 'calm' },
          { date: '2025-03-17', mood: 'sad', note: 'Had trouble focusing' },
        ],
        trends: {
          happy: 40,
          calm: 30,
          sad: 10,
          angry: 5,
          anxious: 15
        }
      },
      attendance: {
        present: 18,
        absent: 1,
        late: 1,
        total: 20
      },
      aiInsights: [
        'Shows improvement in reading comprehension',
        'Struggles with timed writing tasks',
      ]
    },
    s2: {
      studentId: 's2',
      week: '2025-03-20',
      assignments: {
        completed: 18,
        total: 20,
        bySubject: {
          math: { completed: 7, total: 8 },
          reading: { completed: 6, total: 7 },
          writing: { completed: 5, total: 5 }
        }
      },
      emotional: {
        checkins: [
          { date: '2025-03-19', mood: 'calm' },
          { date: '2025-03-18', mood: 'happy' },
        ],
        trends: {
          happy: 50,
          calm: 40,
          sad: 5,
          angry: 0,
          anxious: 5
        }
      },
      attendance: {
        present: 19,
        absent: 0,
        late: 1,
        total: 20
      },
      aiInsights: [
        'Excellent focus in morning sessions',
        'Benefits from visual schedules',
      ]
    },
    s3: {
      studentId: 's3',
      week: '2025-03-20',
      assignments: {
        completed: 12,
        total: 20,
        bySubject: {
          math: { completed: 4, total: 8 },
          reading: { completed: 5, total: 7 },
          writing: { completed: 3, total: 5 }
        }
      },
      emotional: {
        checkins: [
          { date: '2025-03-19', mood: 'anxious' },
          { date: '2025-03-18', mood: 'sad' },
        ],
        trends: {
          happy: 20,
          calm: 25,
          sad: 25,
          angry: 10,
          anxious: 20
        }
      },
      attendance: {
        present: 16,
        absent: 2,
        late: 2,
        total: 20
      },
      aiInsights: [
        'Sensory breaks improve focus',
        'Responds well to calming music',
      ]
    }
  };

  const getMoodEmoji = (mood: string) => {
    switch(mood) {
      case 'happy': return '😊';
      case 'calm': return '😌';
      case 'sad': return '😢';
      case 'angry': return '😠';
      case 'anxious': return '😰';
      default: return '😐';
    }
  };

  const getNeurotypeColor = (neurotype: string) => {
    switch(neurotype) {
      case 'autism': return 'bg-blue-100 text-blue-800';
      case 'adhd': return 'bg-yellow-100 text-yellow-800';
      case 'dyslexia': return 'bg-purple-100 text-purple-800';
      case 'dysgraphia': return 'bg-green-100 text-green-800';
      case 'dyscalculia': return 'bg-red-100 text-red-800';
      case 'spd': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`p-6 rounded-2xl shadow-xl ${
      theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-neuro-blue" />
          Student Progress ({dateRange})
        </h2>
      </div>

      {/* Student List with Progress Bars */}
      <div className="space-y-4 mb-8">
        {students.map(student => {
          const progress = progressData[student.id];
          const completionRate = progress ? 
            (progress.assignments.completed / progress.assignments.total) * 100 : 0;
          
          return (
            <div 
              key={student.id}
              onClick={() => setSelectedStudent(student.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                selectedStudent === student.id 
                  ? 'bg-gradient-to-r from-neuro-blue to-neuro-green text-white' 
                  : 'bg-gray-50 dark:bg-gray-700 hover:scale-[1.02]'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{student.name}</h3>
                  <div className="flex gap-2 mt-1">
                    {student.neurotypes.map(n => (
                      <span key={n} className={`px-2 py-1 rounded-full text-xs ${
                        selectedStudent === student.id
                          ? 'bg-white/20 text-white'
                          : getNeurotypeColor(n)
                      }`}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
                  <p className="text-xs opacity-80">Completion rate</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      selectedStudent === student.id ? 'bg-white' : 'bg-neuro-green'
                    }`}
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              {progress && (
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{progress.assignments.completed}/{progress.assignments.total} tasks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{progress.emotional.checkins.length} check-ins</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{progress.attendance.present}/{progress.attendance.total} days</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed View for Selected Student */}
      {selectedStudent && progressData[selectedStudent] && (
        <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Detailed Progress</h3>
          
          {/* Subject Breakdown */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Object.entries(progressData[selectedStudent].assignments.bySubject).map(([subject, data]) => (
              <div key={subject} className="text-center">
                <p className="text-sm text-gray-500 capitalize">{subject}</p>
                <p className="text-2xl font-bold">{((data.completed/data.total)*100).toFixed(0)}%</p>
                <p className="text-xs">{data.completed}/{data.total} completed</p>
              </div>
            ))}
          </div>

          {/* Emotional Trend Chart */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Emotional Wellbeing Trend
            </h4>
            <div className="flex gap-1 h-32 items-end">
              {progressData[selectedStudent].emotional.checkins.map((checkin, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full ${
                      checkin.mood === 'happy' ? 'bg-green-400 h-24' :
                      checkin.mood === 'calm' ? 'bg-blue-400 h-20' :
                      checkin.mood === 'sad' ? 'bg-purple-400 h-16' :
                      checkin.mood === 'angry' ? 'bg-red-400 h-12' :
                      'bg-yellow-400 h-10'
                    } rounded-t-lg`}
                  />
                  <span className="text-xs mt-1">{getMoodEmoji(checkin.mood)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-neuro-blue" />
              AI-Generated Insights
            </h4>
            <div className="space-y-2">
              {progressData[selectedStudent].aiInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-neuro-blue mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <button className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-neuro-blue to-neuro-green text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition">
            <Download className="w-4 h-4" />
            Export Full Progress Report
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentProgress;