
'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { Hammer, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * @fileOverview A global maintenance gate that restricts app access during maintenance.
 * Admins are allowed to bypass the gate.
 */

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const [settings, setSettings] = useState({ isMaintenance: false, maintenanceMessage: '' });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    // 1. Listen to Global System Settings
    const systemDocRef = doc(db, 'settings', 'system');
    const unsubscribeSettings = onSnapshot(systemDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as any);
      }
      setIsLoading(false);
    });

    // 2. Listen to User Authentication and Role
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'user');
          } else {
            setUserRole('user');
          }
        } catch (e) {
          console.error("Error fetching user role for maintenance gate:", e);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
    });

    return () => {
      unsubscribeSettings();
      unsubscribeAuth();
    };
  }, [auth, db]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white font-headline font-black tracking-widest uppercase animate-pulse">Syncing Services...</p>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';
  const shouldShowMaintenance = settings.isMaintenance && !isAdmin;

  if (shouldShowMaintenance) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-lg text-center space-y-8 animate-fade-in">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-24 h-24 bg-primary/20 rounded-[2.5rem] flex items-center justify-center border border-primary/30 shadow-2xl backdrop-blur-md relative">
              <Hammer className="w-12 h-12 text-accent" />
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-headline font-black text-white tracking-tighter uppercase leading-none">
                We'll be <span className="text-accent">Right Back!</span>
              </h1>
              <p className="text-muted-foreground font-medium text-lg uppercase tracking-widest opacity-70">
                Enhancing your cinematic space
              </p>
            </div>
          </div>

          <Card className="glass-morphism border-none text-white overflow-hidden shadow-2xl">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3 text-accent font-black uppercase tracking-widest text-xs mb-2">
                 <AlertCircle className="w-4 h-4" />
                 Update in Progress
              </div>
              <p className="text-lg font-medium leading-relaxed opacity-90 italic">
                "{settings.maintenanceMessage || 'We are currently performing scheduled maintenance to improve your experience. Please check back soon!'}"
              </p>
            </CardContent>
          </Card>
          
          <div className="pt-8 border-t border-white/5">
             <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">
               The Friends Space &copy; 2024
             </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
