'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signOut, AuthUser } from 'aws-amplify/auth';
import { getTokenFromCookie, clearAuthCookies } from '@/lib/auth/token-capture';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      // First check if we have a cookie token (for edge authentication)
      const cookieToken = getTokenFromCookie('CognitoAuthIdToken');
      
      if (cookieToken) {
        setIsAuthenticated(true);
        // Try to get user info from Amplify
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          // If Amplify doesn't have the user but we have a cookie, 
          // we're still authenticated at the edge level
          console.log('Edge authenticated but Amplify needs refresh');
        }
      } else {
        // No cookie token, check Amplify
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch (error) {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      // Clear cookies first
      document.cookie = 'CognitoAuthIdToken=; Max-Age=0; Path=/';
      document.cookie = 'CognitoAuthAccessToken=; Max-Age=0; Path=/';
      
      // Clear any session storage
      sessionStorage.removeItem('pkce_verifier');
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_nonce');
      
      // Then sign out from Amplify
      try {
        await signOut();
      } catch (error) {
        // Amplify signout might fail if user wasn't signed in via Amplify
        console.log('Amplify signout not needed');
      }
      
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to Cognito logout URL
      const isDev = process.env.NODE_ENV === 'development';
      const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
      const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.replace('https://', '');
      const logoutUri = isDev 
        ? process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI_DEV || 'http://localhost:3000/' 
        : process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI_PROD || window.location.origin;
      
      if (!clientId || !cognitoDomain) {
        console.error('Missing Cognito configuration');
        return;
      }
      
      const logoutUrl = `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
      window.location.href = logoutUrl;
      
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}