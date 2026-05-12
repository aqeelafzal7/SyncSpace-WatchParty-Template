'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Rocket, User as UserIcon, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

/**
 * @fileOverview Onboarding page for new users to set their preferred display name.
 * This page is reached after initial sign-up (Google or Email).
 */

export default function OnboardingPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [customName, setCustomName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgImage = PlaceHolderImages.find(img => img.id === 'landing-bg');

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setCustomName(currentUser.displayName || '');
        
        // Final sanity check: if they've already onboarded, send them home
        if (db) {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists() && userDoc.data().hasSetCustomName === true) {
              router.push('/');
            }
          } catch (e) {
            console.error("Onboarding check error:", e);
          }
        }
      } else {
        router.push('/');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db, router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !db || !customName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, { 
        displayName: customName.trim() 
      });

      // 2. Update Firestore User Document
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        name: customName.trim(),
        hasSetCustomName: true
      });

      // 3. Success! Move to Dashboard
      router.push('/');
    } catch (err: any) {
      console.error("Onboarding Save Error:", err);
      setError(err.message || "Failed to save profile. Please try again.");
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white font-headline font-black tracking-widest uppercase animate-pulse">Preparing your orbit...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#0D0D0F]">
      {/* Background with cinematic overlay */}
      <div className="fixed inset-0 z-0">
        <Image
          src={bgImage?.imageUrl || "https://picsum.photos/seed/friends-space/1920/1080"}
          alt="Cinematic background"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      </div>

      <main className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/30 shadow-2xl mb-4 group hover:scale-110 transition-transform duration-500">
            <Rocket className="w-8 h-8 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-headline font-black text-white tracking-tighter uppercase leading-none">
            Welcome to <span className="text-accent">The Friends Space</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm tracking-wide">Your journey begins here. Let's get you identified.</p>
        </div>

        <Card className="glass-morphism border-none shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Identify Yourself
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              What should your friends call you in the space?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveName} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <UserIcon className="w-3 h-3 text-accent" />
                  Space Handle (Display Name)
                </Label>
                <div className="relative">
                  <Input
                    id="customName"
                    placeholder="e.g. SpaceExplorer_99"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={isSaving}
                    className="bg-white/5 border-white/10 h-14 text-lg font-bold focus:ring-accent transition-all pl-4"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                     <UserIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-[10px] font-bold uppercase tracking-widest py-3">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                disabled={isSaving || !customName.trim()}
                className="w-full h-14 bg-accent hover:bg-accent/80 text-accent-foreground font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-accent/20 gap-3 group"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing Space...
                  </>
                ) : (
                  <>
                    Jump In
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em]">
          ✨ Synchronizing your cinematic experience
        </p>
      </main>

      {/* Decorative Glows */}
      <div className="fixed top-0 -left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 -right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />
    </div>
  );
}
