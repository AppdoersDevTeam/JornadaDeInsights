import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Download, Eye, Copy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Fragment } from 'react';
import { supabase } from '@/lib/supabase';

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
  activeTab: string;
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
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

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
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-24">
      {/* Header */}
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {activeTab === 'ebooks' && 'My eBooks'}
            {activeTab === 'orders' && 'My Orders'}
            {activeTab === 'newsletter' && 'Newsletter'}
            {activeTab === 'settings' && 'Settings'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {activeTab === 'ebooks' && 'Manage your eBooks and downloads'}
            {activeTab === 'orders' && 'Track your orders and purchases'}
            {activeTab === 'newsletter' && 'Manage your newsletter preferences'}
            {activeTab === 'settings' && 'Configure your account settings'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 sm:space-y-8">
        {activeTab === 'ebooks' && (
          <div className="space-y-6 sm:space-y-8">
            {userEbooks.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-base sm:text-lg text-muted-foreground">You haven't purchased any eBooks yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                  Browse eBooks
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                {userEbooks.map((ebook) => (
                  <Card key={ebook.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
                      <div className="w-full sm:w-32 h-40 overflow-hidden rounded-md relative bg-muted mx-auto sm:mx-0">
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
                      <div className="flex-1">
                        <CardHeader className="p-0">
                          <CardTitle className="text-lg sm:text-xl text-center sm:text-left">{ebook.title}</CardTitle>
                          <CardDescription className="line-clamp-2 text-center sm:text-left">{ebook.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 mt-4">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                const pdfUrl = supabase.storage
                                  .from('store-assets')
                                  .getPublicUrl(`pdfs/${ebook.filename}`).data.publicUrl;
                                window.open(pdfUrl, '_blank');
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                              <span className="sm:hidden">View eBook</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
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
                              <span className="hidden sm:inline">Download</span>
                              <span className="sm:hidden">Download PDF</span>
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
          <div className="space-y-6">
            {completedOrdersList.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-base sm:text-lg text-muted-foreground">You haven't placed any orders yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/shop')}>
                  Browse eBooks
                </Button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {completedOrdersList.map((order) => (
                  <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">Order ID: {order.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Total: ${order.total.toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(order.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {expandedRows.has(order.id) ? 'Hide Details' : 'Show Details'}
                          </Button>
                        </div>
                      </div>
                      {expandedRows.has(order.id) && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.name}</span>
                                <span>${item.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'newsletter' && (
          <Card className="overflow-hidden">
            <div className="p-4 sm:p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl">Newsletter Preferences</CardTitle>
                <CardDescription>Manage your email subscription settings</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Updates</p>
                      <p className="text-sm text-muted-foreground">Receive weekly updates about new content</p>
                    </div>
                    <Button
                      variant={isSubscribed ? "default" : "outline"}
                      onClick={handleNewsletterToggle}
                    >
                      {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card className="overflow-hidden">
            <div className="p-4 sm:p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl">Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Email Address</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyEmail(user.email || '')}
                      onMouseEnter={() => setHoverEmail(user.email || '')}
                      onMouseLeave={() => setHoverEmail(null)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserDashboard; 