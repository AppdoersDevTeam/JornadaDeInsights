import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
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

type TabType = 'overview' | 'ebooks' | 'orders' | 'newsletter' | 'settings' | 'cart' | 'analytics' | 'content' | 'users';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />
          <Route path="/podcast" element={<Layout><PodcastPage /></Layout>} />
          <Route path="/shop" element={<Layout><ShopPage /></Layout>} />
          <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
          <Route path="/cart" element={<Layout><CartPage /></Layout>} />
          <Route path="/success" element={<Layout><SuccessPage /></Layout>} />
          <Route path="/cancel" element={<Layout><CancelPage /></Layout>} />
          <Route path="/signin" element={<Layout><SignIn /></Layout>} />
          <Route path="/signup" element={<Layout><SignUp /></Layout>} />
          <Route path="/check-email" element={<Layout><CheckEmailPage /></Layout>} />
          <Route path="/confirm-email" element={<Layout><ConfirmEmailPage /></Layout>} />
          <Route path="/ebook/:id" element={<Layout><EbookDetailsPage /></Layout>} />
          <Route path="/terms" element={<Layout><TermsPage /></Layout>} />
          <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
          <Route path="/dashboard" element={
            <AdminLayout 
              sidePanel={
                <DashboardSidePanel 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab} 
                />
              }
            >
              <DashboardPage activeTab={activeTab} onTabChange={setActiveTab} />
            </AdminLayout>
          } />
          <Route path="/user-dashboard" element={
            <AdminLayout 
              sidePanel={
                <UserDashboardSidePanel 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab} 
                />
              }
            >
              <UserDashboard activeTab={activeTab} />
            </AdminLayout>
          } />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;