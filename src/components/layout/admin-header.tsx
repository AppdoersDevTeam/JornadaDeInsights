import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Headphones, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

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

  const navLinks = isDashboard ? [
    { to: '/dashboard', label: 'Meu Dashboard' },
    { to: '/dashboard', label: 'Visão Geral' },
    { to: '/dashboard/ebooks', label: 'Meus eBooks' },
    { to: '/dashboard/orders', label: 'Pedidos' },
    { to: '/dashboard/cart', label: 'Meu Carrinho' },
    { to: '/dashboard/newsletter', label: 'Newsletter' },
    { to: '/dashboard/settings', label: 'Configurações' }
  ] : [
    { to: '/dashboard', label: 'Dashboard' },
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
          {navLinks.map((link) => (
            <Link 
              key={link.to}
              to={link.to} 
              className="text-base text-background font-normal hover:text-secondary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4">
          <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-background border-background hover:bg-background/10">
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
        "fixed inset-0 top-[60px] bg-secondary z-40 transform transition-transform duration-300 ease-in-out md:hidden",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="bg-secondary container mx-auto px-4 py-8 flex flex-col gap-4 items-center text-white">
          {navLinks.map((link) => (
            <Link 
              key={link.to}
              to={link.to}
              className="text-lg py-3 w-full text-center text-white font-normal hover:text-secondary transition-colors"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          <Button 
            variant="outline" 
            className="w-full text-white border-white hover:bg-white/10 bg-secondary/80"
            onClick={() => {
              closeMenu();
              setShowSignOutDialog(true);
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </nav>
      </div>
    </header>
  );
} 