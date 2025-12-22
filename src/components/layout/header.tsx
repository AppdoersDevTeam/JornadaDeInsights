import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Headphones, User, Home, Info, Mic, ShoppingBag, Mail, LayoutDashboard, ShoppingCart, LogOut } from 'lucide-react';
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
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/shop', label: 'Store' },
    { to: '/contact', label: 'Contact' }
  ] : [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/podcast', label: 'Podcast' },
    { to: '/shop', label: 'Shop' },
    { to: '/contact', label: 'Contact' }
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 bg-primary",
      scrolled ? "shadow-sm" : ""
    )}>
      <div className="container mx-auto px-4 flex items-center">
        {/* Left: Logo */}
        <div className="flex-1 flex items-center">
          <Link to="/" className="flex items-center">
            <img src={jornadaLogo} alt="Jornada de Insights" className="h-12 w-auto" />
          </Link>
        </div>
        {/* Center: Nav Links */}
        <nav className="flex-1 hidden md:flex justify-center gap-8">
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
        {/* Right: Actions */}
        <div className="flex-1 hidden md:flex justify-end items-center gap-4">
          {user ? (
            <>
              <Button variant="outline" asChild>
                <Link to="/shop">Get My eBooks</Link>
              </Button>
              <div className="flex items-center gap-2">
                <Link to="/dashboard?tab=cart" className="relative p-2 rounded-full hover:bg-background/10 transition-colors">
                  <ShoppingCart className="h-6 w-6 text-background" />
                  {totalCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                      {totalCount}
                    </span>
                  )}
                </Link>
                <Link to="/dashboard" className="p-2 rounded-full hover:bg-background/10 transition-colors">
                  <User className="h-6 w-6 text-background" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/shop">Get My eBooks</Link>
              </Button>
              <Link to="/cart" className="relative p-2 rounded-full hover:bg-background/10 transition-colors">
                <ShoppingCart className="h-6 w-6 text-background" />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                    {totalCount}
                  </span>
                )}
              </Link>
              <Link to="/signin" className="p-2 rounded-full hover:bg-background/10 transition-colors">
                <User className="h-6 w-6 text-background" />
              </Link>
            </>
          )}
        </div>
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMenu}
          className="md:hidden text-foreground p-2 bg-background rounded-full shadow ml-auto"
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
              {link.to === '/shop' && <ShoppingBag className="h-5 w-5" />}
              {link.to === '/contact' && <Mail className="h-5 w-5" />}
              {link.to === '/dashboard' && <LayoutDashboard className="h-5 w-5" />}
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
            Cart
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
                Sign Out
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
              Sign In
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}