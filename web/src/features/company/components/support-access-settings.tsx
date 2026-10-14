'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, Shield, ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { messageOf } from '@/features/auth/use-auth';
import type { Company, GrantSupportAccessResult } from '../api';
import { useGrantSupportAccess, useRevokeSupportAccess, useUpdateCompany } from '../hooks';

export interface SupportAccessSettingsProps {
  company: Company;
  canEdit: boolean;
}

/**
 * SupportAccessSettings (PLT-10)
 *
 * Allows tenant owners to:
 * 1. Toggle `requireSupportApproval`: require explicit authorization before
 *    platform operators can open support sessions.
 * 2. Grant temporary support access windows (1h, 2h, 4h, 8h, 24h) with 6-digit access codes.
 * 3. Immediately revoke active support access.
 */
export function SupportAccessSettings({ company, canEdit }: SupportAccessSettingsProps) {
  const updateCompany = useUpdateCompany();
  const grantAccess = useGrantSupportAccess();
  const revokeAccess = useRevokeSupportAccess();

  const [durationHours, setDurationHours] = useState(4);
  const [activeCodeResult, setActiveCodeResult] = useState<GrantSupportAccessResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isGranted = Boolean(
    company.supportAccessGrantedUntil && new Date(company.supportAccessGrantedUntil).getTime() > Date.now(),
  );

  const handleToggleApproval = (requireApproval: boolean) => {
    updateCompany.mutate({
      id: company.id,
      dto: { requireSupportApproval: requireApproval },
    });
  };

  const handleGrantAccess = () => {
    grantAccess.mutate(
      { durationHours },
      {
        onSuccess: (data) => {
          setActiveCodeResult(data);
        },
      },
    );
  };

  const handleRevokeAccess = () => {
    revokeAccess.mutate(undefined, {
      onSuccess: () => {
        setActiveCodeResult(null);
      },
    });
  };

  const handleCopyCode = async () => {
    if (!activeCodeResult?.code) return;
    try {
      await navigator.clipboard.writeText(activeCodeResult.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures in restricted contexts
    }
  };

  const error = updateCompany.error || grantAccess.error || revokeAccess.error;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
            <CardTitle>Platform Support Access & Privacy</CardTitle>
          </div>
          <Badge variant={company.requireSupportApproval ? 'warning' : 'default'}>
            {company.requireSupportApproval ? 'Approval Required' : 'Standard Policy'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error && <Alert variant="error">{messageOf(error, 'An error occurred updating support access')}</Alert>}

        {/* Approval Policy Setting */}
        <div className="flex flex-col gap-2 rounded-md border border-border p-4 bg-surface-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="require-support-approval"
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                Require explicit approval for support sessions
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By default, BRICS operates on an announce-afterwards policy: platform support sessions are time-limited
                (2 hours), fully logged in your audit trail, and require a business reason. When this setting is
                enabled, platform operators cannot access your data unless you provide a temporary approval code or
                pre-grant an access window below.
              </p>
            </div>
            <input
              id="require-support-approval"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
              disabled={!canEdit || updateCompany.isPending}
              checked={company.requireSupportApproval}
              onChange={(e) => handleToggleApproval(e.target.checked)}
            />
          </div>
        </div>

        {/* Active Support Access Code Banner */}
        {activeCodeResult && (
          <div className="flex flex-col gap-2 rounded-md border border-brand-300 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <KeyRound className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                Temporary Approval Code Generated
              </div>
              <Button size="sm" variant="outline" onClick={handleCopyCode} className="h-7 gap-1 text-xs">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy code'}
              </Button>
            </div>
            <div className="my-1 flex items-center justify-center rounded-lg bg-surface py-3 border border-border">
              <span className="font-mono text-2xl font-bold tracking-widest text-brand-700 dark:text-brand-300">
                {activeCodeResult.code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Provide this 6-digit code to the BRICS support operator. Valid until{' '}
              {new Date(activeCodeResult.grantedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
            </p>
          </div>
        )}

        {/* Temporary Support Access Window Controls */}
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-foreground">Temporary Support Access Window</h4>

          {isGranted ? (
            <div className="flex flex-col gap-3 rounded-md border border-brand-200 bg-brand-50/30 p-3.5 dark:border-brand-900 dark:bg-brand-950/10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    Support access active until{' '}
                    <span className="font-semibold">
                      {new Date(company.supportAccessGrantedUntil!).toLocaleString()}
                    </span>
                  </span>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRevokeAccess}
                    disabled={revokeAccess.isPending}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    {revokeAccess.isPending ? <Spinner className="h-3.5 w-3.5" /> : 'Revoke access'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Platform operators can open support sessions during this window without asking for a code.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="w-full sm:w-48">
                <Select
                  label="Access duration"
                  disabled={!canEdit || grantAccess.isPending}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours (default)</option>
                  <option value={8}>8 hours</option>
                  <option value={24}>24 hours</option>
                </Select>
              </div>

              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGrantAccess}
                  disabled={grantAccess.isPending}
                  className="whitespace-nowrap"
                >
                  {grantAccess.isPending ? <Spinner className="h-3.5 w-3.5" /> : 'Grant temporary access'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
