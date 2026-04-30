import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Download, Eye, X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EbookCard } from '@/components/shop/ebook-card';
import { useCart } from '@/context/cart-context';
import { LazyImage } from '@/components/shop/lazy-image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { loadStripe } from '@stripe/stripe-js';
import type { Ebook } from '@/components/shop/ebook-card';
import { TabType } from '@/types/dashboard';
import { trackLifecycleEvent } from '@/lib/lifecycle';

interface CompletedOrder {
  id: string;
  email: string;
  date: string;
  name: string;
  total: number;
  items: Array<{
    name: string;
    price: number;
    ebookId?: string | null;
  }>;
}

interface UserDashboardProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  cover_url?: string;
  description?: string;
  filename?: string;
  created_at: string;
}

const DEFAULT_COVER_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NDc0OGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBDb3ZlcjwvdGV4dD48L3N2Zz4=';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Server URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

const UserDashboard = ({ activeTab, onTabChange }: UserDashboardProps) => {
  const { t, language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [userEbooks, setUserEbooks] = useState<Ebook[]>([]);
  const [completedOrdersList, setCompletedOrdersList] = useState<CompletedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const [latestEbooks, setLatestEbooks] = useState<Ebook[]>([]);
  const { state: { items }, totalCount, totalPrice, addItem, removeItem, decrementItem, clearCart } = useCart();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(30);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Add effect to scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Add session timeout effect
  useEffect(() => {
    if (!user) return;

    // Set session start time when user logs in
    setSessionStartTime(Date.now());

    // Check session time every minute
    const sessionCheckInterval = setInterval(() => {
      const currentTime = Date.now();
      const sessionDuration = currentTime - sessionStartTime;
      const twoHoursInMs = 2 * 60 * 60 * 1000;

      if (sessionDuration >= twoHoursInMs) {
        setShowTimeoutDialog(true);
        setTimeoutCountdown(30);
      }
    }, 60000); // Check every minute

    return () => clearInterval(sessionCheckInterval);
  }, [user, sessionStartTime]);

  // Add countdown effect for timeout dialog
  useEffect(() => {
    if (!showTimeoutDialog) return;

    const countdownInterval = setInterval(() => {
      setTimeoutCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          handleSessionTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showTimeoutDialog]);

  const capitalizeName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const fetchUserOrders = async () => {
    try {
      if (!user?.email) {
        console.error('No user email available');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      const res = await fetch(`${SERVER_URL}/api/my-orders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch orders: ${res.status} ${res.statusText}`);
      }
      
      const { orders } = await res.json();
      if (!orders) {
        console.warn('No orders found in response');
        setCompletedOrdersList([]);
        setUserEbooks([]);
        return;
      }

      const userOrders = orders as CompletedOrder[];
      setCompletedOrdersList(userOrders);
      
      if (userOrders.length === 0) {
        console.log('No orders found for user');
        setUserEbooks([]);
        return;
      }

      // Get unique ebook IDs from orders (preferred) or fallback to titles
      const orderedEbookIds = new Set<string>();
      const orderedEbookTitles = new Set<string>();
      
      userOrders.forEach((order: CompletedOrder) => {
        order.items.forEach((item) => {
          if (item.ebookId) {
            orderedEbookIds.add(item.ebookId);
            console.log('Found ebookId in order:', item.ebookId, 'for item:', item.name);
          } else if (item.name) {
            // Fallback to title matching if ebookId is not available
            orderedEbookTitles.add(item.name);
            console.log('Using title fallback for item:', item.name, '(ebookId not available)');
          }
        });
      });

      console.log('Ordered ebook IDs:', Array.from(orderedEbookIds));
      console.log('Ordered ebook titles (fallback):', Array.from(orderedEbookTitles));

      if (orderedEbookIds.size === 0 && orderedEbookTitles.size === 0) {
        console.log('No ebook IDs or titles found in orders');
        setUserEbooks([]);
        return;
      }

      // Fetch ebooks from Supabase using IDs (preferred) or titles (fallback)
      let ebooks;
      let error;
      
      if (orderedEbookIds.size > 0) {
        console.log('Fetching ebooks by ID from Supabase...');
        const { data, error: err } = await supabase
          .from('ebooks_metadata')
          .select('*')
          .in('id', Array.from(orderedEbookIds));
        ebooks = data;
        error = err;
        console.log('Fetched ebooks by ID:', ebooks?.length || 0, 'ebooks');
      } else {
        // Fallback to title matching
        console.log('Fetching ebooks by title from Supabase (fallback)...');
        const { data, error: err } = await supabase
          .from('ebooks_metadata')
          .select('*')
          .in('title', Array.from(orderedEbookTitles));
        ebooks = data;
        error = err;
        console.log('Fetched ebooks by title:', ebooks?.length || 0, 'ebooks');
      }

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to fetch ebooks from database: ${error.message}`);
      }

      if (!ebooks || ebooks.length === 0) {
        console.log('No ebooks found in database');
        setUserEbooks([]);
        return;
      }

      const ebooksWithCoverUrls = ebooks.map(ebook => ({
        ...ebook,
        cover_url: ebook.filename 
          ? supabase.storage.from('store-assets').getPublicUrl(`covers/${ebook.filename}`).data.publicUrl 
          : DEFAULT_COVER_DATA_URL
      }));
      
      setUserEbooks(ebooksWithCoverUrls);
    } catch (err) {
      console.error('Error fetching orders and ebooks:', err);
      const errorMessage = err instanceof Error ? err.message : t('ud.ebooks.empty', 'Failed to load your eBooks');
      toast.error(errorMessage);
    }
  };

  const fetchLatestEbooks = async () => {
    try {
      const { data: ebooks, error } = await supabase
        .from('ebooks_metadata')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (ebooks) {
        const ebooksWithCoverUrls = ebooks.map(ebook => ({
          ...ebook,
          cover_url: ebook.filename 
            ? supabase.storage.from('store-assets').getPublicUrl(`covers/${ebook.filename}`).data.publicUrl 
            : DEFAULT_COVER_DATA_URL
        }));
        setLatestEbooks(ebooksWithCoverUrls);
      }
    } catch (err) {
      console.error('Error fetching latest ebooks:', err);
      toast.error(t('ud.recommended.desc', 'Failed to load latest eBooks'));
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error loading user session:', error);
      }
      const currentUser = data.user;
      if (!currentUser) {
        navigate('/signin');
      } else if (!currentUser.email_confirmed_at) {
        navigate('/check-email');
      } else {
        setUser(currentUser);
      }
    };

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        navigate('/signin');
      } else if (!currentUser.email_confirmed_at) {
        navigate('/check-email');
      } else {
        setUser(currentUser);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if ((activeTab === 'orders' || activeTab === 'ebooks' || activeTab === 'overview') && user) {
      fetchUserOrders();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchLatestEbooks();
    }
  }, [activeTab]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setIsAuthenticated(!!user);
      // If user just signed in and we have saved cart state, restore it
      if (user) {
        const savedCart = sessionStorage.getItem('cartState');
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart) as CartItem[];
            // Clear current cart and restore saved items
            clearCart();
            parsedCart.forEach((item) => {
              // Convert CartItem to Ebook for addItem
              const ebook: Ebook = {
                id: item.id,
                title: item.title,
                description: item.description || '',
                price: item.price,
                filename: item.filename || item.id,
                cover_url: item.cover_url,
                created_at: item.created_at
              };
              addItem(ebook);
            });
            sessionStorage.removeItem('cartState');
          } catch (error) {
            console.error('Error restoring cart state:', error);
          }
        }
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [clearCart, addItem]);


  const handleCheckout = async () => {
    // If not authenticated, show auth modal and redirect to sign in
    if (!isAuthenticated) {
      // Track checkout attempt even if user must sign in first
      void trackLifecycleEvent('checkout_started', {
        itemCount: items.length,
        total: Number(totalPrice.toFixed(2)),
        userEmail: null,
      });

      // Store current cart state in sessionStorage
      sessionStorage.setItem('cartState', JSON.stringify(items));
      // Navigate to sign in with return path
      navigate('/signin', { 
        state: { 
          from: location.pathname,
          returnTo: '/dashboard?tab=cart'
        } 
      });
      return;
    }

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to initialize');

      // Create checkout session
      const response = await fetch(`${SERVER_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail: user?.email ?? undefined,
          items: items.map(item => {
            // Ensure image URL is absolute and uses HTTPS
            let imageUrl = item.cover_url || '';
            if (imageUrl) {
              try {
                // Parse the URL to handle it properly
                const url = new URL(imageUrl, window.location.origin);
                
                // Remove any query parameters or fragments
                url.search = '';
                url.hash = '';
                
                // Ensure HTTPS
                url.protocol = 'https:';
                
                // Get the final URL
                imageUrl = url.toString();
              } catch (error) {
                console.error('Error processing image URL:', error);
                imageUrl = '';
              }
            }

            return {
              id: item.id,
              name: item.title,
              description: `Digital eBook${item.description ? ` - ${item.description}` : ''}`,
              price: Math.round(item.price * 100), // Convert to cents
              quantity: item.quantity,
              image: imageUrl || undefined, // Use formatted image URL
              metadata: {
                type: 'ebook',
                layout: 'preppy',
                displayStyle: 'large_cover'
              }
            };
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Erro ao iniciar o processo de checkout:', error);
      toast.error(t('ud.toast.checkoutFail', 'Could not start checkout. Please try again.'));
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(t('ud.toast.signoutFail', 'Could not sign out.'));
    }
  };

  // Add session timeout handler
  const handleSessionTimeout = () => {
    setShowTimeoutDialog(false);
    supabase.auth.signOut();
    navigate('/');
  };

  // Add session extension handler
  const handleExtendSession = () => {
    setSessionStartTime(Date.now());
    setShowTimeoutDialog(false);
    setTimeoutCountdown(30);
  };

  const hydrateSettingsForm = (currentUser: User | null) => {
    if (!currentUser) return;
    const metadata = (currentUser.user_metadata || {}) as {
      full_name?: string;
      contact_email?: string;
      phone?: string;
    };

    setFullName(metadata.full_name || currentUser.user_metadata?.name || '');
    setEmail(currentUser.email || '');
    setContactEmail(metadata.contact_email || currentUser.email || '');
    setPhone(metadata.phone || '');
  };

  useEffect(() => {
    if (user && activeTab === 'settings') {
      hydrateSettingsForm(user);
    }
  }, [user, activeTab]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      const emailChanged = email.trim().toLowerCase() !== (user.email || '').toLowerCase();

      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim().toLowerCase(),
        });
        if (emailError) throw emailError;
        toast.success(t('ud.toast.emailUpdated', 'Login email updated. Please confirm in your new inbox.'));
      }

      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          contact_email: contactEmail.trim().toLowerCase(),
          phone: phone.trim(),
        },
      });

      if (error) throw error;
      if (data.user) {
        setUser(data.user);
      }
      toast.success(t('ud.toast.saved', 'Settings updated successfully.'));
    } catch (error) {
      console.error('Error updating settings:', error);
      const message = error instanceof Error ? error.message : t('ud.toast.saveFail', 'Could not save settings.');
      toast.error(message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 pb-24 mt-[52px]">
      {/* Header */}
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {activeTab === 'overview' && t('ud.tab.overview', 'Overview')}
            {activeTab === 'ebooks' && t('ud.tab.ebooks', 'My eBooks')}
            {activeTab === 'orders' && t('ud.tab.orders', 'My orders')}
            {activeTab === 'settings' && t('ud.tab.settings', 'Settings')}
            {activeTab === 'cart' && t('ud.tab.cart', 'My cart')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {activeTab === 'overview' && t('ud.tab.overview.desc', 'An overview of your account and activity')}
            {activeTab === 'ebooks' && t('ud.tab.ebooks.desc', 'Manage your eBooks and downloads')}
            {activeTab === 'orders' && t('ud.tab.orders.desc', 'Track your orders and purchases')}
            {activeTab === 'settings' && t('ud.tab.settings.desc', 'Manage your account settings')}
            {activeTab === 'cart' && t('ud.tab.cart.desc', 'Manage your cart items')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Purchased eBooks Section */}
            <Card>
              <CardHeader>
                <CardTitle>{t('ud.ebooks.title', 'My eBooks')}</CardTitle>
                <CardDescription>
                  {userEbooks.length > 0 
                    ? `${userEbooks.length} eBook${userEbooks.length !== 1 ? 's' : ''}`
                    : t('ud.ebooks.empty', 'You have not purchased any eBooks yet.')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userEbooks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-muted-foreground">{t('ud.ebooks.empty', 'You have not purchased any eBooks yet.')}</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                      {t('ud.ebooks.browse', 'Browse eBooks')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-8 max-w-2xl">
                      {userEbooks.slice(0, 2).map((ebook) => (
                        <Card key={ebook.id} className="overflow-hidden">
                          <div className="flex flex-col md:flex-row gap-6 p-8">
                            <div className="w-full md:w-32 h-56 md:h-40 overflow-hidden rounded-md relative bg-muted">
                              <img
                                src={ebook.cover_url}
                                alt={ebook.title}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = DEFAULT_COVER_DATA_URL;
                                  target.onerror = null;
                                }}
                                loading="lazy"
                              />
                            </div>
                            <div className="flex-1 flex flex-col gap-6">
                              <CardHeader className="p-0">
                                <CardTitle className="text-xl">{ebook.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{ebook.description}</CardDescription>
                              </CardHeader>
                              <CardContent className="p-0">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button 
                                    variant="outline" 
                                    className="flex-1 h-14 sm:h-9"
                                    onClick={() => {
                                      const pdfUrl = supabase.storage
                                        .from('store-assets')
                                        .getPublicUrl(`pdfs/${ebook.filename}`).data.publicUrl;
                                      window.open(pdfUrl, '_blank');
                                    }}
                                  >
                                    <Eye className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
                                    {t('ud.ebooks.view', 'View')}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="flex-1 h-14 sm:h-9"
                                    onClick={async () => {
                                      try {
                                        const { data, error } = await supabase.storage
                                          .from('store-assets')
                                          .download(`pdfs/${ebook.filename}`);
                                          
                                        if (error) {
                                          throw error;
                                        }

                                        if (data) {
                                          const blob = new Blob([data], { type: 'application/pdf' });
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = ebook.filename;
                                          document.body.appendChild(link);
                                          link.click();
                                          window.URL.revokeObjectURL(url);
                                          document.body.removeChild(link);
                                        }
                                      } catch (err) {
                                        console.error('Error downloading file:', err);
                                        toast.error(t('ud.toast.downloadFail', 'Could not download the file.'));
                                      }
                                    }}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('ud.ebooks.download', 'Download')}
                                  </Button>
                                </div>
                              </CardContent>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <div className="flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={() => onTabChange('ebooks')}
                        className="w-full sm:w-auto"
                      >
                        {t('ud.ebooks.viewAll', 'View all my eBooks')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Section */}
            <Card>
              <CardHeader>
                <CardTitle>{t('ud.orders.title', 'Order history')}</CardTitle>
                <CardDescription>{t('ud.orders.desc', 'View your orders and purchases')}</CardDescription>
              </CardHeader>
              <CardContent>
                {completedOrdersList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-muted-foreground">{t('ud.orders.empty', 'You have not made any purchases yet.')}</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                      {t('ud.ebooks.browse', 'Browse eBooks')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full text-left whitespace-nowrap min-w-[300px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="py-2 px-2 sm:px-4 border-b font-medium">{t('ud.orders.col.date', 'Date')}</th>
                            <th className="py-2 px-2 sm:px-4 border-b font-medium hidden sm:table-cell">{t('ud.orders.col.name', 'Name')}</th>
                            <th className="py-2 px-2 sm:px-4 border-b font-medium hidden sm:table-cell">{t('ud.orders.col.email', 'Email')}</th>
                            <th className="py-2 px-2 sm:px-4 border-b font-medium">{t('ud.orders.col.items', 'Items')}</th>
                            <th className="py-2 px-2 sm:px-4 border-b font-medium">{t('ud.orders.col.total', 'Total')}</th>
                            <th className="py-2 px-2 sm:px-4 border-b font-medium hidden sm:table-cell">{t('ud.orders.col.status', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedOrdersList.slice(0, 5).map((order: CompletedOrder) => (
                            <tr 
                              key={order.id}
                              className="border-t hover:bg-gray-50 cursor-pointer"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <td className="py-2 px-2 sm:px-4">
                                {new Date(order.date).toLocaleDateString(language === 'en' ? 'en-NZ' : 'pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="py-2 px-2 sm:px-4 hidden sm:table-cell">
                                {capitalizeName(order.name)}
                              </td>
                              <td className="py-2 px-2 sm:px-4 hidden sm:table-cell">
                                {order.email}
                              </td>
                              <td className="py-2 px-2 sm:px-4">
                                {order.items.length} item{order.items.length>1?'s':''}
                              </td>
                              <td className="py-2 px-2 sm:px-4">
                                {new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', {style:'currency',currency:'BRL'}).format(order.total)}
                              </td>
                              <td className="py-2 px-2 sm:px-4 hidden sm:table-cell">
                                <Badge variant="outline">
                                  {order.total > 0 ? t('ud.orders.status.completed', 'Completed') : t('ud.orders.status.processing', 'Processing')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {completedOrdersList.length > 5 && (
                      <div className="flex justify-center">
                        <Button 
                          variant="outline" 
                          onClick={() => onTabChange('orders')}
                          className="w-full sm:w-auto"
                        >
                          {t('ud.orders.viewAll', 'View full order history')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Recommended Ebooks Section */}
            <Card>
              <CardHeader>
                <CardTitle>{t('ud.recommended.title', 'eBooks you may like')}</CardTitle>
                <CardDescription>
                  {t('ud.recommended.desc', 'Check out our latest releases')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {latestEbooks.map((ebook) => (
                    <EbookCard key={ebook.id} book={ebook} />
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/shop')}
                    className="w-full sm:w-auto"
                  >
                    {t('ud.recommended.viewAll', 'View all eBooks')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'ebooks' && (
          <div className="space-y-8">
            {userEbooks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">{t('ud.ebooks.empty', 'You have not purchased any eBooks yet.')}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                  {t('ud.ebooks.browse', 'Browse eBooks')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 max-w-2xl">
                {userEbooks.map((ebook) => (
                  <Card key={ebook.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-6 p-8">
                      <div className="w-full md:w-32 h-56 md:h-40 overflow-hidden rounded-md relative bg-muted">
                        <img
                          src={ebook.cover_url}
                          alt={ebook.title}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = DEFAULT_COVER_DATA_URL;
                            target.onerror = null;
                          }}
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-6">
                        <CardHeader className="p-0">
                          <CardTitle className="text-xl">{ebook.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{ebook.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1 h-14 sm:h-9"
                              onClick={() => {
                                const pdfUrl = supabase.storage
                                  .from('store-assets')
                                  .getPublicUrl(`pdfs/${ebook.filename}`).data.publicUrl;
                                window.open(pdfUrl, '_blank');
                              }}
                            >
                              <Eye className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
                              {t('ud.ebooks.view', 'View')}
                            </Button>
                            <Button 
                              variant="outline" 
                              className="flex-1 h-14 sm:h-9"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.storage
                                    .from('store-assets')
                                    .download(`pdfs/${ebook.filename}`);
                                    
                                  if (error) {
                                    throw error;
                                  }

                                  if (data) {
                                    const blob = new Blob([data], { type: 'application/pdf' });
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = ebook.filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(link);
                                  }
                                } catch (err) {
                                  console.error('Error downloading file:', err);
                                  toast.error(t('ud.toast.downloadFail', 'Could not download the file.'));
                                }
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {t('ud.ebooks.download', 'Download')}
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <Card className="p-6">
              <CardHeader>
                <CardTitle>{t('ud.orders.title', 'Order history')}</CardTitle>
                <CardDescription>{t('ud.orders.descFull', 'View all your orders and purchases')}</CardDescription>
              </CardHeader>
              <CardContent>
                {completedOrdersList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-muted-foreground">{t('ud.orders.empty', 'You have not made any purchases yet.')}</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                      {t('ud.ebooks.browse', 'Browse eBooks')}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <table className="w-full text-left whitespace-nowrap min-w-[300px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">{t('ud.orders.col.date', 'Date')}</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">{t('ud.orders.col.name', 'Name')}</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">{t('ud.orders.col.email', 'Email')}</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">{t('ud.orders.col.items', 'Items')}</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">{t('ud.orders.col.total', 'Total')}</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">{t('ud.orders.col.status', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedOrdersList.map((order: CompletedOrder) => (
                          <tr 
                            key={order.id}
                            className="border-t hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <td className="py-2 px-1 sm:px-4">
                              {new Date(order.date).toLocaleDateString(language === 'en' ? 'en-NZ' : 'pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-2 px-1 sm:px-4 hidden sm:table-cell">
                              {capitalizeName(order.name)}
                            </td>
                            <td className="py-2 px-1 sm:px-4 hidden sm:table-cell">
                              {order.email}
                            </td>
                            <td className="py-2 px-1 sm:px-4">
                              {order.items.length} item{order.items.length>1?'s':''}
                            </td>
                            <td className="py-2 px-1 sm:px-4">
                              {new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', {style:'currency',currency:'BRL'}).format(order.total)}
                            </td>
                            <td className="py-2 px-1 sm:px-4 hidden sm:table-cell">
                              <Badge variant="outline">
                                {order.total > 0 ? t('ud.orders.status.completed', 'Completed') : t('ud.orders.status.processing', 'Processing')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              {totalCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {totalCount} {totalCount === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center">
                <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-primary" />
                <p className="text-lg text-muted-foreground mb-6">{t('ud.cart.empty', 'Your cart is empty.')}</p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/shop')}
                >
                  {t('ud.cart.continueShopping', 'Continue shopping')}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-card rounded-lg p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <LazyImage
                            src={item.cover_url || ''}
                            alt={item.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-muted-foreground">
                              {new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decrementItem(item.id)}
                              className="p-2 rounded border hover:bg-muted"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => addItem(item)}
                              className="p-2 rounded border hover:bg-muted"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 rounded border border-destructive text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-8">
                  <p className="text-xl font-semibold">{t('ud.cart.total', 'Total:')}</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}
                  </p>
                </div>
                <div className="flex justify-center gap-4 mt-6">
                  <Button variant="outline" onClick={clearCart}>{t('ud.cart.clearCart', 'Clear cart')}</Button>
                  <Button onClick={handleCheckout}>{t('ud.cart.checkout', 'Checkout')}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('ud.settings.title', 'Account settings')}</CardTitle>
                <CardDescription>
                  {t('ud.settings.desc', 'Manage your preferences and account information')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium mb-6">{t('ud.settings.accountInfo', 'Account information')}</h3>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="settings-full-name">{t('ud.settings.fullName', 'Full name')}</Label>
                        <Input
                          id="settings-full-name"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          placeholder={t('ud.settings.fullNamePlaceholder', 'Your full name')}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-email">{t('ud.settings.loginEmail', 'Login email')}</Label>
                        <Input
                          id="settings-email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@email.com"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-contact-email">{t('ud.settings.contactEmail', 'Contact email')}</Label>
                        <Input
                          id="settings-contact-email"
                          type="email"
                          value={contactEmail}
                          onChange={(event) => setContactEmail(event.target.value)}
                          placeholder="contact@email.com"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-phone">{t('ud.settings.phone', 'Phone / WhatsApp')}</Label>
                        <Input
                          id="settings-phone"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="+64 21 000 0000"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          {t('ud.settings.createdAt', 'Account created')}
                        </label>
                        <p className="text-sm">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString(language === 'en' ? 'en-NZ' : 'pt-BR')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Button onClick={handleSaveSettings} disabled={savingSettings}>
                          {savingSettings ? t('ud.settings.saving', 'Saving...') : t('ud.settings.save', 'Save settings')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ud.signout.title', 'Sign out?')}</DialogTitle>
            <DialogDescription>
              {t('ud.signout.body', 'Are you sure you want to sign out?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>
              {t('ud.signout.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              {t('ud.signout.cta', 'Sign out')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Session Timeout Dialog */}
      <Dialog open={showTimeoutDialog} onOpenChange={setShowTimeoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ud.session.title', 'Session expiring')}</DialogTitle>
            <DialogDescription>
              {t('ud.session.body', 'Your session is about to expire. You will be signed out in {seconds} seconds. Extend your session?').replace('{seconds}', String(timeoutCountdown))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleSessionTimeout}>
              {t('ud.session.signout', 'Sign out')}
            </Button>
            <Button onClick={handleExtendSession}>
              {t('ud.session.extend', 'Extend session')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('ud.order.title', 'Order details')}</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">{t('ud.order.date', 'Date')}</p>
                      <p>{new Date(selectedOrder.date).toLocaleDateString(language === 'en' ? 'en-NZ' : 'pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">{t('ud.order.total', 'Total')}</p>
                      <p>{new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', {style:'currency',currency:'BRL'}).format(selectedOrder.total)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">{t('ud.order.name', 'Name')}</p>
                      <p>{capitalizeName(selectedOrder.name)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">{t('ud.order.email', 'Email')}</p>
                      <p>{selectedOrder.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">{t('ud.order.items', 'Items')}</p>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span>{new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', {style:'currency',currency:'BRL'}).format(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between font-medium">
                      <span>{t('ud.order.status', 'Status')}</span>
                      <Badge variant="outline">
                        {selectedOrder.total > 0 ? t('ud.orders.status.completed', 'Completed') : t('ud.orders.status.processing', 'Processing')}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSelectedOrder(null)}>
              {t('ud.order.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard; 