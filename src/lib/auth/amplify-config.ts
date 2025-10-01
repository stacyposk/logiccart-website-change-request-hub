import { Amplify } from 'aws-amplify';

const isDev = process.env.NODE_ENV === 'development';

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!.replace('https://', ''),
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            isDev
              ? 'http://localhost:3000/auth/callback'
              : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-cloudfront-domain.cloudfront.net'}/auth/callback`
          ],
          redirectSignOut: [
            isDev
              ? 'http://localhost:3000/'
              : process.env.NEXT_PUBLIC_SITE_URL || 'https://your-cloudfront-domain.cloudfront.net/'
          ],
          responseType: 'code' as const
        }
      }
    }
  }
};

Amplify.configure(amplifyConfig);

export default amplifyConfig;