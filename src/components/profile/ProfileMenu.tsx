'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase/provider';
import { signOut, updateProfile, User } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Edit, Settings, Loader2, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ProfileMenu({ user }: { user: User }) {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newName, setNewName] = useState(user.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!db || !user) return;
    const checkAdmin = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };
    checkAdmin();
  }, [db, user]);

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
  };

  const handleUpdateName = async () => {
    if (!auth || !db || !user || !newName.trim()) return;
    setIsUpdating(true);
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, { displayName: newName });
      
      // 2. Update Firestore User Document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { name: newName });

      toast({
        title: "Profile updated",
        description: "Your display name has been changed successfully.",
      });
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update profile.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="absolute top-6 left-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 w-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all p-0 shadow-2xl backdrop-blur-sm overflow-hidden ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar className="h-full w-full rounded-none">
                <AvatarFallback className="bg-primary/20 text-accent font-black text-lg">
                  {user.displayName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 glass-morphism border-white/10 text-white" align="start">
            <DropdownMenuLabel className="font-headline font-bold uppercase tracking-widest text-[10px] text-accent">
              User Profile
            </DropdownMenuLabel>
            <div className="px-2 py-3">
              <p className="font-bold text-sm truncate">{user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-white/5" />
            
            {isAdmin && (
              <>
                <DropdownMenuItem 
                  onClick={() => router.push('/admin')}
                  className="gap-2 cursor-pointer text-accent hover:bg-accent/10 focus:bg-accent/10"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="font-bold">Admin Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
              </>
            )}

            <DropdownMenuItem 
              onClick={() => setIsEditDialogOpen(true)}
              className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5"
            >
              <Edit className="w-4 h-4 text-accent" />
              <span>Edit Name</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="gap-2 cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-morphism border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold uppercase tracking-tight">Edit Display Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Name</Label>
              <Input 
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
                className="bg-white/5 border-white/10 text-white"
                disabled={isUpdating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateName} 
              disabled={isUpdating || !newName.trim()}
              className="w-full bg-primary hover:bg-primary/90 font-bold"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
