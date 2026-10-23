'use client';

import { useEffect, useState } from 'react';
import { getRefreshToken } from '@/lib/auth-token';

/**
 * Whether this browser holds a session, to show "Open Dashboard" instead of
 * "Login". Reads the stored refresh token only — it does not refresh it, so
 * visiting the home page never rotates tokens (ADR-015). Always false on the
 * server and the first client render, so hydration matches.
 */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(getRefreshToken() !== null), []);
  return signedIn;
}
