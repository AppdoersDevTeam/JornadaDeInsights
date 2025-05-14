import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Headphones, User, LogOut, ChevronDown, ChevronUp, LayoutDashboard, Book, ShoppingBag, Mail, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AdminHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsDashboardOpen(false);
    }
  };
  const closeMenu = () => {
    setIsOpen(false);
    setIsDashboardOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowSignOutDialog(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isDashboard = location.pathname.startsWith('/dashboard');

  const dashboardLinks = [
    { to: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { to: '/dashboard/orders', label: 'Pedidos', icon: ShoppingBag },
    { to: '/dashboard/ebooks', label: 'Meus eBooks', icon: Book },
    { to: '/dashboard/newsletter', label: 'Newsletter', icon: Mail },
    { to: '/dashboard/settings', label: 'Configurações', icon: Settings }
  ];

  const mainLinks = [
    { to: '/', label: 'Home' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/shop', label: 'Store' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl md:text-2xl font-heading font-normal text-background">
          <Headphones className="h-6 w-6 text-current" />
          <span>Patricia</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8">
          {isDashboard ? (
            dashboardLinks.map((link) => (
              <Link 
                key={link.to}
                to={link.to} 
                className="text-base text-background font-normal hover:text-secondary transition-colors"
              >
                {link.label}
              </Link>
            ))
          ) : (
            <>
              <Link to="/dashboard" className="text-base text-background font-normal hover:text-secondary transition-colors">
                Dashboard
              </Link>
              {mainLinks.map((link) => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  className="text-base text-background font-normal hover:text-secondary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-secondary border-background hover:bg-background/10">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar saída</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja sair da sua conta?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-4 mt-4">
                  <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleSignOut}>
                    Sair
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Link to="/signin">
              <Button variant="outline" className="text-secondary border-background hover:bg-background/10">
                <User className="h-4 w-4 mr-2" />
                Entrar
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMenu}
          className="md:hidden text-foreground p-2 bg-background rounded-full shadow"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={cn(
        "fixed inset-0 top-[60px] bg-white z-40 transform transition-transform duration-300 ease-in-out md:hidden",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="bg-white container mx-auto px-4 py-8 flex flex-col gap-2 items-start">
          {dashboardLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left hover:bg-[#606C38] hover:text-white"
                onClick={closeMenu}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
          <button
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left hover:bg-[#606C38] hover:text-white"
            onClick={() => {
              closeMenu();
              setShowSignOutDialog(true);
            }}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </nav>
        <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar saída</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja sair da sua conta?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-4 mt-4">
              <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
} 