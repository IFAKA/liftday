'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';

// Load YouTube IFrame API once globally
let ytApiLoaded = false;
let ytApiReady = false;
const ytReadyCallbacks: (() => void)[] = [];

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiReady) {
      resolve();
      return;
    }

    ytReadyCallbacks.push(resolve);

    if (!ytApiLoaded) {
      ytApiLoaded = true;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);

      (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = () => {
        ytApiReady = true;
        ytReadyCallbacks.forEach((cb) => cb());
        ytReadyCallbacks.length = 0;
      };
    }
  });
}

interface ExerciseDemoProps {
  youtubeId: string;
  title: string;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export function ExerciseDemo({ youtubeId, title, onPlayingChange }: ExerciseDemoProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

  const handleTap = useCallback(() => {
    setShowPlayer(true);
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowPlayer(false);
    onPlayingChangeRef.current?.(false);
  }, [youtubeId]);

  useEffect(() => {
    if (!showPlayer || !containerRef.current) return;

    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed || !containerRef.current) return;

      const player = new YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onStateChange: (event: YT.OnStateChangeEvent) => {
            const isPlaying = event.data === YT.PlayerState.PLAYING;
            onPlayingChangeRef.current?.(isPlaying);
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [showPlayer, youtubeId]);

  if (showPlayer) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      className="relative block w-full rounded-lg overflow-hidden group"
      aria-label={`Watch ${title} demo`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt={`${title} demonstration`}
        className="w-full aspect-video object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-active:bg-black/50 transition-colors">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
          <Play className="w-5 h-5 text-black fill-black ml-0.5" />
        </div>
      </div>
    </button>
  );
}
