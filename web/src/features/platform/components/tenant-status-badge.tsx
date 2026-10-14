import type { TenantSummaryDto } from '@brics/shared';
import { Badge } from '@/components/ui/badge';

const LABEL: Record<TenantSummaryDto['status'], string> = {
  trial: 'Trial',
  active: 'Active',
  suspended: 'Suspended',
};

const VARIANT: Record<TenantSummaryDto['status'], 'success' | 'warning' | 'danger'> = {
  active: 'success',
  trial: 'warning',
  suspended: 'danger',
};

export function TenantStatusBadge({ status }: { status: TenantSummaryDto['status'] }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
