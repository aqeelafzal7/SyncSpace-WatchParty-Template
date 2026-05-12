'use client';

import React, { useState } from 'react';
import { doc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Play, Pause, Share2, Check, RotateCw, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoomControlsProps {
  roomId: string;
  isHost: boolean;
  roomData: any;
  onOpenSettings: () => void;
  onSync: () => void;
}

export function RoomControls({ roomId, isHost, roomData, onOpenSettings, onSync }: RoomControlsProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleSyncAction = (status: 'playing' | 'paused' | 'stopped') => {
    if (!firestore || !roomId) return;
    const roomRef = doc(firestore, 'rooms', roomId);
    updateDocumentNonBlocking(roomRef, {
      videoStateStatus: status,
      videoStateUpdatedAt: serverTimestamp()
    });
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: "Link Copied", description: "Share it with your friends!" });
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    onSync(); // Sends the manual sync signal to the Video Player
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: "Video Synced", description: "Synchronized with host!" });
    }, 800);
  };

  return (
    <div className="flex items-center justify-between gap-4 w-full px-4 pb-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onOpenSettings}
          className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 shrink-0"
        >
          <Menu className="w-5 h-5 text-accent" />
        </Button>
        <div className="flex flex-col min-w-0">
          <h2 className="font-bold text-sm md:text-base leading-tight truncate text-white">{roomData?.roomName || 'Party Room'}</h2>
          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-black truncate">
            {isHost ? 'Master Host' : `Synced with ${roomData?.hostName || 'Host'}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
        {isHost && (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-accent/20 hover:text-accent" onClick={() => handleSyncAction('playing')}>
              <Play className="w-4 h-4 fill-current" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-accent/20 hover:text-accent" onClick={() => handleSyncAction('paused')}>
              <Pause className="w-4 h-4 fill-current" />
            </Button>
          </div>
        )}
        {isHost && <div className="w-px h-6 bg-white/10 mx-1" />}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl hover:bg-white/10"
          onClick={handleRefreshData}
        >
          <RotateCw className={`w-4 h-4 text-accent ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl hover:bg-white/10"
          onClick={handleShare}
        >
          {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4 text-white" />}
        </Button>
      </div>
    </div>
  );
        }
