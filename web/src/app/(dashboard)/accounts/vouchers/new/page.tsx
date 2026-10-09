'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PERMISSIONS } from '@brics/shared';
import { EmptyState } from '@/components/ui/empty-state';
import { useSession } from '@/features/auth/use-auth';
import { VoucherForm } from '@/features/accounting/components/voucher-form';

export default function NewVoucherPage() {
  const { can } = useSession();

  if (!can(PERMISSIONS.ACCOUNTS_MANAGE)) {
    return (
      <EmptyState title="You cannot post vouchers" description="Ask an owner for the accounts.manage permission." />
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <Link
        href="/accounts/day-book"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the Day Book
      </Link>

      <div>
        <h2 className="text-base font-semibold text-foreground">New voucher</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Debits must equal credits. The entry cannot be edited once posted — correct it with a reversal.
        </p>
      </div>

      <VoucherForm />
    </div>
  );
}
