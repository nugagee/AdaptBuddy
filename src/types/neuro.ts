export interface NeuroOption {
  id: string;
  name: string;
  description: string;
  colorClass: string;
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