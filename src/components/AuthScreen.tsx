
"use client";

import React from 'react';
import AuthDisplay from './AuthDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2 } from 'lucide-react';

interface AuthScreenProps {
  loadingAuth: boolean; // Though AuthDisplay doesn't use it, pass for consistency
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnon: () => Promise<void>;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  loadingAuth,
  signUp,
  signIn,
  signInAnon,
}) => {
  return (
    <AuthDisplay
      user={null} // AuthScreen is for non-authenticated users
      loadingAuth={loadingAuth}
      signUp={signUp}
      signIn={signIn}
      signInAnon={signInAnon}
      signOut={() => Promise.resolve()} // Dummy signOut, not used when user is null
    />
  );
};

export default AuthScreen;
