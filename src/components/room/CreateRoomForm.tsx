"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useAuth } from '@/firebase/provider';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Play, Users, Lock, MonitorPlay, AlertCircle, Loader2, CalendarDays, Clock, Eye, EyeOff, Shield, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BLOCKED_DOMAINS = ['pornhub', 'xvideos', 'xhamster', 'onlyfans', 'redtube', 'brazzers', 'xnxx', 'porn', 'xxx', 'adult', 'sex'];

export function CreateRoomForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDisplayName, setCurrentDisplayName] = useState('');
  const [currentUid, setCurrentUid] = useState('');
  
  // Privacy States
  const [isPublic, setIsPublic] = useState(true);
  const [roomPassword, setRoomPassword] = useState('');
  const [hideMemberList, setHideMemberList] = useState(false);
  
  // Scheduling States
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  const [formData, setFormData] = useState({
    videoUrl: '',
    roomName: '',
  });

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentDisplayName(user.displayName || 'Guest');
        setCurrentUid(user.uid);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const validateUrl = (url: string) => {
    const lowerUrl = url.toLowerCase();
    const isSupportedPlatform = [
      'youtube.com', 'youtu.be', 'vimeo.com', 'facebook.com', 'fb.watch',
      'twitch.tv', 'streamable.com', 'dailymotion.com', 'dai.ly'
    ].some(platform => lowerUrl.includes(platform));
    
    const isMediaFile = ['.mp4', '.webm', '.ogg', '.m3u8'].some(ext => 
      lowerUrl.endsWith(ext) || lowerUrl.includes(ext + '?') || lowerUrl.includes(ext + '#')
    );
    
    if (!isSupportedPlatform && !isMediaFile) {
      return "Please provide a valid link from a supported platform or a direct media link.";
    }

    if (BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain))) {
      return "Error: Adult content is strictly prohibited on this platform.";
    }

    return null;
  };

  const generateShortId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firestore || !currentUid) {
      setError("Waiting for identification...");
      return;
    }

    const urlError = validateUrl(formData.videoUrl);
    if (urlError) {
      setError(urlError);
      return;
    }

    if (!isPublic && !roomPassword.trim()) {
      setError("Please provide a password for your private party.");
      return;
    }

    if (isScheduled && !scheduledTime) {
      setError("Please pick a start time for your scheduled party.");
      return;
    }

    setLoading(true);

    try {
      const userDoc = await getDoc(doc(firestore, 'users', currentUid));
      const globalRole = userDoc.exists() ? userDoc.data().role : 'user';

      const shortId = generateShortId();
      const roomDocRef = doc(firestore, 'rooms', shortId);
      
      await setDoc(roomDocRef, {
        hostName: currentDisplayName,
        hostId: currentUid,
        memberRoles: {
          [currentUid]: 'host'
        },
        globalRoles: {
          [currentUid]: globalRole
        },
        videoUrl: formData.videoUrl,
        roomName: formData.roomName || `${currentDisplayName}'s Room`,
        password: isPublic ? null : roomPassword,
        isPublic,
        roomPassword: isPublic ? '' : roomPassword,
        hideMemberList,
        guests: [],
        allTimeMembers: [currentDisplayName],
        createdAt: serverTimestamp(),
        status: 'active',
        videoStateStatus: 'stopped',
        videoStateTimestamp: 0,
        videoStateUpdatedAt: serverTimestamp(),
        isScheduled: isScheduled,
        startTime: isScheduled ? new Date(scheduledTime) : null,
        notifyList: [],
        notified: false
      });

      onSuccess?.();
      router.push(`/room/${shortId}`);
    } catch (err: any) {
      console.error("Error creating room:", err);
      setError(err.message || "Failed to create room.");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Card className="w-full glass-morphism animate-fade-in border-none shadow-2xl">
      <CardHeader className="text-center space-y-2 pb-6">
        <CardTitle className="text-3xl font-headline font-black text-white tracking-tighter uppercase">
          Host a Party
        </CardTitle>
        <CardDescription className="text-muted-foreground font-medium">
          Configure your synchronized watch party below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateRoom} className="space-y-6">
          <div className="space-y-5">
            {/* Identity Info */}
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Hosting As</span>
                  <span className="text-sm font-bold text-accent">{currentDisplayName}</span>
                </div>
              </div>
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="videoUrl" className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-80 flex items-center gap-2">
                <MonitorPlay className="w-3 h-3 text-accent" />
                Video Source
              </Label>
              <Input
                id="videoUrl"
                name="videoUrl"
                placeholder="YouTube, Vimeo, or .mp4 link"
                required
                disabled={loading}
                value={formData.videoUrl}
                onChange={handleChange}
                className="bg-background/40 border-white/10 focus:ring-accent h-11"
              />
            </div>

            {/* Room Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roomName" className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-80 flex items-center gap-2">
                  <Play className="w-3 h-3 text-accent" />
                  Room Name
                </Label>
                <Input
                  id="roomName"
                  name="roomName"
                  placeholder="The Cool Lobby"
                  disabled={loading}
                  value={formData.roomName}
                  onChange={handleChange}
                  className="bg-background/40 border-white/10 focus:ring-accent h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-80 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-accent" />
                  Visibility
                </Label>
                <Select value={isPublic ? "public" : "private"} onValueChange={(val) => setIsPublic(val === "public")}>
                  <SelectTrigger className="bg-background/40 border-white/10 h-11">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 text-white">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Private Password - Conditional */}
            {!isPublic && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="roomPassword" className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Required Password
                </Label>
                <Input
                  id="roomPassword"
                  type="password"
                  placeholder="Create a password"
                  required={!isPublic}
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="bg-accent/5 border-accent/20 focus:ring-accent h-11"
                />
              </div>
            )}

            {/* Advanced Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-accent/10 rounded-lg">
                    {hideMemberList ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Privacy Shield</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Hide Guest List</span>
                  </div>
                </div>
                <Switch checked={hideMemberList} onCheckedChange={setHideMemberList} />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                    <CalendarDays className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Schedule</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Plan for later</span>
                  </div>
                </div>
                <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
              </div>

              {isScheduled && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Input
                    id="startTime"
                    type="datetime-local"
                    required={isScheduled}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-background/40 border-white/10 focus:ring-accent h-11"
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground animate-in shake duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-sm font-black bg-primary hover:bg-primary/90 transition-all duration-300 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 uppercase tracking-widest"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                {isScheduled ? "Schedule Party" : "Launch Now"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
