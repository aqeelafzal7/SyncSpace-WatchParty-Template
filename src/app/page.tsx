'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { onAuthStateChanged, User, signOut, updateProfile, updatePassword } from 'firebase/auth';
import { collection, query, where, orderBy, limit, getDoc, doc, updateDoc } from 'firebase/firestore';
import { CreateRoomForm } from '@/components/room/CreateRoomForm';
import { JoinRoomForm } from '@/components/room/JoinRoomForm';
import { AuthForm } from '@/components/auth/AuthForm';
import { 
  MonitorPlay, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Loader2, 
  Plus, 
  Menu, 
  X, 
  Home as HomeIcon, 
  Settings, 
  Shield, 
  LogOut, 
  Link as LinkIcon,
  Globe,
  Sparkles,
  User as UserIcon,
  Lock,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Clock,
  ArrowRight
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Renders the list of upcoming scheduled watch parties.
 */
function UpcomingEventsList({ user }: { user: User }) {
  const db = useFirestore();
  
  const upcomingQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rooms'),
      where('isScheduled', '==', true),
      where('status', '==', 'active'),
      limit(10)
    );
  }, [db, user]);

  const { data: rooms, isLoading } = useCollection(upcomingQuery);

  const futureRooms = useMemo(() => {
    if (!rooms) return [];
    return rooms
      .filter(room => {
        const startTime = room.startTime?.toDate ? room.startTime.toDate() : new Date(room.startTime);
        return startTime > new Date();
      })
      .sort((a, b) => {
        const timeA = a.startTime?.toDate ? a.startTime.toDate().getTime() : new Date(a.startTime).getTime();
        const timeB = b.startTime?.toDate ? b.startTime.toDate().getTime() : new Date(b.startTime).getTime();
        return timeA - timeB;
      });
  }, [rooms]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;

  if (!futureRooms || futureRooms.length === 0) {
    return (
      <div className="w-full py-12 px-6 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
        <CalendarDays className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium italic">No upcoming scheduled events right now. Be the first to host one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {futureRooms.map((room) => {
        const startTime = room.startTime?.toDate ? room.startTime.toDate() : new Date(room.startTime);
        const formattedDate = startTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        const formattedTime = startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        return (
          <Card key={room.id} className="glass-morphism border-none text-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-accent/20 rounded-xl">
                  <MonitorPlay className="w-5 h-5 text-accent" />
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-accent">
                  Scheduled
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold truncate mb-1">{room.roomName}</h4>
                <p className="text-xs text-muted-foreground">Hosted by {room.hostName}</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-accent">
                  <CalendarDays className="w-4 h-4" />
                  {formattedDate}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                  <Clock className="w-4 h-4" />
                  {formattedTime}
                </div>
              </div>
              <Button asChild className="w-full mt-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold h-11 group">
                <Link href={`/room/${room.id}`}>
                  Enter Waiting Room
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Consolidates dashboard functionality for authenticated users.
 */
function AuthenticatedDashboard({ user, userRole }: { user: User, userRole: string }) {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  
  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsName, setSettingsName] = useState(user.displayName || '');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      setIsSidebarOpen(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setIsSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      if (settingsName !== user.displayName) {
        await updateProfile(user, { displayName: settingsName });
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { name: settingsName });
      }

      if (settingsPassword.trim()) {
        try {
          await updatePassword(user, settingsPassword);
        } catch (pwErr: any) {
          if (pwErr.code === 'auth/requires-recent-login') {
            throw new Error("For security, please log out and log back in before changing your password.");
          }
          throw pwErr;
        }
      }

      setSettingsSuccess("Profile updated successfully!");
      setSettingsPassword('');
      setTimeout(() => {
        setIsSettingsModalOpen(false);
        setSettingsSuccess(null);
      }, 2000);

    } catch (err: any) {
      setSettingsError(err.message || "Failed to update profile.");
    } finally {
      setIsSettingsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-gray-900 border-r border-white/5 z-[70] transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col p-6",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-6 h-6 text-accent" />
            <span className="font-black uppercase tracking-tighter text-white">Sync<span className="text-accent">Space</span></span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full hover:bg-white/5 text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-white hover:bg-white/5" onClick={() => setIsSidebarOpen(false)}>
            <HomeIcon className="w-5 h-5 text-accent" />
            <span className="font-bold">Home</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-muted-foreground hover:bg-white/5" onClick={() => { router.push('/public'); setIsSidebarOpen(false); }}>
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-bold">Explore Public</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-muted-foreground hover:bg-white/5" onClick={() => { setIsSettingsModalOpen(true); setIsSidebarOpen(false); }}>
            <Settings className="w-5 h-5 text-accent" />
            <span className="font-bold">Settings</span>
          </Button>
          {userRole === 'admin' && (
            <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-accent hover:bg-accent/10" onClick={() => { router.push('/admin'); setIsSidebarOpen(false); }}>
              <Shield className="w-5 h-5" />
              <span className="font-bold">Admin Panel</span>
            </Button>
          )}
        </nav>

        <div className="pt-6 border-t border-white/5">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
            <span className="font-bold">Sign Out</span>
          </Button>
        </div>
      </aside>
                {/* Hamburger Menu */}
      <div className="absolute top-6 left-6 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsSidebarOpen(true)}
          className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 shadow-2xl backdrop-blur-md"
        >
          <Menu className="w-6 h-6 text-white" />
        </Button>
      </div>

      <div className="w-full max-w-5xl animate-fade-in space-y-12 pb-24">
        <div className="pl-16">
          <h2 className="text-3xl md:text-5xl font-headline font-black text-white tracking-tighter mb-2">
            Welcome back, <span className="text-accent">{user.displayName || 'Friend'}!</span> 👋
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Ready for another party?</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="h-16 px-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-lg gap-3 shadow-xl shadow-indigo-500/20 transform hover:-translate-y-1 transition-all duration-200 group border-none">
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                NEW PARTY
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-0 bg-transparent border-none overflow-hidden">
              <DialogHeader className="sr-only">
                <DialogTitle>Create New Watch Party</DialogTitle>
                <DialogDescription>Setup your synchronized watch party room.</DialogDescription>
              </DialogHeader>
              <CreateRoomForm onSuccess={() => setIsCreateModalOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-16 px-8 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-black text-lg gap-3 shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                <LinkIcon className="w-6 h-6 text-accent" />
                JOIN WITH CODE
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-0 bg-transparent border-none overflow-hidden">
              <DialogHeader className="sr-only">
                <DialogTitle>Join a Watch Party</DialogTitle>
                <DialogDescription>Enter the room ID to join your friends.</DialogDescription>
              </DialogHeader>
              <JoinRoomForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Upcoming Events Section */}
        <div className="space-y-6 pt-12 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl md:text-2xl font-headline font-black text-white uppercase tracking-tighter">
              📅 Upcoming <span className="text-accent">Scheduled</span> Parties
            </h3>
          </div>
          <UpcomingEventsList user={user} />
        </div>

        {/* Explore Card Section */}
        <div className="pt-12 border-t border-white/5">
           <Link href="/public" className="group block">
            <div className="w-full p-8 md:p-12 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-6 transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 hover:border-accent/40 relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Globe className="w-48 h-48 text-accent" />
               </div>
               
               <div className="p-4 bg-accent/20 rounded-2xl shadow-inner">
                  <Sparkles className="w-10 h-10 text-accent animate-pulse" />
               </div>
               
               <div>
                  <h3 className="text-2xl md:text-4xl font-headline font-black text-white uppercase tracking-tighter mb-2">
                    Explore <span className="text-accent">Live</span> Parties
                  </h3>
                  <p className="text-muted-foreground font-medium max-w-md mx-auto text-lg">
                    Browse public watch parties and jump into the conversation with users from around the world.
                  </p>
               </div>
               
               <div className="flex items-center gap-3 text-accent font-black uppercase tracking-widest text-sm bg-accent/10 px-6 py-3 rounded-full border border-accent/20">
                  Enter the Discovery Space
                  <Plus className="w-4 h-4 rotate-45" />
               </div>
            </div>
           </Link>
        </div>
      </div>
              {/* User Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-md glass-morphism border-none text-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
          <DialogHeader className="text-center space-y-2 mb-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Account Settings</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Update your profile information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settingsName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 flex items-center gap-2">
                  <UserIcon className="w-3 h-3 text-accent" />
                  Display Name
                </Label>
                <Input 
                  id="settingsName"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="John Doe"
                  disabled={isSettingsLoading}
                  className="bg-white/5 border-white/10 h-11 focus:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingsPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 flex items-center gap-2">
                  <Lock className="w-3 h-3 text-accent" />
                  New Password
                </Label>
                <Input 
                  id="settingsPassword"
                  type="password"
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  disabled={isSettingsLoading}
                  className="bg-white/5 border-white/10 h-11 focus:ring-accent"
                />
              </div>
            </div>

            {settingsError && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-xs py-2">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="font-bold">{settingsError}</AlertDescription>
              </Alert>
            )}

            {settingsSuccess && (
              <Alert className="bg-green-500/10 border-green-500/20 text-green-400 text-xs py-2">
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription className="font-bold">{settingsSuccess}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsSettingsModalOpen(false)}
                disabled={isSettingsLoading}
                className="flex-1 font-bold text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSettingsLoading}
                className="flex-1 bg-accent hover:bg-accent/80 text-accent-foreground font-black uppercase tracking-widest text-xs"
              >
                {isSettingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const bgImage = PlaceHolderImages.find(img => img.id === 'landing-bg');

  useEffect(() => {
    if (!auth || !db) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'user');
          }
        } catch (e) {}
      } else {
        setUser(null);
        setUserRole('user');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white font-headline font-black tracking-widest uppercase animate-pulse">Initializing Space...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-x-hidden bg-[#0D0D0F] dark">
      {/* Cinematic Background Wrapper */}
      <div className="fixed inset-0 z-0">
        <Image
          src={bgImage?.imageUrl || "https://picsum.photos/seed/friends-space/1920/1080"}
          alt="Cinematic background"
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      </div>

      <main className="relative z-10 w-full flex flex-col min-h-screen max-w-6xl mx-auto py-12 px-4 md:px-8">
        <div className="flex-1 flex flex-col items-center justify-start space-y-12">
          {!user ? (
            <div className="flex flex-col items-center space-y-12 w-full max-w-lg mt-12 md:mt-24">
              <div className="flex flex-col items-center space-y-6 text-center animate-fade-in">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/30 shadow-[0_0_50px_rgba(var(--primary),0.3)] backdrop-blur-md">
                  <MonitorPlay className="w-12 h-12 md:w-14 md:h-14 text-accent" />
                </div>
                <h1 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tighter uppercase leading-none">
                  SYNC<span className="text-accent">SPACE</span>
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-md mx-auto">
                  Sync your screen, share the moment. The ultimate destination for virtual watch parties.
                </p>
              </div>
              <AuthForm />
            </div>
          ) : (
            <AuthenticatedDashboard user={user} userRole={userRole} />
          )}
        </div>

        <footer className="mt-auto w-full pb-8 pt-12 flex flex-col items-center animate-fade-in delay-700">
          <p className="text-sm text-muted-foreground/60 font-bold mb-6 uppercase tracking-[0.2em] text-center">
            ✨ Powered by SyncSpace Template
          </p>
          <div className="flex justify-center items-center gap-10">
            <a href="#" className="text-muted-foreground/40 hover:text-white transition-all transform hover:scale-125"><Instagram className="w-7 h-7" /></a>
            <a href="#" className="text-muted-foreground/40 hover:text-white transition-all transform hover:scale-125"><Facebook className="w-7 h-7" /></a>
            <a href="#" className="text-muted-foreground/40 hover:text-white transition-all transform hover:scale-125"><MessageCircle className="w-7 h-7" /></a>
            <a href="#" className="text-muted-foreground/40 hover:text-white transition-all transform hover:scale-125">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 opacity-70 hover:opacity-100 transition-opacity"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z"/></svg>
            </a>
          </div>
        </footer>
      </main>

      <div className="fixed top-0 -left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 -right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />
    </div>
  );
                                         }
