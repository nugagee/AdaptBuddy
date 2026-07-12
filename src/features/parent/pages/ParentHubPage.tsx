import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  HeartPulse,
  KeyRound,
  Loader2,
  Link2,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  UserMinus,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';
import NowNextLaterBoard from 'features/child/components/NowNextLaterBoard';
import ParentHubNavbar from 'features/parent/components/layout/ParentHubNavbar';
import {
  ParentDashboardService,
  mergeLinkedChildIntoDashboard,
  removeChildFromDashboard,
  type CareMeeting,
  type ChildSummary,
  type DashboardSummary,
  type ParentMessage,
  type RiskLevel,
  type TrustedAdult,
} from 'features/parent/services/parentDashboardService';

type ParentDashboardTab = 'overview' | 'ai' | 'journal' | 'alerts' | 'support';

const riskStyles: Record<RiskLevel, { badge: string; card: string; dot: string; label: string }> = {
  low: {
    badge: 'bg-emerald-100 text-emerald-700',
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
    label: 'Low',
  },
  medium: {
    badge: 'bg-amber-100 text-amber-700',
    card: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
    label: 'Medium',
  },
  high: {
    badge: 'bg-red-100 text-red-700',
    card: 'border-red-200 bg-red-50 text-red-800',
    dot: 'bg-red-500',
    label: 'High',
  },
};

const adultStatusStyles: Record<TrustedAdult['status'], string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  connected: 'border-blue-200 bg-blue-50 text-blue-800',
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  inactive: 'border-slate-200 bg-slate-50 text-slate-700',
};

const formatRelativeTime = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoDate));
};

const getEmotionEmoji = (emotion: string): string => {
  const emojis: Record<string, string> = {
    happy: '😊',
    sad: '😔',
    angry: '😠',
    anxious: '😰',
    calm: '😌',
    excited: '🤩',
    tired: '😴',
    scared: '😨',
    frustrated: '😤',
    confused: '😕',
    'too noisy': '🔊',
    'too bright': '💡',
    good: '😊',
    worried: '😟',
    'i need help': '🫂',
    loved: '🥰',
    proud: '😎',
    okay: '😐',
    unspecified: '😐',
  };

  return emojis[emotion.toLowerCase()] || '😐';
};

const formatBuddyIdInput = (value: string): string => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('AB') ? cleaned.slice(2) : cleaned;
  const limited = body.slice(0, 6);
  if (!limited) return cleaned.startsWith('AB') ? 'AB-' : '';

  const first = limited.slice(0, 4);
  const second = limited.slice(4, 6);
  return `AB-${first}${second ? `-${second}` : ''}`;
};

const formatNeurotype = (value: string): string =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatNeurotypes = (values: string[]): string => {
  if (values.length === 0) return 'Profile not set';
  const visible = values.slice(0, 2).map(formatNeurotype).join(', ');
  return values.length > 2 ? `${visible} +${values.length - 2}` : visible;
};

const formatSignedNumber = (value: number | null): string => {
  if (value === null) return 'Awaiting data';
  return `${value >= 0 ? '+' : ''}${value} this week`;
};

const metricName = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const getInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || 'A';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center dark:border-gray-700 dark:bg-gray-950/30">
    <p className="font-bold text-slate-700 dark:text-gray-200">{title}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{detail}</p>
  </div>
);

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const createGuestDashboardSummary = (): DashboardSummary => {
  const childId = 'guest-child';

  return {
    children: [
      {
        childId,
        buddyId: 'AB-GEST-01',
        childName: 'Alex Guest',
        age: 10,
        neurotypes: ['autism'],
        totalEntries: 4,
        entriesLast7Days: 3,
        totalAlerts: 2,
        highAlerts: 0,
        trustedAdultsCount: 3,
        profileCompletion: 85,
        wellbeingScore: 82,
        wellbeingChange: 6,
      },
    ],
    recentEntries: [
      {
        id: 'guest-entry-1',
        childId,
        childName: 'Alex Guest',
        emotion: 'happy',
        text: 'I liked the quiet reading corner today.',
        riskLevel: 'low',
        createdAt: daysAgo(0),
        moodScore: 88,
        focusScore: 76,
        calmScore: 84,
      },
      {
        id: 'guest-entry-2',
        childId,
        childName: 'Alex Guest',
        emotion: 'anxious',
        signalLabel: 'Too noisy',
        signalCategory: 'sensory',
        parentInsight: 'Noise may be affecting regulation or attention.',
        text: 'The classroom was noisy before lunch.',
        riskLevel: 'medium',
        createdAt: daysAgo(1),
        moodScore: 55,
        focusScore: 62,
        calmScore: 48,
      },
      {
        id: 'guest-entry-3',
        childId,
        childName: 'Alex Guest',
        emotion: 'calm',
        signalLabel: 'Calm',
        signalCategory: 'emotional',
        parentInsight: 'The child felt regulated after this step.',
        text: 'The timer helped me move to maths.',
        riskLevel: 'low',
        createdAt: daysAgo(3),
        moodScore: 79,
        focusScore: 82,
        calmScore: 87,
      },
    ],
    recentAlerts: [
      {
        id: 'guest-alert-1',
        childId,
        riskLevel: 'medium',
        journalEntryText: 'Noise before lunch caused anxiety.',
        createdAt: daysAgo(1),
        acknowledged: false,
      },
      {
        id: 'guest-alert-2',
        childId,
        riskLevel: 'low',
        journalEntryText: 'Transition timer worked well.',
        createdAt: daysAgo(3),
        acknowledged: true,
      },
    ],
    trustedAdults: [
      {
        id: 'guest-adult-parent',
        childId,
        name: 'You',
        email: 'guest-parent@adaptbuddy.local',
        phone: '+44 7000 000000',
        relationship: 'Primary parent',
        status: 'connected',
      },
      {
        id: 'guest-adult-teacher',
        childId,
        name: 'Ms Johnson',
        email: 'teacher@example.com',
        relationship: 'Teacher',
        status: 'connected',
      },
      {
        id: 'guest-adult-therapist',
        childId,
        name: 'Dr Ahmed',
        email: 'therapist@example.com',
        relationship: 'Therapist',
        status: 'pending',
      },
    ],
    wellbeingTrends: {
      [childId]: [
        { day: 'Mon', date: daysAgo(6), mood: 72, focus: 68, calm: 75 },
        { day: 'Tue', date: daysAgo(5), mood: 78, focus: 74, calm: 82 },
        { day: 'Wed', date: daysAgo(4), mood: 58, focus: 61, calm: 52 },
        { day: 'Thu', date: daysAgo(3), mood: 79, focus: 82, calm: 87 },
        { day: 'Fri', date: daysAgo(2), mood: 74, focus: 70, calm: 77 },
        { day: 'Sat', date: daysAgo(1), mood: 55, focus: 62, calm: 48 },
        { day: 'Sun', date: daysAgo(0), mood: 88, focus: 76, calm: 84 },
      ],
    },
    messages: [
      {
        id: 'guest-message-1',
        childId,
        senderId: 'guest-parent',
        body: 'Could we use the visual timer before noisy transitions this week?',
        urgency: 'support',
        aiSummary: 'Parent is asking for proactive transition support.',
        aiTalkingPoints: [
          'Which transitions are hardest right now?',
          'Can the timer be introduced before lunch?',
          'What signal should Alex use when noise is too much?',
        ],
        createdAt: daysAgo(0),
      },
    ],
    meetings: [
      {
        id: 'guest-meeting-1',
        childId,
        requestedBy: 'guest-parent',
        meetingType: 'parent_teacher',
        status: 'requested',
        urgency: 'soon',
        proposedTimes: [],
        agenda: ['Review Wednesday anxiety dip', 'Agree classroom noise support', 'Check transition timer plan'],
        actionItems: [],
        createdAt: daysAgo(0),
      },
    ],
    goals: [
      {
        id: 'guest-goal-1',
        childId,
        title: 'Use visual timer for transitions',
        category: 'Routine',
        description: 'Practice timer-supported transitions once each school day.',
        progress: 65,
        status: 'active',
        aiSuggestion: 'Pair the timer with a simple now/next card.',
        createdAt: daysAgo(4),
      },
    ],
    resources: [
      {
        id: 'guest-resource-1',
        childId,
        title: 'Now / Next / Later routine card',
        resourceType: 'printable',
        summary: 'A simple visual support for reducing transition stress.',
        neurotypes: ['autism'],
        reason: 'Recommended because transitions are showing up in the journal.',
        readingLevel: 'parent',
        generated: true,
      },
    ],
    childSignals: [
      {
        id: 'guest-signal-1',
        childId,
        emotion: 'happy',
        color: 'green',
        note: 'Quiet reading helped.',
        createdAt: daysAgo(0),
      },
      {
        id: 'guest-signal-2',
        childId,
        emotion: 'Too noisy',
        color: 'yellow',
        note: 'Noise before lunch.',
        createdAt: daysAgo(1),
      },
    ],
    aiDigest: {
      headline: 'Alex had a mostly calm week with one noisy transition dip.',
      happyWeekPercentage: 75,
      highestEmotion: 'Calm',
      alertSummary: '1 yellow flag this week, linked to classroom noise.',
      learningProgress: 'Completed 3 check-ins and used transition support successfully.',
      suggestion: 'Try previewing lunch transitions with a timer and one visual cue.',
      talkingPoints: [
        'Wednesday mood dip before lunch',
        'Visual timer helped with maths transition',
        'Quiet reading corner improved calm score',
      ],
    },
    proactiveInsights: [
      {
        id: 'guest-insight-1',
        childId,
        priority: 'medium',
        title: 'Wednesday pattern spotted',
        detail: 'Calm and mood scores dip around the middle of the week.',
        suggestedAction: 'Ask the teacher what changes before lunch on Wednesdays.',
      },
    ],
    parentFeedbackThemes: [
      { theme: 'Noise support', count: 2, sentiment: 'concerned' },
      { theme: 'Visual routines', count: 3, sentiment: 'positive' },
    ],
  };
};

const ParentHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, isGuest, signOut } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingAlertId, setAcknowledgingAlertId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ParentDashboardTab>('overview');
  const [messageDraft, setMessageDraft] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [coachDraft, setCoachDraft] = useState('');
  const [buddyIdInput, setBuddyIdInput] = useState('');
  const [buddyRelationship, setBuddyRelationship] = useState(profile?.role === 'teacher' ? 'teacher' : 'parent');
  const [actionStatus, setActionStatus] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isRequestingMeeting, setIsRequestingMeeting] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isLinkingBuddyId, setIsLinkingBuddyId] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [showAddChildPanel, setShowAddChildPanel] = useState(false);
  const [childContentKey, setChildContentKey] = useState(0);
  const [isChildContentVisible, setIsChildContentVisible] = useState(true);
  const [childPendingRemoval, setChildPendingRemoval] = useState<ChildSummary | null>(null);
  const [isRemovingChild, setIsRemovingChild] = useState(false);

  const parentName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Parent';

  const applyDashboardData = useCallback((data: DashboardSummary, preferredChildId?: string | null) => {
    setDashboardData(data);
    setSelectedChildId((current) => {
      const nextChildId = preferredChildId ?? current;
      if (nextChildId && data.children.some((child) => child.childId === nextChildId)) {
        return nextChildId;
      }
      return data.children[0]?.childId ?? null;
    });
  }, []);

  const loadDashboard = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial', preferredChildId?: string | null) => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        if (isGuest) {
          applyDashboardData(createGuestDashboardSummary(), preferredChildId);
          return;
        }

        const data = await ParentDashboardService.getDashboardSummary();
        applyDashboardData(data, preferredChildId);
      } catch (loadError) {
        console.error('Error loading parent dashboard:', loadError);
        setError(getErrorMessage(loadError, 'Could not load the parent dashboard.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyDashboardData, isGuest],
  );

  useEffect(() => {
    let active = true;

    const loadInitialDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isGuest) {
          applyDashboardData(createGuestDashboardSummary());
          return;
        }

        const data = await ParentDashboardService.getDashboardSummary();
        if (active) applyDashboardData(data);
      } catch (loadError) {
        console.error('Error loading parent dashboard:', loadError);
        if (active) {
          setError(getErrorMessage(loadError, 'Could not load the parent dashboard.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInitialDashboard();

    return () => {
      active = false;
    };
  }, [applyDashboardData, isGuest]);

  const currentChild = useMemo(
    () => dashboardData?.children.find((child) => child.childId === selectedChildId) ?? null,
    [dashboardData, selectedChildId],
  );

  const childEntries = useMemo(
    () =>
      currentChild
        ? dashboardData?.recentEntries.filter((entry) => entry.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childAlerts = useMemo(
    () =>
      currentChild
        ? dashboardData?.recentAlerts.filter((alert) => alert.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childTrustedAdults = useMemo(
    () =>
      currentChild
        ? dashboardData?.trustedAdults.filter((adult) => adult.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childMessages = useMemo(
    () =>
      currentChild
        ? dashboardData?.messages.filter((message) => message.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childMeetings = useMemo(
    () =>
      currentChild
        ? dashboardData?.meetings.filter((meeting) => meeting.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childGoals = useMemo(
    () =>
      currentChild
        ? dashboardData?.goals.filter((goal) => goal.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childResources = useMemo(
    () =>
      currentChild
        ? dashboardData?.resources.filter((resource) => resource.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childSignals = useMemo(
    () =>
      currentChild
        ? dashboardData?.childSignals.filter((signal) => signal.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const childInsights = useMemo(
    () =>
      currentChild
        ? dashboardData?.proactiveInsights.filter((insight) => insight.childId === currentChild.childId) ?? []
        : [],
    [currentChild, dashboardData],
  );

  const trendData = currentChild ? dashboardData?.wellbeingTrends[currentChild.childId] ?? [] : [];
  const newAlertsCount = childAlerts.filter((alert) => !alert.acknowledged).length;
  const highAlertsCount = childAlerts.filter((alert) => alert.riskLevel === 'high' && !alert.acknowledged).length;
  const globalHighAlerts = dashboardData?.recentAlerts.filter((alert) => alert.riskLevel === 'high' && !alert.acknowledged).length ?? 0;

  const getChildAlertCount = useCallback(
    (childId: string): number =>
      dashboardData?.recentAlerts.filter(
        (alert) => alert.childId === childId && !alert.acknowledged,
      ).length ?? 0,
    [dashboardData],
  );

  const handleSelectChild = useCallback(
    (childId: string) => {
      if (childId === selectedChildId) return;

      setIsChildContentVisible(false);
      window.setTimeout(() => {
        setSelectedChildId(childId);
        setActiveTab('overview');
      setChildContentKey((current) => current + 1);
      setShowAddChildPanel(false);
      setChildPendingRemoval(null);
      requestAnimationFrame(() => setIsChildContentVisible(true));
      }, 180);
    },
    [selectedChildId],
  );

  const overviewCards = [
    {
      title: 'Child Profile',
      value: currentChild ? `${currentChild.profileCompletion}%` : '--',
      detail: currentChild ? `${formatNeurotypes(currentChild.neurotypes)} complete` : 'No child selected',
      icon: UserRound,
      accent: 'from-sky-500 to-indigo-500',
      surface: 'bg-sky-50',
      text: 'text-sky-800',
    },
    {
      title: 'Wellbeing',
      value: currentChild?.wellbeingScore === null || !currentChild ? '--' : String(currentChild.wellbeingScore),
      detail: currentChild ? formatSignedNumber(currentChild.wellbeingChange) : 'Awaiting data',
      icon: HeartPulse,
      accent: 'from-emerald-500 to-teal-500',
      surface: 'bg-emerald-50',
      text: 'text-emerald-800',
    },
    {
      title: 'Alerts',
      value: `${newAlertsCount} New`,
      detail: `${highAlertsCount} high priority`,
      icon: AlertTriangle,
      accent: 'from-rose-500 to-orange-500',
      surface: 'bg-rose-50',
      text: 'text-rose-800',
    },
    {
      title: 'Journal',
      value: currentChild ? String(currentChild.entriesLast7Days) : '--',
      detail: currentChild ? `${currentChild.totalEntries} total entries` : 'No child selected',
      icon: BookOpen,
      accent: 'from-violet-500 to-fuchsia-500',
      surface: 'bg-violet-50',
      text: 'text-violet-800',
    },
  ];

  const quickActions = [
    { label: 'Message Child', icon: MessageSquare, className: 'border-sky-200 bg-sky-50 text-sky-800' },
    { label: 'Weekly Report', icon: Calendar, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    { label: 'View Trends', icon: Activity, className: 'border-violet-200 bg-violet-50 text-violet-800' },
    { label: 'Full Report', icon: Download, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    { label: 'Privacy', icon: Shield, className: 'border-rose-200 bg-rose-50 text-rose-800' },
    { label: 'Settings', icon: Settings, className: 'border-slate-200 bg-slate-50 text-slate-800' },
  ];

  const tabItems: Array<{ id: ParentDashboardTab; label: string; badge?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'ai', label: 'AI Digest', badge: childInsights.length },
    { id: 'journal', label: 'Journal', badge: childEntries.length },
    { id: 'alerts', label: 'Alerts', badge: newAlertsCount },
    { id: 'support', label: 'Support', badge: childTrustedAdults.length },
  ];

  const coachResponse = useMemo(() => {
    const note = coachDraft.trim().toLowerCase();
    if (!note) {
      return 'Tell Buddy what feels hard right now, and it will turn it into one calm next step.';
    }
    if (/homework|work|study|lesson/.test(note)) {
      return 'That sounds draining. Try a tiny reset first: water, movement for 5 minutes, then one small task with a visible finish line.';
    }
    if (/angry|shout|losing|frustrated/.test(note)) {
      return 'You are allowed to pause. Step away for 60 seconds if safe, lower the demand, then reconnect before returning to the task.';
    }
    if (/school|teacher|meeting/.test(note)) {
      return 'Write down one example, one question, and one support you want to try. That keeps the conversation practical and calm.';
    }
    return 'Start with connection before correction: name what you see, offer one choice, and keep the next step small.';
  }, [coachDraft]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    setAcknowledgingAlertId(alertId);
    setError(null);

    try {
      if (!isGuest) await ParentDashboardService.acknowledgeAlert(alertId);
      setDashboardData((current) =>
        current
          ? {
              ...current,
              recentAlerts: current.recentAlerts.map((alert) =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert,
              ),
            }
          : current,
      );
    } catch (acknowledgeError) {
      console.error('Error acknowledging alert:', acknowledgeError);
      setError(getErrorMessage(acknowledgeError, 'Could not acknowledge the alert.'));
    } finally {
      setAcknowledgingAlertId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!currentChild || !messageDraft.trim() || isSendingMessage) return;
    setIsSendingMessage(true);
    setActionStatus('');
    setError(null);

    try {
      const urgency = /urgent|anxious|worried|unsafe|crisis/i.test(messageDraft) ? 'support' : 'normal';
      const message: ParentMessage | null = isGuest
        ? {
            id: `guest-message-${Date.now()}`,
            childId: currentChild.childId,
            senderId: 'guest-parent',
            body: messageDraft,
            urgency,
            aiSummary: 'Demo summary: this message has been prepared for the care team.',
            aiTalkingPoints: [
              'What changed recently?',
              'Which support has helped before?',
              'What small adjustment should we try this week?',
            ],
            createdAt: new Date().toISOString(),
          }
        : await ParentDashboardService.sendParentTeacherMessage(
            currentChild.childId,
            messageDraft,
            undefined,
            urgency,
          );

      if (message) {
        setDashboardData((current) =>
          current ? { ...current, messages: [message, ...current.messages] } : current,
        );
      }
      setMessageDraft('');
      setActionStatus('Message saved with AI talking points.');
    } catch (sendError) {
      console.error('Error sending parent-teacher message:', sendError);
      setError(getErrorMessage(sendError, 'Could not send the message.'));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleRequestMeeting = async () => {
    if (!currentChild || isRequestingMeeting) return;
    setIsRequestingMeeting(true);
    setActionStatus('');
    setError(null);

    try {
      const hasHighInsight = childInsights.some((insight) => insight.priority === 'high');
      const meeting: CareMeeting | null = isGuest
        ? {
            id: `guest-meeting-${Date.now()}`,
            childId: currentChild.childId,
            requestedBy: 'guest-parent',
            meetingType: 'parent_teacher',
            status: 'requested' as const,
            urgency: hasHighInsight ? ('urgent' as const) : ('soon' as const),
            proposedTimes: [],
            scheduledAt: undefined,
            agenda: dashboardData?.aiDigest.talkingPoints ?? [],
            notes: undefined,
            actionItems: [],
            createdAt: new Date().toISOString(),
          }
        : await ParentDashboardService.requestMeeting(
            currentChild.childId,
            'parent_teacher',
            dashboardData?.aiDigest.talkingPoints ?? [],
            hasHighInsight ? 'urgent' : 'soon',
          );

      if (meeting) {
        setDashboardData((current) =>
          current ? { ...current, meetings: [meeting, ...current.meetings] } : current,
        );
      }
      setActionStatus('Meeting request created with AI agenda points.');
    } catch (meetingError) {
      console.error('Error requesting meeting:', meetingError);
      setError(getErrorMessage(meetingError, 'Could not request the meeting.'));
    } finally {
      setIsRequestingMeeting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackDraft.trim() || isSendingFeedback) return;
    setIsSendingFeedback(true);
    setActionStatus('');
    setError(null);

    try {
      if (!isGuest) {
        await ParentDashboardService.submitParentFeedback(currentChild?.childId ?? null, feedbackDraft);
      }
      if (isGuest) {
        setDashboardData((current) =>
          current
            ? {
                ...current,
                parentFeedbackThemes: [
                  { theme: 'Demo feedback', count: 1, sentiment: 'positive' },
                  ...current.parentFeedbackThemes,
                ],
              }
            : current,
        );
      }
      setFeedbackDraft('');
      setActionStatus('Feedback sent. Thank you for shaping AdaptBuddy.');
    } catch (feedbackError) {
      console.error('Error sending parent feedback:', feedbackError);
      setError(getErrorMessage(feedbackError, 'Could not send feedback.'));
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleLinkBuddyId = async () => {
    if (!buddyIdInput.trim() || isLinkingBuddyId) return;
    setIsLinkingBuddyId(true);
    setActionStatus('');
    setError(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: Buddy ID linking works after creating a parent account.');
        return;
      }

      const linked = await ParentDashboardService.linkChildByBuddyId(buddyIdInput, buddyRelationship);
      setBuddyIdInput('');
      setActionStatus(`${linked.childName} is now connected to your dashboard.`);
      setSelectedChildId(linked.childId);
      setActiveTab('overview');
      setShowAddChildPanel(false);
      setChildContentKey((current) => current + 1);
      setIsChildContentVisible(true);
      setDashboardData((current) =>
        current ? mergeLinkedChildIntoDashboard(current, linked) : current,
      );
      await loadDashboard('refresh', linked.childId);
    } catch (linkError) {
      console.error('Error linking child by Buddy ID:', linkError);
      setError(getErrorMessage(linkError, 'Could not link this Buddy ID.'));
    } finally {
      setIsLinkingBuddyId(false);
    }
  };

  const handleRemoveChild = async () => {
    if (!childPendingRemoval || isRemovingChild) return;
    setIsRemovingChild(true);
    setError(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: child removal works after creating a parent account.');
        setChildPendingRemoval(null);
        return;
      }

      const removed = await ParentDashboardService.unlinkChild(childPendingRemoval.childId);
      const remainingChildren =
        dashboardData?.children.filter((child) => child.childId !== removed.childId) ?? [];
      const nextChildId = remainingChildren[0]?.childId ?? null;

      setChildPendingRemoval(null);
      setShowAddChildPanel(false);
      setActionStatus(`${removed.childName} was removed from your dashboard.`);
      setIsChildContentVisible(false);

      setDashboardData((current) =>
        current ? removeChildFromDashboard(current, removed.childId) : current,
      );
      setSelectedChildId(nextChildId);
      setChildContentKey((current) => current + 1);

      window.setTimeout(() => {
        setIsChildContentVisible(true);
      }, 180);

      await loadDashboard('refresh', nextChildId);
    } catch (removeError) {
      console.error('Error removing child:', removeError);
      setError(getErrorMessage(removeError, 'Could not remove this child.'));
    } finally {
      setIsRemovingChild(false);
    }
  };

  useEffect(() => {
    if (!childPendingRemoval) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRemovingChild) {
        setChildPendingRemoval(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [childPendingRemoval, isRemovingChild]);

  const handleSwitchToParentLogin = async () => {
    if (isSwitchingAccount) return;
    setIsSwitchingAccount(true);
    setError(null);

    try {
      await signOut();
      navigate(ROUTES.LOGIN, {
        replace: true,
        state: {
          message: 'Sign in with a parent or teacher account to connect this Buddy ID.',
        },
      });
    } catch (switchError) {
      console.error('Error switching to parent login:', switchError);
      setError(getErrorMessage(switchError, 'Could not sign out. Please try again.'));
      setIsSwitchingAccount(false);
    }
  };

  const renderBuddyIdLinkCard = (variant: 'default' | 'compact' = 'default') => (
    <article
      className={`rounded-3xl border border-adapt-indigo/15 bg-white/85 text-left shadow-card backdrop-blur-sm dark:border-adapt-cyan/20 dark:bg-gray-900/75 ${
        variant === 'compact' ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
            Buddy ID
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
            {variant === 'compact' ? 'Add another child' : 'Connect a child space'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-gray-400">
            {variant === 'compact'
              ? 'Enter another Buddy ID to connect a sibling or additional child profile.'
              : 'Ask the child for their Buddy ID from Settings, then enter it here. No database UUIDs, no manual matching.'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_0.8fr]">
        <div>
          <label
            htmlFor={variant === 'compact' ? 'parent-buddy-id-add' : 'parent-buddy-id'}
            className="mb-2 block text-sm font-bold text-slate-600 dark:text-gray-300"
          >
            Child Buddy ID
          </label>
          <input
            id={variant === 'compact' ? 'parent-buddy-id-add' : 'parent-buddy-id'}
            value={buddyIdInput}
            onChange={(event) => setBuddyIdInput(formatBuddyIdInput(event.target.value))}
            placeholder="AB-7K4M-23"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-lg font-black tracking-wide text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div>
          <label
            htmlFor={variant === 'compact' ? 'parent-buddy-relationship-add' : 'parent-buddy-relationship'}
            className="mb-2 block text-sm font-bold text-slate-600 dark:text-gray-300"
          >
            Relationship
          </label>
          <select
            id={variant === 'compact' ? 'parent-buddy-relationship-add' : 'parent-buddy-relationship'}
            value={buddyRelationship}
            onChange={(event) => setBuddyRelationship(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="parent">Parent</option>
            <option value="guardian">Guardian</option>
            <option value="grandparent">Grandparent</option>
            <option value="carer">Carer</option>
            <option value="teacher">Teacher</option>
            <option value="therapist">Therapist</option>
            <option value="support_worker">Support worker</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLinkBuddyId}
        disabled={!buddyIdInput.trim() || isLinkingBuddyId}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
      >
        {isLinkingBuddyId ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden />
        )}
        {isLinkingBuddyId ? 'Connecting...' : variant === 'compact' ? 'Connect another child' : 'Connect child'}
      </button>
    </article>
  );

  const renderChildSwitcher = (children: ChildSummary[]) => (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
            Family dashboard
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            {children.length} child space{children.length === 1 ? '' : 's'} connected
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddChildPanel((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition ${
            showAddChildPanel
              ? 'border border-adapt-indigo/30 bg-adapt-indigo/10 text-adapt-indigo dark:border-adapt-cyan/30 dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
              : 'border border-slate-200 bg-white text-adapt-navy hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'
          }`}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {showAddChildPanel ? 'Close' : 'Add another child'}
        </button>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {children.map((child) => {
          const active = child.childId === selectedChildId;
          const alertCount = getChildAlertCount(child.childId);

          return (
            <div
              key={child.childId}
              className={`relative shrink-0 transition-all duration-300 ${
                active ? 'scale-[1.02]' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectChild(child.childId)}
                aria-pressed={active}
                className={`group inline-flex min-w-[220px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                  active
                    ? 'border-adapt-indigo bg-gradient-to-br from-adapt-indigo/12 via-white to-adapt-teal/10 shadow-soft dark:border-adapt-cyan dark:from-adapt-cyan/10 dark:via-gray-900 dark:to-gray-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-adapt-indigo/30 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white transition-transform duration-300 ${
                    active
                      ? 'bg-gradient-to-br from-adapt-indigo to-adapt-teal'
                      : 'bg-slate-300 group-hover:scale-105 dark:bg-gray-600'
                  }`}
                >
                  {getInitial(child.childName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-adapt-navy dark:text-gray-100">
                    {child.childName}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] font-bold tracking-wide text-slate-500 dark:text-gray-400">
                    {child.buddyId || 'Connected'}
                  </span>
                </span>
                {alertCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-900">
                    {alertCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {currentChild && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/50">
          <p className="text-sm text-slate-600 dark:text-gray-400">
            Viewing{' '}
            <span className="font-black text-adapt-navy dark:text-gray-100">{currentChild.childName}</span>
            {currentChild.buddyId ? (
              <span className="ml-2 font-mono text-xs font-bold text-slate-500 dark:text-gray-500">
                {currentChild.buddyId}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => setChildPendingRemoval(currentChild)}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            <UserMinus className="h-4 w-4" aria-hidden />
            Remove from dashboard
          </button>
        </div>
      )}

      <div
        className={`grid transition-all duration-300 ease-out ${
          showAddChildPanel ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 pt-4 dark:border-gray-800">
            {renderBuddyIdLinkCard('compact')}
          </div>
        </div>
      </div>
    </section>
  );

  const renderRemoveChildModal = () => {
    if (!childPendingRemoval) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={() => {
          if (!isRemovingChild) setChildPendingRemoval(null);
        }}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="remove-child-modal-title"
          aria-describedby="remove-child-modal-description"
          className="relative w-full max-w-md animate-slide-up rounded-3xl border border-white/70 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setChildPendingRemoval(null)}
            disabled={isRemovingChild}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-gray-800"
            aria-label="Close remove child dialog"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300">
              <UserMinus className="h-7 w-7" aria-hidden />
            </span>
            <h2
              id="remove-child-modal-title"
              className="mt-4 text-xl font-extrabold text-adapt-navy dark:text-gray-100"
            >
              Remove {childPendingRemoval.childName}?
            </h2>
            <p
              id="remove-child-modal-description"
              className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-400"
            >
              This will disconnect <strong>{childPendingRemoval.childName}</strong> from your parent
              dashboard. Their AdaptBuddy account and data stay safe — you can reconnect anytime using
              their Buddy ID.
            </p>
            {childPendingRemoval.buddyId && (
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-black tracking-wide text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                {childPendingRemoval.buddyId}
              </p>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setChildPendingRemoval(null)}
              disabled={isRemovingChild}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemoveChild}
              disabled={isRemovingChild}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {isRemovingChild ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <UserMinus className="h-4 w-4" aria-hidden />
              )}
              {isRemovingChild ? 'Removing...' : 'Yes, remove child'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <ParentHubNavbar />
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-card dark:border-gray-800 dark:bg-gray-900/80">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <p className="mt-4 font-bold text-adapt-navy dark:text-gray-100">Loading parent dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdultDashboardUser =
    isGuest || profile?.role === 'parent' || profile?.role === 'teacher' || profile?.role === 'admin';

  if (!isAdultDashboardUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <ParentHubNavbar />
        <div className="px-4 py-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
          <UsersRound className="mx-auto h-12 w-12 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
            Parent Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
            This space is for parents and teachers
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-gray-400">
            You are signed in as a child account. Share your Buddy ID with a parent or teacher, then they can sign in
            with their own account and connect your space.
          </p>
          {profile?.buddy_id && (
            <div className="mx-auto mt-5 inline-flex rounded-2xl border border-adapt-indigo/20 bg-adapt-indigo/10 px-5 py-3 font-mono text-lg font-black tracking-wide text-adapt-indigo dark:border-adapt-cyan/20 dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
              {profile.buddy_id}
            </div>
          )}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to={ROUTES.CHILD_DASHBOARD}
              className="inline-flex items-center justify-center rounded-2xl bg-adapt-navy px-5 py-3 text-sm font-black text-white transition hover:bg-adapt-purple dark:bg-adapt-cyan dark:text-gray-950"
            >
              Go to child dashboard
            </Link>
            <button
              type="button"
              onClick={handleSwitchToParentLogin}
              disabled={isSwitchingAccount}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-adapt-navy transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              {isSwitchingAccount ? 'Signing out...' : 'Sign out to parent login'}
            </button>
          </div>
        </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <ParentHubNavbar />
      <section className="border-b border-white/60 bg-white/60 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
              Parent Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
              Welcome back, {parentName}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              {currentChild
                ? `Connected to ${currentChild.childName}'s AdaptBuddy space.`
                : 'Your family overview is ready when a child space is connected.'}
            </p>
            {currentChild?.buddyId && (
              <p className="mt-2 inline-flex rounded-full bg-adapt-indigo/10 px-3 py-1 font-mono text-xs font-black tracking-wide text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                {currentChild.buddyId}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentChild && (
              <button
                type="button"
                onClick={() => setShowAddChildPanel((current) => !current)}
                className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-adapt-navy shadow-sm transition hover:border-adapt-indigo/30 sm:inline-flex dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add child
              </button>
            )}
            <button
              type="button"
              onClick={() => loadDashboard('refresh')}
              disabled={refreshing}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-adapt-indigo/30 hover:text-adapt-indigo disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              aria-label="Refresh parent dashboard"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            </button>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-adapt-indigo/30 hover:text-adapt-indigo dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              aria-label="View parent alerts"
            >
              <Bell className="h-5 w-5" aria-hidden />
              {globalHighAlerts > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-900">
                  {globalHighAlerts}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {actionStatus && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
          >
            {actionStatus}
          </div>
        )}

        {dashboardData && dashboardData.children.length > 0 && renderChildSwitcher(dashboardData.children)}

        {!currentChild ? (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
              <UsersRound className="mx-auto h-12 w-12 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="mt-4 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
                No child space connected yet
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Connect with the child&apos;s Buddy ID to see profile progress, wellbeing trends, journal entries,
                alerts, and the trusted support circle.
              </p>
            </div>
            {renderBuddyIdLinkCard()}
          </section>
        ) : (
          <div
            key={`${selectedChildId}-${childContentKey}`}
            className={`space-y-6 transition-all duration-300 ease-out motion-reduce:transition-none ${
              isChildContentVisible ? 'translate-y-0 opacity-100 animate-child-switch' : 'translate-y-2 opacity-0'
            }`}
          >
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Parent dashboard summary">
              {overviewCards.map(({ title, value, detail, icon: Icon, accent, surface, text }) => (
                <article
                  key={title}
                  className={`rounded-2xl border border-white/80 ${surface} p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-600 dark:text-gray-300">{title}</p>
                      <p className={`mt-3 text-3xl font-extrabold ${text} dark:text-gray-100`}>{value}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{detail}</p>
                    </div>
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                  </div>
                </article>
              ))}
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/80 p-2 shadow-soft backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
              <div className="grid gap-2 sm:grid-cols-5">
                {tabItems.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                        active
                          ? 'bg-adapt-navy text-white shadow-soft dark:bg-adapt-cyan dark:text-gray-950'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {tab.label}
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20' : 'bg-adapt-indigo/10 text-adapt-indigo dark:text-adapt-cyan'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {activeTab === 'overview' && (
              <>
            <NowNextLaterBoard
              childId={currentChild.childId}
              mode="adult"
              editable
              onActivityComplete={(activity) => {
                setActionStatus(`${activity.label} marked complete on ${currentChild.childName}'s plan.`);
                window.setTimeout(() => setActionStatus(''), 3500);
              }}
            />

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-3xl border border-adapt-indigo/15 bg-gradient-to-br from-adapt-indigo/10 via-white to-adapt-teal/10 p-6 shadow-card dark:border-adapt-cyan/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo text-white dark:bg-adapt-cyan dark:text-gray-950">
                    <Sparkles className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Buddy Digest
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      {dashboardData?.aiDigest.headline}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-400">
                      {dashboardData?.aiDigest.suggestion}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/75 p-4 dark:bg-gray-900/70">
                    <p className="text-xs font-bold text-slate-500">Top emotion</p>
                    <p className="mt-1 text-lg font-black capitalize text-adapt-navy dark:text-gray-100">
                      {dashboardData?.aiDigest.highestEmotion}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/75 p-4 dark:bg-gray-900/70">
                    <p className="text-xs font-bold text-slate-500">Alerts</p>
                    <p className="mt-1 text-sm font-black text-adapt-navy dark:text-gray-100">
                      {dashboardData?.aiDigest.alertSummary}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/75 p-4 dark:bg-gray-900/70">
                    <p className="text-xs font-bold text-slate-500">Goals</p>
                    <p className="mt-1 text-sm font-black text-adapt-navy dark:text-gray-100">
                      {dashboardData?.aiDigest.learningProgress}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                  Proactive Alerts
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                  Prevent before crisis
                </h2>
                <div className="mt-5 space-y-3">
                  {childInsights.length > 0 ? (
                    childInsights.slice(0, 3).map((insight) => (
                      <div
                        key={insight.id}
                        className={`rounded-2xl border p-4 ${
                          insight.priority === 'high'
                            ? 'border-red-200 bg-red-50 text-red-800'
                            : insight.priority === 'medium'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-sky-200 bg-sky-50 text-sky-800'
                        }`}
                      >
                        <p className="font-black">{insight.title}</p>
                        <p className="mt-1 text-sm">{insight.detail}</p>
                        <p className="mt-2 text-xs font-bold opacity-80">{insight.suggestedAction}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No risks predicted"
                      detail="AdaptBuddy will flag patterns when enough data is available."
                    />
                  )}
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Wellbeing Trends
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      Mood, focus, and calm over time
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Mood</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" />Focus</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />Calm</span>
                  </div>
                </div>

                <div className="h-72">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 10, right: 18, left: -14, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip
                          formatter={(value, name) => [`${value}%`, metricName(String(name))]}
                          contentStyle={{ borderRadius: 16, borderColor: '#e2e8f0' }}
                        />
                        <Line type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="focus" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="calm" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <EmptyState
                        title="No trend data yet"
                        detail="Shared journal entries with mood analysis will appear here."
                      />
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                  Alerts
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                  Safeguarding signals
                </h2>
                <div className="mt-5 space-y-3">
                  {childAlerts.length > 0 ? (
                    childAlerts.slice(0, 4).map((alert) => {
                      const style = riskStyles[alert.riskLevel];
                      const isAcknowledging = acknowledgingAlertId === alert.id;
                      return (
                        <div key={alert.id} className={`rounded-2xl border p-4 ${style.card}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 font-bold">
                                {alert.acknowledged ? (
                                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                                ) : (
                                  <AlertTriangle className="h-5 w-5" aria-hidden />
                                )}
                                {style.label} alert
                              </div>
                              <p className="mt-2 text-sm">{alert.journalEntryText}</p>
                              <p className="mt-2 text-xs opacity-75">{formatRelativeTime(alert.createdAt)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              disabled={alert.acknowledged || isAcknowledging}
                              className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-black transition hover:bg-white disabled:cursor-default disabled:opacity-70"
                            >
                              {alert.acknowledged ? 'Acknowledged' : isAcknowledging ? 'Saving...' : 'Acknowledge'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState title="No recent alerts" detail="High-priority journal signals will show here." />
                  )}
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                  Recent Journal Entries
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                  What {currentChild.childName} shared
                </h2>
                <div className="mt-5 space-y-3">
                  {childEntries.length > 0 ? (
                    childEntries.slice(0, 5).map((entry) => {
                      const style = riskStyles[entry.riskLevel];
                      const entrySignal = entry.signalLabel ?? entry.emotion;
                      return (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/40 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${style.dot}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-gray-300">
                                &ldquo;{entry.text || 'Voice note saved without text.'}&rdquo;
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${style.badge}`}>
                                  {style.label}
                                </span>
                                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold capitalize text-slate-500 dark:bg-gray-900 dark:text-gray-300">
                                  {entrySignal}
                                </span>
                              </div>
                              {entry.parentInsight && (
                                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                                  {entry.parentInsight}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-400">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {formatRelativeTime(entry.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState title="No shared journal entries" detail="Shared child journal entries will appear here." />
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                  Trusted Adults
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                  Support circle
                </h2>
                <div className="mt-5 space-y-3">
                  {childTrustedAdults.length > 0 ? (
                    childTrustedAdults.map((adult) => (
                      <div
                        key={`${adult.childId}-${adult.id}`}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${adultStatusStyles[adult.status]}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 font-extrabold">
                            {getInitial(adult.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold">{adult.name}</p>
                            <p className="truncate text-xs opacity-75">
                              {adult.relationship}
                              {adult.email ? ` · ${adult.email}` : ''}
                            </p>
                          </div>
                        </div>
                        {adult.status === 'active' || adult.status === 'connected' ? (
                          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
                        ) : (
                          <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
                        )}
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No trusted adults yet" detail="Adults added from the child space will show here." />
                  )}
                </div>
              </article>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                Quick Actions
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {quickActions.map(({ label, icon: Icon, className }) => (
                  <button
                    key={label}
                    type="button"
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-soft ${className}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </section>
              </>
            )}

            {activeTab === 'ai' && (
              <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-6">
                  <article className="rounded-3xl border border-adapt-indigo/15 bg-gradient-to-br from-adapt-indigo/10 via-white to-adapt-teal/10 p-6 shadow-card dark:border-adapt-cyan/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Weekly AI Wellness Summary
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
                      {dashboardData?.aiDigest.headline}
                    </h2>
                    <div className="mt-5 space-y-3">
                      <p className="rounded-2xl bg-white/75 p-4 text-sm font-semibold text-slate-700 dark:bg-gray-900/70 dark:text-gray-300">
                        {dashboardData?.aiDigest.alertSummary}
                      </p>
                      <p className="rounded-2xl bg-white/75 p-4 text-sm font-semibold text-slate-700 dark:bg-gray-900/70 dark:text-gray-300">
                        {dashboardData?.aiDigest.learningProgress}
                      </p>
                      <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                        AI suggestion: {dashboardData?.aiDigest.suggestion}
                      </p>
                    </div>
                    <div className="mt-5">
                      <p className="text-sm font-black text-adapt-navy dark:text-gray-100">Meeting talking points</p>
                      <div className="mt-3 grid gap-2">
                        {dashboardData?.aiDigest.talkingPoints.map((point) => (
                          <span
                            key={point}
                            className="rounded-2xl border border-adapt-indigo/10 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                          >
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>

                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Calm Parent Coach
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      Turn a hard moment into one next step
                    </h2>
                    <textarea
                      value={coachDraft}
                      onChange={(event) => setCoachDraft(event.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      placeholder="Example: Homework is turning into a fight and I do not know what to do..."
                    />
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                      {coachResponse}
                    </div>
                  </article>
                </div>

                <div className="space-y-6">
                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Parent-Child Signals
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      Quiet check-ins
                    </h2>
                    <div className="mt-5 space-y-3">
                      {childSignals.length > 0 ? (
                        childSignals.slice(0, 4).map((signal) => (
                          <div key={signal.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-black capitalize text-adapt-navy dark:text-gray-100">
                                  {getEmotionEmoji(signal.emotion)} {signal.emotion}
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{signal.note || 'No extra words needed.'}</p>
                              </div>
                              <span className="text-xs font-semibold text-slate-400">{formatRelativeTime(signal.createdAt)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No quiet signals yet"
                          detail="A child can send a mood color or emoji when talking feels too much."
                        />
                      )}
                    </div>
                  </article>

                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Parent Feedback Loop
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      Tell us what families need
                    </h2>
                    <textarea
                      value={feedbackDraft}
                      onChange={(event) => setFeedbackDraft(event.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      placeholder="What is working? What is confusing? What would help at home or school?"
                    />
                    <button
                      type="button"
                      onClick={handleSubmitFeedback}
                      disabled={!feedbackDraft.trim() || isSendingFeedback}
                      className="mt-3 w-full rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
                    >
                      {isSendingFeedback ? 'Sending...' : 'Send feedback'}
                    </button>
                    {dashboardData?.parentFeedbackThemes.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {dashboardData.parentFeedbackThemes.map((theme) => (
                          <span key={theme.theme} className="rounded-full bg-adapt-indigo/10 px-3 py-1 text-xs font-black text-adapt-indigo dark:text-adapt-cyan">
                            {theme.theme} · {theme.count}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                </div>
              </section>
            )}

            {activeTab === 'journal' && (
              <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Journal Timeline
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      Every shared check-in from {currentChild.childName}
                    </h2>
                  </div>
                  <span className="rounded-full bg-adapt-indigo/10 px-3 py-1 text-xs font-black text-adapt-indigo dark:text-adapt-cyan">
                    {childEntries.length} visible
                  </span>
                </div>

                {childEntries.length > 0 ? (
                  <div className="space-y-3">
                    {childEntries.map((entry) => {
                      const style = riskStyles[entry.riskLevel];
                      const entrySignal = entry.signalLabel ?? entry.emotion;
                      return (
                        <article
                          key={entry.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="text-2xl" aria-hidden>{getEmotionEmoji(entrySignal)}</span>
                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${style.badge}`}>
                                  {style.label}
                                </span>
                                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold capitalize text-slate-500 dark:bg-gray-900 dark:text-gray-300">
                                  {entrySignal}
                                </span>
                              </div>
                              <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-gray-300">
                                &ldquo;{entry.text || 'Voice note saved without text.'}&rdquo;
                              </p>
                              {entry.parentInsight && (
                                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                                  {entry.parentInsight}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-3 text-xs font-semibold text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                {formatRelativeTime(entry.createdAt)}
                              </span>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-adapt-indigo shadow-sm transition hover:bg-adapt-mist dark:bg-gray-900 dark:text-adapt-cyan"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden />
                                View
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No shared journal entries yet"
                    detail="When your child saves a feelings journal entry, it will appear here."
                  />
                )}
              </section>
            )}

            {activeTab === 'alerts' && (
              <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Safeguarding Alerts
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      Signals that may need adult support
                    </h2>
                  </div>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                    {highAlertsCount} high priority
                  </span>
                </div>

                {childAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {childAlerts.map((alert) => {
                      const style = riskStyles[alert.riskLevel];
                      const isAcknowledging = acknowledgingAlertId === alert.id;
                      return (
                        <article key={alert.id} className={`rounded-2xl border p-4 ${style.card}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 font-black">
                                {alert.acknowledged ? (
                                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                                ) : (
                                  <AlertTriangle className="h-5 w-5" aria-hidden />
                                )}
                                {style.label} alert
                              </div>
                              <p className="mt-2 text-sm">{alert.journalEntryText}</p>
                              <p className="mt-2 text-xs opacity-75">{formatRelativeTime(alert.createdAt)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              disabled={alert.acknowledged || isAcknowledging}
                              className="shrink-0 rounded-full bg-white/70 px-4 py-2 text-xs font-black transition hover:bg-white disabled:cursor-default disabled:opacity-70"
                            >
                              {alert.acknowledged ? 'Acknowledged' : isAcknowledging ? 'Saving...' : 'Acknowledge'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No alerts right now"
                    detail="Medium and high risk journal signals will be listed here."
                  />
                )}
              </section>
            )}

            {activeTab === 'support' && (
              <section className="space-y-6">
                {renderBuddyIdLinkCard('compact')}

                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Parent-Teacher Chat
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      Message with AI summaries
                    </h2>
                    <textarea
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      placeholder={`Write a calm message about ${currentChild.childName}'s progress, worry, or support need...`}
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!messageDraft.trim() || isSendingMessage}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden />
                      {isSendingMessage ? 'Saving message...' : 'Save message + AI talking points'}
                    </button>
                    <div className="mt-5 space-y-3">
                      {childMessages.length > 0 ? (
                        childMessages.slice(0, 4).map((message) => (
                          <div key={message.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{message.body}</p>
                            {message.aiTalkingPoints.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.aiTalkingPoints.slice(0, 2).map((point) => (
                                  <span key={point} className="rounded-full bg-adapt-indigo/10 px-3 py-1 text-xs font-bold text-adapt-indigo dark:text-adapt-cyan">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-2 text-xs font-semibold text-slate-400">{formatRelativeTime(message.createdAt)}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No messages yet" detail="Start a parent-teacher thread with a clear support question." />
                      )}
                    </div>
                  </article>

                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Meeting Planner
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                      One-click meeting request
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">
                      AdaptBuddy uses recent alerts and journal trends to pre-fill agenda points for a parent-teacher discussion.
                    </p>
                    <button
                      type="button"
                      onClick={handleRequestMeeting}
                      disabled={isRequestingMeeting}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
                    >
                      <Calendar className="h-4 w-4" aria-hidden />
                      {isRequestingMeeting ? 'Creating request...' : 'Request meeting with AI agenda'}
                    </button>
                    <div className="mt-5 space-y-3">
                      {childMeetings.length > 0 ? (
                        childMeetings.slice(0, 3).map((meeting) => (
                          <div key={meeting.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-black capitalize text-adapt-navy dark:text-gray-100">
                                {meeting.meetingType.replace(/_/g, ' ')}
                              </p>
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold capitalize text-slate-500 dark:bg-gray-900">
                                {meeting.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                              {meeting.agenda.length > 0 ? meeting.agenda[0] : 'Agenda will be added before the meeting.'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No meetings yet" detail="Create a meeting request when home and school need to align." />
                      )}
                    </div>
                  </article>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Goals & Accommodations
                    </p>
                    <div className="mt-5 space-y-3">
                      {childGoals.length > 0 ? (
                        childGoals.slice(0, 4).map((goal) => (
                          <div key={goal.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                            <p className="font-black text-adapt-navy dark:text-gray-100">{goal.title}</p>
                            <div className="mt-3 h-2 rounded-full bg-slate-200">
                              <div className="h-2 rounded-full bg-adapt-teal" style={{ width: `${goal.progress}%` }} />
                            </div>
                            <p className="mt-2 text-xs font-semibold text-slate-500">{goal.progress}% · {goal.status}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No shared goals yet" detail="Goals can track accommodations, homework, wellbeing, or communication." />
                      )}
                    </div>
                  </article>

                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Resource Library
                    </p>
                    <div className="mt-5 space-y-3">
                      {childResources.slice(0, 4).map((resource) => (
                        <div key={resource.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                          <p className="font-black text-adapt-navy dark:text-gray-100">{resource.title}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{resource.summary}</p>
                          {resource.reason && (
                            <p className="mt-2 text-xs font-bold text-adapt-indigo dark:text-adapt-cyan">{resource.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Trusted Adults
                    </p>
                    <div className="mt-5 space-y-3">
                      {childTrustedAdults.length > 0 ? (
                        childTrustedAdults.slice(0, 5).map((adult) => (
                          <div
                            key={`${adult.childId}-${adult.id}-support`}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${adultStatusStyles[adult.status]}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold">{adult.name}</p>
                              <p className="truncate text-xs opacity-75">
                                {adult.relationship}{adult.phone ? ` · ${adult.phone}` : ''}{adult.email ? ` · ${adult.email}` : ''}
                              </p>
                            </div>
                            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No trusted adults yet" detail="Add a parent, teacher, therapist, or guardian." />
                      )}
                    </div>
                    <button
                      type="button"
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-adapt-indigo/25 bg-adapt-indigo/5 px-4 py-3 text-sm font-black text-adapt-indigo transition hover:bg-adapt-indigo/10 dark:text-adapt-cyan"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Add Trusted Adult
                    </button>
                  </article>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      {renderRemoveChildModal()}
    </div>
  );
};

export default ParentHubPage;
