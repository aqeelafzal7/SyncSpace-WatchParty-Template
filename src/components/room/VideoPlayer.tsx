'use client';

import React, { useRef, useEffect, useState } from 'react';
import { DocumentReference, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import ReactPlayer from 'react-player';
import { Play, Pause, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  videoState: {
    status: string;
    timestamp: number;
    updatedAt: any;
  };
  isHost: boolean;
  roomRef: DocumentReference;
  syncCount: number;
}

export function VideoPlayer({ videoUrl, videoState, isHost, roomRef, syncCount }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [lastSyncCount, setLastSyncCount] = useState(0);

  // Sync logic for guests and late joiners
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    const targetStatus = videoState.status === 'playing';
    
    // Calculate current target time based on when the state was updated
    let targetTime = videoState.timestamp;
    if (videoState.status === 'playing' && videoState.updatedAt) {
      // Calculate elapsed time since Host updated state to handle live broadcast sync
      const updatedAtMs = videoState.updatedAt?.toMillis?.() || (videoState.updatedAt instanceof Date ? videoState.updatedAt.getTime() : typeof videoState.updatedAt === 'number' ? videoState.updatedAt : Date.now());
      const nowMs = Date.now();
      const elapsedSeconds = (nowMs - updatedAtMs) / 1000;
      
      // Ensure we don't jump ahead if the offset is unreasonably large
      if (elapsedSeconds > 0 && elapsedSeconds < 3600) {
        targetTime += elapsedSeconds;
      }
    }

    const currentTime = playerRef.current.getCurrentTime();
    const timeDiff = Math.abs(currentTime - targetTime);

    // Manual sync check
    const isManualSync = syncCount > lastSyncCount;

    // Sync playing status
    if (targetStatus !== playing) {
      setPlaying(targetStatus);
    }

    // Sync timestamp if out of sync by more than 2 seconds (or manual sync)
    if (isManualSync || timeDiff > 2) {
      playerRef.current.seekTo(targetTime, 'seconds');
      if (isManualSync) {
        setLastSyncCount(syncCount);
      }
    }
  }, [videoState, isReady, syncCount, lastSyncCount, playing]);

  // Set loading state when URL changes
  useEffect(() => {
    setIsVideoLoading(true);
  }, [videoUrl]);

  const handlePlayerReady = () => {
    setIsReady(true);
    setIsVideoLoading(false);
    
    // Force immediate initial sync on mount
    if (playerRef.current) {
      const targetStatus = videoState.status === 'playing';
      let targetTime = videoState.timestamp;
      
      if (videoState.status === 'playing' && videoState.updatedAt) {
        const updatedAtMs = videoState.updatedAt?.toMillis?.() || (videoState.updatedAt instanceof Date ? videoState.updatedAt.getTime() : typeof videoState.updatedAt === 'number' ? videoState.updatedAt : Date.now());
        const elapsedSeconds = (Date.now() - updatedAtMs) / 1000;
        if (elapsedSeconds > 0 && elapsedSeconds < 3600) {
          targetTime += elapsedSeconds;
        }
      }
      
      playerRef.current.seekTo(targetTime, 'seconds');
      setPlaying(targetStatus);
    }
  };

  const handlePlayPause = () => {
    if (!isHost) return;
    const newStatus = playing ? 'paused' : 'playing';
    updateDocumentNonBlocking(roomRef, {
      videoStateStatus: newStatus,
      videoStateTimestamp: playerRef.current?.getCurrentTime() || 0,
      videoStateUpdatedAt: serverTimestamp()
    });
  };

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setSeeking(false);
    const newPlayed = parseFloat((e.target as HTMLInputElement).value);
    playerRef.current?.seekTo(newPlayed);
    
    if (isHost) {
      updateDocumentNonBlocking(roomRef, {
        videoStateTimestamp: newPlayed * duration,
        videoStateUpdatedAt: serverTimestamp()
      });
    }
  };

  // Keep internal 'playing' state and Firestore in sync with player events
  const handleOnPlay = () => {
    if (!isReady) return;
    setPlaying(true);
    if (isHost && videoState.status !== 'playing') {
      updateDocumentNonBlocking(roomRef, {
        videoStateStatus: 'playing',
        videoStateTimestamp: playerRef.current?.getCurrentTime() || 0,
        videoStateUpdatedAt: serverTimestamp()
      });
    }
  };

  const handleOnPause = () => {
    if (!isReady) return;
    setPlaying(false);
    if (isHost && videoState.status !== 'paused') {
      updateDocumentNonBlocking(roomRef, {
        videoStateStatus: 'paused',
        videoStateTimestamp: playerRef.current?.getCurrentTime() || 0,
        videoStateUpdatedAt: serverTimestamp()
      });
    }
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* Video frame with aspect ratio */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/10 group">
        
        {/* Interaction Lockdown Overlay: Glass shield for guests */}
        <div 
          className={`absolute inset-0 z-20 transition-all duration-300 ${isHost ? 'pointer-events-none' : 'pointer-events-auto bg-transparent cursor-not-allowed'}`} 
          title={!isHost ? "Synced with Host" : ""}
        />

        {/* Loading Overlay */}
        {isVideoLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Loading video...</p>
          </div>
        )}
        
        <div className="absolute inset-0 z-0">
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height="100%"
            playing={playing}
            controls={true} // Set to true to ensure all platforms remain responsive
            onReady={handlePlayerReady}
            onPlay={handleOnPlay}
            onPause={handleOnPause}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onBuffer={() => setIsVideoLoading(true)}
            onBufferEnd={() => setIsVideoLoading(false)}
            progressInterval={1000}
            config={{
              youtube: {
                playerVars: { 
                  modestbranding: 1, 
                  rel: 0, 
                  showinfo: 0, 
                  disablekb: 1,
                  autoplay: 1
                }
              },
              file: {
                attributes: {
                  controlsList: 'nodownload'
                }
              }
            }}
          />
        </div>
      </div>

      {/* Custom Sleek Control Bar for Host */}
      {isHost && (
        <div className="flex flex-col gap-3 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 flex items-center justify-center bg-accent text-accent-foreground rounded-full hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-accent/20"
            >
              {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            
            <div className="flex-1 group relative">
              <input
                type="range"
                min={0}
                max={0.999999}
                step="any"
                value={played}
                onMouseDown={handleSeekMouseDown}
                onTouchStart={handleSeekMouseDown}
                onChange={handleSeekChange}
                onMouseUp={handleSeekMouseUp}
                onTouchEnd={handleSeekMouseUp}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent transition-all hover:h-2"
                style={{
                  background: `linear-gradient(to right, hsl(var(--accent)) ${played * 100}%, rgba(255,255,255,0.1) ${played * 100}%)`
                }}
              />
            </div>
            
            <div className="text-[10px] font-mono font-bold text-muted-foreground tabular-nums min-w-[32px] text-right">
              {Math.floor(played * duration / 60)}:{String(Math.floor(played * duration % 60)).padStart(2, '0')}
            </div>
          </div>
        </div>
      )}
      
      {!isHost && (
        <div className="px-4 py-2 bg-accent/5 border border-accent/10 rounded-xl flex items-center justify-center gap-3">
           <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(var(--accent),0.5)]" />
           <span className="text-[10px] font-black text-accent uppercase tracking-widest">Live Master Sync</span>
        </div>
      )}
    </div>
  );
}
