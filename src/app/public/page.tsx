'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where } from 'firebase/firestore';
import { 
  MonitorPlay, 
  ArrowLeft, 
  Loader2, 
  Globe, 
  Play, 
  Sparkles,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PublicDiscovery() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, router]);

  // KILL SWITCH: Only construct query if user is fully authenticated
  const publicRoomsQuery = useMemo(() => {
    if (!db || !user || isAuthLoading) return null;
    const q = query(
      collection(db, 'rooms'),
      where('isPublic', '==', true),
      where('status', '==', 'active')
    );
    // Explicitly tag as memoized for useCollection hook
    (q as any).__memo = true;
    return q;
  }, [db, user, isAuthLoading]);

  const { data: publicRooms, isLoading: isRoomsLoading } = useCollection(publicRoomsQuery);

  const filteredRooms = useMemo(() => {
    if (!publicRooms) return [];
    return publicRooms.filter(room => 
      room.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.hostName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [publicRooms, searchQuery]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white font-headline font-black tracking-widest uppercase animate-pulse">Entering Discovery...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white p-6 md:p-12 relative overflow-hidden flex flex-col items-center">
      {/* Background Orbs */}
      <div className="fixed top-0 -left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 -right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10 space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
              className="group -ml-4 text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-2xl shadow-lg border border-accent/20">
                <Globe className="w-8 h-8 text-accent animate-spin-slow" />
              </div>
              <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter">
                Discovery <span className="text-accent">Space</span>
              </h1>
            </div>
            <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Jump into live conversations around the world</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by room or host..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border-white/10 pl-10 h-12 focus:ring-accent rounded-xl"
            />
          </div>
        </div>

        {/* Feed Grid */}
        <div className="min-h-[400px]">
          {isRoomsLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
              <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Scanning the horizon...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-24 px-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-6">
              <Sparkles className="w-12 h-12 text-accent/40 mx-auto" />
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">No live parties found</h3>
                <p className="text-muted-foreground font-medium">Be the pioneer! Go back and start your own public room.</p>
              </div>
              <Button onClick={() => router.push('/')} className="bg-accent text-accent-foreground font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl">
                Create Room
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRooms.map((room) => (
                <div key={room.id} className="glass-morphism border-none text-white p-8 rounded-[2.5rem] flex flex-col space-y-6 hover:scale-[1.02] transition-all duration-300 shadow-2xl relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <MonitorPlay className="w-24 h-24" />
                  </div>
                  
                  <div className="space-y-2 relative">
                    <div className="flex justify-between items-start">
                      <h3 className="text-2xl font-black uppercase tracking-tighter truncate max-w-[200px]">{room.roomName}</h3>
                      <div className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-green-500/30 animate-pulse">LIVE</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Host: <span className="text-accent">{room.hostName}</span></span>
                      <span>•</span>
                      <span>{room.guests?.length || 0} watching</span>
                    </div>
                  </div>

                  <Link href={`/room/${room.id}`} className="w-full">
                    <Button className="w-full bg-accent hover:bg-accent/80 text-accent-foreground font-black uppercase tracking-widest text-xs h-12 rounded-2xl gap-3 shadow-lg shadow-accent/20">
                      JUMP IN
                      <Play className="w-4 h-4 fill-current" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
