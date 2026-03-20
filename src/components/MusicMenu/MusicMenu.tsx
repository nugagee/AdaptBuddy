import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, Volume2, VolumeX, Play, Pause, 
  Waves, Cloud, Wind, Moon, Sun, Coffee,
  Heart, Bell, SkipForward, SkipBack
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SoundTrack {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  duration: string;
  description: string;
  suitableFor: string[];
}

const MusicMenu: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [timer, setTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { theme } = useTheme();

  // Sound tracks with metadata
  const soundTracks: SoundTrack[] = [
    {
      id: 'rain',
      name: 'Gentle Rain',
      icon: <Cloud className="w-8 h-8" />,
      color: 'blue',
      duration: '∞ Loop',
      description: 'Calming rain sounds for focus and relaxation',
      suitableFor: ['spd', 'anxiety', 'adhd']
    },
    {
      id: 'ocean',
      name: 'Ocean Waves',
      icon: <Waves className="w-8 h-8" />,
      color: 'teal',
      duration: '∞ Loop',
      description: 'Soothing waves crashing on shore',
      suitableFor: ['spd', 'autism', 'sleep']
    },
    {
      id: 'forest',
      name: 'Forest Night',
      icon: <Wind className="w-8 h-8" />,
      color: 'green',
      duration: '∞ Loop',
      description: 'Gentle forest sounds with crickets',
      suitableFor: ['anxiety', 'adhd', 'relaxation']
    },
    {
      id: 'lofi',
      name: 'Lofi Beats',
      icon: <Music className="w-8 h-8" />,
      color: 'purple',
      duration: '∞ Loop',
      description: 'Calm study beats for focus',
      suitableFor: ['adhd', 'dyslexia', 'study']
    },
    {
      id: 'white-noise',
      name: 'White Noise',
      icon: <Volume2 className="w-8 h-8" />,
      color: 'gray',
      duration: '∞ Loop',
      description: 'Consistent sound for sensory blocking',
      suitableFor: ['spd', 'autism', 'sleep']
    },
    {
      id: 'morning',
      name: 'Morning Birds',
      icon: <Sun className="w-8 h-8" />,
      color: 'yellow',
      duration: '∞ Loop',
      description: 'Gentle birdsong for morning calm',
      suitableFor: ['morning', 'anxiety']
    }
  ];

  // Check if user has SPD for recommendation
  useEffect(() => {
    const userNeurotypes = localStorage.getItem('userNeurotypes');
    if (userNeurotypes) {
      const neurotypes = JSON.parse(userNeurotypes);
      if (neurotypes.includes('spd')) {
        // Show SPD recommendation
        setTimeout(() => {
          if (window.confirm('👂 We notice you have Sensory Processing Disorder. Would you like to try our calming sounds?')) {
            // Auto-suggest first track
            setCurrentTrack('rain');
          }
        }, 2000);
      }
    }
  }, []);

  // Simulate audio playback (in real app, connect to actual audio files)
  const togglePlay = (trackId: string) => {
    if (currentTrack === trackId && isPlaying) {
      setIsPlaying(false);
      // In real app: audioRef.current?.pause();
    } else {
      setCurrentTrack(trackId);
      setIsPlaying(true);
      // In real app: audioRef.current = new Audio(`/sounds/${trackId}.mp3`);
      // audioRef.current?.play();
    }
  };

  const stopAll = () => {
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  const startTimer = (minutes: number) => {
    setTimer(minutes);
    setTimeRemaining(minutes * 60);
  };

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) {
      if (timeRemaining === 0) {
        stopAll();
        setTimer(null);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${
      theme === 'light' ? 'bg-gradient-to-br from-purple-50 to-pink-50' :
      theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-purple-900' :
      'bg-gradient-to-br from-amber-50 to-sepia-100'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            🎵 Calming Sounds
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Find your calm. Focus, relax, or drift to sleep.
          </p>
          
          {/* Timer buttons */}
          <div className="mt-4 flex justify-center gap-3">
            <button 
              onClick={() => startTimer(5)}
              className="px-4 py-2 bg-white/80 dark:bg-gray-800 rounded-full text-sm shadow-sm hover:scale-105 transition"
            >
              5 min
            </button>
            <button 
              onClick={() => startTimer(15)}
              className="px-4 py-2 bg-white/80 dark:bg-gray-800 rounded-full text-sm shadow-sm hover:scale-105 transition"
            >
              15 min
            </button>
            <button 
              onClick={() => startTimer(30)}
              className="px-4 py-2 bg-white/80 dark:bg-gray-800 rounded-full text-sm shadow-sm hover:scale-105 transition"
            >
              30 min
            </button>
            <button 
              onClick={() => setTimer(null)}
              className="px-4 py-2 bg-white/80 dark:bg-gray-800 rounded-full text-sm shadow-sm hover:scale-105 transition"
            >
              No timer
            </button>
          </div>

          {/* Timer display */}
          {timeRemaining !== null && timeRemaining > 0 && (
            <div className="mt-3 text-lg font-bold text-purple-600 dark:text-purple-400">
              Time remaining: {formatTime(timeRemaining)}
            </div>
          )}
        </header>

        {/* Now Playing Bar */}
        {currentTrack && (
          <div className="mb-6 p-4 bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-${
                  soundTracks.find(t => t.id === currentTrack)?.color || 'purple'
                }-500 flex items-center justify-center text-white`}>
                  {soundTracks.find(t => t.id === currentTrack)?.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {soundTracks.find(t => t.id === currentTrack)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isPlaying ? 'Playing...' : 'Paused'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center hover:scale-110 transition"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button 
                  onClick={stopAll}
                  className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:scale-110 transition"
                >
                  <VolumeX className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sound Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {soundTracks.map((track) => {
            const isCurrentTrack = currentTrack === track.id;
            
            return (
              <button
                key={track.id}
                onClick={() => togglePlay(track.id)}
                className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                  theme === 'light' ? `bg-${track.color}-50` :
                  theme === 'dark' ? 'bg-gray-800' :
                  'bg-sepia-50'
                } ${
                  isCurrentTrack && isPlaying
                    ? `border-${track.color}-500 scale-[1.02] shadow-xl ring-4 ring-${track.color}-500/20` 
                    : 'border-gray-200 hover:border-gray-400 hover:scale-[1.02] hover:shadow-lg'
                }`}
              >
                {/* Animated playing indicator */}
                {isCurrentTrack && isPlaying && (
                  <div className="absolute -top-3 -right-3 flex gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping animation-delay-200" />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping animation-delay-400" />
                  </div>
                )}

                {/* Icon */}
                <div className={`flex justify-center mb-4 transform group-hover:scale-110 transition-transform text-${track.color}-600`}>
                  {track.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2">{track.name}</h3>

                {/* Duration badge */}
                <span className="inline-block px-3 py-1 bg-white/80 dark:bg-gray-700 rounded-full text-xs font-medium mb-3 shadow-sm">
                  {track.duration}
                </span>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {track.description}
                </p>

                {/* Suitable for badges */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {track.suitableFor.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-white/60 dark:bg-gray-700/60 rounded-full text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Play/Pause indicator */}
                {isCurrentTrack && (
                  <div className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-purple-600">
                    {isPlaying ? (
                      <>🔊 Now Playing</>
                    ) : (
                      <>⏸️ Paused</>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Visualizer (optional) */}
        {showVisualizer && isPlaying && (
          <div className="mt-8 p-6 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Sound Visualizer</h3>
              <button 
                onClick={() => setShowVisualizer(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            </div>
            <div className="flex items-end justify-center gap-1 h-32">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-4 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '1s'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Volume Control */}
        <div className="mt-6 p-4 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
          <div className="flex items-center gap-4">
            <Volume2 className="w-6 h-6 text-gray-500" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 w-12">{volume}%</span>
          </div>
        </div>

        {/* Footer note */}
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>🎧 Use headphones for best experience • Sounds loop continuously</p>
          <p className="mt-2">Perfect for: Sensory breaks • Focus time • Bedtime • Calm moments</p>
        </footer>
      </div>
    </div>
  );
};

export default MusicMenu;