'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { firestore, useCollection } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users as UsersIcon, MessageCircle, Crown, UserMinus, ShieldCheck, Reply, X, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  roomId: string;
  roomData: any;
  user: { uid: string; displayName: string };
  roomRef: DocumentReference;
}

export function ChatSidebar({ roomId, roomData, user, roomRef }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemo(() => {
    if (!firestore || !roomId) return null;
    const q = query(
      collection(firestore, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    (q as any).__memo = true;
    return q;
  }, [roomId]);

  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !firestore || !user.uid) return;

    const messagesRef = collection(firestore, 'rooms', roomId, 'messages');
    
    const messageData: any = {
      roomId,
      senderName: user.displayName || 'Anonymous',
      senderId: user.uid,
      text: messageText,
      timestamp: serverTimestamp()
    };

    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderName
      };
    }

    addDocumentNonBlocking(messagesRef, messageData);

    setMessageText('');
    setReplyingTo(null);
  };

  const handleKick = (guestUid: string, guestName: string) => {
    if (!guestUid) return;

    const newRoles = { ...roomData.memberRoles };
    delete newRoles[guestUid];

    updateDocumentNonBlocking(roomRef, {
      memberRoles: newRoles,
      guests: roomData.guests?.filter((g: string) => g !== guestName) || []
    });
  };

  const handleMakeHost = (guestUid: string, guestName: string) => {
    if (!guestUid) return;
    if (!window.confirm("Are you sure you want to make this person the Host? You will lose your host controls.")) return;

    updateDocumentNonBlocking(roomRef, {
      hostId: guestUid,
      hostName: guestName,
      memberRoles: {
        ...roomData.memberRoles,
        [user.uid]: 'guest',
        [guestUid]: 'host'
      },
      guests: [...(roomData.guests?.filter((g: string) => g !== guestName) || []), user.displayName]
    });
  };

  const allMembers = useMemo(() => {
    return Object.entries(roomData.memberRoles || {}).map(([uid, role]) => ({
      id: uid,
      role: role as string,
    }));
  }, [roomData.memberRoles]);

  const isAdmin = roomData.globalRoles?.[user.uid] === 'admin';
  const isHost = user.uid === roomData.hostId;
  const isPrivileged = isAdmin || isHost;

  const displayedMembers = useMemo(() => {
    if (roomData.hideMemberList && !isPrivileged) {
      return allMembers.filter(m => m.id === user.uid || m.id === roomData.hostId);
    }
    return allMembers;
  }, [allMembers, roomData.hideMemberList, isPrivileged, user.uid, roomData.hostId]);

  const isChatMuted = roomData.hostOnlyChat && !isPrivileged;

  return (
    <div className="flex flex-col flex-1 h-full max-h-full bg-[#0D0D0F] overflow-hidden min-h-0">
      {/* Tab Switcher */}
      <div className="flex-shrink-0 p-4 border-b border-white/5 bg-black/40">
        <div className="grid w-full grid-cols-2 bg-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all",
              activeTab === 'chat' 
                ? "bg-accent text-accent-foreground shadow-lg" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </button>
          <button 
            onClick={() => setActiveTab('participants')}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all",
              activeTab === 'participants' 
                ? "bg-accent text-accent-foreground shadow-lg" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <UsersIcon className="w-4 h-4" />
            Party
            <Badge variant="secondary" className="ml-1 bg-white/10 text-[10px]">
              {(roomData.guests?.length || 0) + 1}
            </Badge>
          </button>
        </div>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        {activeTab === 'chat' ? (
          <div className="flex flex-col h-full w-full min-h-0">
            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages?.map((msg) => {
                const timeString = msg.timestamp?.toDate 
                  ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
                  : '';

                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center w-full my-4">
                      <div className="text-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] px-4 py-1.5 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm italic">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex flex-col group ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {msg.senderName}
                      </span>
                      {msg.senderId === roomData.hostId && (
                        <Crown className="w-3 h-3 text-yellow-500" />
                      )}
                      {roomData.globalRoles?.[msg.senderId] === 'admin' && (
                        <Crown className="w-3 h-3 text-accent" />
                      )}
                      <span className="text-[9px] text-muted-foreground/40 font-mono ml-1">
                        {timeString}
                      </span>
                      {!isChatMuted && (
                        <button 
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-white"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {msg.replyTo && (
                      <div className={`mb-1 p-2 border-l-2 bg-white/5 text-[11px] rounded-r-md max-w-[80%] ${
                        msg.senderId === user?.uid ? 'border-primary' : 'border-accent'
                      }`}>
                        <p className="font-bold opacity-60 mb-0.5">{msg.replyTo.senderName}</p>
                        <p className="truncate opacity-80">{msg.replyTo.text}</p>
                      </div>
                    )}

                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.senderId === user?.uid 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-white/5 text-white rounded-tl-none border border-white/10'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Reply Preview */}
            {replyingTo && (
              <div className="flex-shrink-0 px-4 py-2 bg-white/10 border-t border-white/5 flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Replying to {replyingTo.senderName}</span>
                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">{replyingTo.text}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="mt-auto shrink-0 p-3 bg-gray-900 border-t border-gray-800 backdrop-blur-xl">
              <div className="flex gap-2">
                <Input 
                  placeholder={isChatMuted ? "🔇 The host has temporarily paused the chat." : "Type a message..."} 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={isChatMuted}
                  className="bg-white/5 border-white/10 focus-visible:ring-accent h-11"
                />
                <Button type="submit" size="icon" disabled={isChatMuted} className="bg-accent hover:bg-accent/80 text-accent-foreground h-11 w-11">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* Party List */
          <div className="h-full w-full overflow-y-auto p-4 min-h-0 custom-scrollbar">
            <div className="space-y-6 pb-24">
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Host</h3>
                <div className="flex items-center justify-between p-3 bg-accent/10 border border-accent/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-accent">
                        <AvatarFallback className="bg-accent/20 text-accent font-bold">
                          {roomData.hostName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {roomData.globalRoles?.[roomData.hostId] === 'admin' && (
                        <Crown className="absolute -top-2 -right-2 w-4 h-4 text-accent fill-accent" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{roomData.hostName}</p>
                      <p className="text-[10px] text-accent font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        MASTER
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Guests</h3>
                <div className="space-y-2">
                  {(() => {
                    // Extract only the guests and match them with the guest names array
                    const guestsOnly = displayedMembers.filter(m => m.id !== roomData.hostId);
                    const guestNamesArray = roomData.guests?.filter((g: string) => g !== roomData.hostName) || [];

                    if (guestsOnly.length === 0) {
                      return <p className="text-sm text-muted-foreground italic px-1 py-4">No one else has joined yet...</p>;
                    }

                    return guestsOnly.map((member, index) => {
                      const uid = member.id;
                      // Accurately map the name using the index, fallback to "Guest" just in case
                      const guestName = roomData.memberNames?.[uid] || guestNamesArray[index] || "Guest";
                      
                      return (
                        <div key={uid} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl group transition-all hover:bg-white/10">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-white/10">{guestName[0]}</AvatarFallback>
                              </Avatar>
                              {roomData.globalRoles?.[uid] === 'admin' && (
                                <Crown className="absolute -top-2 -right-2 w-3 h-3 text-accent fill-accent" />
                              )}
                            </div>
                            <p className="font-medium text-sm">{guestName}</p>
                          </div>
                          {isPrivileged && (
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-muted-foreground hover:text-white"
                                onClick={() => handleMakeHost(uid, guestName)}
                              >
                                <Crown className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleKick(uid, guestName)}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  
                  {roomData.hideMemberList && !isPrivileged && (
                    <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground/40 italic">
                      <EyeOff className="w-3.5 h-3.5" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">The host has hidden the full guest list</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
      }
