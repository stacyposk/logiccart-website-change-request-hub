'use client';

import { useEffect, useState } from 'react';

// Force static generation for S3 deployment
export const dynamic = 'force-static'

export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('Processing OAuth callback with authorization code...');
        
        // Debug information
        const debugInfo = {
          currentURL: window.location.href,
          hostname: window.location.hostname,
          origin: window.location.origin,
          timestamp: new Date().toISOString()
        };
        console.log('Auth Callback Debug Info:', debugInfo);

        const params = new URLSearchParams(window.location.search);
        
        // Handle Cognito error returns (prevents weird loops)
        const err = params.get('error');
        if (err) {
          console.error('Cognito error:', err, params.get('error_description'));
          setStatus('error');
          // Don't automatically retry - let user manually retry
          console.log('Authentication failed. Please try again manually.');
          return;
        }

        // Parse state to get random part and next parameter
        const stateParam = params.get('state') || '';
        let parsed = { s: '', next: '/' };
        try {
          parsed = JSON.parse(decodeURIComponent(stateParam));
        } catch (e) {
          console.error('Failed to parse state parameter:', e);
        }

        const savedState = sessionStorage.getItem('oauth_state');
        const code = params.get('code');
        const verifier = sessionStorage.getItem('pkce_verifier');

        if (!code || !parsed.s || parsed.s !== savedState || !verifier) {
          console.error('Invalid or expired OAuth flow', {
            hasCode: !!code,
            hasState: !!parsed.s,
            stateMatches: parsed.s === savedState,
            hasVerifier: !!verifier
          });
          setStatus('error');
          // Don't automatically retry - this prevents double authentication loops
          console.log('OAuth validation failed. Please try logging in again manually.');
          return;
        }

        // Use the next parameter from parsed state
        const nextParam = parsed.next || '/';

        console.log('Exchanging authorization code for tokens...');

        // Exchange code for tokens (no client secret; PKCE instead)
        const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'your-cognito-domain.auth.region.amazoncognito.com';
        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || 'your-cognito-client-id';

        // Build redirect_uri to exactly match what's configured in Cognito (constant, no query params)
        const url = new URL(window.location.href);
        const redirectUri = `${url.origin}/auth/callback`;
        
        // Debug redirect URI construction
        console.log('Token Exchange Debug:', {
          constructedRedirectUri: redirectUri,
          cognitoDomain: domain,
          clientId: clientId,
          hasCode: !!code,
          hasVerifier: !!verifier
        });

        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier
        });

        const response = await fetch(`https://${domain}/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          cache: 'no-store'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token exchange failed:', response.status, response.statusText, errorText);
          setStatus('error');
          // Don't automatically retry - this prevents double authentication loops
          console.log('Token exchange failed. Please try logging in again manually.');
          return;
        }

        const tokens = await response.json();
        console.log('Tokens received successfully');

        // Store tokens in sessionStorage for API calls (not cookies)
        const expiresIn = tokens.expires_in || 3600;
        sessionStorage.setItem('id_token', tokens.id_token || '');
        sessionStorage.setItem('access_token', tokens.access_token || '');
        sessionStorage.setItem('token_expires_at', (Date.now() + expiresIn * 1000).toString());

        // Set only lightweight session cookie for CloudFront Function
        document.cookie = `lc_session=1; Max-Age=${expiresIn}; Path=/; Secure; SameSite=Lax`;

        // Clean up PKCE session storage
        sessionStorage.removeItem('pkce_verifier');
        sessionStorage.removeItem('oauth_state');

        setStatus('success');

        // Redirect to original destination
        setTimeout(() => {
          window.location.replace(nextParam);
        }, 1500);

      } catch (error) {
        console.error('Error processing callback:', error);
        setStatus('error');
        // Don't automatically retry - this prevents double authentication loops
        console.log('Authentication processing failed. Please try logging in again manually.');
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(processCallback, 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <img
            src="/favicon.png"
            alt="LogicCart"
            className="h-16 w-16 mx-auto mb-6"
          />

          {status === 'processing' && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Signing you in...
              </h1>
              <p className="text-slate-600 mb-8">
                Please wait while we complete your authentication
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-green-500 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Authentication Successful!
              </h1>
              <p className="text-slate-600 mb-8">
                Redirecting you to the application...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-red-500 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Authentication Error
              </h1>
              <p className="text-slate-600 mb-6">
                Something went wrong during authentication. Please try logging in again.
              </p>
              <button
                onClick={() => window.location.replace('/auth/start')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}