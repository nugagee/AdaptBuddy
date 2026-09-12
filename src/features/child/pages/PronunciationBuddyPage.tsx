import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  Ear,
  HelpCircle,
  History,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from 'store/uiStore';
import PronunciationAudioStudio, { type PronunciationAudioHandle } from '../components/pronunciation/PronunciationAudioStudio';
import PronunciationPromptCards from '../components/pronunciation/PronunciationPromptCards';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import {
  DEFAULT_PRONUNCIATION_ITEMS,
  PRONUNCIATION_CATEGORIES,
  type PronunciationCategory,
  type PronunciationPracticeItem,
} from 'features/child/data/pronunciationPractice';
import { ChildAssignmentService } from 'features/child/services/childAssignmentService';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import {
  getCurrentChildScopeId,
  getReadyChildProgressForOwner,
  resolveAuthenticatedChildId,
  resolveChildScopeId,
} from 'features/child/store/childProgressReadAccess';
import { resolveRoutedActivity } from 'features/child/routing/routedActivityCompletion';

type FeedbackTone = 'great' | 'steady' | 'try';
type AttemptMode = 'microphone' | 'self_checked' | 'support_needed';
type WordSource = 'learner' | 'parent' | 'teacher' | 'trusted_adult';
type ConfidenceRating = 'confident' | 'practised' | 'hard' | 'needs_help';

export const getPracticeScoreLabel = (mode: AttemptMode) => mode === 'microphone'
  ? 'Browser word-match score'
  : mode === 'self_checked' ? 'Self-check encouragement score' : 'Support check-in score';

interface StoredPracticeItem extends PronunciationPracticeItem {
  source?: WordSource;
  createdByLabel?: string;
  createdAt?: string;
}

export interface PronunciationAttempt {
  id: string;
  itemId: string;
  phrase: string;
  heard: string;
  score: number;
  tone: FeedbackTone;
  mode: AttemptMode;
  confidence: ConfidenceRating;
  supportUsed: string[];
  source?: WordSource;
  assignmentId?: string;
  createdAt: string;
}

interface FeedbackState {
  tone: FeedbackTone;
  title: string;
  message: string;
  score: number;
}

interface PronunciationBuddyRouteState {
  assignmentPractice?: {
    assignmentId: string;
    title: string;
    phrase: string;
    hint?: string;
  };
}

interface SaveAttemptInput {
  heard: string;
  mode?: AttemptMode;
  confidence?: ConfidenceRating;
  supportUsed?: string[];
  force?: boolean;
}

const normalizePhrase = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const letterAliases: Record<string, string[]> = {
  a: ['a', 'ay', 'hey'],
  m: ['m', 'em', 'them'],
  s: ['s', 'ess', 'yes'],
};

const getLevenshteinDistance = (left: string, right: string) => {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
};

export const scorePronunciation = (expectedRaw: string, heardRaw: string) => {
  const expected = normalizePhrase(expectedRaw);
  const heard = normalizePhrase(heardRaw);

  if (!heard) return 0;
  if (expected === heard) return 100;

  const aliases = letterAliases[expected];
  if (aliases?.includes(heard)) return 96;

  if (expected.length > 2 && (heard.includes(expected) || expected.includes(heard))) {
    return heard.length >= expected.length * 0.55 ? 82 : 62;
  }

  const maxLength = Math.max(expected.length, heard.length, 1);
  const charScore = Math.max(0, Math.round(100 - (getLevenshteinDistance(expected, heard) / maxLength) * 100));
  const expectedWords = expected.split(' ').filter(Boolean);
  const heardWords = new Set(heard.split(' ').filter(Boolean));
  const matchedWords = expectedWords.filter((word) => heardWords.has(word)).length;
  const wordScore = expectedWords.length > 1 ? Math.round((matchedWords / expectedWords.length) * 100) : 0;

  return Math.max(charScore, wordScore);
};

