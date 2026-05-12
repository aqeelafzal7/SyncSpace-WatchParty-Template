
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase/provider';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Hash, LogIn, Loader2, Info } from 'lucide-react';

export function JoinRoomForm() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDisplayName, setCurrentDisplayName] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentDisplayName(user.displayName || 'Guest');
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !firestore) return;
    
    setLoading(true);

    const cleanedId = roomId.includes('/room/') 
      ? roomId.split('/room/')[1].split('?')[0] 
      : roomId.trim();

    try {
      const roomRef = doc(firestore, 'rooms', cleanedId);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        toast({
          variant: "destructive",
          title: "Invalid Room ID",
          description: "We couldn't find a watch party with that ID.",
        });
        setLoading(false);
        return;
      }
      
      router.push(`/room/${cleanedId}`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to verify Room ID.",
      });
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg glass-morphism animate-fade-in border-none flex flex-col">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-headline font-bold text-white tracking-tight">
          Join a Party
        </CardTitle>
        <CardDescription className="text-muted-foreground flex flex-col gap-1 items-center">
          <span>Enter the unique ID shared with you to jump in.</span>
          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1 mt-1">
            <Info className="w-2.5 h-2.5" />
            The ID is the text at the end of the room URL.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 opacity-50">
                <Users className="w-4 h-4 text-accent" />
                Joining as
              </Label>
              <div className="p-3 bg-white/5 border border-white/10 rounded-md font-bold text-accent">
                {currentDisplayName || '...'}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomIdInput" className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-accent" />
                Room ID
              </Label>
              <Input
                id="roomIdInput"
                placeholder="abcd-1234-..."
                required
                disabled={loading}
                value={roomId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('/room/')) {
                    const extractedId = val.split('/room/').pop()?.split('?')[0] || '';
                    setRoomId(extractedId);
                  } else {
                    setRoomId(val);
                  }
                }}
                className="bg-background/40 border-white/10 focus:ring-accent focus:border-accent h-11"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/80 text-accent-foreground transition-all duration-300 shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {loading ? "Verifying..." : "Join Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
