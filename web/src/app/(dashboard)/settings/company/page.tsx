'use client';

import { AlertTriangle } from 'lucide-react';
import { PERMISSIONS } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/use-auth';
import { CompanyForm } from '@/features/company/components/company-form';
import { SupportAccessSettings } from '@/features/company/components/support-access-settings';
import { useCurrentCompany } from '@/features/company/hooks';
import { messageOf } from '@/features/auth/use-auth';

export default function CompanySettingsPage() {
  const { can } = useSession();
  const { data: company, isLoading, isError, error } = useCurrentCompany();

  if (isLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4" role="status" aria-label="Loading company">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load the company"
        description={messageOf(error, 'Try reloading the page.')}
      />
    );
  }

  const canEdit = can(PERMISSIONS.COMPANY_MANAGE);

  return (
    <div className="flex flex-col gap-8">
      {!canEdit && <Alert variant="info">You can view these details but not change them.</Alert>}
      <CompanyForm company={company} canEdit={canEdit} />
      <SupportAccessSettings company={company} canEdit={canEdit} />
    </div>
  );
}
