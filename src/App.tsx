import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/layout';
import { AdminLayout } from '@/components/layout/admin-layout';
import { HomePage } from '@/pages/home';
import { AboutPage } from '@/pages/about';
import { PodcastPage } from '@/pages/podcast';
import { ShopPage } from '@/pages/shop';
import { ContactPage } from '@/pages/contact';
import { CartPage } from '@/pages/cart';
import { DonationPage } from '@/pages/donation';
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
import { CuriosidadesPage } from '@/pages/curiosidades';
import { CuriosidadeDetailsPage } from '@/pages/curiosidade-details';
import { CuriosidadeEditorPage } from '@/pages/curiosidade-editor';
import { TabType } from '@/types/dashboard';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { captureClientError } from '@/lib/monitoring';
import { LanguageProvider, useLanguage } from '@/context/language-context';
import { LanguagePickerDialog } from '@/components/language/language-picker-dialog';

const ROUTE_METADATA: Record<'pt-BR' | 'en', Record<string, { title: string; description: string }>> = {
  'pt-BR': {
    '/': {
      title: 'Jornada de Insights | Patricia',
      description:
        'Podcasts, videos e eBooks cristãos para fortalecer sua jornada espiritual com conteúdo bíblico prático.',
    },
    '/about': {
      title: 'Sobre | Jornada de Insights',
      description:
        'Conheça a missão da Jornada de Insights e o propósito por trás dos conteúdos cristãos.',
    },
    '/podcast': {
      title: 'Podcast | Jornada de Insights',
      description:
        'Ouça episódios com reflexões bíblicas e temas de fé para o seu dia a dia.',
    },
    '/shop': {
      title: 'Loja de eBooks | Jornada de Insights',
      description:
        'Acesse eBooks cristãos digitais para aprofundar seus estudos e devocionais.',
    },
    '/contact': {
      title: 'Contato | Jornada de Insights',
      description:
        'Fale com a equipe da Jornada de Insights para dúvidas, convites e parcerias.',
    },
    '/donation': {
      title: 'Apoie o Ministério | Jornada de Insights',
      description:
        'Contribua para manter o projeto ativo e levar conteúdo cristão a mais pessoas.',
    },
    '/signin': {
      title: 'Entrar | Jornada de Insights',
      description: 'Acesse sua conta para ver seus eBooks e acompanhar seu histórico.',
    },
    '/signup': {
      title: 'Criar Conta | Jornada de Insights',
      description: 'Crie sua conta para comprar, acessar e organizar seus conteúdos.',
    },
  },
  en: {
    '/': {
      title: 'Journey of Insights | Patricia',
      description:
        'Christian podcasts, videos and eBooks to strengthen your spiritual journey with practical biblical teaching.',
    },
    '/about': {
      title: 'About | Journey of Insights',
      description: 'Learn about the mission behind Journey of Insights and its biblical content.',
    },
    '/podcast': {
      title: 'Podcast | Journey of Insights',
      description: 'Listen to episodes with biblical reflections and faith-centered topics.',
    },
    '/shop': {
      title: 'eBook Store | Journey of Insights',
      description: 'Browse Christian eBooks designed to deepen your studies and devotional life.',
    },
    '/contact': {
      title: 'Contact | Journey of Insights',
      description: 'Reach out to the Journey of Insights team for questions and partnerships.',
    },
    '/donation': {
      title: 'Support the Ministry | Journey of Insights',
      description: 'Help keep this project active and reach more people with biblical content.',
    },
    '/signin': {
      title: 'Sign In | Journey of Insights',
      description: 'Access your account to view your eBooks and order history.',
    },
    '/signup': {
      title: 'Create Account | Journey of Insights',
      description: 'Create your account to buy and manage your content.',
    },
  },
};

function App() {
  return (
    <LanguageProvider>
      <AppRoutes />
    </LanguageProvider>
  );
}

function AppRoutes() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const location = useLocation();
  const navigate = useNavigate();
  const lastTrackedPathRef = useRef<string | null>(null);
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
  const { language } = useLanguage();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const validTabs: TabType[] = ['overview', 'ebooks', 'orders', 'settings', 'cart'];
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      setActiveTab(tabParam as TabType);
    }
  }, [location.search]);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    const shouldSkipPath = ['/dashboard', '/user-dashboard'].some((prefix) =>
      location.pathname.startsWith(prefix)
    );

    if (shouldSkipPath || lastTrackedPathRef.current === path) {
      return;
    }

    lastTrackedPathRef.current = path;

    const visitorStorageKey = 'jdi_visitor_id';
    const sessionStorageKey = 'jdi_session_id';
    const generateId = () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const visitorId =
      localStorage.getItem(visitorStorageKey) || generateId();
    const sessionId =
      sessionStorage.getItem(sessionStorageKey) || generateId();

    localStorage.setItem(visitorStorageKey, visitorId);
    sessionStorage.setItem(sessionStorageKey, sessionId);

    const payload = JSON.stringify({
      pagePath: location.pathname,
      pageUrl: path,
      referrer: document.referrer || null,
      visitorId,
      sessionId,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    });

    // Prefer beacon for non-blocking delivery during navigation/unload.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${SERVER_URL}/api/site-analytics-track`, blob);
      return;
    }

    void fetch(`${SERVER_URL}/api/site-analytics-track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: payload,
    }).catch((error) => {
      console.error('Failed to record page view', error);
      captureClientError(error, {
        area: 'site-analytics-track',
        route: location.pathname,
      });
    });
  }, [location.pathname, location.search, SERVER_URL]);

  useEffect(() => {
    const localeMeta = ROUTE_METADATA[language];
    const routeMeta = localeMeta[location.pathname] || localeMeta['/'];
    document.title = routeMeta.title;

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.setAttribute('content', routeMeta.description);
    }

    const canonicalHref = `https://jornadadeinsights.com${location.pathname}`;
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonicalHref);
  }, [location.pathname, language]);

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
            <Route path="donation" element={<DonationPage />} />
            <Route path="success" element={<SuccessPage />} />
            <Route path="cancel" element={<CancelPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="shop/ebook/:id" element={<EbookDetailsPage />} />
            <Route path="curiosidades" element={<CuriosidadesPage />} />
            <Route path="curiosidades/:id" element={<CuriosidadeDetailsPage />} />
            <Route path="signin" element={<SignIn />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="check-email" element={<CheckEmailPage />} />
            <Route path="confirm-email" element={<ConfirmEmailPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
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
          
          <Route path="/dashboard/curiosidades/:id?" element={
            <AdminLayout 
              sidePanel={
                <DashboardSidePanel 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              }
            >
              <CuriosidadeEditorPage />
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
        <LanguagePickerDialog />
        <Toaster />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;