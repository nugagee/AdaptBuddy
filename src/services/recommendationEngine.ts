import { LearningRecommendation, LearningStyle } from '../types/ai.types';

export class RecommendationEngine {
  private static activitiesDatabase: LearningRecommendation[] = [
    {
      id: 'vis-math-001',
      title: 'Visual Math Puzzles',
      description: 'Pattern recognition and spatial reasoning games',
      learningStyle: 'visual',
      difficulty: 4,
      estimatedTime: 15,
      neuroProfileMatch: ['autism', 'dyscalculia'],
      aiConfidence: 0.88,
      tags: ['math', 'patterns', 'visual']
    },
    {
      id: 'aud-story-002',
      title: 'Audio Story Builder',
      description: 'Create stories using voice recordings and sound effects',
      learningStyle: 'auditory',
      difficulty: 3,
      estimatedTime: 20,
      neuroProfileMatch: ['adhd', 'dyslexia'],
      aiConfidence: 0.82,
      tags: ['creativity', 'language', 'audio']
    },
    {
      id: 'kin-motor-003',
      title: 'Fine Motor Challenge',
      description: 'Tracing and precision exercises with virtual tools',
      learningStyle: 'kinesthetic',
      difficulty: 5,
      estimatedTime: 10,
      neuroProfileMatch: ['dyspraxia', 'adhd'],
      aiConfidence: 0.91,
      tags: ['motor skills', 'coordination', 'hands-on']
    },
    {
      id: 'soc-emo-004',
      title: 'Emotion Charades',
      description: 'Learn to recognize and express emotions through games',
      learningStyle: 'social',
      difficulty: 3,
      estimatedTime: 25,
      neuroProfileMatch: ['autism', 'speech'],
      aiConfidence: 0.76,
      tags: ['social skills', 'emotions', 'interactive']
    },
    {
      id: 'vis-focus-005',
      title: 'Focus Flow Game',
      description: 'Attention training with calming visual sequences',
      learningStyle: 'visual',
      difficulty: 2,
      estimatedTime: 12,
      neuroProfileMatch: ['adhd', 'sensory'],
      aiConfidence: 0.85,
      tags: ['focus', 'attention', 'calming']
    }
  ];
  
  static recommend(
    neuroProfiles: string[],
    pastPerformance: number = 0.5, // 0-1 scale
    currentMood: string = 'calm',
    completedActivities: string[] = []
  ): LearningRecommendation[] {
    // Filter out recently completed activities
    const availableActivities = this.activitiesDatabase.filter(
      activity => !completedActivities.includes(activity.id)
    );
    
    // Score each activity based on match
    const scoredActivities = availableActivities.map(activity => {
      let score = 0;
      
      // Neuro-profile match (weight: 40%)
      const profileMatch = activity.neuroProfileMatch.filter(profile => 
        neuroProfiles.includes(profile)
      ).length / Math.max(1, activity.neuroProfileMatch.length);
      score += profileMatch * 0.4;
      
      // Difficulty adjustment based on past performance (weight: 30%)
      const difficultyScore = 1 - Math.abs(activity.difficulty / 10 - pastPerformance);
      score += difficultyScore * 0.3;
      
      // Mood-based adjustment (weight: 20%)
      let moodScore = 0.5;
      if (currentMood === 'anxious' && activity.tags.includes('calming')) moodScore = 0.9;
      if (currentMood === 'sad' && activity.tags.includes('creativity')) moodScore = 0.8;
      if (currentMood === 'angry' && activity.tags.includes('focus')) moodScore = 0.7;
      score += moodScore * 0.2;

      // AI confidence (weight: 10%)
      score += activity.aiConfidence * 0.1;
      
      return { ...activity, matchScore: score };
    });
    
    // Sort by score and return top 3
    return scoredActivities
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)
      .map(({ matchScore, ...activity }) => activity);
  }
  
  static getLearningStyleProfile(neuroProfiles: string[]): Record<LearningStyle, number> {
    const styleCounts: Record<LearningStyle, number> = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
      social: 0
    };
    
    const neuroStyleMapping: Record<string, LearningStyle[]> = {
      autism: ['visual', 'kinesthetic'],
      adhd: ['kinesthetic', 'auditory'],
      dyslexia: ['auditory', 'visual'],
      dyspraxia: ['visual', 'kinesthetic'],
      sensory: ['visual', 'kinesthetic'],
      speech: ['auditory', 'social']
    };
    
    neuroProfiles.forEach(profile => {
      neuroStyleMapping[profile]?.forEach(style => {
        styleCounts[style]++;
      });
    });
    
    return styleCounts;
  }
}