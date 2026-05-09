import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { encryptPayload, decryptResponse } from '../utils/encryption.util';
import api from '../api/axios';

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (content: string, replyToId?: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  fetchMessageHistory: () => Promise<void>;
  messages: any[];
  partnerLocation: { lat: number; lng: number; battery?: number; isCharging?: boolean } | null;
  partnerPresence: { isOnline: boolean; lastActive?: string } | null;
  pingLocation: (lat: number, lng: number, battery: number, isCharging: boolean) => void;
  lastSharedUpdate: number;
}

const RealtimeContext = createContext<RealtimeContextType>({
  socket: null,
  isConnected: false,
  sendMessage: async () => {},
  reactToMessage: async () => {},
  deleteMessage: async () => {},
  fetchMessageHistory: async () => {},
  messages: [],
  partnerLocation: null,
  partnerPresence: null,
  pingLocation: () => {},
  lastSharedUpdate: Date.now(),
});

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, hasPartner } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number, battery?: number, isCharging?: boolean} | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<{isOnline: boolean, lastActive?: string} | null>(null);
  const [lastSharedUpdate, setLastSharedUpdate] = useState<number>(Date.now());

  useEffect(() => {
    if (!session || !hasPartner) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://127.0.0.1:3000';
    
    // We send the Supabase JWT and the API key securely in the connection headers
    const newSocket = io(socketUrl, {
      extraHeaders: {
        Authorization: `Bearer ${session.access_token}`,
        'x-api-key': process.env.EXPO_PUBLIC_FRONTEND_API_KEY || '',
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to Covy Realtime Gateway');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Covy Realtime Gateway');
      setIsConnected(false);
    });

    newSocket.on('new_message', (message) => {
      try {
        setMessages((prev) => [message, ...prev]);
      } catch (e) {
        console.error('Failed to handle incoming message', e);
      }
    });

    newSocket.on('partner_location_update', (location) => {
      try {
        setPartnerLocation({ 
          lat: location.lat, 
          lng: location.lng, 
          battery: location.battery, 
          isCharging: location.isCharging 
        });
      } catch (e) {
        console.error('Failed to handle incoming location', e);
      }
    });

    newSocket.on('partner_presence', (presence) => {
      setPartnerPresence({ isOnline: presence.isOnline, lastActive: presence.lastActive });
    });

    newSocket.on('message_reacted', (reactionData) => {
      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === reactionData.messageId) {
            const existingReactions = msg.reactions || [];
            const filtered = existingReactions.filter((r: any) => r.userId !== reactionData.userId);
            if (reactionData.emoji === null) {
              return { ...msg, reactions: filtered };
            }
            return { ...msg, reactions: [...filtered, reactionData] };
          }
          return msg;
        })
      );
    });

    newSocket.on('message_deleted', (data) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    });

    newSocket.on('shared_space_update', () => {
      setLastSharedUpdate(Date.now());
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [session, hasPartner]);

  const fetchMessageHistory = async () => {
    try {
      const response = await api.get('/chat');
      if (response.data) {
        setMessages(response.data);
      }
    } catch (e) {
      console.error('Failed to fetch message history:', e);
    }
  };

  const sendMessage = async (content: string, replyToId?: string) => {
    try {
      // Optimistic update
      const tempId = Date.now().toString();
      const optimisticMsg = {
        id: tempId,
        content,
        senderId: profile?.id,
        createdAt: new Date().toISOString(),
        isRead: false,
        reactions: [],
        replyToId,
        replyTo: replyToId ? messages.find(m => m.id === replyToId) : null,
      };
      setMessages((prev) => [optimisticMsg, ...prev]);

      // Send via robust HTTP endpoint
      const response = await api.post('/chat', { content, replyToId });
      
      // Update optimistic message with real ID from DB
      if (response.data) {
        setMessages((prev) => prev.map((msg) => msg.id === tempId ? response.data : msg));
      }
    } catch (e) {
      console.error('Failed to send message via HTTP:', e);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((msg) => msg.content !== content));
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    try {
      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === messageId) {
            const existingReactions = msg.reactions || [];
            const existing = existingReactions.find((r: any) => r.userId === profile?.id);
            const filtered = existingReactions.filter((r: any) => r.userId !== profile?.id);
            
            if (existing && existing.emoji === emoji) {
               // Toggle off
               return { ...msg, reactions: filtered };
            }
            
            const optimisticReaction = { messageId, userId: profile?.id, emoji, createdAt: new Date().toISOString() };
            return { ...msg, reactions: [...filtered, optimisticReaction] };
          }
          return msg;
        })
      );

      await api.post(`/chat/${messageId}/react`, { emoji });
    } catch (e) {
      console.error('Failed to react to message:', e);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // Optimistic delete
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      await api.delete(`/chat/${messageId}`);
    } catch (e) {
      console.error('Failed to delete message:', e);
      // Revert optimism by fetching
      fetchMessageHistory();
    }
  };

  const pingLocation = async (lat: number, lng: number, battery: number, isCharging: boolean) => {
    if (!socket || !isConnected) return;
    socket.emit('ping_location', { lat, lng, battery, isCharging });
  };

  return (
    <RealtimeContext.Provider value={{ 
      socket, 
      isConnected, 
      sendMessage, 
      reactToMessage, 
      deleteMessage,
      fetchMessageHistory, 
      messages, 
      partnerLocation, 
      partnerPresence,
      pingLocation,
      lastSharedUpdate
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
