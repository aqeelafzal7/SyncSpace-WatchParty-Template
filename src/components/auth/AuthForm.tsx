'use client';

import React, { useState } from 'react';
import { useAuth, useFirestore } from '@/firebase/provider';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, LogIn, UserPlus, ArrowLeft, Send } from 'lucide-react';

export function AuthForm() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  // View States
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Form States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  // Reset States
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !db) return;
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        // New User via Google
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || 'Friend',
          email: user.email,
          role: 'user',
          hasSetCustomName: false,
          createdAt: serverTimestamp()
        });
        router.push('/onboarding');
      } else {
        // Existing User via Google
        const userData = docSnap.data();
        if (userData.hasSetCustomName === false) {
          router.push('/onboarding');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          setError("Please verify your email before logging in. Check your inbox.");
          await signOut(auth);
          setLoading(false);
          return;
        }

        // Check onboarding status
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().hasSetCustomName === false) {
          router.push('/onboarding');
        } else {
          router.push('/');
        }

      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: formData.fullName });

        // Create User Profile in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          uid: user.uid,
          name: formData.fullName,
          email: user.email,
          role: 'user',
          hasSetCustomName: false,
          createdAt: serverTimestamp()
        });
        
        await sendEmailVerification(user);
        
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account before logging in.",
        });
        
        await signOut(auth);
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !resetEmail.trim()) return;
    
    setResetLoading(true);
    setResetMessage(null);
    setResetError(null);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMessage("Check your inbox! We sent you a password reset link.");
      setResetEmail('');
    } catch (err: any) {
      console.error("Reset Password error:", err);
      setResetError("Error sending reset email. Please check the address.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md glass-morphism border-none shadow-2xl animate-fade-in overflow-hidden">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-headline font-bold text-white tracking-tight uppercase">
          {isForgotPassword 
            ? 'Reset Password' 
            : (isLogin ? 'Welcome Back' : 'Create Account')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isForgotPassword 
            ? "Enter your email and we'll send you a link to get back into your account."
            : (isLogin ? 'Sign in to access your watch parties.' : 'Join The Friends Space and start hosting today.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isForgotPassword ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70 flex items-center gap-2">
                  <Mail className="w-3 h-3 text-accent" />
                  Email Address
                </Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetLoading}
                  className="bg-white/5 border-white/10 h-11"
                />
              </div>

              {resetError && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-xs py-2">
                  <AlertDescription className="font-bold">{resetError}</AlertDescription>
                </Alert>
              )}

              {resetMessage && (
                <Alert className="bg-green-500/10 border-green-500/20 text-green-400 text-xs py-2">
                  <AlertDescription className="font-bold">{resetMessage}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                disabled={resetLoading || !resetEmail.trim()}
                className="w-full h-12 text-sm font-black uppercase tracking-widest bg-primary hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 gap-2"
              >
                {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send Reset Link
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetMessage(null);
                  setResetError(null);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-all flex items-center justify-center gap-2 mx-auto group"
              >
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* Google Sign In */}
            <Button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white text-gray-900 font-bold py-6 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-lg mb-4"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">or</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70 flex items-center gap-2">
                    <User className="w-3 h-3 text-accent" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="John Doe"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                    className="bg-white/5 border-white/10 h-11"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70 flex items-center gap-2">
                  <Mail className="w-3 h-3 text-accent" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="bg-white/5 border-white/10 h-11"
                />
              </div>
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70 flex items-center gap-2">
                    <Lock className="w-3 h-3 text-accent" />
                    Password
                  </Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] font-bold text-accent/70 hover:text-accent uppercase tracking-widest transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className="bg-white/5 border-white/10 h-11"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-xs py-2">
                  <AlertDescription className="font-bold">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 text-sm font-black uppercase tracking-widest bg-primary hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-all duration-300"
                >
                  {isLogin ? (
                    <>New to the Space? <span className="text-accent underline underline-offset-4">Create Account</span></>
                  ) : (
                    <>Member already? <span className="text-accent underline underline-offset-4">Sign In</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
