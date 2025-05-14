import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Download, Eye, Copy, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

interface Ebook {
  id: string;
  title: string;
  description: string;
  price: number;
  filename: string;
  cover_url: string;
  created_at: string;
}

interface CompletedOrder {
  id: string;
  email: string;
  date: string;
  name: string;
  total: number;
  items: Array<{
    name: string;
    price: number;
  }>;
}

interface UserDashboardProps {
  activeTab: 'overview' | 'ebooks' | 'orders' | 'newsletter' | 'settings';
}

const DEFAULT_COVER_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NDc0OGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBDb3ZlcjwvdGV4dD48L3N2Zz4=';

const UserDashboard = ({ activeTab }: UserDashboardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hoverEmail, setHoverEmail] = useState<string | null>(null);
  const [userEbooks, setUserEbooks] = useState<Ebook[]>([]);
  const [completedOrdersList, setCompletedOrdersList] = useState<CompletedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  const capitalizeName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const fetchUserOrders = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/completed-orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const { orders } = await res.json();
      if (user?.email) {
        const userOrders = orders.filter((o: CompletedOrder) => o.email === user.email);
        setCompletedOrdersList(userOrders);
        
        // Get unique ebook titles from orders
        const orderedEbookTitles = new Set(userOrders.flatMap((order: CompletedOrder) => 
          order.items.map((item: { name: string; price: number }) => item.name)
        ));

        // Fetch ebooks from Supabase
        const { data: ebooks, error } = await supabase
          .from('ebooks_metadata')
          .select('*')
          .in('title', Array.from(orderedEbookTitles));

        if (error) throw error;

        if (ebooks) {
          const ebooksWithCoverUrls = ebooks.map(ebook => ({
            ...ebook,
            cover_url: ebook.filename 
              ? supabase.storage.from('store-assets').getPublicUrl(`covers/${ebook.filename}`).data.publicUrl 
              : DEFAULT_COVER_DATA_URL
          }));
          setUserEbooks(ebooksWithCoverUrls);
        }
      }
    } catch (err) {
      console.error('Error fetching orders and ebooks:', err);
      toast.error('Failed to load your ebooks');
    }
  };

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/signin');
      } else if (!user.emailVerified) {
        navigate('/check-email');
      } else {
        setUser(user);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if ((activeTab === 'orders' || activeTab === 'ebooks') && user) {
      fetchUserOrders();
    }
  }, [activeTab, user]);

  const handleNewsletterToggle = () => {
    setIsSubscribed(!isSubscribed);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 pb-24">
      {/* Header */}
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {activeTab === 'overview' && 'Visão Geral'}
            {activeTab === 'ebooks' && 'Meus eBooks'}
            {activeTab === 'orders' && 'Meus Pedidos'}
            {activeTab === 'newsletter' && 'Newsletter'}
            {activeTab === 'settings' && 'Configurações'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {activeTab === 'overview' && 'Uma visão geral da sua conta e atividades'}
            {activeTab === 'ebooks' && 'Gerencie seus eBooks e downloads'}
            {activeTab === 'orders' && 'Acompanhe seus pedidos e compras'}
            {activeTab === 'newsletter' && 'Gerencie suas preferências de newsletter'}
            {activeTab === 'settings' && 'Configure as configurações da sua conta'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Purchased eBooks Section */}
            <Card>
              <CardHeader>
                <CardTitle>Meus eBooks</CardTitle>
                <CardDescription>
                  {userEbooks.length > 0 
                    ? `Você tem ${userEbooks.length} eBook${userEbooks.length !== 1 ? 's' : ''}`
                    : 'Você ainda não comprou nenhum eBook'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userEbooks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userEbooks.slice(0, 3).map((ebook) => (
                      <div key={ebook.id} className="flex items-center space-x-4">
                        <img
                          src={ebook.cover_url || DEFAULT_COVER_DATA_URL}
                          alt={ebook.title}
                          className="w-16 h-20 object-cover rounded"
                        />
                        <div>
                          <h3 className="font-medium">{ebook.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Comprado em {new Date(ebook.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Button onClick={() => navigate('/shop')}>
                    Explorar eBooks
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Orders Section */}
            <Card>
              <CardHeader>
                <CardTitle>Últimos Pedidos</CardTitle>
                <CardDescription>
                  {completedOrdersList.length > 0 
                    ? `Você tem ${completedOrdersList.length} pedido${completedOrdersList.length !== 1 ? 's' : ''}`
                    : 'Você ainda não fez nenhum pedido'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedOrdersList.length > 0 ? (
                  <div className="space-y-4">
                    {completedOrdersList.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Pedido em {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {order.total > 0 ? 'Concluído' : 'Em processamento'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Button onClick={() => navigate('/shop')}>
                    Ver Pedidos
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Newsletter Section */}
            <Card>
              <CardHeader>
                <CardTitle>Newsletter</CardTitle>
                <CardDescription>
                  Mantenha-se atualizado com nossas novidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Status da Inscrição</p>
                    <p className="text-sm text-muted-foreground">
                      {isSubscribed ? 'Inscrito' : 'Não inscrito'}
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleNewsletterToggle}>
                    {isSubscribed ? 'Cancelar Inscrição' : 'Inscrever-se'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Store Button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => navigate('/store')}>
                Ver Nossa Loja
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'ebooks' && (
          <div className="space-y-8">
            {userEbooks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Você ainda não comprou nenhum eBook.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                  Procurar eBooks
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
                              Visualizar
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
                                  toast.error('Failed to download the file');
                                }
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Baixar
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
                <CardTitle>Histórico de Pedidos</CardTitle>
                <CardDescription>Visualize todos os seus pedidos e compras</CardDescription>
              </CardHeader>
              <CardContent>
                {completedOrdersList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-muted-foreground">Você ainda não fez nenhuma compra.</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                      Procurar eBooks
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <table className="w-full text-left whitespace-nowrap min-w-[300px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">Data</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">Itens</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">Total</th>
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
                              {new Date(order.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-2 px-1 sm:px-4">
                              {order.items.length} item{order.items.length>1?'s':''}
                            </td>
                            <td className="py-2 px-1 sm:px-4">
                              {new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(order.total)}
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

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-[600px] [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:hover:ring-0 focus:ring-0 focus:ring-offset-0 hover:ring-0 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:outline-none [&>button]:focus:outline-none [&>button]:focus-visible:ring-0 [&>button]:focus-visible:ring-offset-0 [&>button]:focus-visible:outline-none [&_[data-dialog-overlay]]:ring-0 [&_[data-dialog-overlay]]:ring-offset-0 [&_[data-dialog-overlay]]:outline-none [&_[data-dialog-overlay]]:focus:ring-0 [&_[data-dialog-overlay]]:focus:ring-offset-0 [&_[data-dialog-overlay]]:focus:outline-none">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido</DialogTitle>
              <DialogDescription>
                {selectedOrder && new Date(selectedOrder.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Nome</h4>
                    <p>{capitalizeName(selectedOrder.name)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                    <p>{selectedOrder.email}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Itens</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="font-medium">Total</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(selectedOrder.total)}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {activeTab === 'newsletter' && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Newsletter</CardTitle>
                <CardDescription>
                  Receba atualizações e conteúdo exclusivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <p className="text-muted-foreground mb-6">
                    Inscreva-se para receber as últimas notícias, eBooks e conteúdo exclusivo.
                  </p>
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleNewsletterToggle}
                      variant={isSubscribed ? 'outline' : 'default'}
                    >
                      {isSubscribed ? 'Cancelar Inscrição' : 'Inscrever-se'}
                    </Button>
                    {isSubscribed && (
                      <p className="text-sm text-muted-foreground">
                        Você está inscrito na newsletter
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Conta</CardTitle>
                <CardDescription>
                  Gerencie suas preferências e informações da conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium mb-6">Informações da Conta</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Email
                        </label>
                        <p className="text-sm">{user.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Conta criada em
                        </label>
                        <p className="text-sm">
                          {user.metadata.creationTime
                            ? new Date(user.metadata.creationTime).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard; 