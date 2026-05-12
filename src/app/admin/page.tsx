'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { 
  Users, 
  MonitorPlay, 
  History, 
  ArrowLeft, 
  ExternalLink, 
  Loader2, 
  ShieldCheck, 
  LayoutDashboard, 
  BarChart3, 
  Menu, 
  Settings, 
  ChevronRight, 
  Save,
  AlertTriangle,
  CheckCircle2,
  Hammer,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Search States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  // System Settings State
  const [systemLoading, setSystemLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  // The Kill Switch queries (Real-Time Lists)
  const usersQuery = useMemo(() => {
    if (!db || isAdmin !== true || !auth.currentUser) return null;
    return collection(db, 'users');
  }, [db, isAdmin, auth.currentUser]);

  const roomsQuery = useMemo(() => {
    if (!db || isAdmin !== true || !auth.currentUser) return null;
    return collection(db, 'rooms');
  }, [db, isAdmin, auth.currentUser]);

  const { data: allUsers } = useCollection(usersQuery);
  const { data: allRooms } = useCollection(roomsQuery);

  useEffect(() => {
    if (!auth || !db) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            router.push('/');
          }
        } catch (e) {
          setIsAdmin(false);
          router.push('/');
        }
      } else {
        setIsAdmin(false);
        router.push('/');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db, router]);

  // Fetch System Settings
  useEffect(() => {
    if (!db || isAdmin !== true) return;
    const systemDocRef = doc(db, 'settings', 'system');
    const unsubscribe = onSnapshot(systemDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMaintenanceMode(data.isMaintenance || false);
        setMaintenanceMessage(data.maintenanceMessage || '');
      }
    });
    return () => unsubscribe();
  }, [db, isAdmin]);

  const handleSaveSystemSettings = async () => {
    if (!db || isAdmin !== true) return;
    setSystemLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        isMaintenance: maintenanceMode,
        maintenanceMessage: maintenanceMessage
      }, { merge: true });
      
      toast({
        title: "Settings Saved",
        description: "Global system configuration has been updated successfully.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: e.message || "Failed to update system settings."
      });
    } finally {
      setSystemLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!allUsers || !allRooms) return { totalUsers: 0, activeRooms: 0, pastRooms: 0 };
    return {
      totalUsers: allUsers.length,
      activeRooms: allRooms.filter(r => r.status === 'active').length,
      pastRooms: allRooms.filter(r => r.status === 'ended').length,
    };
  }, [allUsers, allRooms]);

  // Sorting and Filtering Logic
  const sortedAndFilteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers
      .filter((user: any) => 
        user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
      )
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
  }, [allUsers, userSearchQuery]);

  const sortedAndFilteredRooms = useMemo(() => {
    if (!allRooms) return [];
    return allRooms
      .filter((room: any) => 
        room.roomName?.toLowerCase().includes(roomSearchQuery.toLowerCase()) || 
        room.hostName?.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
        room.id?.toLowerCase().includes(roomSearchQuery.toLowerCase())
      )
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
  }, [allRooms, roomSearchQuery]);

  if (isAuthLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white font-headline font-black tracking-widest uppercase animate-pulse">Verifying Credentials...</p>
      </div>
    );
  }

  const SidebarItem = ({ name, icon: Icon, active }: { name: string, icon: any, active: boolean }) => (
    <button onClick={() => setActiveTab(name)} className={cn("flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group", active ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20 font-bold" : "text-muted-foreground hover:bg-white/5 hover:text-white")}>
      <Icon className={cn("w-5 h-5", active ? "text-accent-foreground" : "text-accent group-hover:scale-110 transition-transform")} />
      <span className="text-sm tracking-tight">{name}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-foreground animate-pulse" />}
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-body">
      <aside className={cn("bg-gray-900 border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out", isSidebarOpen ? "w-64 p-6" : "w-0 p-0 overflow-hidden border-none")}>
        <div className="flex items-center gap-3 px-2 mb-8">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <h2 className="text-lg font-black uppercase tracking-tighter">Admin <span className="text-accent">Portal</span></h2>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarItem name="Overview" icon={LayoutDashboard} active={activeTab === 'Overview'} />
          <SidebarItem name="All Rooms" icon={MonitorPlay} active={activeTab === 'All Rooms'} />
          <SidebarItem name="Users" icon={Users} active={activeTab === 'Users'} />
          <SidebarItem name="System" icon={Settings} active={activeTab === 'System'} />
        </nav>
        <div className="space-y-4">
          <Separator className="bg-white/5" />
          <Button variant="ghost" onClick={() => router.push('/')} className="w-full justify-start gap-3 h-12 px-4"><ArrowLeft className="w-5 h-5 text-accent" />Back to App</Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu className="w-6 h-6 text-accent" /></Button>
            <h1 className="text-4xl font-headline font-black uppercase tracking-tighter">{activeTab} <span className="text-accent">{activeTab === 'Overview' ? 'Center' : 'Module'}</span></h1>
          </div>

          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-morphism border-none text-white p-6">
                <Users className="w-5 h-5 text-accent mb-2" />
                <span className="text-3xl font-black block">{stats.totalUsers}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Users</span>
              </Card>
              <Card className="glass-morphism border-none text-white p-6">
                <MonitorPlay className="w-5 h-5 text-green-500 mb-2" />
                <span className="text-3xl font-black block">{stats.activeRooms}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Live Parties</span>
              </Card>
              <Card className="glass-morphism border-none text-white p-6">
                <History className="w-5 h-5 text-primary mb-2" />
                <span className="text-3xl font-black block">{stats.pastRooms}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ended Sessions</span>
              </Card>
            </div>
          )}
          
          {activeTab === 'System' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="glass-morphism border-none text-white overflow-hidden p-8 space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-accent mb-2">
                    <Hammer className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase tracking-tight">Maintenance Controls</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Toggle maintenance mode to restrict non-admin access while performing updates.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                   <div className="space-y-0.5">
                     <Label className="text-sm font-bold">Global Maintenance Mode</Label>
                     <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Admins can always bypass this</p>
                   </div>
                   <Switch 
                     checked={maintenanceMode} 
                     onCheckedChange={setMaintenanceMode} 
                     className="data-[state=checked]:bg-accent"
                   />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70">Custom Maintenance Message</Label>
                  <Textarea 
                    placeholder="We'll be right back! We're performing a cinematic update..."
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    className="bg-white/5 border-white/10 min-h-[120px] focus:ring-accent"
                  />
                </div>

                <Button 
                  onClick={handleSaveSystemSettings}
                  disabled={systemLoading}
                  className="w-full h-14 bg-accent hover:bg-accent/80 text-accent-foreground font-black uppercase tracking-widest text-xs gap-3"
                >
                  {systemLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save System Configuration
                </Button>
              </Card>

              <div className="space-y-6">
                <Card className="bg-amber-500/10 border border-amber-500/20 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-amber-500 uppercase tracking-tight">Caution</h4>
                      <p className="text-sm text-amber-200/70">Enabling maintenance mode will immediately lock all active rooms and prevent new users from entering the dashboard. Use this only for critical updates.</p>
                    </div>
                  </div>
                </Card>

                <Card className="glass-morphism border-none text-white p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-xl text-green-500">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-green-500 uppercase tracking-tight">Admin Status</h4>
                      <p className="text-sm text-green-200/70">Your admin role allows you to bypass maintenance screens. You will see a small "Admin Bypass" indicator on the dashboard when maintenance is active.</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'All Rooms' && (
            <div className="space-y-4">
              {/* Search Bar for Rooms */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by Room ID, Name, or Host..." 
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="bg-white/5 border-white/10 pl-10 focus:ring-accent"
                />
              </div>

              <Card className="glass-morphism border-none text-white overflow-hidden">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Room Info</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Attendees</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredRooms.map((room) => (
                      <TableRow key={room.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                           <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-widest", room.status === 'active' ? 'border-green-500/50 text-green-500 bg-green-500/10' : 'border-muted-foreground/30 text-muted-foreground bg-white/5')}>
                             {room.status || 'ended'}
                           </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold">{room.roomName || 'Untitled Room'}</p>
                            <p className="text-[10px] opacity-50 font-mono">ID: {room.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{room.hostName}</TableCell>
                        <TableCell className="font-mono">{room.allTimeMembers?.length || (room.guests?.length || 0) + 1}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" onClick={() => router.push(`/room/${room.id}`)}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedAndFilteredRooms.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                          No rooms found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'Users' && (
            <div className="space-y-4">
              {/* Search Bar for Users */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by Name or Email..." 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="bg-white/5 border-white/10 pl-10 focus:ring-accent"
                />
              </div>

              <Card className="glass-morphism border-none text-white overflow-hidden">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredUsers.map((user) => (
                      <TableRow key={user.uid} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div>
                            <p className="font-bold">{user.name}</p>
                            <p className="text-[10px] opacity-50">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-[10px] font-bold uppercase tracking-widest", user.role === 'admin' ? 'bg-accent/20 text-accent border border-accent/20' : 'bg-white/5')}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs opacity-50 font-mono">
                          {user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedAndFilteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
