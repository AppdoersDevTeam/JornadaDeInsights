import { useState, useEffect, Fragment, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  FileText,
  BarChart3,
  Edit,
  Users,
  Upload,
  Trash2,
  Eye,
  Download,
  Mail,
  Lock,
  Check,
  PieChart,
  LineChart,
  Bell,
  Bold,
  Italic,
  Underline,
  Link as IconLink,
  Image as IconImage,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import UploadEbookForm from '@/components/dashboard/upload-ebook-form';
import EbookList from '@/components/dashboard/ebook-list';
import { SalesTrendsChart, SalesData } from '@/components/dashboard/sales-trends-chart';
import { StripeBalanceChart, BalanceData } from '@/components/dashboard/stripe-balance-chart';
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

const ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'admin@jornadadeinsights.com'
];

export function DashboardPage({ activeTab, onTabChange }: DashboardPageProps) {
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

  // Constants
  const itemsPerPage = 20; // Show 20 orders per page in completed orders tab
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
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
    toast.success('Email copied');
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
          const [ordersRes, topProducts, statsRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/completed-orders`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            }),
            calculateTopProducts(),
            fetch(`${SERVER_URL}/api/stats`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
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
      const res = await fetch(`${SERVER_URL}/api/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to load users');
      const { users } = await res.json();
      setUsersList(users);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Dashboard auth state:', user);
      setIsAuthenticated(!!user);
      
      if (!user) {
        console.log('No authenticated user, redirecting to sign in');
        navigate('/signin');
      } else if (!ALLOWED_ADMIN_EMAILS.includes(user.email || '')) {
        console.log('Non-admin user, redirecting to user dashboard');
        navigate('/user-dashboard');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (!isAuthenticated) {
    return null; // Don't render anything while checking auth
  }

  const contentData = {
    recentUpdates: [
      { page: 'About', action: 'Updated content', date: '2024-03-15' },
      { page: 'FAQ', action: 'Added new question', date: '2024-03-14' },
      { page: 'Contact', action: 'Updated contact information', date: '2024-03-13' },
    ]
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate upload
      setTimeout(() => {
      }, 2000);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/users/${uid}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Remove user from the list
      setUsersList(prev => prev.filter(user => user.uid !== uid));
      toast.success('Usuário deletado com sucesso');
      setDeleteDialogOpen(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao deletar usuário');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-full w-full overflow-x-hidden mt-[52px] pt-20 sm:pt-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {activeTab === 'overview' ? (
            <>
              <h1 className="text-3xl font-bold">Painel de Controle</h1>
              <p className="text-muted-foreground">Bem-vindo de volta, Administrador</p>
            </>
          ) : (
            <h1 className="text-3xl font-bold">
              {activeTab === 'overview' && 'Visão Geral'}
              {activeTab === 'ebooks' && 'eBooks'}
              {activeTab === 'analytics' && 'Análises'}
              {activeTab === 'content' && 'Conteúdo'}
              {activeTab === 'users' && 'Usuários'}
              {activeTab === 'orders' && 'Pedidos Concluídos'}
              {activeTab === 'settings' && 'Configurações'}
            </h1>
          )}
        </div>
        {activeTab === 'overview' && (
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Input
              type="search"
              placeholder="Pesquisar..."
              className="w-full max-w-xs md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline" className="shrink-0">
              <Bell className="mr-2 h-4 w-4" />
              Notificações
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8 w-full">
          {/* Sales and User Overview Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 w-full">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compras de Hoje</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(stats.today)
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
                  <p className="text-sm font-medium text-muted-foreground">Compras da Semana</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(stats.week)
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
                  <p className="text-sm font-medium text-muted-foreground">Compras do Mês</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(stats.month)
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
                  <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                  <h3 className="text-2xl font-bold">
                    {statsLoading
                      ? <span className="inline-block h-8 w-20 bg-gray-200 animate-pulse rounded" />
                      : stats.users.total
                    }
                  </h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="secondary">Novos esta semana: {stats.users.newThisWeek}</Badge>
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
                <CardDescription>Produtos mais vendidos este mês</CardDescription>
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
                            {product.sales} sales
                          </p>
                        </div>
                        <p className="font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(product.revenue)}
                        </p>
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
                    <p className="text-sm font-medium text-muted-foreground">Pedidos Concluídos</p>
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
                  Ver Pedidos Concluídos
                </Button>
              </div>
            </Card>
          </div>

          {/* Insights Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
            <Card className="p-6">
              <CardHeader>
                <CardTitle>Atualizações Recentes de Conteúdo</CardTitle>
                <CardDescription>Alterações recentes no conteúdo do seu site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contentData.recentUpdates.map((update, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{update.page}</p>
                        <p className="text-sm text-muted-foreground">
                          {update.action} • {update.date}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Ver Todas as Atualizações
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'ebooks' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Novo eBook</CardTitle>
              <CardDescription>Adicionar um novo eBook à loja</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <UploadEbookForm onUploadSuccess={handleUploadSuccess} />
              </div>
            </CardContent>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">eBooks Enviados</h2>
            <EbookList key={refreshKey} />
          </Card>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6 w-full">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 w-full">
            <SalesTrendsChart
              dailyData={salesTrends.daily}
              weeklyData={salesTrends.weekly}
              monthlyData={salesTrends.monthly}
            />
            <StripeBalanceChart data={balanceData} />
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
            {/* Content Navigation Panel */}
            <div className="col-span-1 md:col-span-3">
              <Card className="p-4">
                <nav className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Páginas
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Posts do Blog
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <IconImage className="mr-2 h-4 w-4" />
                    Biblioteca de Mídia
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <IconLink className="mr-2 h-4 w-4" />
                    Links
                  </Button>
                </nav>
              </Card>
            </div>

            {/* Content Editor */}
            <div className="col-span-1 md:col-span-9">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="page-title" className="text-sm font-medium">Título da Página</Label>
                    <Input
                      id="page-title"
                      placeholder="Digite o título da página"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="page-content" className="text-sm font-medium">Conteúdo</Label>
                    <div className="mt-2 border rounded-lg">
                      <div className="border-b p-2 flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Underline className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <Button variant="ghost" size="icon">
                          <IconLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <IconImage className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        id="page-content"
                        placeholder="Digite o conteúdo da página..."
                        rows={10}
                        className="border-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  {/* Save Changes Button */}
                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto">
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 w-full">
          <Card className="p-6 w-full">
            <h2 className="text-xl font-semibold mb-6">Gerenciamento de Usuários</h2>
            <div className="space-y-4 w-full">
              {usersList.map((user) => (
                <div
                  key={user.uid}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg w-full gap-4"
                >
                  <div className="flex items-center gap-4 w-full">
                    <Avatar>
                      <AvatarImage src={user.photoURL ? `${SERVER_URL}/user-photo/${user.uid}` : undefined} />
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
                          toast.success('Email copiado para a área de transferência');
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
                          <DialogTitle>Confirmar Exclusão</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir a conta de {user.email || user.displayName || user.uid}? Esta ação não pode ser desfeita.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>
                            Cancelar
                          </Button>
                          <Button variant="destructive" onClick={() => handleDeleteUser(user.uid)}>
                            Deletar Conta
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

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Settings Header */}
          <div className="mb-8">
            <p className="text-muted-foreground">
              Personalize as configurações básicas do site e ative recursos como modo escuro ou modo de manutenção.
            </p>
          </div>

          <Card className="p-6">
            <div className="space-y-8">
              {/* Site Title */}
              <div>
                <Label htmlFor="site-title" className="text-sm font-medium">Título do Site</Label>
                <Input
                  id="site-title"
                  placeholder="Digite o título do seu site aqui"
                  defaultValue="Minha Plataforma"
                  className="mt-2"
                />
              </div>

              {/* Site Description */}
              <div>
                <Label htmlFor="site-description" className="text-sm font-medium">Descrição do Site</Label>
                <Textarea
                  id="site-description"
                  placeholder="Digite uma breve descrição da sua plataforma"
                  defaultValue="Bem-vindo à nossa plataforma..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* Maintenance Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance-mode" className="text-sm font-medium">Modo de Manutenção</Label>
                  <p className="text-sm text-muted-foreground">
                    Ative o modo de manutenção para desativar temporariamente o site
                  </p>
                </div>
                <Switch id="maintenance-mode" />
              </div>

              {/* Dark Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode" className="text-sm font-medium">Modo Escuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Ative o modo escuro para a interface administrativa
                  </p>
                </div>
                <Switch id="dark-mode" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Completed Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6 w-full">
          <Card className="p-6 w-full">
            <CardHeader>
              <CardTitle>Todos os Pedidos Concluídos</CardTitle>
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
                        <td>{new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
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
                          <td>{new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
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
                                    <div className="text-gray-600">Price: {new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: 'USD'
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
                <Button variant="outline" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>Anterior</Button>
                <span>Página {currentPage} de {totalPages}</span>
                <Button variant="outline" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>Próximo</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 