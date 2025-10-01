'use client'

import { useEffect } from 'react'

// Force static generation for S3 deployment
export const dynamic = 'force-static'

// PKCE helper functions
function b64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sha256(txt: string): Promise<string> {
  const data = new TextEncoder().encode(txt)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return b64url(new Uint8Array(hash))
}

export default function AuthStartPage() {
  useEffect(() => {
    const initiatePKCEFlow = async () => {
      try {
        console.log('Auth start page loaded, initiating PKCE flow...');
        // 1) Generate PKCE parameters
        const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)))
        const challenge = await sha256(verifier)
        
        // 2) Get next parameter (deep link)
        const urlParams = new URLSearchParams(window.location.search);
        const nextRaw = urlParams.get('next');
        const next = nextRaw ? decodeURIComponent(nextRaw) : '/';
        
        console.log('Auth start - next parameter:', next); // Debug log
        
        // 3) Create CSRF state
        const stateRandom = b64url(crypto.getRandomValues(new Uint8Array(16)))
        sessionStorage.setItem('oauth_state', stateRandom)
        
        // 4) Pack next into state (encode the whole thing as JSON)
        const state = encodeURIComponent(JSON.stringify({ s: stateRandom, next }))
        
        // 5) Store PKCE parameters in sessionStorage for security
        sessionStorage.setItem('pkce_verifier', verifier)
        
        // 5) Build Cognito authorize URL with PKCE parameters
        const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.replace('https://', '') 
        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID 
        
        // Support both dev and production environments
        const isDev = window.location.hostname === 'localhost';
        const redirectBase = isDev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_SITE_URL;
        
        // Keep redirect_uri constant (no query parameters)
        const redirectUri = encodeURIComponent(`${redirectBase}/auth/callback`)
        const scope = encodeURIComponent('openid email profile')

        // Debug information
        console.log('Auth Start Debug Info:', {
          isDev,
          hostname: window.location.hostname,
          redirectBase,
          decodedRedirectUri: `${redirectBase}/auth/callback`,
          encodedRedirectUri: redirectUri,
          cognitoDomain: domain,
          clientId,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL
        });

        const url = `https://${domain}/oauth2/authorize` +
          `?response_type=code&client_id=${clientId}` +
          `&redirect_uri=${redirectUri}&scope=${scope}` +
          `&state=${state}` +
          `&code_challenge=${challenge}&code_challenge_method=S256`
        
        console.log('Cognito Authorization URL:', url);

        // 4) Use window.location.replace() to redirect (no browser history)
        window.location.replace(url)
      } catch (error) {
        console.error('PKCE generation failed:', error)
        // Fallback: redirect to home page if PKCE generation fails
        window.location.replace('/')
      }
    }

    initiatePKCEFlow()
  }, [])

  // Minimal "Redirecting..." text only for cases where users see the page
  // This should be invisible - users should not see this page
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}