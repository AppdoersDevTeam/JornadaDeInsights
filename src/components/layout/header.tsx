import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Headphones, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { AnimatedCartIcon } from '@/components/shop/animated-cart-icon';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalCount } = useCart();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.mobile-menu') && !target.closest('.menu-toggle')) {
        closeMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
          <NavLink to="/" end className="text-base text-background font-normal hover:text-secondary transition-colors">
            Início
          </NavLink>
          <NavLink to="/about" className="text-base text-background font-normal hover:text-secondary transition-colors">
            Sobre
          </NavLink>
          <NavLink to="/podcast" className="text-base text-background font-normal hover:text-secondary transition-colors">
            Podcast
          </NavLink>
          <NavLink to="/shop" className="text-base text-background font-normal hover:text-secondary transition-colors">
            Loja
          </NavLink>
          <NavLink to="/contact" className="text-base text-background font-normal hover:text-secondary transition-colors">
            Contato
          </NavLink>
        </nav>

        {/* CTA Button and User Icon (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/shop">Adquirir Meus eBooks</Link>
          </Button>
          <AnimatedCartIcon count={totalCount} className="text-background hover:text-secondary transition-colors" />
          <Link to="/signin" className="p-2 rounded-full hover:bg-background/10 transition-colors">
            <User className="h-6 w-6 text-background" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMenu}
          className="menu-toggle md:hidden text-foreground p-2 bg-background rounded-full shadow"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={cn(
        "mobile-menu fixed inset-0 top-[60px] bg-secondary z-40 transform transition-all duration-300 ease-in-out md:hidden",
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}>
        <nav className="bg-secondary container mx-auto px-4 py-8 flex flex-col gap-4 items-center text-white h-full overflow-y-auto">
          <NavLink 
            to="/" end 
            className="text-lg py-3 w-full text-center text-white font-normal hover:text-secondary transition-colors"
            onClick={closeMenu}
          >
            Início
          </NavLink>
          <NavLink 
            to="/about" 
            className="text-lg py-3 w-full text-center text-white font-normal hover:text-secondary transition-colors"
            onClick={closeMenu}
          >
            Sobre
          </NavLink>
          <NavLink 
            to="/podcast" 
            className="text-lg py-3 w-full text-center text-white font-normal hover:text-secondary transition-colors"
            onClick={closeMenu}
          >
            Podcast
          </NavLink>
          <NavLink 
            to="/shop" 
            className="text-lg py-3 w-full text-center text-white font-normal hover:text-secondary transition-colors"
            onClick={closeMenu}
          >
            Loja
          </NavLink>
          <NavLink 
            to="/contact" 
            className="text-lg py-3 w-full text-center text-white font-normal hover:text-secondary transition-colors"
            onClick={closeMenu}
          >
            Contato
          </NavLink>
          <div className="w-full border-t border-white/10 my-4" />
          <Link 
            to="/shop" 
            className="w-full"
            onClick={closeMenu}
          >
            <Button variant="outline" className="w-full justify-center">
              Adquirir Meus eBooks
            </Button>
          </Link>
          <Link 
            to="/signin" 
            className="text-lg py-3 w-full text-center text-white font-normal hover:text-secondary transition-colors"
            onClick={closeMenu}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="h-5 w-5" />
              <span>Entrar</span>
            </div>
          </Link>
          <div className="mt-4">
            <AnimatedCartIcon count={totalCount} className="text-white hover:text-secondary transition-colors" />
          </div>
        </nav>
      </div>
    </header>
  );
}