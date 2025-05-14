import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Headphones, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { AnimatedCartIcon } from '@/components/shop/animated-cart-icon';
import { useAuth } from '@/context/auth-context';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalCount } = useCart();
  const { user } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = user ? [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/', label: 'Home' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/shop', label: 'Store' }
  ] : [
    { to: '/', label: 'Início' },
    { to: '/about', label: 'Sobre' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/shop', label: 'Loja' },
    { to: '/contact', label: 'Contato' }
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 bg-primary",
      scrolled ? "shadow-sm" : ""
    )}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl md:text-2xl font-heading font-normal text-background">
          <Headphones className="h-6 w-6 text-current" />
          <span>Patricia</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8">
          {navLinks.map((link) => (
            <NavLink 
              key={link.to}
              to={link.to} 
              end={link.to === '/'}
              className="text-base text-background font-normal hover:text-secondary transition-colors"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* CTA Button and User Icon (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/shop">Adquirir Meus eBooks</Link>
          </Button>
          <AnimatedCartIcon count={totalCount} className="text-background hover:text-secondary transition-colors" />
          {user ? (
            <Link to="/dashboard" className="p-2 rounded-full hover:bg-background/10 transition-colors">
              <User className="h-6 w-6 text-background" />
            </Link>
          ) : (
            <Link to="/signin" className="p-2 rounded-full hover:bg-background/10 transition-colors">
              <User className="h-6 w-6 text-background" />
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
        <nav className="bg-white container mx-auto px-4 py-8 flex flex-col gap-4 items-center">
          {navLinks.map((link) => (
            <NavLink 
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className="text-lg py-3 w-full text-center text-[#808000] font-normal hover:bg-[#808000] hover:text-white transition-colors"
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}