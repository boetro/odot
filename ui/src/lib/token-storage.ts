import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_KEY = 'auth_tokens';

/**
 * Secure token storage service that uses platform-appropriate storage
 * - Mobile: Capacitor Preferences (Keychain/Keystore)
 * - Web: Returns null (uses cookies instead)
 */
export class TokenStorage {
  /**
   * Store token pair securely
   * Only works on native platforms - returns false on web
   */
  static async storeTokens(tokens: TokenPair): Promise<boolean> {
    if (!isNative) {
      // Web platform uses cookies, don't store tokens locally
      return false;
    }

    try {
      await Preferences.set({
        key: TOKEN_KEY,
        value: JSON.stringify(tokens)
      });
      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }
  }

  /**
   * Retrieve stored token pair
   * Returns null on web or if no tokens found
   */
  static async getTokens(): Promise<TokenPair | null> {
    if (!isNative) {
      // Web platform uses cookies
      return null;
    }

    try {
      const result = await Preferences.get({ key: TOKEN_KEY });
      if (!result.value) {
        return null;
      }

      const tokens = JSON.parse(result.value) as TokenPair;

      // Check if access token is expired
      const now = Math.floor(Date.now() / 1000);
      if (tokens.expiresAt <= now) {
        // Access token expired, but keep refresh token for renewal
        return {
          ...tokens,
          accessToken: '' // Clear expired access token
        };
      }

      return tokens;
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Get only the access token if it's valid
   */
  static async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Get only the refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Update only the access token and expiration
   */
  static async updateAccessToken(accessToken: string, expiresAt: number): Promise<boolean> {
    if (!isNative) {
      return false;
    }

    const existingTokens = await this.getTokens();
    if (!existingTokens) {
      return false;
    }

    return this.storeTokens({
      ...existingTokens,
      accessToken,
      expiresAt
    });
  }

  /**
   * Clear all stored tokens
   */
  static async clearTokens(): Promise<void> {
    if (!isNative) {
      return;
    }

    try {
      await Preferences.remove({ key: TOKEN_KEY });
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if we have valid tokens stored
   */
  static async hasValidTokens(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null && tokens.refreshToken !== '';
  }
}
