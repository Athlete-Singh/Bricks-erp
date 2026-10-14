import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { PlatformAdminBounce } from '@/features/auth/components/platform-admin-bounce';
import { SupportSessionBanner } from '@/features/platform/components/support-session-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PlatformAdminBounce>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <SupportSessionBanner />
            <Topbar />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </PlatformAdminBounce>
    </AuthGuard>
  );
}
