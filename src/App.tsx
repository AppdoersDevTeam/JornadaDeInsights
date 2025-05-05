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
import { EbookDetailsPage } from '@/pages/ebook-details';

function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
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
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/podcast" element={<PodcastPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/ebook/:id" element={<EbookDetailsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/cancel" element={<CancelPage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/check-email" element={<CheckEmailPage />} />
              <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </>
  );
}

export default App;