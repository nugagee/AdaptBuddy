import { LearningRecommendation, LearningStyle } from 'types/ai.types';

export class RecommendationEngine {
  private static activitiesDatabase: LearningRecommendation[] = [
    {
      id: 'vis-math-001',
      title: 'Visual Math Puzzles',
      description: 'Pattern recognition with color-coded number blocks — no timed pressure',
      learningStyle: 'visual',
      difficulty: 4,
      estimatedTime: 15,
      neuroProfileMatch: ['autism', 'dyscalculia'],
      aiConfidence: 0.88,
      tags: ['math', 'patterns', 'visual'],
    },
    {
      id: 'aud-story-002',
      title: 'Audio Story Builder',
      description: 'Build stories with voice + sound effects — Lexy-style multisensory literacy',
      learningStyle: 'auditory',
      difficulty: 3,
      estimatedTime: 20,
      neuroProfileMatch: ['adhd', 'dyslexia', 'auditory'],
      aiConfidence: 0.82,
      tags: ['creativity', 'language', 'audio'],
    },
    {
      id: 'kin-motor-003',
      title: 'Fine Motor Challenge',
      description: 'Tracing paths and precision taps — OT-inspired motor grading',
      learningStyle: 'kinesthetic',
      difficulty: 5,
      estimatedTime: 10,
      neuroProfileMatch: ['dyspraxia', 'dysgraphia', 'adhd'],
      aiConfidence: 0.91,
      tags: ['motor skills', 'coordination', 'hands-on'],
    },
    {
      id: 'soc-emo-004',
      title: 'Emotion Charades',
      description: 'Recognize feelings through visual cards — social story inspired',
      learningStyle: 'social',
      difficulty: 3,
      estimatedTime: 25,
      neuroProfileMatch: ['autism', 'spd'],
      aiConfidence: 0.76,
      tags: ['social skills', 'emotions', 'interactive'],
    },
    {
      id: 'vis-focus-005',
      title: 'Focus Flow Game',
      description: 'Calming visual sequences that train sustained attention',
      learningStyle: 'visual',
      difficulty: 2,
      estimatedTime: 12,
      neuroProfileMatch: ['adhd', 'spd', 'tourettes'],
      aiConfidence: 0.85,
      tags: ['focus', 'attention', 'calming'],
    },
    {
      id: 'read-comfort-006',
      title: 'Comfort Read Mode',
      description: 'Sepia overlay + OpenDyslexic font + read-aloud — Speechify-inspired',
      learningStyle: 'auditory',
      difficulty: 2,
      estimatedTime: 15,
      neuroProfileMatch: ['dyslexia', 'visual-stress'],
      aiConfidence: 0.9,
      tags: ['reading', 'accessibility', 'calming'],
    },
    {
      id: 'voice-grid-007',
      title: 'Voice Grid Express',
      description: 'Tap-to-speak word tiles — AAC grid communication inspired',
      learningStyle: 'auditory',
      difficulty: 3,
      estimatedTime: 12,
      neuroProfileMatch: ['dysgraphia', 'autism', 'auditory'],
      aiConfidence: 0.84,
      tags: ['communication', 'voice', 'motor-friendly'],
    },
    {
      id: 'sensory-scape-008',
      title: 'Sensory Soundscape Mix',
      description: 'Layer rain, lo-fi, and white noise to your comfort zone',
      learningStyle: 'kinesthetic',
      difficulty: 1,
      estimatedTime: 10,
      neuroProfileMatch: ['spd', 'autism', 'adhd'],
      aiConfidence: 0.87,
      tags: ['calming', 'regulation', 'sensory'],
    },
    {
      id: 'flex-create-009',
      title: 'Pressure-Free Create',
      description: 'Open canvas with pause-anytime — tic-friendly flexible flow',
      learningStyle: 'kinesthetic',
      difficulty: 2,
      estimatedTime: 18,
      neuroProfileMatch: ['tourettes', 'adhd', 'dysgraphia'],
      aiConfidence: 0.8,
      tags: ['creative', 'flexible', 'low-pressure'],
    },
    {
      id: 'mood-adapt-read-010',
      title: 'Mood-Adaptive Reading',
      description: 'Story length adjusts to your energy — Vedyx Leap-style pacing',
      learningStyle: 'visual',
      difficulty: 3,
      estimatedTime: 20,
      neuroProfileMatch: ['dyslexia', 'adhd', 'autism'],
      aiConfidence: 0.86,
      tags: ['reading', 'mood', 'adaptive'],
    },
  ];

  static recommend(
    neuroProfiles: string[],
    pastPerformance: number = 0.5,
    currentMood: string = 'calm',
    completedActivities: string[] = [],
  ): LearningRecommendation[] {
    const availableActivities = this.activitiesDatabase.filter(
      (activity) => !completedActivities.includes(activity.id),
    );

    const scoredActivities = availableActivities.map((activity) => {
      let score = 0;

      const profileMatch =
        activity.neuroProfileMatch.filter((profile) => neuroProfiles.includes(profile)).length /
        Math.max(1, activity.neuroProfileMatch.length);
      score += profileMatch * 0.4;

      const difficultyScore = 1 - Math.abs(activity.difficulty / 10 - pastPerformance);
      score += difficultyScore * 0.3;

      let moodScore = 0.5;
      if (currentMood === 'anxious' && activity.tags.includes('calming')) moodScore = 0.9;
      if (currentMood === 'sad' && activity.tags.includes('creativity')) moodScore = 0.8;
      if (currentMood === 'angry' && activity.tags.includes('focus')) moodScore = 0.7;
      if (currentMood === 'tired' && activity.tags.includes('calming')) moodScore = 0.85;
      if (currentMood === 'happy' && activity.tags.includes('interactive')) moodScore = 0.8;
      score += moodScore * 0.2;

      score += activity.aiConfidence * 0.1;

      return { ...activity, matchScore: score };
    });

    return scoredActivities
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)
      .map(({ matchScore: _matchScore, ...activity }) => activity);
  }

  static getLearningStyleProfile(neuroProfiles: string[]): Record<LearningStyle, number> {
    const styleCounts: Record<LearningStyle, number> = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
      social: 0,
    };

    const neuroStyleMapping: Record<string, LearningStyle[]> = {
      autism: ['visual', 'kinesthetic'],
      adhd: ['kinesthetic', 'auditory'],
      dyslexia: ['auditory', 'visual'],
      dysgraphia: ['kinesthetic', 'auditory'],
      dyscalculia: ['visual', 'kinesthetic'],
      dyspraxia: ['visual', 'kinesthetic'],
      spd: ['visual', 'kinesthetic'],
      auditory: ['auditory', 'visual'],
      'visual-stress': ['visual', 'auditory'],
      tourettes: ['kinesthetic', 'social'],
    };

    neuroProfiles.forEach((profile) => {
      neuroStyleMapping[profile]?.forEach((style) => {
        styleCounts[style]++;
      });
    });

    return styleCounts;
  }
}
