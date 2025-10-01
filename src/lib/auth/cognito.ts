// AWS Cognito authentication utilities
// Streamlined approach using Hosted UI for enterprise-grade auth

interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  domain: string;
  redirectUri: string;
  logoutUri: string;
}

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface UserInfo {
  email: string;
  name: string;
  sub: string;
}

class CognitoAuth {
  private config: CognitoConfig;

  constructor() {
    this.config = {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
      domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
      redirectUri: this.getRedirectUri(),
      logoutUri: this.getLogoutUri(),
    };

    if (!this.config.userPoolId || !this.config.clientId || !this.config.domain) {
      console.warn('Cognito configuration incomplete. Check environment variables.');
    }
  }

  private getRedirectUri(): string {
    if (typeof window === 'undefined') return '';
    
    // Use CloudFront-only configuration for production deployment
    return process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  }

  private getLogoutUri(): string {
    if (typeof window === 'undefined') return '';
    
    // Use CloudFront-only configuration for production deployment
    return process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || window.location.origin;
  }

  /**
   * Redirect to Cognito Hosted UI for sign in
   */
  signIn(): void {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: this.config.redirectUri,
    });

    const signInUrl = `${this.config.domain}/login?${params.toString()}`;
    window.location.href = signInUrl;
  }

  /**
   * Sign out and redirect to Cognito Hosted UI logout
   */
  signOut(): void {
    // Clear local tokens
    this.clearTokens();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      logout_uri: this.config.logoutUri,
    });

    const signOutUrl = `${this.config.domain}/logout?${params.toString()}`;
    window.location.href = signOutUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    const tokenEndpoint = `${this.config.domain}/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code: code,
      redirect_uri: this.config.redirectUri,
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      
      const tokens: AuthTokens = {
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      // Store tokens in sessionStorage
      this.storeTokens(tokens);
      
      return tokens;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Get stored tokens from sessionStorage
   */
  getTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem('cognito_tokens');
      if (!stored) return null;

      const tokens: AuthTokens = JSON.parse(stored);
      
      // Check if tokens are expired
      if (Date.now() >= tokens.expiresAt) {
        this.clearTokens();
        return null;
      }

      return tokens;
    } catch (error) {
      console.error('Error reading tokens:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Store tokens in sessionStorage
   */
  private storeTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('cognito_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  /**
   * Clear tokens from sessionStorage
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem('cognito_tokens');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Get user info from ID token
   */
  getUserInfo(): UserInfo | null {
    const tokens = this.getTokens();
    if (!tokens) return null;

    try {
      // Decode ID token (JWT) - note: this doesn't verify signature
      const payload = this.decodeJWT(tokens.idToken);
      
      return {
        email: payload.email || '',
        name: payload.name || payload.email || '',
        sub: payload.sub || '',
      };
    } catch (error) {
      console.error('Error decoding user info:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getTokens() !== null;
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens ? tokens.accessToken : null;
  }

  /**
   * Simple JWT decoder (doesn't verify signature)
   */
  private decodeJWT(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('JWT decode error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<AuthTokens | null> {
    const tokens = this.getTokens();
    if (!tokens || !tokens.refreshToken) {
      return null;
    }

    const tokenEndpoint = `${this.config.domain}/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: tokens.refreshToken,
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        // Refresh failed, clear tokens and require re-login
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      
      const newTokens: AuthTokens = {
        accessToken: data.access_token,
        idToken: data.id_token || tokens.idToken, // ID token might not be refreshed
        refreshToken: data.refresh_token || tokens.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      this.storeTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      return null;
    }
  }
}

// Export singleton instance
export const cognitoAuth = new CognitoAuth();

// Export types for use in components
export type { AuthTokens, UserInfo };