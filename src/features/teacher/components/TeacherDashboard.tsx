import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Users, BookOpen, Calendar, TrendingUp, Award,
  Bell, FileText, Download, BarChart3, PieChart,
  AlertTriangle, Heart, Brain, Settings, LogOut,
  Grid, List, Filter, Plus, Mail, MessageSquare, Clock
} from 'lucide-react';
import { useTheme } from 'hooks/useTheme';
import StudentProgress from './StudentProgress';
import SafeguardingAlerts from './SafeguardingAlerts';
import AssignmentCreator from './AssignmentCreator';
import ProgressReports from './ProgressReports';

// ✅ StatCard
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  color: string;
}> = ({ icon, label, value, change, color }) => {
  const { theme } = useTheme();

  return (
    <div className={`p-6 rounded-2xl shadow-xl ${
      theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
    }`}>
      <div className={`w-12 h-12 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center mb-4`}>
        <div className={`text-${color}-600 dark:text-${color}-400`}>{icon}</div>
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className={`text-xs mt-2 ${
        change.includes('+') ? 'text-green-600' : 
        change.includes('-') ? 'text-red-600' : 
        'text-gray-500'
      }`}>
        {change}
      </p>
    </div>
  );
};

// ✅ OverviewTab
const OverviewTab: React.FC<{ 
  classes: ClassData[]; 
  viewMode: 'grid' | 'list';
  selectedClass: string;
}> = ({ classes, viewMode, selectedClass }) => {
  const { theme } = useTheme();

  const filteredClasses = selectedClass === 'all' 
    ? classes 
    : classes.filter(c => c.id === selectedClass);

  if (filteredClasses.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <p className="text-gray-500">No classes found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Classes Grid/List */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
        : 'space-y-4'
      }>
        {filteredClasses.map(cls => (
          <div
            key={cls.id}
            className={`p-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] cursor-pointer ${
              theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{cls.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {cls.students} students • {cls.subject} • Grade {cls.grade}
                </p>
              </div>
              <span className="px-3 py-1 bg-neuro-blue/10 text-neuro-blue rounded-full text-sm">
                {cls.schedule}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Rate</span>
                <span className="font-bold">{cls.completionRate}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-neuro-blue to-neuro-green rounded-full"
                  style={{ width: `${cls.completionRate}%` }}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500">Assignments</p>
                <p className="font-bold">24</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500">Due This Week</p>
                <p className="font-bold">8</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500">Check-ins</p>
                <p className="font-bold">156</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-neuro-blue/10 text-neuro-blue rounded-lg text-sm hover:bg-neuro-blue/20 transition">
                View Class
              </button>
              <button className="flex-1 px-3 py-2 bg-green-600/10 text-green-600 rounded-lg text-sm hover:bg-green-600/20 transition">
                Message
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className={`p-6 rounded-2xl shadow-xl ${
        theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
      }`}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neuro-blue" />
          Recent Activity
        </h3>
        <div className="space-y-4">
          {[
            { id: 1, icon: '📝', title: 'Assignment submitted • Grade 3 Math', time: '15 minutes ago', count: 18 },
            { id: 2, icon: '✅', title: 'New check-in • Emma Watson', time: '32 minutes ago', count: 1 },
            { id: 3, icon: '🎯', title: 'Achievement unlocked • James Smith', time: '1 hour ago', count: 1 },
            { id: 4, icon: '🚨', title: 'Safeguarding alert • Sophia Lee', time: '2 hours ago', count: 1 }
          ].map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-neuro-blue/20 flex items-center justify-center">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {item.time} • {item.count} {item.count > 1 ? 'submissions' : 'submission'}
                </p>
              </div>
              <span className="text-xs text-gray-400 hover:text-neuro-blue cursor-pointer">View</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ✅ AnalyticsTab
const AnalyticsTab: React.FC<{ classId: string; dateRange: string }> = ({ classId, dateRange }) => {
  const { theme } = useTheme();

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <PieChart className="w-5 h-5 text-neuro-blue" />
        Class Analytics {classId !== 'all' && `- ${classId}`} ({dateRange})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Neurotype Distribution */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <h4 className="font-medium mb-4">Neurotype Distribution</h4>
          <div className="space-y-3">
            {[
              { type: 'Autism', count: 8, color: 'blue' },
              { type: 'ADHD', count: 12, color: 'yellow' },
              { type: 'Dyslexia', count: 7, color: 'purple' },
              { type: 'Dysgraphia', count: 5, color: 'green' },
              { type: 'SPD', count: 4, color: 'pink' }
            ].map(item => (
              <div key={item.type} className="flex items-center gap-2">
                <span className="w-24 text-sm">{item.type}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-${item.color}-500 rounded-full`}
                    style={{ width: `${(item.count/24)*100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Trends */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <h4 className="font-medium mb-4">Performance Trends</h4>
          <div className="h-40 flex items-end justify-between gap-1">
            {[65, 72, 68, 85, 78, 82, 88].map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-neuro-blue to-neuro-green rounded-t-lg"
                  style={{ height: `${value}%` }}
                />
                <span className="text-xs mt-2">Day {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="md:col-span-2 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            AI-Generated Class Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              'Morning sessions show 23% higher engagement',
              'Visual learners perform best with step-by-step guides',
              'Safeguarding alert: 3 students showing anxiety patterns',
              'Writing tasks take 40% longer for dysgraphia students',
              'Group activities boost participation by 35%'
            ].map((insight, i) => (
              <div key={i} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg text-sm">
                {insight}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Interface
interface ClassData {
  id: string;
  name: string;
  students: number;
  subject: string;
  grade: string;
  schedule: string;
  completionRate: number;
}

// ✅ Main TeacherDashboard component
const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate(); // <-- this creates the `navigate` function
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'alerts' | 'assignments' | 'reports' | 'analytics'>('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'semester'>('week');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  // Mock data fetch
  useEffect(() => {
    setTimeout(() => {
      setClasses([
        { id: 'c1', name: 'Grade 3 - Mrs. Johnson', students: 24, subject: 'General', grade: '3', schedule: 'Mon-Fri 9am', completionRate: 85 },
        { id: 'c2', name: 'Grade 4 - Mr. Smith', students: 22, subject: 'Mathematics', grade: '4', schedule: 'Mon/Wed 10am', completionRate: 78 },
        { id: 'c3', name: 'Grade 5 - Ms. Davis', students: 26, subject: 'Science', grade: '5', schedule: 'Tue/Thu 11am', completionRate: 92 },
        { id: 'c4', name: 'Grade 2 - Mrs. Wilson', students: 20, subject: 'Reading', grade: '2', schedule: 'Mon-Fri 1pm', completionRate: 88 },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Stats calculation
  const totalStudents = classes.reduce((acc, c) => acc + c.students, 0);
  const avgCompletion = classes.length > 0 
    ? Math.round(classes.reduce((acc, c) => acc + c.completionRate, 0) / classes.length) 
    : 0;
  const activeAlerts = 7;
  const pendingReviews = 12;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neuro-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 pb-32 transition-colors duration-300 ${
      theme === 'light' ? 'bg-gray-50' :
      theme === 'dark' ? 'bg-gray-900' :
      'bg-sepia-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Teacher-specific Navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <NavLink
            to="/teacher/dashboard"
            className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${
              isActive 
                ? 'bg-orange-600 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
            }`}
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/teacher/classes"
            className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${
              isActive 
                ? 'bg-orange-600 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
            }`}
          >
            👥 Classes
          </NavLink>
          <NavLink
            to="/teacher/students"
            className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${
              isActive 
                ? 'bg-orange-600 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
            }`}
          >
            🧑‍🎓 Students
          </NavLink>
          <NavLink
            to="/teacher/reports"
            className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${
              isActive 
                ? 'bg-orange-600 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
            }`}
          >
            📑 Reports
          </NavLink>
          <NavLink
            to="/teacher/settings"
            className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${
              isActive 
                ? 'bg-orange-600 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
            }`}
          >
            ⚙️ Settings
          </NavLink>
        </div>

        {/* Header with Teacher Info */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuro-blue to-neuro-green bg-clip-text text-transparent">
                👨‍🏫 Teacher Portal
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2 flex items-center gap-2">
                <span>Welcome back, Mrs. Johnson!</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Camhelions Partner School
                </span>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button className="relative p-3 bg-white dark:bg-gray-800 rounded-xl shadow hover:scale-105 transition">
                <Bell className="w-5 h-5" />
                {activeAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {activeAlerts}
                  </span>
                )}
              </button>
              <button className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow hover:scale-105 transition">
                <Mail className="w-5 h-5" />
              </button>
              <button className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow hover:scale-105 transition">
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('teacherSession'); // Clear session
                  navigate('/'); // Go to main menu
                }}
                className="p-3 bg-red-100 text-red-600 rounded-xl shadow hover:scale-105 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Total Students"
              value={totalStudents.toString()}
              change="+8 this semester"
              color="blue"
            />
            <StatCard
              icon={<BookOpen className="w-6 h-6" />}
              label="Classes"
              value={classes.length.toString()}
              change="4 active"
              color="green"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Avg. Progress"
              value={`${avgCompletion}%`}
              change="+5% vs last month"
              color="purple"
            />
            <StatCard
              icon={<AlertTriangle className="w-6 h-6" />}
              label="Pending Reviews"
              value={pendingReviews.toString()}
              change="Needs attention"
              color="yellow"
            />
          </div>

          {/* Filters and Tabs */}
          <div className="mt-6 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'overview', label: '📊 Overview', icon: <Grid className="w-4 h-4" /> },
                { id: 'progress', label: '📈 Progress', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'alerts', label: '🚨 Alerts', icon: <Bell className="w-4 h-4" />, badge: activeAlerts },
                { id: 'assignments', label: '📝 Assignments', icon: <FileText className="w-4 h-4" /> },
                { id: 'reports', label: '📑 Reports', icon: <Download className="w-4 h-4" /> },
                { id: 'analytics', label: '📊 Analytics', icon: <PieChart className="w-4 h-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-neuro-blue to-neuro-green text-white shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:scale-105'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Right side filters */}
            <div className="flex gap-2">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="all">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="semester">This Semester</option>
              </select>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-white dark:bg-gray-800 rounded-xl"
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <OverviewTab 
              classes={classes} 
              viewMode={viewMode} 
              selectedClass={selectedClass}
            />
          )}

          {activeTab === 'progress' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
              <StudentProgress 
                classId={selectedClass} 
                dateRange={dateRange}
              />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
              <SafeguardingAlerts 
                classId={selectedClass}
              />
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
              <AssignmentCreator 
                classId={selectedClass}
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
              <ProgressReports 
                classId={selectedClass}
                dateRange={dateRange}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
              <AnalyticsTab 
                classId={selectedClass}
                dateRange={dateRange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
