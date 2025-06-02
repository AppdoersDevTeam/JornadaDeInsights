import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/layout';
import { AdminLayout } from '@/components/layout/admin-layout';
import { HomePage } from '@/pages/home';
import { AboutPage } from '@/pages/about';
import { PodcastPage } from '@/pages/podcast';
import { ShopPage } from '@/pages/shop';
import { ContactPage } from '@/pages/contact';
import { CartPage } from '@/pages/cart';
import { SuccessPage } from '@/pages/success';
import { CancelPage } from '@/pages/cancel';
import { DashboardPage } from '@/pages/dashboard';
import { DashboardSidePanel } from '@/components/dashboard/dashboard-side-panel';
import SignIn from '@/components/SignIn';
import SignUp from '@/components/SignUp';
import { CheckEmailPage } from './pages/check-email';
import { ConfirmEmailPage } from './pages/confirm-email';
import UserDashboard from '@/components/UserDashboard';
import { UserDashboardSidePanel } from '@/components/dashboard/user-dashboard-side-panel';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/context/cart-context';
import { AuthProvider } from '@/context/auth-context';
import { EbookDetailsPage } from '@/pages/ebook-details';
import { TermsPage } from '@/pages/terms';
import { PrivacyPage } from '@/pages/privacy';
import { TabType } from '@/types/dashboard';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const validTabs: TabType[] = ['overview', 'ebooks', 'orders', 'newsletter', 'settings', 'cart'];
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      setActiveTab(tabParam as TabType);
    }
  }, [location.search]);

  const handleTabChange = (tab: string | TabType) => {
    const newTab = tab as TabType;
    setActiveTab(newTab);
    if (location.pathname === '/user-dashboard') {
      navigate(`/user-dashboard?tab=${newTab}`);
    }
  };

  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Layout><Outlet /></Layout>}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="podcast" element={<PodcastPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="success" element={<SuccessPage />} />
            <Route path="cancel" element={<CancelPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="shop/ebook/:id" element={<EbookDetailsPage />} />
            <Route path="signin" element={<SignIn />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="check-email" element={<CheckEmailPage />} />
            <Route path="confirm-email" element={<ConfirmEmailPage />} />
          </Route>

          <Route path="/dashboard" element={
            <AdminLayout 
              sidePanel={
                <DashboardSidePanel 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              }
            >
              <DashboardPage activeTab={activeTab} onTabChange={handleTabChange} />
            </AdminLayout>
          } />

          <Route path="/user-dashboard" element={
            <AdminLayout 
              sidePanel={
                <UserDashboardSidePanel 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              }
            >
              <UserDashboard activeTab={activeTab} onTabChange={handleTabChange} />
            </AdminLayout>
          } />
        </Routes>
        <Toaster />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;