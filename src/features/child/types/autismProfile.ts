export type CommunicationStyle = 'speaks' | 'gestures' | 'pictures' | 'aac' | 'typing' | 'mixed';
export type CommunicationSupport = 'voice' | 'pictures' | 'text' | 'all';

export interface QuickButton {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

export interface CommunicationSection {
  style: CommunicationStyle[];
  supportFormat: CommunicationSupport[];
  quickButtons: QuickButton[];
  customPhrases: string[];
}

export type SensorySensitivity = 'sound' | 'light' | 'touch' | 'smell' | 'crowds' | 'movement';
export type CalmingTool = 'music' | 'quiet' | 'breathing' | 'darkMode' | 'timer' | 'trustedAdult';

export interface SensorySection {
  sensitivities: SensorySensitivity[];
  calmingTools: CalmingTool[];
  reducedAnimations: boolean;
  customNotes: string;
}

export type RoutinePreference = 'strict' | 'flexible';
export type WarningTime = 2 | 5 | 10 | 15;

export interface TransitionDifficulty {
  activity: string;
  notes: string;
}

export interface RoutineSection {
  preference: RoutinePreference;
  warningTime: WarningTime;
  difficultTransitions: TransitionDifficulty[];
}

export type LearningFormat = 'pictures' | 'video' | 'voice' | 'text' | 'game' | 'checklist';

export interface LearningSection {
  bestFormats: LearningFormat[];
  interests: string[];
  oneInstructionAtATime: boolean;
}

export interface SafetySection {
  helpAlertContacts: string[];
  overwhelmSigns: string;
  preferredSupport: string;
}

export interface AutismProfile {
  childId: string;
  communication: CommunicationSection;
  sensory: SensorySection;
  routine: RoutineSection;
  learning: LearningSection;
  safety: SafetySection;
  completedAt: string | null;
  updatedAt: string;
}

export interface ScheduleItem {
  id: string;
  label: string;
  icon: string;
  done: boolean;
}

export interface NowNextLaterState {
  now: string;
  next: string;
  later: string;
}

export interface SocialStory {
  id: string;
  title: string;
  panels: string[];
}
