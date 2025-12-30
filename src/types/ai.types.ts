import React, { useState } from 'react';
import { BookOpen, Heart, Clock, Trophy, Settings, Bell, Sun, Volume2, Type, Music } from 'lucide-react';
import FeelingsJournal from '../components/FeelingsJournal/FeelingsJournal';
import { RecommendationEngine } from '../services/recommendationEngine'; // ← ADD THIS LINE

export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'excited' | 'tired';
export type RiskLevel = 'low' | 'medium' | 'high';
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'social';

export interface EmotionAnalysis {
  emotion: EmotionType;
  confidence: number; // 0-1
  keywords: string[];
  riskLevel: RiskLevel;
  sentimentScore: number; // -1 to 1
  timestamp: Date;
}

export interface LearningRecommendation {
  id: string;
  title: string;
  description: string;
  learningStyle: LearningStyle;
  difficulty: number; // 1-10
  estimatedTime: number; // minutes
  neuroProfileMatch: string[]; // ['autism', 'adhd']
  aiConfidence: number; // 0-1
  tags: string[];
}

export interface AnalyticsData {
  date: string;
  moodScore: number;
  engagement: number;
  focusDuration: number;
  activitiesCompleted: number;
}

export interface PredictiveInsight {
  type: 'risk' | 'opportunity' | 'trend';
  title: string;
  description: string;
  confidence: number;
  suggestedAction?: string;
}