export const buildFeedback = (
  item: PronunciationPracticeItem,
  heard: string,
  mode: AttemptMode = 'microphone',
  confidence: ConfidenceRating = 'practised',
): FeedbackState => {
  if (mode === 'support_needed') {
    return {
      tone: 'try',
      title: 'Help noted for this practice',
      message: `You can ask someone nearby for help; no adult has been notified. Listen once or explore the first part: ${item.breakdown[0] ?? item.phrase}.`,
      score: 30,
    };
  }

  if (mode === 'self_checked') {
    const selfScore = confidence === 'confident' ? 88 : confidence === 'hard' ? 52 : 72;
    return {
      tone: confidence === 'confident' ? 'great' : confidence === 'hard' ? 'try' : 'steady',
      title: confidence === 'confident' ? 'Practice counted' : confidence === 'hard' ? 'Keep it gentle' : 'Good practice',
      message:
        confidence === 'hard'
          ? `You practised "${item.phrase}". Try it slowly: ${item.breakdown.join(' + ')}.`
          : `You marked "${item.phrase}" as practised. Nice steady effort. This is your self-check, not a microphone measurement.`,
      score: selfScore,
    };
  }

  const score = scorePronunciation(item.phrase, heard);

  if (!heard.trim()) {
    return {
      tone: 'try',
      title: 'I did not hear that clearly',
      message: 'That is okay. Move closer to the microphone, listen once, then try again.',
      score,
    };
  }

  if (score >= 86) {
    return {
      tone: 'great',
      title: 'Words matched — good practice',
      message: `The browser text matched "${item.phrase}". This is a word match, not a measure of speech clarity. Nice effort.`,
      score,
    };
  }

  if (score >= 60) {
    return {
      tone: 'steady',
      title: 'Some words matched — keep going gently',
      message: `Some browser words matched. Recognition can make mistakes. Explore ${item.breakdown.join(' + ')} one part at a time if helpful.`,
      score,
    };
  }

  return {
    tone: 'try',
    title: 'Let us try it slowly',
    message: `Listen again, then say only the first part: ${item.breakdown[0] ?? item.phrase}.`,
    score,
  };
};

export const getPronunciationStorageKey = (childId: string, name: string) =>
  `adaptbuddy-pronunciation-${name}:${encodeURIComponent(childId)}`;

