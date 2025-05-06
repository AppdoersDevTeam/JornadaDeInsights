import { ReactNode, useState, useEffect } from 'react';
import { AdminHeader } from './admin-header';
import { AdminFooter } from './admin-footer';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  sidePanel?: ReactNode;
}

export function AdminLayout({ children, sidePanel }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <div className="flex flex-1 pt-16">
        {/* Mobile Menu Toggle */}
        {sidePanel && isMobile && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="fixed bottom-4 right-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        )}

        {/* Side Panel */}
        {sidePanel && (
          <aside
            className={cn(
              "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card overflow-y-auto z-40 transition-all duration-300 ease-in-out",
              "lg:w-64 lg:translate-x-0 lg:shadow-none lg:border-r",
              isMobile ? (
                isSidebarOpen
                  ? "w-3/4 translate-x-0 shadow-xl"
                  : "w-3/4 -translate-x-full"
              ) : "w-64 translate-x-0"
            )}
          >
            {sidePanel}
          </aside>
        )}

        {/* Backdrop */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            sidePanel ? "lg:pl-64" : "",
            "px-4 py-6 sm:px-6 lg:px-8"
          )}
        >
          {children}
        </main>
      </div>
      <div className="relative z-50">
        <AdminFooter />
      </div>
    </div>
  );
} 