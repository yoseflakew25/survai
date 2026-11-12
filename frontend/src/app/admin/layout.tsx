import KBar from '@/components/kbar';
import AdminSidebar from '@/components/layout/admin-sidebar';
import Header from '@/components/layout/header';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';
import { RequireSystemAdmin } from '@/components/layout/require-system-admin';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: {
    default: 'Platform Admin | Survai',
    template: '%s | Survai Admin'
  },
  description: 'SurvAI system administration console',
  robots: { index: false, follow: false }
};

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <RequireSystemAdmin>
      <KBar>
        <SidebarProvider
          defaultOpen={defaultOpen}
          style={{ '--sidebar-width': '15rem' } as React.CSSProperties}
        >
          <AdminSidebar />
          <SidebarInset id='main-content' tabIndex={-1} className='bg-card'>
            <ImpersonationBanner />
            <Header />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </KBar>
    </RequireSystemAdmin>
  );
}