export const redactPronunciationAttemptHistory = (value: unknown): PronunciationAttempt[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((attempt): attempt is PronunciationAttempt => (
      typeof attempt === 'object'
      && attempt !== null
      && typeof (attempt as PronunciationAttempt).id === 'string'
      && typeof (attempt as PronunciationAttempt).phrase === 'string'
      && ['microphone', 'self_checked', 'support_needed'].includes(
        String((attempt as PronunciationAttempt).mode),
      )
    ))
    .map((attempt) => ({
      ...attempt,
      heard: attempt.mode === 'microphone'
        ? 'Microphone practice completed'
        : attempt.mode === 'self_checked'
          ? 'Self-checked practice'
          : 'Support requested',
    }));
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const startOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const difficultyStyles: Record<PronunciationPracticeItem['difficulty'], string> = {
  gentle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  steady: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  stretch: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
};

const feedbackStyles: Record<FeedbackTone, string> = {
  great: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  steady: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  try: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
};

const sourceLabels: Record<WordSource, string> = {
  learner: 'Learner word',
  parent: 'Parent word',
  teacher: 'Teacher word',
  trusted_adult: 'Trusted adult word',
};

const confidenceOptions: Array<{ id: ConfidenceRating; label: string; helper: string }> = [
  { id: 'confident', label: 'Confident', helper: 'That felt clear' },
  { id: 'practised', label: 'Practised', helper: 'I gave it a good try' },
  { id: 'hard', label: 'Hard', helper: 'I need it slower' },
];

const buildBreakdown = (phrase: string) => {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words;
  if (phrase.length > 8) {
    const midpoint = Math.ceil(phrase.length / 2);
    return [phrase.slice(0, midpoint), phrase.slice(midpoint)].filter(Boolean);
  }
  return [phrase];
};

export const buildWeeklySummaryText = (attempts: PronunciationAttempt[], firstName: string) => {
  const weekAttempts = attempts.filter((attempt) => new Date(attempt.createdAt) >= startOfWeek());
  const phrases = Array.from(new Set(weekAttempts.map((attempt) => attempt.phrase)));
  const bestScore = weekAttempts.length ? Math.max(...weekAttempts.map((attempt) => attempt.score)) : 0;
  const needsHelp = weekAttempts.filter((attempt) => attempt.confidence === 'needs_help' || attempt.mode === 'support_needed').length;
  const supports = Array.from(new Set(weekAttempts.flatMap((attempt) => attempt.supportUsed)));

  return [
    `AdaptBuddy Pronunciation Summary for ${firstName}`,
    `Window: This week`,
    `Practice tries: ${weekAttempts.length}`,
    `Words practised: ${phrases.length ? phrases.join(', ') : 'No words practised yet'}`,
    `Best practice score: ${bestScore}% (mixed score sources; not a pronunciation assessment)`,
    `Browser word checks: ${weekAttempts.filter(attempt => attempt.mode === 'microphone').length}`,
    `Self-checks: ${weekAttempts.filter(attempt => attempt.mode === 'self_checked').length}`,
    `Support needed signals: ${needsHelp}`,
    `Support used: ${supports.length ? supports.join(', ') : 'No support recorded yet'}`,
    '',
    'Score note: Self-check percentages are preset encouragement values based on the chosen confidence. Browser scores compare text and can be wrong. Support check-ins are not ability scores. Do not interpret a mixed score trend as measured speech improvement.',
    'Privacy note: This summary contains practice metadata, not audio clips or recognised words. Temporary replay audio is kept only in memory in the open practice session. Browser speech checking may process audio remotely.',
    'Safety note: Pronunciation Buddy supports speech confidence, phonics and word practice. It does not diagnose speech difficulties or replace professional speech and language therapy.',
  ].join('\n');
};

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const PronunciationBuddyPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isGuest } = useAuth();
  const firstName = profile?.first_name || 'Friend';
  const reducedMotion = useUiStore(state => state.reducedMotion);
  const setReducedMotion = useUiStore(state => state.setReducedMotion);
  const audioStudioRef = useRef<PronunciationAudioHandle>(null);
  const authInput = {
    userId: user?.id ?? null,
    profileId: profile?.id ?? null,
    profileRole: profile?.role ?? null,
    isGuest: Boolean(isGuest),
  };
  const childScopeId = resolveChildScopeId(authInput);
  const authenticatedChildId = resolveAuthenticatedChildId(authInput);
  const routeState = (location.state as PronunciationBuddyRouteState | null)?.assignmentPractice;
  const assignmentPractice = authenticatedChildId ? routeState : undefined;
  const neuroTypes = profile?.neuro_types ?? [];
  const routedActivity = useMemo(
    () => resolveRoutedActivity({
      search: location.search,
      expectedPathname: location.pathname,
      neuroTypes,
      completion: 'pronunciation-attempt',
    }),
    [location.pathname, location.search, neuroTypes],
  );

  const [selectedCategory, setSelectedCategory] = useState<PronunciationCategory>('everyday');
  const [selectedItemId, setSelectedItemId] = useState('hello');
  const [customItems, setCustomItems] = useState<StoredPracticeItem[]>([]);
  const [attempts, setAttempts] = useState<PronunciationAttempt[]>([]);
  const [customPhrase, setCustomPhrase] = useState('');
  const [customHint, setCustomHint] = useState('');
  const [customCategory, setCustomCategory] = useState<PronunciationCategory>('names');
  const [wordSource, setWordSource] = useState<WordSource>('learner');
  const [confidence, setConfidence] = useState<ConfidenceRating>('practised');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [feedbackMode, setFeedbackMode] = useState<AttemptMode>('self_checked');
  const [status, setStatus] = useState('');
  const [linkedAssignmentSaving, setLinkedAssignmentSaving] = useState(false);
  const [linkedAssignmentDone, setLinkedAssignmentDone] = useState(false);

  const hasSavedAttemptRef = useRef(false);

  const customStorageKey = useMemo(
    () => authenticatedChildId ? getPronunciationStorageKey(authenticatedChildId, 'custom-items') : null,
    [authenticatedChildId],
  );
  const attemptsStorageKey = useMemo(
    () => authenticatedChildId ? getPronunciationStorageKey(authenticatedChildId, 'attempts') : null,
    [authenticatedChildId],
  );
  const personalItems = useMemo<StoredPracticeItem[]>(() => {
    if (!profile?.first_name) return [];

    return [
      {
        id: `child-name-${profile.first_name.toLowerCase()}`,
        category: 'names',
        label: profile.first_name,
        phrase: profile.first_name,
        hint: 'This is your name. Say it proudly, one sound at a time.',
        breakdown: buildBreakdown(profile.first_name),
        example: `My name is ${profile.first_name}.`,
        difficulty: 'gentle',
        source: 'learner',
        createdByLabel: 'Profile',
      },
    ];
  }, [profile?.first_name]);

  const assignmentItem = useMemo<StoredPracticeItem | null>(() => {
    if (!assignmentPractice?.assignmentId || !assignmentPractice.phrase.trim()) return null;
    const phrase = assignmentPractice.phrase.trim();

    return {
      id: `assignment-${assignmentPractice.assignmentId}`,
      category: 'school',
      label: phrase,
      phrase,
      hint: assignmentPractice.hint || 'Your teacher sent this pronunciation practice.',
      breakdown: buildBreakdown(phrase),
      example: `Teacher task: ${assignmentPractice.title}`,
      difficulty: phrase.split(/\s+/).length > 3 ? 'stretch' : 'steady',
      source: 'teacher',
      createdByLabel: 'Teacher assignment',
    };
  }, [assignmentPractice?.assignmentId, assignmentPractice?.hint, assignmentPractice?.phrase, assignmentPractice?.title]);

  const practiceItems = useMemo<StoredPracticeItem[]>(
    () => [
      ...(assignmentItem ? [assignmentItem] : []),
      ...personalItems,
      ...(DEFAULT_PRONUNCIATION_ITEMS as StoredPracticeItem[]),
      ...customItems,
    ],
    [assignmentItem, customItems, personalItems],
  );

  const categoryItems = useMemo(
    () => practiceItems.filter((item) => item.category === selectedCategory),
    [practiceItems, selectedCategory],
  );

  const selectedItem = useMemo(
    () => categoryItems.find((item) => item.id === selectedItemId) ?? categoryItems[0] ?? practiceItems[0],
    [categoryItems, practiceItems, selectedItemId],
  );

  const todaysAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.createdAt.startsWith(todayKey())),
    [attempts],
  );
  const weeklyAttempts = useMemo(
    () => attempts.filter((attempt) => new Date(attempt.createdAt) >= startOfWeek()),
    [attempts],
  );
  const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : 0;
  const practisedPhrases = new Set(attempts.map((attempt) => attempt.phrase)).size;
  const weeklyPhrases = new Set(weeklyAttempts.map((attempt) => attempt.phrase)).size;
  const weeklyNeedsHelp = weeklyAttempts.filter((attempt) => attempt.mode === 'support_needed' || attempt.confidence === 'needs_help').length;
  useLayoutEffect(() => {
    audioStudioRef.current?.reset();
    setCustomItems([]);
    setAttempts([]);
    setSelectedCategory('everyday');
    setSelectedItemId('hello');
    setCustomPhrase('');
    setCustomHint('');
    setFeedback(null);
    setStatus('');
    setLinkedAssignmentSaving(false);
    setLinkedAssignmentDone(false);
    hasSavedAttemptRef.current = false;

    if (!childScopeId || !authenticatedChildId) return undefined;

    try {
      const savedItems = customStorageKey ? localStorage.getItem(customStorageKey) : null;
      const parsedItems = savedItems ? JSON.parse(savedItems) : [];
      setCustomItems(Array.isArray(parsedItems) ? parsedItems as StoredPracticeItem[] : []);
    } catch {
      setCustomItems([]);
    }

    try {
      const savedAttempts = attemptsStorageKey ? localStorage.getItem(attemptsStorageKey) : null;
      const parsedAttempts = savedAttempts ? JSON.parse(savedAttempts) : [];
      const safeAttempts = redactPronunciationAttemptHistory(parsedAttempts);
      setAttempts(safeAttempts);
      if (attemptsStorageKey && savedAttempts) {
        localStorage.setItem(attemptsStorageKey, JSON.stringify(safeAttempts));
      }
    } catch {
      setAttempts([]);
    }

    return undefined;
  }, [
    attemptsStorageKey,
    authenticatedChildId,
    childScopeId,
    customStorageKey,
  ]);

  useEffect(() => {
    if (!assignmentItem) return;
    setSelectedCategory('school');
    setSelectedItemId(assignmentItem.id);
    setFeedback(null);
    setLinkedAssignmentDone(false);
  }, [assignmentItem]);

  useEffect(() => {
    if (!selectedItem || categoryItems.some((item) => item.id === selectedItemId)) return;
    setSelectedItemId(selectedItem.id);
  }, [categoryItems, selectedItem, selectedItemId]);

  const persistCustomItems = useCallback((items: StoredPracticeItem[]) => {
    if (!childScopeId || getCurrentChildScopeId() !== childScopeId) return;
    setCustomItems(items);
    if (!customStorageKey) {
      setStatus('Added for this guest visit only.');
      return;
    }
    try {
      localStorage.setItem(customStorageKey, JSON.stringify(items));
    } catch {
      setStatus('Could not save that word on this device.');
    }
  }, [childScopeId, customStorageKey]);

  const persistAttempts = useCallback((nextAttempts: PronunciationAttempt[]) => {
    if (!childScopeId || getCurrentChildScopeId() !== childScopeId) return;
    const trimmedAttempts = nextAttempts.slice(0, 120);
    setAttempts(trimmedAttempts);
    if (!attemptsStorageKey) return;
    try {
      localStorage.setItem(attemptsStorageKey, JSON.stringify(trimmedAttempts));
    } catch {
      setStatus('Practice was checked, but history could not be saved on this device.');
    }
  }, [attemptsStorageKey, childScopeId]);

  const saveAttempt = useCallback(
    ({ heard, mode = 'microphone', confidence: nextConfidence = confidence, supportUsed = [], force = false }: SaveAttemptInput) => {
      const expectedOwnerId = childScopeId;
      if (
        !expectedOwnerId
        || getCurrentChildScopeId() !== expectedOwnerId
        || !selectedItem
        || (!force && hasSavedAttemptRef.current)
      ) return;
      hasSavedAttemptRef.current = true;
      if (mode !== 'microphone') audioStudioRef.current?.reset();
      setFeedbackMode(mode);

      const nextFeedback = buildFeedback(selectedItem, heard, mode, nextConfidence);
      const attempt: PronunciationAttempt = {
        id: `${selectedItem.id}-${Date.now()}`,
        itemId: selectedItem.id,
        phrase: selectedItem.phrase,
        heard: mode === 'microphone'
          ? 'Microphone practice completed'
          : mode === 'self_checked'
            ? 'Self-checked practice'
            : 'Support requested',
        score: nextFeedback.score,
        tone: nextFeedback.tone,
        mode,
        confidence: mode === 'support_needed' ? 'needs_help' : nextConfidence,
        supportUsed: Array.from(new Set(['pronunciation_practice', ...supportUsed])),
        source: selectedItem.source,
        assignmentId: assignmentPractice?.assignmentId,
        createdAt: new Date().toISOString(),
      };

      setFeedback(nextFeedback);
      persistAttempts([attempt, ...attempts]);
      const completedRealPractice = mode === 'self_checked'
        || (mode === 'microphone' && Boolean(heard.trim()));
      if (completedRealPractice && routedActivity) {
        const progress = getReadyChildProgressForOwner(expectedOwnerId);
        progress?.completeActivity(
          routedActivity.id,
          routedActivity.neuroId,
          routedActivity.starsReward,
          routedActivity.durationMinutes,
        );
      }
      setStatus(
        mode === 'support_needed'
          ? 'Help noted for this practice.'
          : authenticatedChildId
            ? 'Practice metadata saved. Recognised words and raw audio were not stored.'
            : 'Practice kept for this guest visit only. Recognised words and raw audio were not stored.',
      );
    },
    [
      assignmentPractice?.assignmentId,
      attempts,
      authenticatedChildId,
      childScopeId,
      confidence,
      persistAttempts,
      routedActivity,
      selectedItem,
    ],
  );

  const handleAddCustomPhrase = () => {
    const phrase = customPhrase.trim();
    if (!phrase) return;

    const nextItem: StoredPracticeItem = {
      id: `custom-${wordSource}-${Date.now()}`,
      category: customCategory,
      label: phrase,
      phrase,
      hint: customHint.trim() || 'Practise this slowly, one sound at a time.',
      breakdown: buildBreakdown(phrase),
      example: phrase.includes(' ') ? phrase : `I can say ${phrase}.`,
      difficulty: phrase.split(/\s+/).length > 3 ? 'stretch' : 'steady',
      source: wordSource,
      createdByLabel: sourceLabels[wordSource],
      createdAt: new Date().toISOString(),
    };

    persistCustomItems([nextItem, ...customItems]);
    setSelectedCategory(customCategory);
    setSelectedItemId(nextItem.id);
    setCustomPhrase('');
    setCustomHint('');
    setStatus(`Added "${phrase}" to the ${sourceLabels[wordSource].toLowerCase()} bank.`);
  };

  const markLinkedAssignmentComplete = async () => {
    const expectedOwnerId = authenticatedChildId;
    if (
      !assignmentPractice?.assignmentId
      || !expectedOwnerId
      || linkedAssignmentSaving
      || getCurrentChildScopeId() !== expectedOwnerId
    ) return;

    setLinkedAssignmentSaving(true);
    setStatus('');

    try {
      const availableAssignments = await ChildAssignmentService.getAssignments(expectedOwnerId);
      if (getCurrentChildScopeId() !== expectedOwnerId) return;
      const verifiedAssignment = availableAssignments.find((assignment) =>
        assignment.id === assignmentPractice.assignmentId
        && (
          assignment.assignmentType === 'pronunciation'
          || assignment.supportTools.includes('pronunciation_practice')
        ));
      if (!verifiedAssignment) {
        setStatus('This teacher task could not be verified. Return to the dashboard and open it again.');
        return;
      }

      await ChildAssignmentService.saveProgress({
        assignmentId: assignmentPractice.assignmentId,
        childId: expectedOwnerId,
        status: 'completed',
        supportUsed: ['pronunciation_practice', feedback?.tone === 'try' ? 'slow_repetition' : 'listen_repeat'],
        moodAfterTask: feedback?.tone === 'great' ? 'confident' : feedback?.tone === 'try' ? 'needs_more_practice' : 'practised',
      });
      if (getCurrentChildScopeId() !== expectedOwnerId) return;
      setLinkedAssignmentDone(true);
      setStatus('Teacher task updated.');
    } catch {
      if (getCurrentChildScopeId() === expectedOwnerId) {
        setStatus('Practice saved here, but the teacher task could not update.');
      }
    } finally {
      if (getCurrentChildScopeId() === expectedOwnerId) {
        setLinkedAssignmentSaving(false);
      }
    }
  };

  const latestAttempts = attempts.slice(0, 5);
  const weeklyBest = weeklyAttempts.length ? Math.max(...weeklyAttempts.map((attempt) => attempt.score)) : 0;
  const weeklySummaryText = buildWeeklySummaryText(attempts, firstName);

  const resetTry = () => {
    audioStudioRef.current?.reset(); setFeedback(null); setStatus('Ready to try again. Earlier scores stay in history.'); hasSavedAttemptRef.current = false;
  };
  const openWordBank = () => {
    const input = document.getElementById('pronunciation-custom-word'); input?.focus(); input?.scrollIntoView?.({ block: 'nearest' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <ChildDashboardNavbar />

      <main className="pronunciation-motion mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-6 sm:pb-20" data-calm={reducedMotion ? 'true' : 'false'}>
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-adapt-indigo/12 via-white to-adapt-teal/12 p-6 shadow-card dark:border-gray-800 dark:from-adapt-indigo/20 dark:via-gray-900 dark:to-adapt-teal/10 sm:p-8">
          <button
            type="button"
            onClick={() => navigate(ROUTES.CHILD_DASHBOARD)}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-adapt-indigo/15 bg-white/80 px-4 py-2 text-sm font-bold text-adapt-indigo shadow-sm transition hover:border-adapt-indigo/30 hover:bg-adapt-indigo/5 dark:border-adapt-cyan/20 dark:bg-gray-900/80 dark:text-adapt-cyan"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </button>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-adapt-indigo dark:text-adapt-cyan">
                Pronunciation Buddy
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-adapt-navy dark:text-gray-50 sm:text-5xl">
                Hear it, say it, practise it your way.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-gray-400">
                Hi {firstName}. Choose a sound, word, name, or sentence. AdaptBuddy can say it slowly,
                listen to your try, or let you count private practice without the microphone.
              </p>
              {assignmentPractice && (
                <div className="mt-5 inline-flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-adapt-indigo/15 bg-white/75 px-4 py-3 text-sm font-bold text-adapt-navy shadow-sm dark:border-adapt-cyan/20 dark:bg-gray-950/70 dark:text-gray-100">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                  Teacher task loaded: {assignmentPractice.title}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
                <p className="text-2xl font-black text-adapt-navy dark:text-gray-100">{todaysAttempts.length}</p>
                <p className="text-xs font-semibold text-slate-500">Today</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
                <p className="text-2xl font-black text-adapt-navy dark:text-gray-100">{bestScore}%</p>
                <p className="text-xs font-semibold text-slate-500">Best practice score</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
                <p className="text-2xl font-black text-adapt-navy dark:text-gray-100">{practisedPhrases}</p>
                <p className="text-xs font-semibold text-slate-500">Words</p>
              </div>
            </div>
          </div>
        </section>

        <PronunciationPromptCards
          onHear={() => audioStudioRef.current?.hear()}
          onSay={() => audioStudioRef.current?.focus()}
          onRetry={resetTry}
          onWords={openWordBank}
        />
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} />
          Calm Motion — keep icons still
        </label>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Scores stay for encouragement. Self-check percentages reflect your confidence choice; browser percentages compare recognised words.
          They are different kinds of score, not clinical pronunciation accuracy. A starting 0 means no recorded practice yet.
        </p>

        <section className="rounded-[2rem] border border-adapt-indigo/15 bg-white/90 p-5 shadow-card dark:border-adapt-cyan/20 dark:bg-gray-900/90">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <div>
                <h2 className="text-lg font-black text-adapt-navy dark:text-gray-100">Safety and consent</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-gray-400">
                  Pronunciation Buddy supports speech confidence, phonics and word practice. It does not diagnose speech
                  difficulties or replace professional speech and language therapy. Optional replay clips stay only in memory
                  in the open practice session and are not uploaded. Browser word checking is a separate opt-in and may process
                  audio remotely. Practice history keeps the chosen item, method, score, support, confidence and time—not replay clips
                  or the browser’s recognised words. Scores are encouragement/text matches, not a speech diagnosis.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => audioStudioRef.current?.focus()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white"
            >
              <Mic className="h-4 w-4" aria-hidden />
              Microphone options
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-card dark:border-gray-800 dark:bg-gray-900/90 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                    Practice bank
                  </p>
                  <h2 className="text-xl font-black text-adapt-navy dark:text-gray-100">Choose a set</h2>
                </div>
                <Ear className="h-6 w-6 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {PRONUNCIATION_CATEGORIES.map(({ id, label, helper, icon: Icon }) => {
                  const active = selectedCategory === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(id);
                        const firstItem = practiceItems.find((item) => item.category === id);
                        if (firstItem) setSelectedItemId(firstItem.id);
                        setFeedback(null);
                      }}
                      className={`min-h-[5.25rem] rounded-2xl border-2 p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-adapt-indigo/50 ${
                        active
                          ? 'border-adapt-indigo bg-adapt-indigo text-white shadow-md'
                          : 'border-slate-200 bg-white text-adapt-navy hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'
                      }`}
                    >
                      <Icon className="mb-2 h-5 w-5" aria-hidden />
                      <span className="block text-sm font-black">{label}</span>
                      <span className={`mt-0.5 block text-xs ${active ? 'text-white/80' : 'text-slate-500 dark:text-gray-400'}`}>
                        {helper}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-card dark:border-gray-800 dark:bg-gray-900/90 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                    Word list
                  </p>
                  <h2 className="text-xl font-black text-adapt-navy dark:text-gray-100">Tap one</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                  {categoryItems.length} items
                </span>
              </div>

              <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                {categoryItems.map((item) => {
                  const active = item.id === selectedItem?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setFeedback(null);
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-navy dark:border-adapt-cyan dark:bg-adapt-cyan/10 dark:text-gray-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-black">{item.label}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${difficultyStyles[item.difficulty]}`}>
                          {item.difficulty}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{item.hint}</p>
                      {item.source && (
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-gray-800 dark:text-gray-300">
                          {sourceLabels[item.source]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-[2rem] border border-adapt-indigo/15 bg-gradient-to-br from-white via-white to-adapt-teal/10 p-5 shadow-card dark:border-adapt-cyan/20 dark:from-gray-900 dark:via-gray-900 dark:to-adapt-cyan/10 sm:p-6">
              {selectedItem ? (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                        Today we practise
                      </p>
                      <h2 className="mt-2 text-4xl font-black leading-tight text-adapt-navy dark:text-gray-50 sm:text-5xl">
                        {selectedItem.phrase}
                      </h2>
                      {selectedItem.example && (
                        <p className="mt-3 text-base font-semibold text-slate-600 dark:text-gray-400">
                          {selectedItem.example}
                        </p>
                      )}
                    </div>
                    <button type="button" aria-label="Open microphone and playback controls" onClick={() => audioStudioRef.current?.focus()}
                      className="pronunciation-action flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-adapt-indigo/10 text-adapt-indigo focus-visible:outline focus-visible:outline-2 dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                      <Mic className="pronunciation-icon h-8 w-8" aria-hidden />
                    </button>
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-950/80">
                    <p className="text-sm font-bold text-slate-500 dark:text-gray-400">Break it down</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedItem.breakdown.map((part) => (
                        <span
                          key={`${selectedItem.id}-${part}`}
                          className="rounded-2xl bg-adapt-indigo/10 px-4 py-2 text-lg font-black text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan"
                        >
                          {part}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-gray-400">{selectedItem.hint}</p>
                  </div>

                  <PronunciationAudioStudio
                    key={`${childScopeId}:${selectedItem.id}`}
                    ref={audioStudioRef}
                    ownerId={childScopeId}
                    itemId={selectedItem.id}
                    phrase={selectedItem.phrase}
                    onRecognised={text => {
                      hasSavedAttemptRef.current = false;
                      saveAttempt({ heard: text, mode: 'microphone', supportUsed: ['browser_speech_check'] });
                    }}
                  />

                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-950/80">
                    <p className="text-sm font-bold text-slate-500 dark:text-gray-400">Practise without a microphone</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-400">
                      No microphone? No problem. Mark your own practice and confidence. Your encouragement score is not a measurement of your voice.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {confidenceOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setConfidence(option.id)}
                          className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                            confidence === option.id
                              ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo dark:border-adapt-cyan dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                              : 'border-slate-200 bg-white text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                          }`}
                        >
                          <span className="block font-black">{option.label}</span>
                          <span className="text-xs opacity-80">{option.helper}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => saveAttempt({ heard: selectedItem.phrase, mode: 'self_checked', confidence, supportUsed: ['self_check'], force: true })}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        I said it myself
                      </button>
                      <button
                        type="button"
                        onClick={() => saveAttempt({ heard: '', mode: 'support_needed', confidence: 'needs_help', supportUsed: ['slow_repetition_needed'], force: true })}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden />
                        I need help
                      </button>
                      <button
                        type="button"
                        onClick={resetTry}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        Try again
                      </button>
                    </div>
                  </div>

                  {status && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">{status}</p>}

                  {feedback && (
                    <div className={`mt-5 rounded-3xl border p-4 ${feedbackStyles[feedback.tone]}`} role="status">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden />
                          <div>
                            <p className="text-lg font-black">{feedback.title}</p>
                            <p className="mt-1 text-sm leading-relaxed">{feedback.message}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/70 px-4 py-2 text-center dark:bg-black/20">
                          <p className="text-2xl font-black tabular-nums">{feedback.score}%</p>
                          <p className="text-[10px] font-black uppercase tracking-wide opacity-70">{getPracticeScoreLabel(feedbackMode)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {assignmentPractice && feedback && (
                    <div className="mt-5 rounded-3xl border border-adapt-indigo/15 bg-white/85 p-4 dark:border-adapt-cyan/20 dark:bg-gray-950/80">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-adapt-navy dark:text-gray-100">
                            Connected teacher task
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                            Mark this task complete when you are happy with your practice.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void markLinkedAssignmentComplete()}
                          disabled={linkedAssignmentSaving || linkedAssignmentDone}
                          className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-5 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:cursor-not-allowed disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
                        >
                          {linkedAssignmentSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                          )}
                          {linkedAssignmentDone ? 'Saved for teacher' : 'Mark complete'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-lg font-black text-adapt-navy dark:text-gray-100">No practice words yet</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">Add a custom word to begin.</p>
                </div>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-card dark:border-gray-800 dark:bg-gray-900/90">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                    <Plus className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Family and school words
                    </p>
                    <h2 className="text-lg font-black text-adapt-navy dark:text-gray-100">Add word bank item</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    id="pronunciation-custom-word"
                    aria-label="New practice word or sentence"
                    maxLength={240}
                    value={customPhrase}
                    onChange={(event) => setCustomPhrase(event.target.value)}
                    placeholder="Name, word, or short sentence"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-adapt-navy outline-none transition placeholder:text-slate-400 focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                  <input
                    value={customHint}
                    onChange={(event) => setCustomHint(event.target.value)}
                    placeholder="Optional mouth/meaning hint"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-adapt-navy outline-none transition placeholder:text-slate-400 focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={customCategory}
                      onChange={(event) => setCustomCategory(event.target.value as PronunciationCategory)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-adapt-navy outline-none transition focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    >
                      {PRONUNCIATION_CATEGORIES.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={wordSource}
                      onChange={(event) => setWordSource(event.target.value as WordSource)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-adapt-navy outline-none transition focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    >
                      {Object.entries(sourceLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomPhrase}
                    disabled={!customPhrase.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add to practice
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-card dark:border-gray-800 dark:bg-gray-900/90">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                      <History className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                        Practice history
                      </p>
                      <h2 className="text-lg font-black text-adapt-navy dark:text-gray-100">Latest tries</h2>
                    </div>
                  </div>
                  {attempts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => persistAttempts([])}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-rose-200 hover:text-rose-600 dark:border-gray-700 dark:bg-gray-950"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {latestAttempts.length > 0 ? (
                  <div className="space-y-2">
                    {latestAttempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-950"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-adapt-navy dark:text-gray-100">{attempt.phrase}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                            {attempt.score}% · {getPracticeScoreLabel(attempt.mode)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                          {attempt.mode === 'microphone'
                            ? 'Microphone practice completed · recognised words not stored'
                            : attempt.heard}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                          {attempt.confidence.replace(/_/g, ' ')} · {attempt.supportUsed.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-adapt-indigo/25 bg-adapt-indigo/5 p-6 text-center dark:border-adapt-cyan/20 dark:bg-adapt-cyan/5">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                    <p className="text-sm font-bold text-slate-600 dark:text-gray-400">
                      Your practice tries will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-card dark:border-gray-800 dark:bg-gray-900/90">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
                      Weekly summary
                    </p>
                    <h2 className="text-lg font-black text-adapt-navy dark:text-gray-100">Progress snapshot</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-gray-400">
                      A privacy-safe snapshot for parents, teachers or review meetings. It uses practice metadata only.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadText(`adaptbuddy-pronunciation-summary-${todayKey()}.txt`, weeklySummaryText)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple dark:bg-adapt-cyan dark:text-gray-950"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download summary
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  { label: 'Tries', value: weeklyAttempts.length },
                  { label: 'Words', value: weeklyPhrases },
                  { label: 'Best practice score', value: `${weeklyBest}%` },
                  { label: 'Help', value: weeklyNeedsHelp },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-gray-950">
                    <p className="text-2xl font-black text-adapt-navy dark:text-gray-100">{metric.value}</p>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">{metric.label}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PronunciationBuddyPage;
