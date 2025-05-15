import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Headphones, User, LogOut, ChevronDown, ChevronUp, LayoutDashboard, Book, ShoppingBag, Mail, Settings, Home, Mic, ShoppingCart, Info } from 'lucide-react';
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
import jornadaLogo from '@/Jornada logo.png';

const ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'admin@jornadadeinsights.com'
];

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
    { to: '/user-dashboard?tab=overview', label: 'Visão Geral', icon: LayoutDashboard },
    { to: '/user-dashboard?tab=ebooks', label: 'Meus eBooks', icon: Book },
    { to: '/user-dashboard?tab=orders', label: 'Pedidos', icon: ShoppingBag },
    { to: '/user-dashboard?tab=newsletter', label: 'Newsletter', icon: Mail },
    { to: '/user-dashboard?tab=settings', label: 'Configurações', icon: Settings },
    { to: '/user-dashboard?tab=cart', label: 'Carrinho', icon: ShoppingCart }
  ];

  const mainLinks = [
    { to: '/', label: 'Início' },
    { to: '/about', label: 'Sobre' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/shop', label: 'Loja' },
    { to: '/contact', label: 'Contato' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary py-4">
      <div className="container mx-auto px-4 flex items-center">
        {/* Left: Logo */}
        <div className="flex-1 flex items-center">
          <Link to="/" className="flex items-center">
            <img src={jornadaLogo} alt="Jornada de Insights" className="h-12 w-auto" />
          </Link>
        </div>
        {/* Center: Nav Links */}
        <nav className="flex-1 hidden md:flex justify-center gap-8">
          <Link 
            to={user?.email && ALLOWED_ADMIN_EMAILS.includes(user.email) ? "/dashboard" : "/user-dashboard"} 
            className="text-base text-background font-normal hover:text-secondary transition-colors"
          >
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
        </nav>
        {/* Right: Actions */}
        <div className="flex-1 hidden md:flex justify-end items-center gap-4">
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
        "fixed inset-0 top-[72px] bg-white z-40 transform transition-transform duration-300 ease-in-out md:hidden",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="bg-white container mx-auto px-4 py-8 flex flex-col gap-2 items-start">
          {/* Dashboard Dropdown */}
          <button
            onClick={() => setIsDashboardOpen(!isDashboardOpen)}
            className="flex items-center justify-between w-full text-lg px-4 py-3 rounded-lg text-[#606C38] font-normal transition-colors hover:bg-[#606C38] hover:text-white"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </div>
            {isDashboardOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          
          {/* Dashboard Links Dropdown */}
          <div className={cn(
            "w-full flex flex-col gap-2 pl-12 overflow-hidden transition-all duration-300",
            isDashboardOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            {dashboardLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 text-base py-2 text-[#606C38] font-normal transition-colors hover:text-[#606C38]/80"
                  onClick={closeMenu}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Main Navigation Links */}
          <Link
            to="/"
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors hover:bg-[#606C38] hover:text-white"
            onClick={closeMenu}
          >
            <Home className="h-5 w-5" />
            Início
          </Link>
          <Link
            to="/about"
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors hover:bg-[#606C38] hover:text-white"
            onClick={closeMenu}
          >
            <Info className="h-5 w-5" />
            Sobre
          </Link>
          <Link
            to="/podcast"
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors hover:bg-[#606C38] hover:text-white"
            onClick={closeMenu}
          >
            <Mic className="h-5 w-5" />
            Podcast
          </Link>
          <Link
            to="/shop"
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors hover:bg-[#606C38] hover:text-white"
            onClick={closeMenu}
          >
            <ShoppingBag className="h-5 w-5" />
            Loja
          </Link>
          <Link
            to="/contact"
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors hover:bg-[#606C38] hover:text-white"
            onClick={closeMenu}
          >
            <Mail className="h-5 w-5" />
            Contato
          </Link>

          {/* Logout Button */}
          <button
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors hover:bg-[#606C38] hover:text-white"
            onClick={() => {
              closeMenu();
              setShowSignOutDialog(true);
            }}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </nav>
      </div>

      {/* Sign Out Dialog - Moved outside mobile navigation */}
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
    </header>
  );
} 