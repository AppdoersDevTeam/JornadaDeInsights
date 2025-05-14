import { ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Header } from './header';
import { AdminHeader } from './admin-header';
import { Footer } from './footer';
import { StickyHeader } from '@/components/ui/sticky-header';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/context/auth-context';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  if (isLoading) {
    return null; // Don't render anything while checking auth
  }

  return (
    <div className="flex flex-col min-h-screen">
      <StickyHeader>
        {user ? <AdminHeader /> : <Header />}
      </StickyHeader>
      <Toaster position="top-right" />
      <motion.main 
        className="flex-grow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  );
}