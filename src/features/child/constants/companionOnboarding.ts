import type {
  AutismProfile,
  CalmingTool,
  CommunicationStyle,
  LearningFormat,
  SensorySensitivity,
} from 'features/child/types/autismProfile';
import type { CompanionOnboardingAnswers } from 'features/child/types/companionOnboarding';

export const PARENT_COPILOT_MAX_AGE = 8;

export const COMMUNICATION_DIFFICULTIES = [
  { id: 'explain', label: 'Explain things' },
  { id: 'find_words', label: 'Find words' },
  { id: 'understand_instructions', label: 'Understand instructions' },
  { id: 'ask_help', label: 'Ask for help' },
  { id: 'start_conversations', label: 'Start conversations' },
] as const;

export const SENSORY_ONBOARDING = [
  { id: 'sound' as SensorySensitivity, label: 'Loud sounds bother me' },
  { id: 'light' as SensorySensitivity, label: 'Bright lights bother me' },
  { id: 'crowds' as SensorySensitivity, label: 'Crowded places are difficult' },
  { id: 'touch' as SensorySensitivity, label: 'Some clothes feel uncomfortable' },
  { id: 'smell' as SensorySensitivity, label: 'Certain food textures are difficult' },
];

export const LEARNING_ONBOARDING = [
  { id: 'text' as LearningFormat, label: 'Reading' },
  { id: 'pictures' as LearningFormat, label: 'Pictures help me' },
  { id: 'video' as LearningFormat, label: 'Videos help me' },
  { id: 'voice' as LearningFormat, label: 'Listening helps me' },
];

export const GOAL_OPTIONS = [
  'Making friends',
  'Feeling calmer',
  'School work',
  'Communication',
  'Routines',
  'Confidence',
  'Focus',
  'Understanding emotions',
] as const;

export const EXECUTIVE_OPTIONS = [
  { id: 'startingTasks', label: 'Starting tasks is hard' },
  { id: 'finishingTasks', label: 'Finishing tasks is hard' },
  { id: 'rememberingInstructions', label: 'Remembering instructions is hard' },
  { id: 'switchingActivities', label: 'Switching activities is hard' },
  { id: 'managingTime', label: 'Managing time is hard' },
] as const;

export const CALM_STRATEGY_OPTIONS = [
  { id: 'music' as CalmingTool, label: 'Music' },
  { id: 'quiet' as CalmingTool, label: 'Quiet space' },
  { id: 'breathing' as CalmingTool, label: 'Breathing' },
  { id: 'darkMode' as CalmingTool, label: 'Low light' },
  { id: 'trustedAdult' as CalmingTool, label: 'Trusted adult' },
];

export const ONBOARDING_STEPS = [
  { id: 'about', title: 'About Me', subtitle: 'Let AdaptBuddy get to know you' },
  { id: 'learning', title: 'How I Learn', subtitle: 'What helps you understand things' },
  { id: 'communication', title: 'Communication', subtitle: 'What can feel tricky sometimes' },
  { id: 'sensory', title: 'Sensory Profile', subtitle: 'What your body notices' },
  { id: 'feelings', title: 'Feelings', subtitle: 'Worries, calm moments, and help' },
  { id: 'executive', title: 'Daily Tasks', subtitle: 'Starting, finishing, and switching' },
  { id: 'goals', title: 'My Goals', subtitle: 'What you want help with' },
] as const;

export function emptyOnboardingAnswers(preferredName = ''): CompanionOnboardingAnswers {
  return {
    preferredName,
    favouriteThings: [],
    happyTriggers: [],
    learningFormats: [],
    communicationDifficulties: [],
    sensorySensitivities: [],
    worryTopics: '',
    frustrationTriggers: '',
    calmStrategies: [],
    helpBehaviour: '',
    executiveDifficulties: [],
    goals: [],
    onboardedWithParent: false,
  };
}

const difficultyToStyle = (ids: string[]): CommunicationStyle[] => {
  const styles: CommunicationStyle[] = [];
  if (ids.includes('find_words') || ids.includes('explain')) styles.push('pictures', 'typing');
  if (ids.includes('ask_help')) styles.push('gestures');
  if (ids.includes('start_conversations')) styles.push('mixed');
  return styles.length ? styles : ['mixed'];
};

export function buildAutismProfileFromOnboarding(
  childId: string,
  answers: CompanionOnboardingAnswers,
): AutismProfile {
  const now = new Date().toISOString();
  const interests = [...answers.favouriteThings];

  return {
    childId,
    aboutMe: {
      preferredName: answers.preferredName.trim(),
      favouriteThings: answers.favouriteThings,
      happyTriggers: answers.happyTriggers,
    },
    communication: {
      style: difficultyToStyle(answers.communicationDifficulties),
      supportFormat: answers.learningFormats.includes('pictures') ? ['pictures', 'all'] : ['all'],
      quickButtons: [
        { id: 'help', label: 'I need help', icon: 'Help', enabled: true },
        { id: 'repeat', label: 'Please repeat', icon: 'Repeat', enabled: true },
        { id: 'show', label: 'Show me', icon: 'Show', enabled: true },
        { id: 'time', label: 'Give me time', icon: 'Time', enabled: true },
        { id: 'type', label: 'Can I type it?', icon: 'Type', enabled: true },
        { id: 'break', label: 'I need a break', icon: 'Break', enabled: true },
      ],
      customPhrases: [],
      difficulties: answers.communicationDifficulties,
    },
    sensory: {
      sensitivities: answers.sensorySensitivities,
      calmingTools: answers.calmStrategies.length ? answers.calmStrategies : ['quiet', 'breathing'],
      reducedAnimations: answers.sensorySensitivities.includes('light'),
      customNotes: '',
    },
    routine: {
      preference: 'flexible',
      warningTime: 5,
      difficultTransitions: [],
    },
    learning: {
      bestFormats: answers.learningFormats.length ? answers.learningFormats : ['pictures', 'checklist'],
      interests,
      oneInstructionAtATime: answers.executiveDifficulties.includes('rememberingInstructions'),
    },
    emotional: {
      worryTopics: answers.worryTopics,
      frustrationTriggers: answers.frustrationTriggers,
      calmStrategies: answers.calmStrategies,
      helpBehaviour: answers.helpBehaviour,
    },
    executiveFunction: {
      startingTasks: answers.executiveDifficulties.includes('startingTasks'),
      finishingTasks: answers.executiveDifficulties.includes('finishingTasks'),
      rememberingInstructions: answers.executiveDifficulties.includes('rememberingInstructions'),
      switchingActivities: answers.executiveDifficulties.includes('switchingActivities'),
      managingTime: answers.executiveDifficulties.includes('managingTime'),
    },
    goals: {
      selected: answers.goals,
    },
    safety: {
      helpAlertContacts: [],
      overwhelmSigns: answers.frustrationTriggers,
      preferredSupport: answers.helpBehaviour,
    },
    companionOnboardingCompleted: true,
    onboardedWithParent: answers.onboardedWithParent,
    completedAt: now,
    updatedAt: now,
  };
}
