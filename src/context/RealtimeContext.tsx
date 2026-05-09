import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { encryptPayload, decryptResponse } from '../utils/encryption.util';
import api from '../api/axios';

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (content: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  fetchMessageHistory: () => Promise<void>;
  messages: any[];
  partnerLocation: { lat: number; lng: number } | null;
  pingLocation: (lat: number, lng: number) => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  socket: null,
  isConnected: false,
  sendMessage: async () => {},
  reactToMessage: async () => {},
  fetchMessageHistory: async () => {},
  messages: [],
  partnerLocation: null,
  pingLocation: () => {},
});

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, hasPartner } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number} | null>(null);

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
        setPartnerLocation({ lat: location.lat, lng: location.lng });
      } catch (e) {
        console.error('Failed to handle incoming location', e);
      }
    });

    newSocket.on('message_reacted', (reactionData) => {
      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === reactionData.messageId) {
            const existingReactions = msg.reactions || [];
            // Remove existing reaction from this user if present
            const filtered = existingReactions.filter((r: any) => r.userId !== reactionData.userId);
            return { ...msg, reactions: [...filtered, reactionData] };
          }
          return msg;
        })
      );
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

  const sendMessage = async (content: string) => {
    try {
      // Optimistic update
      const tempId = Date.now().toString();
      const optimisticMsg = {
        id: tempId,
        content,
        senderId: profile?.id,
        createdAt: new Date().toISOString(),
        isRead: false,
        reactions: []
      };
      setMessages((prev) => [optimisticMsg, ...prev]);

      // Send via robust HTTP endpoint
      const response = await api.post('/chat', { content });
      
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
      // Optimistic update
      const optimisticReaction = { messageId, userId: profile?.id, emoji, createdAt: new Date().toISOString() };
      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === messageId) {
            const existingReactions = msg.reactions || [];
            const filtered = existingReactions.filter((r: any) => r.userId !== profile?.id);
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

  const pingLocation = async (lat: number, lng: number) => {
    if (!socket || !isConnected) return;
    const payload = await encryptPayload({ latitude: lat, longitude: lng });
    socket.emit('ping_location', payload);
  };

  return (
    <RealtimeContext.Provider value={{ 
      socket, 
      isConnected, 
      sendMessage, 
      reactToMessage, 
      fetchMessageHistory, 
      messages, 
      partnerLocation, 
      pingLocation 
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
