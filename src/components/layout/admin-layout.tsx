import { ReactNode } from 'react';
import { AdminHeader } from './admin-header';
import { AdminFooter } from './admin-footer';

interface AdminLayoutProps {
  children: ReactNode;
  sidePanel?: ReactNode;
}

export function AdminLayout({ children, sidePanel }: AdminLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <div className="flex flex-1 pt-16">
        {/* Side Panel */}
        {sidePanel && (
          <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-card overflow-y-auto z-0">
            {sidePanel}
          </aside>
        )}
        {/* Main Content */}
        <main className={`flex-1 ${sidePanel ? 'pl-64' : ''}`}>
          {children}
        </main>
      </div>
      <div className="relative z-50">
        <AdminFooter />
      </div>
    </div>
  );
} 