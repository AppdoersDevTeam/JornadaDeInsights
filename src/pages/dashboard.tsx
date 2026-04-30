import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getSupabaseAccessToken } from '@/lib/supabase';
import {
  BarChart3,
  Edit,
  Users,
  Trash2,
  Mail,
  Check,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';
import UploadEbookForm from '@/components/dashboard/upload-ebook-form';
import EbookList from '@/components/dashboard/ebook-list';
import CuriosidadesList from '@/components/dashboard/curiosidades-list';
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from '@/lib/supabase';
import { SalesTrendsChart, SalesData } from '@/components/dashboard/sales-trends-chart';
import { StripeBalanceChart, BalanceData } from '@/components/dashboard/stripe-balance-chart';
import { SiteTrafficDailyChart } from '@/components/dashboard/site-traffic-daily-chart';
import { useLanguage } from '@/context/language-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface DashboardPageProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface CompletedOrder {
  id: string;
  date: string;
  name: string;
  email: string;
  total: number;
  items: Array<{
    name: string;
    price: number;
  }>;
}

interface ProductSales {
  name: string;
  sales: number;
  revenue: number;
}

interface UserData {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface SiteAnalyticsPoint {
  date: string;
  views: number;
}

interface SiteAnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  topPages: Array<{ page: string; views: number }>;
  topCountries: Array<{ country: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  topDevices: Array<{ device: string; views: number }>;
  topOperatingSystems: Array<{ os: string; views: number }>;
  dailyViews: SiteAnalyticsPoint[];
  windowDays: number;
}

interface LifecycleFunnelSummary {
  windowDays: number;
  totals: {
    visits: number;
    leads: number;
    checkoutStarted: number;
    purchaseCompleted: number;
  };
  conversionRates: {
    visitToLead: number;
    leadToCheckout: number;
    checkoutToPurchase: number;
    visitToPurchase: number;
  };
}

interface StripeWebhookEventRow {
  event_id: string;
  event_type: string;
  session_id: string | null;
  processed_at: string;
}

interface PurchaseEmailEventRow {
  session_id: string;
  customer_email: string;
  status: string;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'ptasbr2020@gmail.com'
];

export function DashboardPage({ activeTab, onTabChange }: DashboardPageProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // All state declarations first
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hoverEmail, setHoverEmail] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    users: {
      total: 0,
      newThisWeek: 0
    },
    completedOrders: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [completedOrdersList, setCompletedOrdersList] = useState<CompletedOrder[]>([]);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [salesTrends, setSalesTrends] = useState<{
    daily: SalesData[];
    weekly: SalesData[];
    monthly: SalesData[];
  }>({
    daily: [],
    weekly: [],
    monthly: []
  });
  const [balanceData, setBalanceData] = useState<BalanceData[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [siteAnalytics, setSiteAnalytics] = useState<SiteAnalyticsSummary>({
    totalPageViews: 0,
    uniqueVisitors: 0,
    topPages: [],
    topCountries: [],
    topReferrers: [],
    topDevices: [],
    topOperatingSystems: [],
    dailyViews: [],
    windowDays: 30,
  });
  const [siteAnalyticsLoading, setSiteAnalyticsLoading] = useState(false);
  const [siteAnalyticsError, setSiteAnalyticsError] = useState<string | null>(null);
  const [lifecycleFunnel, setLifecycleFunnel] = useState<LifecycleFunnelSummary>({
    windowDays: 30,
    totals: {
      visits: 0,
      leads: 0,
      checkoutStarted: 0,
      purchaseCompleted: 0,
    },
    conversionRates: {
      visitToLead: 0,
      leadToCheckout: 0,
      checkoutToPurchase: 0,
      visitToPurchase: 0,
    },
  });
  const [lifecycleFunnelLoading, setLifecycleFunnelLoading] = useState(false);
  const [stripeWebhookEvents, setStripeWebhookEvents] = useState<StripeWebhookEventRow[]>([]);
  const [purchaseEmailEvents, setPurchaseEmailEvents] = useState<PurchaseEmailEventRow[]>([]);
  const [stripeWebhookEventsLoading, setStripeWebhookEventsLoading] = useState(false);
  const [stripeWebhookEventsError, setStripeWebhookEventsError] = useState<string | null>(null);

  // Constants
  const itemsPerPage = 20; // Show 20 orders per page in completed orders tab
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
  console.log('Dashboard using SERVER_URL:', SERVER_URL);

  // Helper function to safely parse dates
  const parseDate = (dateStr: string): Date | null => {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Derived values
  const filteredOrders = completedOrdersList.filter(o => {
    // Text search
    const term = searchQuery.trim().toLowerCase();
    const matchText = !term || 
      [o.name || '', o.email || '', o.date ? new Date(o.date).toLocaleDateString() : '']
        .some(v => v.toLowerCase().includes(term)) || 
      (o.items || []).some(i => (i.name || '').toLowerCase().includes(term));

    // Date filtering
    let matchDate = true;
    if (dateRange.start || dateRange.end) {
      const orderDate = parseDate(o.date);
      if (!orderDate) return false;

      if (dateRange.start) {
        const startDate = parseDate(dateRange.start);
        if (startDate) {
          matchDate = matchDate && orderDate >= startDate;
        }
      }
      
      if (dateRange.end) {
        const endDate = parseDate(dateRange.end);
        if (endDate) {
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999);
          matchDate = matchDate && orderDate <= endDate;
        }
      }
    }

    return matchText && matchDate;
  });
  
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success(t('admin.toast.emailCopied', 'Email copied'));
  };

