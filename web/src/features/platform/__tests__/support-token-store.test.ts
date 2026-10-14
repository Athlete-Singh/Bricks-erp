import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, getRefreshToken, clearTokens } from '@/lib/auth-token';
import { useAuthStore } from '@/stores/auth-store';
import {
  backupPlatformTokens,
  clearBackup,
  hasPlatformBackup,
  restorePlatformSession,
  restorePlatformTokens,
  type PlatformTokens,
} from '@/lib/support-token-store';

function createMockJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = 'sig_mock_123';
  return `${header}.${payload}.${signature}`;
}

describe('support-token-store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    clearTokens();
    useAuthStore.getState().reset();
    vi.restoreAllMocks();
  });

  describe('backupPlatformTokens', () => {
    it('stores the platform tokens in sessionStorage as JSON', () => {
      const tokens: PlatformTokens = {
        accessToken: 'platform_access_token_1',
        refreshToken: 'platform_refresh_token_1',
      };

      backupPlatformTokens(tokens);

      const stored = sessionStorage.getItem('brics_platform_tokens_backup');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(tokens);
    });

    it('handles sessionStorage throwing an exception without crashing', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError or security block');
      });

      expect(() => {
        backupPlatformTokens({
          accessToken: 'tok_a',
          refreshToken: 'tok_r',
        });
      }).not.toThrow();
    });
  });

  describe('restorePlatformTokens', () => {
    it('reads and returns the backed-up tokens from sessionStorage', () => {
      const tokens: PlatformTokens = {
        accessToken: 'access_abc',
        refreshToken: 'refresh_xyz',
      };
      sessionStorage.setItem('brics_platform_tokens_backup', JSON.stringify(tokens));

      const restored = restorePlatformTokens();
      expect(restored).toEqual(tokens);
    });

    it('returns null if no backup exists in sessionStorage', () => {
      expect(restorePlatformTokens()).toBeNull();
    });

    it('returns null if stored JSON is corrupted', () => {
      sessionStorage.setItem('brics_platform_tokens_backup', 'invalid-json{{');
      expect(restorePlatformTokens()).toBeNull();
    });

    it('returns null if stored object is missing accessToken or refreshToken', () => {
      sessionStorage.setItem('brics_platform_tokens_backup', JSON.stringify({ accessToken: 'only_access' }));
      expect(restorePlatformTokens()).toBeNull();

      sessionStorage.setItem('brics_platform_tokens_backup', JSON.stringify({ refreshToken: 'only_refresh' }));
      expect(restorePlatformTokens()).toBeNull();
    });

    it('handles sessionStorage.getItem throwing an exception gracefully', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(restorePlatformTokens()).toBeNull();
    });
  });

  describe('clearBackup', () => {
    it('removes the backed-up tokens from sessionStorage', () => {
      sessionStorage.setItem(
        'brics_platform_tokens_backup',
        JSON.stringify({ accessToken: 'tok1', refreshToken: 'tok2' }),
      );

      clearBackup();
      expect(sessionStorage.getItem('brics_platform_tokens_backup')).toBeNull();
    });

    it('handles sessionStorage.removeItem throwing an exception gracefully', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(() => clearBackup()).not.toThrow();
    });
  });

  describe('hasPlatformBackup', () => {
    it('returns true when backup tokens exist and are valid', () => {
      expect(hasPlatformBackup()).toBe(false);

      sessionStorage.setItem(
        'brics_platform_tokens_backup',
        JSON.stringify({ accessToken: 'acc', refreshToken: 'ref' }),
      );
      expect(hasPlatformBackup()).toBe(true);
    });

    it('returns false when no backup or invalid backup exists', () => {
      sessionStorage.setItem('brics_platform_tokens_backup', JSON.stringify({}));
      expect(hasPlatformBackup()).toBe(false);
    });
  });

  describe('restorePlatformSession', () => {
    it('returns false when no backup tokens are stored', () => {
      const result = restorePlatformSession();
      expect(result).toBe(false);
    });

    it('restores tokens into auth custody, decodes JWT, and sets useAuthStore', () => {
      const jwtClaims = {
        sub: 'user_platform_admin_42',
        email: 'support@brics.test',
        mobile: '9876543210',
        name: 'Support Officer',
        roleCode: 'platform_support',
        permissions: ['platform.tenants.view', 'platform.tenants.suspend'],
        isSuperAdmin: false,
      };

      const accessToken = createMockJwt(jwtClaims);
      const refreshToken = 'platform_refresh_secret';

      sessionStorage.setItem('brics_platform_tokens_backup', JSON.stringify({ accessToken, refreshToken }));

      // Pre-set some tenant company in auth store to verify it gets cleared
      useAuthStore.setState({
        status: 'authenticated',
        company: { id: 'tenant_co_1', name: 'Kiln 1', gstin: null, stateCode: '09', gstScheme: 'regular_12_itc' },
        sites: [{ id: 'site_1', name: 'Site 1', code: 'S1', type: 'kiln' }],
        activeSiteId: 'site_1',
      });

      const success = restorePlatformSession();
      expect(success).toBe(true);

      // Tokens should be loaded into auth token custody
      expect(getAccessToken()).toBe(accessToken);
      expect(getRefreshToken()).toBe(refreshToken);

      // Auth store should reflect the platform admin user and clear tenant company info
      const authState = useAuthStore.getState();
      expect(authState.status).toBe('authenticated');
      expect(authState.user).toEqual({
        id: 'user_platform_admin_42',
        email: 'support@brics.test',
        mobile: '9876543210',
        name: 'Support Officer',
        roleCode: 'platform_support',
        permissions: ['platform.tenants.view', 'platform.tenants.suspend'],
        isSuperAdmin: false,
      });
      expect(authState.company).toBeNull();
      expect(authState.sites).toEqual([]);
      expect(authState.activeSiteId).toBeNull();
    });

    it('still returns true and sets tokens even if JWT decoding encounters malformed payload', () => {
      const badAccessToken = 'header.not_valid_base64!@#.signature';
      const refreshToken = 'refresh_valid';

      sessionStorage.setItem(
        'brics_platform_tokens_backup',
        JSON.stringify({ accessToken: badAccessToken, refreshToken }),
      );

      const success = restorePlatformSession();
      expect(success).toBe(true);
      expect(getAccessToken()).toBe(badAccessToken);
      expect(getRefreshToken()).toBe(refreshToken);
    });
  });
});
