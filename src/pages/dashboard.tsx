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
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, completedOrders: 0, users: { total: 0, newThisWeek: 0 } });
  const [statsLoading, setStatsLoading] = useState(true);
  const [completedOrdersList, setCompletedOrdersList] = useState<CompletedOrder[]>([]);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Constants
  const itemsPerPage = 20;
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
  const fetchCompletedOrders = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/completed-orders`);
      if (!res.ok) throw new Error('Failed to load orders');
      const { orders } = await res.json();
      setCompletedOrdersList(orders);
    } catch (err) {
      console.error('Error loading completed orders:', err);
    }
  };
  // Fetch all orders when switching to orders tab
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchCompletedOrders();
    }
  }, [activeTab]);
  // Fetch all users when switching to users tab
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/users`);
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
    setStatsLoading(true);
    // Compute local midnight thresholds
    const now = new Date();
    // Start of today local midnight
    const dayStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
    // Start of week as sliding last 7 days (from local midnight today)
    const weekStart = dayStart - 7 * 24 * 60 * 60;
    // Start of month local midnight
    const monthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    // Fetch stats with timezone-aware thresholds
    fetch(`${SERVER_URL}/api/stats?dayStart=${dayStart}&weekStart=${weekStart}&monthStart=${monthStart}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
        console.error('Error fetching stats:', err);
        setStats({ today: 0, week: 0, month: 0, completedOrders: 0, users: { total: 0, newThisWeek: 0 } });
      })
      .finally(() => setStatsLoading(false));
  }, []);

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

  // Mock data for demonstration
  const salesData = {
    today: 1250,
    todayChange: 5.2,
    week: 8750,
    weekChange: -2.1,
    month: 32500,
    monthChange: 8.5,
    topProducts: [
      { name: 'Mindfulness Guide', sales: 450, revenue: 2250, stock: 25, image: 'https://i.pravatar.cc/150?u=1' },
      { name: 'Productivity Masterclass', sales: 380, revenue: 1900, stock: 15, image: 'https://i.pravatar.cc/150?u=2' },
      { name: 'Stress Management', sales: 290, revenue: 1450, stock: 10, image: 'https://i.pravatar.cc/150?u=3' },
    ],
    recentSales: [
      { id: 1, product: 'Mindfulness Guide', customer: 'John Doe', amount: 49.99, date: '2024-03-15', status: 'completed' },
      { id: 2, product: 'Productivity Masterclass', customer: 'Jane Smith', amount: 99.99, date: '2024-03-15', status: 'completed' },
      { id: 3, product: 'Stress Management', customer: 'Mike Johnson', amount: 29.99, date: '2024-03-14', status: 'completed' },
    ],
    salesTrends: {
      daily: [
        { date: '2024-03-09', amount: 1200 },
        { date: '2024-03-10', amount: 1350 },
        { date: '2024-03-11', amount: 1100 },
        { date: '2024-03-12', amount: 1450 },
        { date: '2024-03-13', amount: 1300 },
        { date: '2024-03-14', amount: 1500 },
        { date: '2024-03-15', amount: 1250 },
      ],
      weekly: [
        { week: 'Week 1', amount: 8500 },
        { week: 'Week 2', amount: 9200 },
        { week: 'Week 3', amount: 7800 },
        { week: 'Week 4', amount: 8750 },
      ],
      monthly: [
        { month: 'Jan', amount: 28000 },
        { month: 'Feb', amount: 32000 },
        { month: 'Mar', amount: 32500 },
      ]
    },
    revenueBreakdown: [
      { product: 'Mindfulness Guide', revenue: 2250, percentage: 35 },
      { product: 'Productivity Masterclass', revenue: 1900, percentage: 30 },
      { product: 'Stress Management', revenue: 1450, percentage: 22 },
      { product: 'Others', revenue: 900, percentage: 13 },
    ]
  };

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

  return (
    <div className="p-4 sm:p-6 max-w-full w-full overflow-x-hidden mt-[62px] pt-20 sm:pt-6">
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
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
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
                  <p className="text-sm font-medium text-muted-foreground">Compras da Semana</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Compras do Mês</p>
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

          {/* Insights Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
            <Card className="p-6">
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
              <Button variant="outline" className="w-full mt-4" onClick={() => onTabChange('orders')}>
                Ver Pedidos Concluídos
              </Button>
            </Card>
            <Card className="p-6">
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
                <CardDescription>Produtos mais vendidos este mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.sales} vendas
                        </p>
                      </div>
                      <p className="font-medium">${product.revenue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Ver Todos os Produtos
                </Button>
              </CardFooter>
            </Card>
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
            <Card className="p-6 w-full">
              <CardHeader>
                <CardTitle>Tendências de Vendas</CardTitle>
                <CardDescription>Dados de vendas diários, semanais e mensais</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center w-full min-h-[120px]">
                  <div className="text-center w-full">
                    <LineChart className="h-12 w-12 mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">O gráfico de tendências de vendas será exibido aqui</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Ver Tendências Detalhadas
                </Button>
              </CardFooter>
            </Card>
            <Card className="p-6 w-full">
              <CardHeader>
                <CardTitle>Análise de Receita</CardTitle>
                <CardDescription>Distribuição de receita por produto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center w-full min-h-[120px]">
                  <div className="text-center w-full">
                    <PieChart className="h-12 w-12 mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">O gráfico de análise de receita será exibido aqui</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Ver Detalhes da Receita
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Export Options */}
          <Card className="p-6 w-full">
            <CardHeader>
              <CardTitle>Exportar Relatórios</CardTitle>
              <CardDescription>Baixar relatórios de vendas em vários formatos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full">
                <Button variant="outline" className="flex-1 w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar como CSV
                </Button>
                <Button variant="outline" className="flex-1 w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar como PDF
                </Button>
                <Button variant="outline" className="flex-1 w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar como Excel
                </Button>
              </div>
            </CardContent>
          </Card>
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
                    <Button variant="ghost" size="icon">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Lock className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                        <td>{new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(o.total)}</td>
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
                          <td>{new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(o.total)}</td>
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
                                    <div className="text-gray-600">Price: {new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(item.price)}</div>
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