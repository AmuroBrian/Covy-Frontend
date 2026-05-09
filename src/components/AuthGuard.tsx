import React, { useEffect } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading, hasPartner } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial auth check and backend sync completes
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoginScreen = segments[1] === 'login';
    const isInviteScreen = segments[1] === 'invite';
    const isOnboardingScreen = segments[1] === 'onboarding';

    if (!session) {
      // If no session and we are not already on the login screen, kick to login
      if (!inAuthGroup || isInviteScreen || isOnboardingScreen) {
        router.replace('/(auth)/login');
      }
    } else {
      // User has a session, check if profile is complete
      const hasCompleteProfile = profile && profile.displayName;

      if (!hasCompleteProfile) {
        // Must complete profile before doing anything else
        if (!isOnboardingScreen) {
          router.replace('/(auth)/onboarding');
        }
      } else {
        // Profile is complete, check partner status
        if (!hasPartner) {
          if (!isInviteScreen) {
            router.replace('/(auth)/invite');
          }
        } else {
          if (!segments[0]?.startsWith('(main)')) {
            router.replace('/(main)/tabs/map');
          }
        }
      }
    }
  }, [session, profile, isLoading, hasPartner, segments]);

  return <>{children}</>;
}
