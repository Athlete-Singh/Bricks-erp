'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/use-auth';
import { closeSupportSession } from '@/features/platform/api';
import { useActiveSupportSessionForMe } from '@/features/platform/hooks';
import { clearBackup, restorePlatformSession, restorePlatformTokens } from '@/lib/support-token-store';

export function truncateReason(reason: string, maxLength = 50): string {
  if (reason.length <= maxLength) return reason;
  return `${reason.slice(0, maxLength).trimEnd()}…`;
}

function formatCountdown(expiresAt: string | undefined, nowMs: number) {
  if (!expiresAt) return { text: '--:--:--', isExpired: false };
  const expiresAtMs = new Date(expiresAt).getTime();
  const diffMs = expiresAtMs - nowMs;
  if (diffMs <= 0) {
    return { text: '00:00:00', isExpired: true };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const text = [hours, minutes, seconds].map((v) => v.toString().padStart(2, '0')).join(':');
  return { text, isExpired: false };
}

export function SupportSessionBanner() {
  const router = useRouter();
  const { user, company } = useSession();
  const { activeSession, session } = useActiveSupportSessionForMe();
  const currentSession = session ?? activeSession;

  const [now, setNow] = useState(() => Date.now());
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Only render when the user has entered support mode with roleCode 'platform_support'
  if (user?.roleCode !== 'platform_support') {
    return null;
  }

  const tenantName = currentSession?.tenantName || company?.name || 'Tenant';
  const reasonText = currentSession?.reason ? truncateReason(currentSession.reason) : 'Active session';
  const countdown = formatCountdown(currentSession?.expiresAt, now);

  const handleCloseSession = async () => {
    setIsClosing(true);
    try {
      if (currentSession?.id) {
        await closeSupportSession(currentSession.id);
      }
    } catch {
      // Proceed with local token restoration even if backend session closing failed
    } finally {
      restorePlatformTokens();
      restorePlatformSession();
      clearBackup();
      router.push('/admin/tenants');
      setIsClosing(false);
    }
  };

  const handleReturnToAdmin = () => {
    restorePlatformSession();
    router.push('/admin/tenants');
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs sm:text-sm text-amber-950 dark:text-amber-200 shadow-sm"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Support session</span>
        </div>
        <span aria-hidden="true" className="text-amber-600/70 dark:text-amber-400/70">
          ·
        </span>
        <span className="font-medium text-foreground">{tenantName}</span>
        <span aria-hidden="true" className="text-amber-600/70 dark:text-amber-400/70">
          ·
        </span>
        <span
          className="truncate max-w-xs sm:max-w-md text-amber-900/90 dark:text-amber-200/90"
          title={currentSession?.reason}
        >
          {reasonText}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-amber-950 dark:text-amber-100">
          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <span>{countdown.text}</span>
          {countdown.isExpired && <span className="font-bold text-red-600 dark:text-red-400">(Expired)</span>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleReturnToAdmin}
            className="h-7 border-amber-600/40 bg-white/70 px-2.5 text-xs text-amber-950 hover:bg-amber-500/20 dark:bg-black/40 dark:text-amber-100"
          >
            Return to admin
          </Button>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isClosing}
            onClick={handleCloseSession}
            className="h-7 px-2.5 text-xs"
          >
            {isClosing ? 'Closing…' : 'Close session'}
          </Button>
        </div>
      </div>
    </div>
  );
}
