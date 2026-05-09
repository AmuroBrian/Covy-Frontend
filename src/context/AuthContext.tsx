import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';
import apiClient from '../api/axios';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  hasPartner: boolean;
  checkPartnerStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  hasPartner: false,
  checkPartnerStatus: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPartner, setHasPartner] = useState(false);

  const checkPartnerStatus = async () => {
    try {
      const response = await apiClient.get('/users/profile');
      if (response.data) {
        setProfile(response.data);
        if (response.data.coupleId) {
          setHasPartner(true);
        } else {
          setHasPartner(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch partner status:', error);
      setHasPartner(false);
    }
  };

  const syncUserWithBackend = async (currentSession: Session) => {
    try {
      // Send the Supabase JWT to the NestJS backend to sync the user profile
      await apiClient.post(
        '/auth/sync',
        {},
        {
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
        }
      );
      // After syncing, we set the default axios auth header
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentSession.access_token}`;
      await checkPartnerStatus();
    } catch (error) {
      console.error('Failed to sync user with backend:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        syncUserWithBackend(session).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        syncUserWithBackend(session);
      } else {
        delete apiClient.defaults.headers.common['Authorization'];
        setHasPartner(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, hasPartner, checkPartnerStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
