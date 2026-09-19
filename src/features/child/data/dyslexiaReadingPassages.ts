export interface DyslexiaReadingPassage {
  id: string;
  title: string;
  level: 'gentle' | 'steady' | 'stretch';
  summary: string;
  sentences: string[];
}

export const DYSLEXIA_READING_PASSAGES: DyslexiaReadingPassage[] = [
  {
    id: 'moon-garden',
    title: 'The Moon Garden',
    level: 'gentle',
    summary: 'Short sentences about a quiet night garden.',
    sentences: [
      'Mina stepped into the garden at night.',
      'The moon made every leaf shine silver.',
      'A small moth rested on a yellow flower.',
      'Mina smiled and listened to the soft wind.',
    ],
  },
  {
    id: 'brave-little-boat',
    title: 'The Brave Little Boat',
    level: 'steady',
    summary: 'A small boat finds a calm path through the rain.',
    sentences: [
      'A little red boat waited beside the wooden pier.',
      'Dark clouds gathered, and raindrops tapped the water.',
      'The boat followed three bright buoys toward a sheltered bay.',
      'When the sky cleared, its red sail glowed in the sun.',
    ],
  },
  {
    id: 'library-of-clouds',
    title: 'The Library of Clouds',
    level: 'stretch',
    summary: 'Longer sentences about a library floating above the town.',
    sentences: [
      'Above the town floated a library built from pale blue clouds.',
      'Readers climbed a spiral staircase that appeared after every rainfall.',
      'Inside, each book whispered its story when someone opened the cover.',
      'Before sunset, the librarian gave every visitor a feather bookmark for the journey home.',
    ],
  },
];
