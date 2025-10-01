'use client';

import { signInWithRedirect } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';

export function AuthButton() {
  const handleSignIn = async () => {
    try {
      await signInWithRedirect();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <img 
            src="/favicon.png" 
            alt="LogicCart" 
            className="h-16 w-16 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            LogicCart Management Hub
          </h1>
          <p className="text-slate-600 mb-8">
            Please sign in to access the website change request system
          </p>
          <Button 
            onClick={handleSignIn}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Sign In with Cognito
          </Button>
        </div>
      </div>
    </div>
  );
}