import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, Mail } from 'lucide-react';
import { useTheme } from 'hooks/useTheme';

interface SafeguardingAlertsProps {
  classId: string;
  severity?: string;
}

const SafeguardingAlerts: React.FC<SafeguardingAlertsProps> = ({ classId, severity = 'all' }) => {
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState([
    {
      id: '1',
      student: 'Emma Watson',
      type: 'emotional',
      message: 'Shows signs of anxiety during writing tasks',
      severity: 'high',
      time: '10 min ago',
      status: 'new'
    },
    {
      id: '2',
      student: 'James Smith',
      type: 'attendance',
      message: '3 consecutive lates this week',
      severity: 'medium',
      time: '1 hour ago',
      status: 'acknowledged'
    },
    {
      id: '3',
      student: 'Sophia Lee',
      type: 'academic',
      message: 'Sudden drop in assignment completion',
      severity: 'medium',
      time: '2 hours ago',
      status: 'new'
    }
  ]);

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className={`p-6 rounded-2xl shadow-xl ${
      theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
    }`}>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6 text-red-500" />
        Safeguarding Alerts
        <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
          {alerts.filter(a => a.status === 'new').length} new
        </span>
      </h2>

      <div className="space-y-4">
        {alerts.map(alert => (
          <div key={alert.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-l-4 border-l-red-500">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{alert.student}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{alert.message}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs text-white ${getSeverityColor(alert.severity)}`}>
                {alert.severity}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {alert.time}
              </span>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-neuro-blue text-white rounded-lg text-sm hover:scale-105 transition">
                  View
                </button>
                <button className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:scale-105 transition flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Notify Parent
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SafeguardingAlerts;