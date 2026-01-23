import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Headphones, User, Home, Info, Mic, ShoppingBag, Mail, LayoutDashboard, ShoppingCart, LogOut, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
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
    { to: '/', label: 'Home' },
    { to: '/about', label: 'Sobre' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/curiosidades', label: 'Curiosidades' },
    { to: '/shop', label: 'Store' },
    { to: '/contact', label: 'Contato' }
  ] : [
    { to: '/', label: 'Início' },
    { to: '/about', label: 'Sobre' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/curiosidades', label: 'Curiosidades' },
    { to: '/shop', label: 'Loja' },
    { to: '/contact', label: 'Contato' }
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 bg-primary",
      scrolled ? "shadow-sm" : ""
    )}>
      <div className="container mx-auto px-2 sm:px-4 flex items-center gap-2 sm:gap-4">
        {/* Left: Logo */}
        <div className="flex-shrink-0 flex items-center min-w-0">
          <Link to="/" className="flex items-center">
            <img src={jornadaLogo} alt="Jornada de Insights" className="h-8 sm:h-10 lg:h-12 w-auto" />
          </Link>
        </div>
        {/* Center: Nav Links */}
        <nav className="hidden lg:flex flex-1 justify-center items-center gap-2 xl:gap-4 min-w-0">
          {navLinks.map((link) => (
            <NavLink 
              key={link.to}
              to={link.to} 
              end={link.to === '/'}
              className="text-sm xl:text-base text-background font-normal hover:text-secondary transition-colors whitespace-nowrap px-1"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        {/* Right: Actions */}
        <div className="hidden lg:flex flex-shrink-0 justify-end items-center gap-2 xl:gap-3">
          {user ? (
            <>
              <Button variant="outline" asChild size="sm" className="text-background border-background hover:bg-background hover:text-primary bg-background/10 min-w-[auto] px-2 xl:px-3">
                <Link to="/dashboard" className="flex items-center gap-1.5 xl:gap-2">
                  <LayoutDashboard className="h-4 w-4 xl:h-4 xl:w-4 flex-shrink-0" />
                  <span className="text-xs xl:text-sm font-medium">Dashboard</span>
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="text-background border-background hover:bg-background hover:text-primary bg-background/10 whitespace-nowrap px-2 xl:px-3">
                <Link to="/shop" className="text-xs xl:text-sm font-medium">
                  <span className="hidden xl:inline">Adquirir Meus eBooks</span>
                  <span className="xl:hidden">eBooks</span>
                </Link>
              </Button>
              <div className="flex items-center gap-1 xl:gap-2">
                <Link to="/dashboard?tab=cart" className="relative p-1.5 xl:p-2 rounded-full hover:bg-background/10 transition-colors flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 xl:h-6 xl:w-6 text-background" />
                  {totalCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                      {totalCount}
                    </span>
                  )}
                </Link>
                <Link to="/dashboard" className="p-1.5 xl:p-2 rounded-full hover:bg-background/10 transition-colors flex-shrink-0">
                  <User className="h-5 w-5 xl:h-6 xl:w-6 text-background" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" asChild size="sm" className="text-background border-background hover:bg-background hover:text-primary bg-background/10 whitespace-nowrap px-2 xl:px-3">
                <Link to="/shop" className="text-xs xl:text-sm font-medium">
                  <span className="hidden xl:inline">Adquirir Meus eBooks</span>
                  <span className="xl:hidden">eBooks</span>
                </Link>
              </Button>
              <Link to="/cart" className="relative p-1.5 xl:p-2 rounded-full hover:bg-background/10 transition-colors flex-shrink-0">
                <ShoppingCart className="h-5 w-5 xl:h-6 xl:w-6 text-background" />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                    {totalCount}
                  </span>
                )}
              </Link>
              <Link to="/signin" className="p-1.5 xl:p-2 rounded-full hover:bg-background/10 transition-colors flex-shrink-0">
                <User className="h-5 w-5 xl:h-6 xl:w-6 text-background" />
              </Link>
            </>
          )}
        </div>
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMenu}
          className="lg:hidden text-foreground p-2 bg-background rounded-full shadow flex-shrink-0 ml-auto"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={cn(
        "fixed inset-0 top-[72px] bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto h-[calc(100vh-72px)]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="bg-white container mx-auto px-4 py-8 flex flex-col gap-4 items-start">
          {/* Dashboard Link for logged-in users */}
          {user && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                  isActive
                    ? 'bg-[#606C38] text-white'
                    : 'hover:bg-[#606C38] hover:text-white'
                }`
              }
              onClick={closeMenu}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </NavLink>
          )}

          {/* Main Navigation Links */}
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                  isActive
                    ? 'bg-[#606C38] text-white'
                    : 'hover:bg-[#606C38] hover:text-white'
                }`
              }
              onClick={closeMenu}
            >
              {link.to === '/' && <Home className="h-5 w-5" />}
              {link.to === '/about' && <Info className="h-5 w-5" />}
              {link.to === '/podcast' && <Mic className="h-5 w-5" />}
              {link.to === '/curiosidades' && <BookOpen className="h-5 w-5" />}
              {link.to === '/shop' && <ShoppingBag className="h-5 w-5" />}
              {link.to === '/contact' && <Mail className="h-5 w-5" />}
              {link.label}
            </NavLink>
          ))}

          {/* Cart Link */}
          <NavLink
            to="/dashboard?tab=cart"
            className={({ isActive }) =>
              `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
                isActive
                  ? 'bg-[#606C38] text-white'
                  : 'hover:bg-[#606C38] hover:text-white'
              }`
            }
            onClick={closeMenu}
          >
            <ShoppingCart className="h-5 w-5" />
            Carrinho
            {totalCount > 0 && (
              <span className="ml-2 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </NavLink>

          {/* Sign In/Out Link */}
          {user ? (
            <div className="flex items-center gap-2 w-full">
              <NavLink
                to="/dashboard?tab=cart"
                className={({ isActive }) =>
                  `flex items-center gap-3 text-lg px-4 py-3 flex-1 rounded-lg text-[#606C38] font-normal transition-colors text-left hover:bg-[#606C38] hover:text-white`
                }
                onClick={closeMenu}
              >
                <ShoppingCart className="h-5 w-5" />
                Carrinho
                {totalCount > 0 && (
                  <span className="ml-2 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                    {totalCount}
                  </span>
                )}
              </NavLink>
              <button
                onClick={() => {
                  closeMenu();
                  // Add your sign out logic here
                }}
                className="flex items-center gap-3 text-lg px-4 py-3 rounded-lg text-[#606C38] font-normal transition-colors text-left hover:bg-[#606C38] hover:text-white"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </div>
          ) : (
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