  // Calculate top selling products
  const calculateTopProducts = async (): Promise<ProductSales[]> => {
    try {
      const response = await fetch(`${SERVER_URL}/api/top-products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.products) {
        throw new Error('Invalid response format');
      }

      return data.products;
    } catch (error) {
      console.error('Error calculating top products:', error);
      return [];
    }
  };

  // Update the useEffect to fetch sales trends data
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'analytics') {
      const fetchData = async () => {
        try {
          setLoading(true);
          const idToken = await getSupabaseAccessToken();
          if (!idToken) throw new Error('Admin token unavailable');

          const [ordersRes, topProducts, statsRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/completed-orders`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              }
            }),
            calculateTopProducts(),
            fetch(`${SERVER_URL}/api/stats`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              }
            })
          ]);

          if (!ordersRes.ok) throw new Error('Failed to load orders');
          if (!statsRes.ok) throw new Error('Failed to load stats');
          
          const { orders } = await ordersRes.json();
          const statsData = await statsRes.json();
          console.log('Received stats data:', statsData);
          
          setCompletedOrdersList(orders);
          setTopProducts(topProducts);
          
          // Ensure salesTrends has the correct structure and format
          const formattedTrends = {
            daily: Array.isArray(statsData?.salesTrends?.daily) ? statsData.salesTrends.daily.map((item: SalesData) => ({
              ...item,
              date: item.date,
              sales: Number(item.sales) || 0,
              refunds: Number(item.refunds) || 0,
              disputes: Number(item.disputes) || 0,
              disputesWon: Number(item.disputesWon) || 0
            })) : [],
            weekly: Array.isArray(statsData?.salesTrends?.weekly) ? statsData.salesTrends.weekly.map((item: SalesData) => ({
              ...item,
              date: item.date,
              sales: Number(item.sales) || 0,
              refunds: Number(item.refunds) || 0,
              disputes: Number(item.disputes) || 0,
              disputesWon: Number(item.disputesWon) || 0
            })) : [],
            monthly: Array.isArray(statsData?.salesTrends?.monthly) ? statsData.salesTrends.monthly.map((item: SalesData) => ({
              ...item,
              date: item.date,
              sales: Number(item.sales) || 0,
              refunds: Number(item.refunds) || 0,
              disputes: Number(item.disputes) || 0,
              disputesWon: Number(item.disputesWon) || 0
            })) : []
          };

          console.log('Formatted trends data:', formattedTrends);
          setSalesTrends(formattedTrends);

          // Set balance data
          if (Array.isArray(statsData?.balanceData)) {
            setBalanceData(statsData.balanceData.map((item: BalanceData) => ({
              ...item,
              current_balance: Number(item.current_balance) || 0,
              payouts: Number(item.payouts) || 0,
              net_transactions: Number(item.net_transactions) || 0,
              payments: Number(item.payments) || 0,
              refunds: Number(item.refunds) || 0,
              transfers: Number(item.transfers) || 0,
              chargeback_withdrawals: Number(item.chargeback_withdrawals) || 0,
              chargeback_reversals: Number(item.chargeback_reversals) || 0,
              other_adjustments: Number(item.other_adjustments) || 0,
              other_transactions: Number(item.other_transactions) || 0
            })));
          }

          // Use real stats from the server
          setStats({
            today: Number(statsData.today) || 0,
            week: Number(statsData.week) || 0,
            month: Number(statsData.month) || 0,
            users: statsData.users || { total: 0, newThisWeek: 0 },
            completedOrders: Number(statsData.completedOrders) || 0
          });

          setStatsLoading(false);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          setStatsLoading(false);
          // Set default values in case of error
          setSalesTrends({
            daily: [],
            weekly: [],
            monthly: []
          });
          setBalanceData([]);
          setStats({
            today: 0,
            week: 0,
            month: 0,
            users: { total: 0, newThisWeek: 0 },
            completedOrders: 0
          });
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [activeTab]);

  // Fetch all users when switching to users tab
  const fetchUsers = async () => {
    try {
      const idToken = await getSupabaseAccessToken();
      if (!idToken) throw new Error('Admin token unavailable');

      const res = await fetch(`${SERVER_URL}/api/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        }
      });
      if (!res.ok) throw new Error('Failed to load users');
      const { users } = await res.json();
      setUsersList(users);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error(t('admin.toast.categoriesLoadFail', 'Could not load categories.'));
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'categories' || activeTab === 'ebooks') {
      fetchCategories();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;

    const fetchSiteAnalytics = async () => {
      try {
        setSiteAnalyticsLoading(true);
        setSiteAnalyticsError(null);

        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) throw new Error('Admin user is not authenticated');

        const idToken = await getSupabaseAccessToken();
        if (!idToken) throw new Error('Admin token is not available');
        const response = await fetch(`${SERVER_URL}/api/site-analytics-summary?days=30`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to load site analytics (${response.status})`);
        }

        const summary = await response.json();
        setSiteAnalytics({
          totalPageViews: Number(summary.totalPageViews) || 0,
          uniqueVisitors: Number(summary.uniqueVisitors) || 0,
          topPages: Array.isArray(summary.topPages) ? summary.topPages : [],
          topCountries: Array.isArray(summary.topCountries) ? summary.topCountries : [],
          topReferrers: Array.isArray(summary.topReferrers) ? summary.topReferrers : [],
          topDevices: Array.isArray(summary.topDevices) ? summary.topDevices : [],
          topOperatingSystems: Array.isArray(summary.topOperatingSystems)
            ? summary.topOperatingSystems
            : [],
          dailyViews: Array.isArray(summary.dailyViews) ? summary.dailyViews : [],
          windowDays: Number(summary.windowDays) || 30,
        });
      } catch (error) {
        console.error('Error fetching site analytics:', error);
        setSiteAnalyticsError('Nao foi possivel carregar os dados de trafego.');
      } finally {
        setSiteAnalyticsLoading(false);
      }
    };

    fetchSiteAnalytics();
  }, [activeTab, SERVER_URL]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;

    const fetchLifecycleFunnel = async () => {
      try {
        setLifecycleFunnelLoading(true);
        const idToken = await getSupabaseAccessToken();
        if (!idToken) throw new Error('Admin token is not available');

        const response = await fetch(`${SERVER_URL}/api/lifecycle-funnel-summary?days=30`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to load lifecycle funnel (${response.status})`);
        }

        const data = await response.json();
        setLifecycleFunnel({
          windowDays: Number(data.windowDays) || 30,
          totals: {
            visits: Number(data?.totals?.visits) || 0,
            leads: Number(data?.totals?.leads) || 0,
            checkoutStarted: Number(data?.totals?.checkoutStarted) || 0,
            purchaseCompleted: Number(data?.totals?.purchaseCompleted) || 0,
          },
          conversionRates: {
            visitToLead: Number(data?.conversionRates?.visitToLead) || 0,
            leadToCheckout: Number(data?.conversionRates?.leadToCheckout) || 0,
            checkoutToPurchase: Number(data?.conversionRates?.checkoutToPurchase) || 0,
            visitToPurchase: Number(data?.conversionRates?.visitToPurchase) || 0,
          },
        });
      } catch (error) {
        console.error('Error fetching lifecycle funnel:', error);
      } finally {
        setLifecycleFunnelLoading(false);
      }
    };

    fetchLifecycleFunnel();
  }, [activeTab, SERVER_URL]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;

    const fetchStripeWebhookEvents = async () => {
      try {
        setStripeWebhookEventsLoading(true);
        setStripeWebhookEventsError(null);
        const idToken = await getSupabaseAccessToken();
        if (!idToken) throw new Error('Admin token is not available');

        const response = await fetch(`${SERVER_URL}/api/stripe-webhook-events?limit=50`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Failed to load Stripe webhook events (${response.status})`);
        }

        const data = await response.json();
        setStripeWebhookEvents(Array.isArray(data.webhookEvents) ? data.webhookEvents : []);
        setPurchaseEmailEvents(Array.isArray(data.purchaseEmailEvents) ? data.purchaseEmailEvents : []);
      } catch (error) {
        console.error('Error fetching Stripe webhook events:', error);
        setStripeWebhookEventsError(
          error instanceof Error ? error.message : t('admin.webhooks.loadFail', 'Could not load Stripe webhook events.')
        );
      } finally {
        setStripeWebhookEventsLoading(false);
      }
    };

    fetchStripeWebhookEvents();
  }, [activeTab, SERVER_URL, t]);

  useEffect(() => {
    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Dashboard auth check failed:', error);
      }
      const currentUser = data.user;
      setIsAuthenticated(!!currentUser);
      if (!currentUser) {
        navigate('/signin');
      } else if (!ALLOWED_ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase())) {
        navigate('/user-dashboard');
      }
    };

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setIsAuthenticated(!!currentUser);
      if (!currentUser) {
        navigate('/signin');
      } else if (!ALLOWED_ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase())) {
        navigate('/user-dashboard');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  if (!isAuthenticated) {
    return null; // Don't render anything while checking auth
  }

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      const idToken = await getSupabaseAccessToken();
      if (!idToken) throw new Error('Admin token unavailable');

      const response = await fetch(`${SERVER_URL}/api/users?uid=${encodeURIComponent(uid)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Remove user from the list
      setUsersList(prev => prev.filter(user => user.uid !== uid));
      toast.success(t('admin.toast.userDeleted', 'User deleted successfully'));
      setDeleteDialogOpen(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('admin.toast.userDeleteFail', 'Could not delete user.'));
    }
  };

  // Category management functions
  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error(t('admin.categories.nameRequired', 'Category name is required'));
      return;
    }

    try {
      await createCategory(categoryName.trim(), categoryDescription.trim() || undefined);
      toast.success(t('admin.toast.categoryCreated', 'Category created successfully'));
      setCategoryName('');
      setCategoryDescription('');
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.toast.categoryCreateFail', 'Could not create category.');
      console.error('Error creating category:', error);
      toast.error(errorMessage);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryName.trim()) {
      toast.error(t('admin.categories.nameRequired', 'Category name is required'));
      return;
    }

    try {
      await updateCategory(editingCategory.id, categoryName.trim(), categoryDescription.trim() || undefined);
      toast.success(t('admin.toast.categoryUpdated', 'Category updated successfully'));
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.toast.categoryUpdateFail', 'Could not update category.');
      console.error('Error updating category:', error);
      toast.error(errorMessage);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success(t('admin.toast.categoryDeleted', 'Category deleted successfully'));
      fetchCategories();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.toast.categoryDeleteFail', 'Could not delete category.');
      console.error('Error deleting category:', error);
      toast.error(errorMessage);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-full w-full overflow-x-hidden mt-[52px] pt-20 sm:pt-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {activeTab === 'overview' ? (
            <>
              <h1 className="text-3xl font-bold">{t('admin.panelTitle', 'Admin')}</h1>
              <p className="text-muted-foreground">{t('admin.welcome', 'Welcome back, admin')}</p>
            </>
          ) : (
            <h1 className="text-3xl font-bold">
              {activeTab === 'overview' && t('admin.tab.overview', 'Overview')}
              {activeTab === 'ebooks' && t('admin.tab.ebooks', 'eBooks')}
              {activeTab === 'analytics' && t('admin.tab.analytics', 'Analytics')}
              {activeTab === 'users' && t('admin.tab.users', 'Users')}
              {activeTab === 'orders' && t('admin.tab.orders', 'Completed orders')}
              {activeTab === 'curiosidades' && t('admin.tab.curiosidades', 'Insights')}
            </h1>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8 w-full">
          {/* Sales and User Overview Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 w-full">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.stats.today', 'Purchases today')}</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : stats.today
                    }
                  </h3>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <Progress value={75} className="mt-4" />
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.stats.week', 'Purchases this week')}</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : stats.week
                    }
                  </h3>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <Progress value={60} className="mt-4" />
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.stats.month', 'Purchases this month')}</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : stats.month
                    }
                  </h3>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <Progress value={85} className="mt-4" />
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.stats.usersTotal', 'Total users')}</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : stats.users.total
                    }
                  </h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="secondary">
                      {t('admin.stats.usersNewThisWeek', 'New this week: {count}').replace('{count}', String(stats.users.newThisWeek))}
                    </Badge>
                  </div>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>

          {/* Top Products and Pedidos Concluídos Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Produtos Mais Vendidos (2/3 width on lg) */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
                <CardDescription>{t('admin.topProducts.desc', 'Top selling products this month')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                            <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
                          </div>
                          <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.sales} vendas
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => onTabChange('analytics')}>
                  Ver Todos os Produtos
                </Button>
              </CardFooter>
            </Card>
            {/* Pedidos Concluídos (1/3 width on lg) */}
            <Card className="col-span-1 p-6 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('admin.orders.completed', 'Completed orders')}</p>
                    <h3 className="text-2xl font-bold">
                      {statsLoading
                        ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                        : stats.completedOrders
                      }
                    </h3>
                  </div>
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full" onClick={() => onTabChange('orders')}>
                  {t('admin.orders.view', 'View completed orders')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'ebooks' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Novo eBook</CardTitle>
              <CardDescription>{t('admin.ebooks.uploadDesc', 'Add a new eBook to the store')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <UploadEbookForm onUploadSuccess={handleUploadSuccess} />
              </div>
            </CardContent>
          </Card>

          {/* Categories Management Section */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">{t('admin.categories.title', 'Category management')}</h2>
                <p className="text-sm text-muted-foreground mt-1">Gerencie categorias para organizar seus eBooks</p>
              </div>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryDescription(''); }}>
                    {t('admin.categories.new', 'New category')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? t('admin.categories.editTitle', 'Edit category') : t('admin.categories.newTitle', 'New category')}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCategory
                        ? t('admin.categories.editDesc', 'Update category details')
                        : t('admin.categories.newDesc', 'Create a new category to organize your eBooks')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="categoryName">{t('admin.categories.nameLabel', 'Category name')} *</Label>
                      <Input
                        id="categoryName"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Ex: Autoajuda, Produtividade..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoryDescription">{t('admin.categories.descLabel', 'Description (optional)')}</Label>
                      <Textarea
                        id="categoryDescription"
                        value={categoryDescription}
                        onChange={(e) => setCategoryDescription(e.target.value)}
                        placeholder={t('admin.categories.descPlaceholder', 'Category description...')}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeCategoryDialog}>
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                      {editingCategory ? 'Atualizar' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">Nenhuma categoria criada ainda.</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('admin.categories.emptyHint', 'Click “New category” to get started.')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex-1">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete', 'Delete')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('admin.dialog.deleteTitle', 'Confirm delete')}</DialogTitle>
                              <DialogDescription>
                                {t('admin.categories.deleteConfirm', 'Are you sure you want to delete the category "{name}"? This action cannot be undone.')
                                  .replace('{name}', category.name)}
                                {' '}
                                {t('admin.categories.deleteNote', 'eBooks in this category will not be deleted, but will lose the category association.')}
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline">{t('common.cancel', 'Cancel')}</Button>
                              <Button variant="destructive" onClick={() => handleDeleteCategory(category.id)}>
                                {t('common.delete', 'Delete')}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">eBooks Enviados</h2>
            <EbookList key={refreshKey} />
          </Card>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6 w-full">
          <Card className="p-6 w-full">
            <CardHeader>
              <CardTitle>{t('admin.analytics.trafficTitle', 'Site traffic')}</CardTitle>
              <CardDescription>
                Dados coletados diretamente no site nos ultimos {siteAnalytics.windowDays} dias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {siteAnalyticsError && (
                <p className="text-sm text-destructive">{siteAnalyticsError}</p>
              )}
              {siteAnalyticsLoading ? (
                <p className="text-sm text-muted-foreground">{t('admin.analytics.loadingTraffic', 'Loading traffic...')}</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Visualizacoes de pagina</p>
                      <p className="text-2xl font-bold">{siteAnalytics.totalPageViews.toLocaleString('pt-BR')}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Visitantes unicos</p>
                      <p className="text-2xl font-bold">{siteAnalytics.uniqueVisitors.toLocaleString('pt-BR')}</p>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Paises</h3>
                      <div className="space-y-3">
                        {siteAnalytics.topCountries.length === 0 && (
                          <p className="text-sm text-muted-foreground">{t('admin.analytics.noData', 'No data yet.')}</p>
                        )}
                        {siteAnalytics.topCountries.map((item) => (
                          <div key={item.country} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.country}</span>
                              <span>{item.views}</span>
                            </div>
                            <Progress
                              value={siteAnalytics.totalPageViews > 0 ? (item.views / siteAnalytics.totalPageViews) * 100 : 0}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Paginas mais vistas</h3>
                      <div className="space-y-2">
                        {siteAnalytics.topPages.length === 0 && (
                          <p className="text-sm text-muted-foreground">{t('admin.analytics.noData', 'No data yet.')}</p>
                        )}
                        {siteAnalytics.topPages.map((item) => (
                          <div key={item.page} className="flex justify-between text-sm border-b pb-1">
                            <span className="truncate max-w-[75%]">{item.page}</span>
                            <span>{item.views}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Referenciadores</h3>
                      <div className="space-y-3">
                        {siteAnalytics.topReferrers.length === 0 && (
                          <p className="text-sm text-muted-foreground">{t('admin.analytics.noData', 'No data yet.')}</p>
                        )}
                        {siteAnalytics.topReferrers.map((item) => (
                          <div key={item.referrer} className="space-y-1">
                            <div className="flex justify-between text-sm gap-2">
                              <span className="truncate max-w-[75%]" title={item.referrer}>
                                {item.referrer}
                              </span>
                              <span>{item.views}</span>
                            </div>
                            <Progress
                              value={
                                siteAnalytics.totalPageViews > 0
                                  ? (item.views / siteAnalytics.totalPageViews) * 100
                                  : 0
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Dispositivos</h3>
                      <div className="space-y-3">
                        {siteAnalytics.topDevices.length === 0 && (
                          <p className="text-sm text-muted-foreground">{t('admin.analytics.noData', 'No data yet.')}</p>
                        )}
                        {siteAnalytics.topDevices.map((item) => (
                          <div key={item.device} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.device}</span>
                              <span>{item.views}</span>
                            </div>
                            <Progress
                              value={
                                siteAnalytics.totalPageViews > 0
                                  ? (item.views / siteAnalytics.totalPageViews) * 100
                                  : 0
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Sistemas operacionais</h3>
                      <div className="space-y-3">
                        {siteAnalytics.topOperatingSystems.length === 0 && (
                          <p className="text-sm text-muted-foreground">{t('admin.analytics.noData', 'No data yet.')}</p>
                        )}
                        {siteAnalytics.topOperatingSystems.map((item) => (
                          <div key={item.os} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.os}</span>
                              <span>{item.views}</span>
                            </div>
                            <Progress
                              value={
                                siteAnalytics.totalPageViews > 0
                                  ? (item.views / siteAnalytics.totalPageViews) * 100
                                  : 0
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">{t('admin.analytics.dailyTrend', 'Daily views trend')}</h3>
                    <SiteTrafficDailyChart data={siteAnalytics.dailyViews} />
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 w-full">
            <SalesTrendsChart
              dailyData={salesTrends.daily}
              weeklyData={salesTrends.weekly}
              monthlyData={salesTrends.monthly}
            />
            <StripeBalanceChart data={balanceData} />
          </div>

          <Card className="p-6 w-full">
            <CardHeader>
              <CardTitle>{t('admin.webhooks.title', 'Stripe webhooks')}</CardTitle>
              <CardDescription>
                {t('admin.webhooks.desc', 'Latest webhook deliveries and purchase email processing status.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stripeWebhookEventsError && (
                <p className="text-sm text-destructive">{stripeWebhookEventsError}</p>
              )}

              {stripeWebhookEventsLoading ? (
                <p className="text-sm text-muted-foreground">{t('admin.webhooks.loading', 'Loading webhook events...')}</p>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">{t('admin.webhooks.eventsTitle', 'Webhook events')}</h3>
                    {stripeWebhookEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('admin.analytics.noData', 'No data yet.')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.time', 'Time')}</th>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.type', 'Type')}</th>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.session', 'Session')}</th>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.eventId', 'Event ID')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stripeWebhookEvents.slice(0, 50).map((row) => (
                              <tr key={row.event_id} className="border-t">
                                <td className="py-2 px-2 text-sm">
                                  {new Date(row.processed_at).toLocaleString(language === 'en' ? 'en' : 'pt-BR')}
                                </td>
                                <td className="py-2 px-2 text-sm">
                                  <Badge variant="outline">{row.event_type}</Badge>
                                </td>
                                <td className="py-2 px-2 text-sm font-mono">{row.session_id || '—'}</td>
                                <td className="py-2 px-2 text-sm font-mono">{row.event_id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">{t('admin.webhooks.emailsTitle', 'Purchase emails')}</h3>
                    {purchaseEmailEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('admin.analytics.noData', 'No data yet.')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.email', 'Email')}</th>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.status', 'Status')}</th>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.sentAt', 'Sent')}</th>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.session', 'Session')}</th>
                              <th className="py-2 px-2 border-b font-medium">{t('admin.webhooks.col.error', 'Error')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchaseEmailEvents.slice(0, 50).map((row) => (
                              <tr key={row.session_id} className="border-t">
                                <td className="py-2 px-2 text-sm">{row.customer_email}</td>
                                <td className="py-2 px-2 text-sm">
                                  <Badge variant={row.status === 'sent' ? 'default' : 'outline'}>
                                    {row.status}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2 text-sm">
                                  {row.sent_at
                                    ? new Date(row.sent_at).toLocaleString(language === 'en' ? 'en' : 'pt-BR')
                                    : '—'}
                                </td>
                                <td className="py-2 px-2 text-sm font-mono">{row.session_id}</td>
                                <td className="py-2 px-2 text-sm max-w-[360px] truncate" title={row.last_error || ''}>
                                  {row.last_error || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-6 w-full">
            <CardHeader>
              <CardTitle>{t('admin.analytics.funnelTitle', 'Conversion funnel')}</CardTitle>
              <CardDescription>
                Jornada de visitas ate compras nos ultimos {lifecycleFunnel.windowDays} dias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lifecycleFunnelLoading ? (
                <p className="text-sm text-muted-foreground">{t('admin.analytics.loadingFunnel', 'Loading funnel...')}</p>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Visitas</p>
                      <p className="text-2xl font-bold">{lifecycleFunnel.totals.visits.toLocaleString('pt-BR')}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Leads</p>
                      <p className="text-2xl font-bold">{lifecycleFunnel.totals.leads.toLocaleString('pt-BR')}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Checkout iniciado</p>
                      <p className="text-2xl font-bold">{lifecycleFunnel.totals.checkoutStarted.toLocaleString('pt-BR')}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Compras</p>
                      <p className="text-2xl font-bold">{lifecycleFunnel.totals.purchaseCompleted.toLocaleString('pt-BR')}</p>
                    </Card>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Visita → Lead</p>
                      <p className="text-xl font-semibold">{lifecycleFunnel.conversionRates.visitToLead}%</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Lead → Checkout</p>
                      <p className="text-xl font-semibold">{lifecycleFunnel.conversionRates.leadToCheckout}%</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Checkout → Compra</p>
                      <p className="text-xl font-semibold">{lifecycleFunnel.conversionRates.checkoutToPurchase}%</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Visita → Compra</p>
                      <p className="text-xl font-semibold">{lifecycleFunnel.conversionRates.visitToPurchase}%</p>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 w-full">
          <Card className="p-6 w-full">
            <h2 className="text-xl font-semibold mb-6">{t('admin.users.title', 'User management')}</h2>
            <div className="space-y-4 w-full">
              {usersList.map((user) => (
                <div
                  key={user.uid}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg w-full gap-4"
                >
                  <div className="flex items-center gap-4 w-full">
                    <Avatar>
                      <AvatarImage src={user.photoURL || undefined} />
                      <AvatarFallback>{user.displayName?.[0] || user.email?.[0] || user.uid}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                      <h3 className="font-medium break-words">{user.displayName || user.email || user.uid}</h3>
                      <p className="text-sm text-muted-foreground break-words">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (user.email) {
                          navigator.clipboard.writeText(user.email);
                          toast.success(t('admin.toast.emailCopiedToClipboard', 'Email copied to clipboard'));
                        }
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Dialog open={deleteDialogOpen === user.uid} onOpenChange={(open) => setDeleteDialogOpen(open ? user.uid : null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('admin.dialog.deleteTitle', 'Confirm delete')}</DialogTitle>
                          <DialogDescription>
                            {t('admin.users.deleteConfirm', 'Are you sure you want to delete the account for {name}? This action cannot be undone.')
                              .replace('{name}', user.email || user.displayName || user.uid)}
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>
                            {t('common.cancel', 'Cancel')}
                          </Button>
                          <Button variant="destructive" onClick={() => handleDeleteUser(user.uid)}>
                            {t('admin.users.deleteAccount', 'Delete account')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6 w-full">
          <Card className="p-6 w-full">
            <CardHeader>
              <CardTitle>{t('admin.orders.allTitle', 'All completed orders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4 w-full">
                <div className="flex-grow w-full">
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, email, data ou item"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full border px-3 py-1 rounded"
                  />
                </div>
                <div className="flex space-x-2 w-full md:w-auto">
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="border px-2 py-1 rounded w-full md:w-auto" />
                  <input type="date" value={dateRange.end}   onChange={e => setDateRange({...dateRange, end: e.target.value})  } className="border px-2 py-1 rounded w-full md:w-auto" />
                </div>
              </div>
              <div className="overflow-x-auto w-full">
                {/* Mobile: Simple Table */}
                <table className="min-w-full text-left whitespace-nowrap md:hidden">
                  <thead>
                    <tr>
                      <th style={{ color: '#808000' }}>Name</th>
                      <th style={{ color: '#808000' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(o => (
                      <tr key={o.id} className="border-t hover:bg-gray-50">
                        <td>
                          <div className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap" title={o.name}>
                            {o.name}
                          </div>
                        </td>
                        <td>{new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Desktop: Full Table */}
                <table className="min-w-full text-left whitespace-nowrap hidden md:table">
                  <thead>
                    <tr>
                      <th style={{ color: '#808000' }}>Date</th>
                      <th style={{ color: '#808000' }}>Name</th>
                      <th style={{ color: '#808000' }}>Email</th>
                      <th style={{ color: '#808000' }}>Total</th>
                      <th style={{ color: '#808000' }}>Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(o => (
                      <Fragment key={o.id}>
                        <tr
                          className="border-t hover:bg-gray-50"
                        >
                          <td>{new Date(o.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</td>
                          <td>
                            <div className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap" title={o.name}>
                              {o.name}
                            </div>
                          </td>
                          <td
                            onMouseEnter={() => setHoverEmail(o.id)}
                            onMouseLeave={() => setHoverEmail(null)}
                            className="relative"
                          >
                            <div className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap" title={o.email}>
                              {o.email}
                            </div>
                            {hoverEmail === o.id && (
                              <Copy className="absolute right-1 top-1 cursor-pointer" onClick={() => copyEmail(o.email)} />
                            )}
                          </td>
                          <td>{new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(o.total)}</td>
                          <td style={{ color: '#8B4513' }}>
                            <button className="text-[#8B4513] hover:underline" onClick={() => toggleRow(o.id)}>
                              {o.items.length} item{o.items.length>1?'s':''}
                            </button>
                          </td>
                        </tr>
                        {expandedRows.has(o.id) && (
                          <tr className="bg-gray-100">
                            <td colSpan={5} className="p-4">
                              <div className="space-y-4">
                                {o.items.map((item, i) => (
                                  <div key={i} className="grid grid-cols-3 gap-4 items-center">
                                    <div style={{ color: '#808000' }} className="font-medium" title={item.name}>
                                      {item.name.length > 40 ? item.name.slice(0, 40) + '...' : item.name}
                                    </div>
                                    <div className="text-gray-600">Format: PDF</div>
                                    <div className="text-gray-600">Price: {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL'
                                    }).format(item.price)}</div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex justify-center mt-4 space-x-2">
                <Button variant="outline" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>{t('common.prev', 'Previous')}</Button>
                <span>{t('admin.pagination.pageOf', 'Page {page} of {total}').replace('{page}', String(currentPage)).replace('{total}', String(totalPages))}</span>
                <Button variant="outline" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>{t('common.next', 'Next')}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'curiosidades' && (
        <div className="space-y-6 w-full">
          <CuriosidadesList />
        </div>
      )}
    </div>
  );
} 