import type {
  CalmingTool,
  CommunicationStyle,
  LearningFormat,
  SensorySensitivity,
} from 'features/child/types/autismProfile';

export interface CompanionOnboardingAnswers {
  preferredName: string;
  favouriteThings: string[];
  happyTriggers: string[];
  learningFormats: LearningFormat[];
  communicationDifficulties: string[];
  sensorySensitivities: SensorySensitivity[];
  worryTopics: string;
  frustrationTriggers: string;
  calmStrategies: CalmingTool[];
  helpBehaviour: string;
  executiveDifficulties: string[];
  goals: string[];
  onboardedWithParent: boolean;
}

export interface MoodCheckInEntry {
  id: string;
  mood: string;
  note: string;
  aiResponse?: string;
  createdAt: string;
}

export interface CompanionContext {
  childName: string;
  age: number | null;
  interests: string[];
  learningFormats: string[];
  communicationDifficulties: string[];
  sensorySensitivities: string[];
  goals: string[];
  calmStrategies: string[];
  worryTopics: string;
  frustrationTriggers: string;
}

export interface SimplifiedLanguageResult {
  original: string;
  simplified: string[];
  tip?: string;
}

export interface GeneratedSocialStory {
  title: string;
  panels: string[];
}

export interface MoodCheckInResult {
  response: string;
  suggestion?: string;
}
