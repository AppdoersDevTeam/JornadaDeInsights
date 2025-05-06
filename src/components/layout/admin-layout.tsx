import { ReactNode, useState } from 'react';
import { AdminHeader } from './admin-header';
import { AdminFooter } from './admin-footer';
import { MobileMenu } from './mobile-menu';

interface AdminLayoutProps {
  children: ReactNode;
  sidePanel?: ReactNode;
}

export function AdminLayout({ children, sidePanel }: AdminLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <div className="flex flex-1 pt-16">
        {/* Side Panel */}
        {sidePanel && (
          <>
            {/* Mobile Menu */}
            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)}>
              {sidePanel}
            </MobileMenu>
            {/* Desktop Side Panel */}
            <aside className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-card overflow-y-auto z-0">
              {sidePanel}
            </aside>
          </>
        )}
        {/* Main Content */}
        <main className={`flex-1 ${sidePanel ? 'md:pl-64' : ''}`}>
          {children}
        </main>
      </div>
      <div className="relative z-50">
        <AdminFooter />
      </div>
    </div>
  );
} 