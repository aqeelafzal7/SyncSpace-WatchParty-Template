'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, collection } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { firestore, useDoc, useAuth, addDocumentNonBlocking } from '@/firebase';
import { VideoPlayer } from './VideoPlayer';
import { ChatSidebar } from './ChatSidebar';
import { RoomControls } from './RoomControls';
import { 
  Loader2, 
  AlertCircle, 
  Users, 
  LogIn, 
  Home, 
  Lock, 
  Trophy, 
  Clock, 
  Sparkles, 
  Bell, 
  CalendarClock,
  X,
  Settings,
  LogOut,
  Trash2,
  MonitorPlay,
  Link as LinkIcon,
  ShieldAlert,
  KeyRound,
  MessageCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface RoomClientProps {
  roomId: string;
}

const BLOCKED_KEYWORDS = ['pornhub', 'xvideos', 'xhamster', 'onlyfans', 'redtube', 'brazzers', 'xnxx', 'porn', 'xxx', 'adult', 'sex'];

export function RoomClient({ roomId }: RoomClientProps) {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [localUserId, setLocalUserId] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [joinNameInput, setJoinNameInput] = useState("");
  const [joinPasswordInput, setJoinPasswordInput] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [leftAt, setLeftAt] = useState<number | null>(null);
  const [isJoiningLoading, setIsJoiningLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  const [isWaitingRoom, setIsWaitingRoom] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  
  const hasAnnouncedJoin = useRef(false);
  const hasAnnouncedFinish = useRef(false);

  const roomRef = useMemo(() => {
    if (!firestore || !roomId || isAuthLoading || !localUserId) return null;
    const ref = doc(firestore, 'rooms', roomId);
    (ref as any).__memo = true;
    return ref;
  }, [roomId, firestore, isAuthLoading, localUserId]);

  const { data: roomData, isLoading: isRoomLoading } = useDoc(roomRef);

  useEffect(() => {
    if (!auth || !firestore) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        setLocalUserId(user.uid);
        setDisplayName(user.displayName || 'Friend');
        setJoinNameInput(user.displayName || 'Friend');
        
        try {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'user');
          }
        } catch (e) {
          console.error("Error fetching user role:", e);
        }
      } else if (!isAuthLoading) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirect_to', window.location.pathname);
          router.push('/');
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, firestore, router, isAuthLoading]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAdmin = userRole === 'admin';
  const isHost = localUserId === roomData?.hostId;
  const hasControl = isHost || isAdmin;
  const needsPassword = !!roomData?.password && !hasControl && !isPasswordVerified;
  const isMember = localUserId && roomData?.memberRoles?.[localUserId];

  useEffect(() => {
    if (!roomData?.isScheduled || !roomData?.startTime) {
      setIsWaitingRoom(false);
      return;
    }

    const startTime = roomData.startTime?.toDate ? roomData.startTime.toDate() : new Date(roomData.startTime);
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = startTime.getTime() - now.getTime();

      if (difference <= 0) {
        if (isWaitingRoom && hasControl && !hasAnnouncedFinish.current) {
          toast({
            title: "Countdown Finished",
            description: "The countdown is finished! You can now start the video whenever you are ready.",
          });
          hasAnnouncedFinish.current = true;
        }
        setIsWaitingRoom(false);
        setTimeLeft(null);
        return true; 
      }

      setIsWaitingRoom(true);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
      return false;
    };

    const isFinished = calculateTimeLeft();
    if (isFinished) return;

    const timer = setInterval(() => {
      const finished = calculateTimeLeft();
      if (finished) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [roomData?.isScheduled, roomData?.startTime, isWaitingRoom, hasControl, toast]);

  useEffect(() => {
    if (
      isMounted && 
      !isRoomLoading && 
      roomData && 
      localUserId && 
      displayName && 
      !needsPassword && 
      isMember && 
      !hasAnnouncedJoin.current &&
      firestore
    ) {
      const messagesRef = collection(firestore, 'rooms', roomId, 'messages');
      addDocumentNonBlocking(messagesRef, {
        roomId,
        senderName: 'System',
        senderId: 'system',
        text: `${displayName} joined the room`,
        isSystem: true,
        timestamp: serverTimestamp()
      });
      hasAnnouncedJoin.current = true;
    }
  }, [isMounted, isRoomLoading, roomData, localUserId, displayName, needsPassword, isMember, roomId, firestore]);

  const handleJoinParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!displayName || !localUserId) return;

    if (roomData?.password && !isAdmin && joinPasswordInput !== roomData.password) {
      setJoinError("Incorrect room password.");
      return;
    }

    setIsJoiningLoading(true);
    try {
      if (roomRef && roomData) {
        await updateDoc(roomRef, {
          [`memberRoles.${localUserId}`]: 'guest',
          [`globalRoles.${localUserId}`]: userRole,
          guests: roomData.guests.includes(displayName) 
            ? roomData.guests 
            : [...roomData.guests, displayName],
          allTimeMembers: arrayUnion(displayName)
        });
      }
      setIsPasswordVerified(true);
    } catch (err: any) {
      console.error("Join Room Error:", err);
      setJoinError("Failed to join room. Please check your connection.");
    } finally {
      setIsJoiningLoading(false);
    }
  };

  const handleEndRoom = () => {
    if (!roomRef || !roomData || !hasControl) return;
    if (!window.confirm("Are you sure you want to end this party for everyone? This cannot be undone.")) return;
    updateDoc(roomRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });
    setIsSidebarOpen(false);
  };

  const handleLeaveRoom = async () => {
    if (!roomRef || !localUserId || !roomData) return;
    
    const newRoles = { ...roomData.memberRoles };
    delete newRoles[localUserId];
    
    await updateDoc(roomRef, {
      memberRoles: newRoles,
      guests: roomData.guests.filter((g: string) => g !== displayName)
    });
    
    setLeftAt(Date.now());
    setShowSummary(true);
    setIsSidebarOpen(false);
  };

  const handleUpdateVideo = () => {
    if (!newVideoUrl.trim() || !roomRef) return;

    const lowerUrl = newVideoUrl.toLowerCase();
    const isSupportedPlatform = [
      'youtube.com', 'youtu.be', 'vimeo.com', 'facebook.com', 'fb.watch',
      'twitch.tv', 'streamable.com', 'dailymotion.com', 'dai.ly'
    ].some(platform => lowerUrl.includes(platform));
    
    const isMediaFile = ['.mp4', '.webm', '.ogg', '.m3u8'].some(ext => 
      lowerUrl.endsWith(ext) || lowerUrl.includes(ext + '?') || lowerUrl.includes(ext + '#')
    );

    if (!isSupportedPlatform && !isMediaFile) {
      toast({ variant: "destructive", title: "Invalid Link", description: "Please provide a valid platform or direct media link." });
      return;
    }

    if (BLOCKED_KEYWORDS.some(keyword => lowerUrl.includes(keyword))) {
      toast({ variant: "destructive", title: "Content Restricted", description: "Adult content is strictly prohibited." });
      setNewVideoUrl('');
      return;
    }

    updateDocumentNonBlocking(roomRef, {
      videoUrl: newVideoUrl,
      videoStateStatus: 'playing',
      videoStateTimestamp: 0,
      videoStateUpdatedAt: serverTimestamp()
    });
    setNewVideoUrl('');
    toast({ title: "Video Updated", description: "The room video has been updated successfully." });
  };

  const calculateDuration = () => {
    if (!roomData?.createdAt) return "00:00:00";
    const start = roomData.createdAt?.toMillis?.() || new Date(roomData.createdAt).getTime();
    const end = roomData.status === 'ended' ? (roomData.endedAt?.toMillis?.() || Date.now()) : (leftAt || Date.now());
    const diff = Math.max(0, end - start);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  if (!isMounted || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white tracking-widest animate-pulse font-headline font-bold uppercase">
        AUTHENTICATING...
      </div>
    );
  }

  if (isRoomLoading || !roomData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-black">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="text-white font-headline font-bold text-xl tracking-tight uppercase">Syncing Space...</p>
      </div>
    );
  }

  const isEnded = roomData?.status === 'ended';
  const displaySummary = showSummary || isEnded;

  if (displaySummary && roomData) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0D0D0F] p-4 text-white overflow-y-auto">
        <Card className="w-full max-w-xl glass-morphism border-none text-white shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden">
          <CardHeader className="text-center space-y-4 pt-10">
            <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] opacity-80">✨ THE FRIENDS SPACE</h4>
            <CardTitle className="text-4xl md:text-5xl font-headline font-black uppercase tracking-tighter leading-none">
              PARTY <span className="text-accent">SUMMARY</span>
            </CardTitle>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xl font-bold opacity-90">{roomData.roomName}</p>
              <p className="text-sm text-muted-foreground">Hosted by {roomData.hostName}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 px-8 pb-10">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center">
                <Clock className="w-4 h-4 text-accent mb-1" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duration</span>
                <span className="text-2xl font-black font-mono">{calculateDuration()}</span>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-500 mb-1" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendees</span>
                <span className="text-2xl font-black font-mono">{roomData.allTimeMembers?.length || 1}</span>
              </div>
            </div>
            <Button onClick={() => router.push('/')} className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-white/90 rounded-2xl">
              <Home className="w-5 h-5 mr-3" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isMember || needsPassword || isJoiningLoading) {
    return (
      <div className="h-screen bg-[#0D0D0F] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />
        
        <Card className="w-full max-w-md glass-morphism border-none text-white animate-in zoom-in-95 shadow-2xl relative z-10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center border border-accent/30 shadow-lg shadow-accent/20 mb-2">
              <KeyRound className="w-8 h-8 text-accent" />
            </div>
            <div>
              <CardTitle className="text-3xl font-headline font-black uppercase tracking-tighter">
                Private Party
              </CardTitle>
              <CardDescription className="text-muted-foreground font-medium mt-1">
                Enter the secret key to join <span className="text-accent font-bold">@{roomData.hostName}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinParty} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Authenticated As</Label>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-accent text-sm truncate flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    {displayName || '...'}
                  </div>
                </div>
                
                {roomData.password && !isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="joinPasswordInput" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="joinPasswordInput" 
                        type="password" 
                        placeholder="••••••••"
                        value={joinPasswordInput} 
                        onChange={(e) => setJoinPasswordInput(e.target.value)} 
                        required 
                        className="bg-white/5 border-white/10 pl-10 h-12 focus:ring-accent"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {joinError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground text-[10px] font-bold uppercase tracking-widest p-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {joinError}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isJoiningLoading} 
                className="w-full h-14 text-sm font-black uppercase tracking-widest bg-accent hover:bg-accent/80 text-accent-foreground shadow-lg shadow-accent/20 gap-3"
              >
                {isJoiningLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Enter Party
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-950 overflow-hidden font-body relative">
      <FirebaseErrorListener />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Admin / Settings Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-gray-900 border-r border-white/5 z-[70] transform transition-transform duration-300 ease-in-out shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent" />
              <h2 className="font-black uppercase tracking-widest text-sm text-white">Room Settings</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full hover:bg-white/5 text-muted-foreground hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
            {hasControl && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <MonitorPlay className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Update Content</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sidebarVideoUrl" className="text-[10px] font-bold text-muted-foreground/60">New Video URL</Label>
                  <div className="flex flex-col gap-2">
                    <Input 
                      id="sidebarVideoUrl"
                      placeholder="YouTube, Vimeo, mp4..." 
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="bg-white/5 border-white/10 text-xs h-10"
                    />
                    <Button size="sm" onClick={handleUpdateVideo} className="bg-accent hover:bg-accent/80 text-accent-foreground font-black text-[10px] h-10 uppercase tracking-widest">
                      Update Screen
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-white/5 space-y-3">
               <Button onClick={handleLeaveRoom} variant="outline" className="w-full justify-start text-muted-foreground border-white/10 hover:bg-white/5 hover:text-white">
                 <LogOut className="w-4 h-4 mr-2" />
                 Leave Room
               </Button>
               {hasControl && (
                 <Button onClick={handleEndRoom} variant="destructive" className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20">
                   <Trash2 className="w-4 h-4 mr-2" />
                   End Party for All
                 </Button>
               )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full overflow-hidden relative">
        
        {/* Video Column */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden bg-black relative">
          <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col justify-center">
            {roomData && <VideoPlayer roomData={roomData} roomId={roomId} isHost={hasControl} />}
          </div>
          {/* Passed onOpenSettings to RoomControls */}
          {roomData && <RoomControls roomId={roomId} roomData={roomData} isHost={hasControl} onOpenSettings={() => setIsSidebarOpen(true)} />}
        </div>

        {/* Chat Column */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col h-[50vh] lg:h-full border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0D0D0F]">
           {roomRef && roomData && localUserId && (
             <ChatSidebar roomId={roomId} roomData={roomData} user={{ uid: localUserId, displayName }} roomRef={roomRef} />
           )}
        </div>

      </div>
    </div>
  );
}
