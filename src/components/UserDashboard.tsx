import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Download, Eye, Copy, X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Fragment } from 'react';
import { supabase } from '@/lib/supabase';
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
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { loadStripe } from '@stripe/stripe-js';
import type { Ebook } from '@/components/shop/ebook-card';

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
  activeTab: 'overview' | 'ebooks' | 'orders' | 'newsletter' | 'settings' | 'cart';
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
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

const UserDashboard = ({ activeTab }: UserDashboardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hoverEmail, setHoverEmail] = useState<string | null>(null);
  const [userEbooks, setUserEbooks] = useState<Ebook[]>([]);
  const [completedOrdersList, setCompletedOrdersList] = useState<CompletedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const [latestEbooks, setLatestEbooks] = useState<Ebook[]>([]);
  const { state: { items }, totalCount, totalPrice, addItem, removeItem, decrementItem, clearCart } = useCart();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      toast.error('Failed to load latest ebooks');
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
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
            // Close auth modal if open
            setShowAuthModal(false);
          } catch (error) {
            console.error('Error restoring cart state:', error);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [clearCart, addItem]);

  const handleNewsletterToggle = () => {
    setIsSubscribed(!isSubscribed);
  };

  const handleCheckout = async () => {
    // If not authenticated, show auth modal and redirect to sign in
    if (!isAuthenticated) {
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

      // Get the correct API URL based on environment
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://jornadadeinsights.com'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      // Create checkout session
      const response = await fetch(`${apiUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
      toast.error('Falha ao iniciar o processo de checkout. Por favor, tente novamente.');
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
            {activeTab === 'cart' && 'Meu Carrinho'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {activeTab === 'overview' && 'Uma visão geral da sua conta e atividades'}
            {activeTab === 'ebooks' && 'Gerencie seus eBooks e downloads'}
            {activeTab === 'orders' && 'Acompanhe seus pedidos e compras'}
            {activeTab === 'newsletter' && 'Gerencie suas preferências de newsletter'}
            {activeTab === 'settings' && 'Configure as configurações da sua conta'}
            {activeTab === 'cart' && 'Gerencie os itens do seu carrinho'}
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
                {userEbooks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">Você ainda não comprou nenhum eBook.</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                      Procurar eBooks
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
                    {userEbooks.length > 2 && (
                      <div className="flex justify-center">
                        <Button 
                          variant="outline" 
                          onClick={() => navigate('/dashboard?tab=ebooks')}
                          className="w-full sm:w-auto"
                        >
                          Ver todos os meus eBooks
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Section */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pedidos</CardTitle>
                <CardDescription>Visualize seus pedidos e compras</CardDescription>
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
                  <div className="space-y-6">
                    <div className="overflow-x-auto -mx-6 sm:mx-0">
                      <table className="w-full text-left whitespace-nowrap min-w-[300px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="py-2 px-1 sm:px-4 border-b font-medium">Data</th>
                            <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">Nome</th>
                            <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">Email</th>
                            <th className="py-2 px-1 sm:px-4 border-b font-medium">Itens</th>
                            <th className="py-2 px-1 sm:px-4 border-b font-medium">Total</th>
                            <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedOrdersList.slice(0, 5).map((order: CompletedOrder) => (
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
                                {new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(order.total)}
                              </td>
                              <td className="py-2 px-1 sm:px-4 hidden sm:table-cell">
                                <Badge variant="outline">
                                  {order.total > 0 ? 'Concluído' : 'Em processamento'}
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
                          onClick={() => navigate('/dashboard?tab=orders')}
                          className="w-full sm:w-auto"
                        >
                          Ver todo o histórico de pedidos
                        </Button>
                      </div>
                    )}
                  </div>
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
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleNewsletterToggle}>
                      {isSubscribed ? 'Cancelar Inscrição' : 'Inscrever-se'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/dashboard?tab=newsletter')}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Ebooks Section */}
            <Card>
              <CardHeader>
                <CardTitle>Ebooks que você pode gostar</CardTitle>
                <CardDescription>
                  Confira nossas últimas publicações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    Ver todos os ebooks
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
                          <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">Nome</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">Email</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">Itens</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium">Total</th>
                          <th className="py-2 px-1 sm:px-4 border-b font-medium hidden sm:table-cell">Status</th>
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
                              {new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(order.total)}
                            </td>
                            <td className="py-2 px-1 sm:px-4 hidden sm:table-cell">
                              <Badge variant="outline">
                                {order.total > 0 ? 'Concluído' : 'Em processamento'}
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
                <p className="text-lg text-muted-foreground mb-6">Seu carrinho está vazio no momento.</p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/shop')}
                >
                  Continuar Comprando
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-card rounded-lg p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <LazyImage
                          src={item.cover_url || ''}
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-muted-foreground">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => decrementItem(item.id)}
                          className="p-1 rounded border hover:bg-muted"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => addItem(item)}
                          className="p-1 rounded border hover:bg-muted"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded border border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-8">
                  <p className="text-xl font-semibold">Total:</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}
                  </p>
                </div>
                <div className="flex justify-center gap-4 mt-6">
                  <Button variant="outline" onClick={clearCart}>Limpar Carrinho</Button>
                  <Button onClick={handleCheckout}>Finalizar Compra</Button>
                </div>
              </div>
            )}
          </div>
        )}

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