// TypeScript declaration for Google API
declare global {
  interface Window {
    google: any;
  }
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

let tokenClient: any = null;

/**
 * Dynamically load Google Identity Services script
 */
export const loadGoogleScripts = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google client script. Check network connection.'));
    document.body.appendChild(script);
  });
};

/**
 * Initialize OAuth2 Token Client
 */
export const initGoogleAuth = (
  clientId: string,
  onTokenResponse: (response: TokenResponse) => void,
  onError?: (err: any) => void
): void => {
  if (!window.google?.accounts?.oauth2) {
    if (onError) onError(new Error('Google Identity Services script not loaded.'));
    return;
  }

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      // Request access to read/write/modify messages and view/create basic filters
      scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.settings.basic',
      callback: (response: any) => {
        if (response.error) {
          if (onError) onError(response);
        } else {
          onTokenResponse(response);
        }
      },
    });
  } catch (error) {
    if (onError) onError(error);
  }
};

/**
 * Trigger OAuth 2.0 Flow popup
 */
export const loginGoogle = (): void => {
  if (!tokenClient) {
    throw new Error('OAuth Client is not initialized. Please configure your Google Client ID in settings first.');
  }
  tokenClient.requestAccessToken({ prompt: '' });
};

/**
 * Revoke and clean up token
 */
export const logoutGoogle = (accessToken: string): void => {
  if (accessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Google Access token revoked successfully.');
      });
    } catch (e) {
      console.error('Failed to revoke Google token:', e);
    }
  }
};
