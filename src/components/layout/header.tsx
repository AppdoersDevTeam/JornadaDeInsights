import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Headphones, User, Home, Info, Mic, ShoppingBag, Mail, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { AnimatedCartIcon } from '@/components/shop/animated-cart-icon';
import { useAuth } from '@/context/auth-context';
import jornadaLogo from '@/Jornada logo.png';

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
    { to: '/about', label: 'Sobre' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/shop', label: 'Store' },
    { to: '/contact', label: 'Contato' }
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
      <div className="container mx-auto px-4 flex items-center">
        <Link to="/" className="flex items-center">
          <img src={jornadaLogo} alt="Jornada de Insights" className="h-12 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-1 justify-center gap-8">
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
        "fixed inset-0 top-[72px] bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto h-[calc(100vh-72px)]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="bg-white container mx-auto px-4 py-8 flex flex-col gap-4 items-start">
          {/* Main Navigation Links */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                isActive
                  ? 'bg-[#606C38] text-white'
                  : 'hover:bg-[#606C38] hover:text-white'
              }`
            }
            onClick={closeMenu}
          >
            <Home className="h-5 w-5" />
            Início
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                isActive
                  ? 'bg-[#606C38] text-white'
                  : 'hover:bg-[#606C38] hover:text-white'
              }`
            }
            onClick={closeMenu}
          >
            <Info className="h-5 w-5" />
            Sobre
          </NavLink>
          <NavLink
            to="/podcast"
            className={({ isActive }) =>
              `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                isActive
                  ? 'bg-[#606C38] text-white'
                  : 'hover:bg-[#606C38] hover:text-white'
              }`
            }
            onClick={closeMenu}
          >
            <Mic className="h-5 w-5" />
            Podcast
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                isActive
                  ? 'bg-[#606C38] text-white'
                  : 'hover:bg-[#606C38] hover:text-white'
              }`
            }
            onClick={closeMenu}
          >
            <ShoppingBag className="h-5 w-5" />
            Loja
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                isActive
                  ? 'bg-[#606C38] text-white'
                  : 'hover:bg-[#606C38] hover:text-white'
              }`
            }
            onClick={closeMenu}
          >
            <Mail className="h-5 w-5" />
            Contato
          </NavLink>
          {!user && (
            <NavLink
              to="/signin"
              className={({ isActive }) =>
                `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                  isActive
                    ? 'bg-[#606C38] text-white'
                    : 'hover:bg-[#606C38] hover:text-white'
                }`
              }
              onClick={closeMenu}
            >
              <User className="h-5 w-5" />
              Entrar
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}