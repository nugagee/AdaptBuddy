import type { ComponentType, SVGProps } from 'react';

export interface NeuroOption {
  id: string;
  name: string;
  description: string;
  colorClass: string;
  longDescription?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    cardBg?: string;
    accent?: string;
  };
  learningStyle?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  neuroTypes: string[];
  age?: number;
}

export interface FeelingEntry {
  id: string;
  emotion: string;
  note?: string;
  timestamp: Date;
}