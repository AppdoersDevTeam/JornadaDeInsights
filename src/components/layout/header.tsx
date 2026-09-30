import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, User, Home, Info, Mic, ShoppingBag, GraduationCap, Mail, LayoutDashboard, ShoppingCart,
  BookOpen, Languages, Bell } from 'lucide-react';
import { DesktopActions, DesktopNav } from '@/components/layout/header-nav';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { siteLogoAlt, siteLogoSrc } from '@/lib/site-logo';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalCount } = useCart();
  const { user } = useAuth();
  const { language, openLanguagePrompt, t } = useLanguage();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Desktop groups the store pages under one "Store" menu; mobile lists them under a heading.
  const primaryLinks = [
    { to: '/', label: t('nav.home', 'Início') },
    { to: '/about', label: t('nav.about', 'Sobre') },
    { to: '/podcast', label: t('nav.podcast', 'Podcast') },
    { to: '/curiosidades', label: t('nav.curiosidades', 'Curiosidades') },
  ];
  const storeLinks = [
    { to: '/shop', label: t('nav.ebooks.short', 'eBooks') },
    { to: '/courses', label: t('nav.courses', 'Cursos') },
  ];
  const contactLink = { to: '/contact', label: t('nav.contact', 'Contato') };

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left ${
      isActive ? 'bg-[#606C38] text-white' : 'hover:bg-[#606C38] hover:text-white'
    }`;

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 bg-primary",
      scrolled ? "shadow-sm" : ""
    )}>
      <div className="container mx-auto px-2 sm:px-4 flex items-center gap-2 sm:gap-4">
        {/* Left: Logo */}
        <div className="flex-shrink-0 flex items-center min-w-0">
          <Link to="/" className="flex items-center">
            <img src={siteLogoSrc(language, 'header')} alt={siteLogoAlt(language)} className="h-8 sm:h-10 lg:h-12 w-auto" />
          </Link>
        </div>
        <DesktopNav />
        <DesktopActions />
        {/* Mobile: cart + language + menu */}
        <div className="lg:hidden flex items-center gap-2 ml-auto">
          <Link
            to={user ? '/user-dashboard?tab=cart' : '/cart'}
            className="relative p-2 bg-background rounded-full shadow flex-shrink-0"
            aria-label={t('nav.cart', 'Carrinho')}
          >
            <ShoppingCart className="h-5 w-5 text-foreground" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </Link>
          <button
            onClick={openLanguagePrompt}
            className="text-foreground p-2 bg-background rounded-full shadow flex-shrink-0"
            aria-label={t('lang.switch', 'Change language')}
            title={t('lang.switch', 'Change language')}
          >
            <Languages className="h-5 w-5" />
          </button>
          <button 
            onClick={toggleMenu}
            className="text-foreground p-2 bg-background rounded-full shadow flex-shrink-0"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={cn(
        "fixed inset-0 top-[72px] bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto h-[calc(100vh-72px)]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="bg-white container mx-auto px-4 py-8 flex flex-col gap-4 items-start">
          <button
            type="button"
            onClick={() => {
              closeMenu();
              openLanguagePrompt();
            }}
            className="flex items-center gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal transition-colors text-left hover:bg-[#606C38] hover:text-white"
          >
            <Languages className="h-5 w-5" />
            {t('lang.switch', 'Change language')}
          </button>
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

          {/* Notifications for logged-in users */}
          {user && (
            <div className="flex items-center justify-between gap-3 text-lg px-4 py-3 w-full rounded-lg text-[#606C38] font-normal">
              <span className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                {t('notifications.title', 'Notifications')}
              </span>
              <NotificationBell triggerClassName="relative p-2 rounded-full hover:bg-[#606C38]/10 transition-colors text-[#606C38]" />
            </div>
          )}

          {/* Main Navigation Links */}
          {primaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={mobileLinkClass} onClick={closeMenu}>
              {link.to === '/' && <Home className="h-5 w-5" />}
              {link.to === '/about' && <Info className="h-5 w-5" />}
              {link.to === '/podcast' && <Mic className="h-5 w-5" />}
              {link.to === '/curiosidades' && <BookOpen className="h-5 w-5" />}
              {link.label}
            </NavLink>
          ))}

          <div className="w-full">
            <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[#606C38]/70">
              {t('nav.shop', 'Loja')}
            </p>
            <div className="flex flex-col gap-1 pl-4">
              {storeLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={mobileLinkClass} onClick={closeMenu}>
                  {link.to === '/shop' ? <ShoppingBag className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink to={contactLink.to} className={mobileLinkClass} onClick={closeMenu}>
            <Mail className="h-5 w-5" />
            {contactLink.label}
          </NavLink>

          {/* Cart Link — guests use public /cart; signed-in users use dashboard cart */}
          <NavLink
            to={user ? '/user-dashboard?tab=cart' : '/cart'}
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
            {t('nav.cart', 'Carrinho')}
            {totalCount > 0 && (
              <span className="ml-2 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </NavLink>

          {/* Sign In Link (signed-out only; signed-in users use Dashboard above) */}
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
              {t('nav.signIn', 'Entrar')}
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}