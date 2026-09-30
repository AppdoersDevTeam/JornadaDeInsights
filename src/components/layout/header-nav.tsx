import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, ShoppingBag, GraduationCap, LayoutDashboard, ShoppingCart, Languages, ChevronDown, Book, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { isAdminEmail } from '@/lib/admin';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { NotificationBell } from '@/components/notifications/notification-bell';

// Shared by the public header and the dashboard header so both bars stay identical on desktop.

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm xl:text-base text-background font-normal hover:text-secondary transition-colors whitespace-nowrap px-1',
    isActive && 'underline underline-offset-8 decoration-2'
  );

const iconButtonClass =
  'relative p-1.5 xl:p-2 rounded-full hover:bg-background/10 transition-colors flex-shrink-0 text-background';

/** Home · About · Podcast · Insights · Store ▾ (eBooks, Courses) · Contact */
export function DesktopNav() {
  const { t } = useLanguage();
  const location = useLocation();
  const storeActive = location.pathname.startsWith('/shop') || location.pathname.startsWith('/courses');

  const primaryLinks = [
    { to: '/', label: t('nav.home', 'Início') },
    { to: '/about', label: t('nav.about', 'Sobre') },
    { to: '/podcast', label: t('nav.podcast', 'Podcast') },
    { to: '/curiosidades', label: t('nav.curiosidades', 'Curiosidades') },
  ];

  return (
    <nav className="hidden lg:flex flex-1 justify-center items-center gap-3 xl:gap-5 min-w-0">
      {primaryLinks.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.to === '/'} className={desktopLinkClass}>
          {link.label}
        </NavLink>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center gap-1 text-sm xl:text-base text-background font-normal hover:text-secondary transition-colors whitespace-nowrap px-1 outline-none',
            storeActive && 'underline underline-offset-8 decoration-2'
          )}
        >
          {t('nav.shop', 'Loja')}
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[10rem]">
          <DropdownMenuItem asChild>
            <Link to="/shop" className="flex items-center gap-2 cursor-pointer">
              <ShoppingBag className="h-4 w-4" />
              {t('nav.ebooks.short', 'eBooks')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/courses" className="flex items-center gap-2 cursor-pointer">
              <GraduationCap className="h-4 w-4" />
              {t('nav.courses', 'Cursos')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NavLink to="/contact" className={desktopLinkClass}>
        {t('nav.contact', 'Contato')}
      </NavLink>
    </nav>
  );
}

/** Language · Cart · Notifications · Account ▾ (signed in) or Sign-in icon. */
export function DesktopActions() {
  const { t, language, openLanguagePrompt } = useLanguage();
  const { totalCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(user?.email);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="hidden lg:flex flex-shrink-0 justify-end items-center gap-1 xl:gap-2">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-background hover:bg-background/10 transition-colors"
        onClick={openLanguagePrompt}
        aria-label={t('lang.switch', 'Change language')}
        title={t('lang.switch', 'Change language')}
      >
        <Languages className="h-4 w-4" />
        {language === 'pt-BR' ? 'PT' : 'EN'}
      </button>
      <Link
        to={user ? '/user-dashboard?tab=cart' : '/cart'}
        className={iconButtonClass}
        aria-label={t('nav.cart', 'Carrinho')}
        title={t('nav.cart', 'Carrinho')}
      >
        <ShoppingCart className="h-5 w-5 xl:h-6 xl:w-6" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </Link>
      {user ? (
        <>
          <NotificationBell triggerClassName={iconButtonClass} />
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(iconButtonClass, 'flex items-center gap-0.5 outline-none')}
              aria-label={t('nav.account', 'Minha conta')}
              title={t('nav.account', 'Minha conta')}
            >
              <User className="h-5 w-5 xl:h-6 xl:w-6" />
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuItem asChild>
                <Link to={isAdmin ? '/dashboard' : '/user-dashboard'} className="flex items-center gap-2 cursor-pointer">
                  <LayoutDashboard className="h-4 w-4" />
                  {t('nav.dashboard', 'Dashboard')}
                </Link>
              </DropdownMenuItem>
              {!isAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/user-dashboard?tab=ebooks" className="flex items-center gap-2 cursor-pointer">
                      <Book className="h-4 w-4" />
                      {t('user.tab.ebooks', 'Meus eBooks')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/user-dashboard?tab=courses" className="flex items-center gap-2 cursor-pointer">
                      <GraduationCap className="h-4 w-4" />
                      {t('courses.mine.title', 'Meus cursos')}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void handleSignOut()}
                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                {t('user.signOut.cta', 'Sair')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <Link to="/signin" className={iconButtonClass} aria-label={t('nav.signIn', 'Entrar')} title={t('nav.signIn', 'Entrar')}>
          <User className="h-5 w-5 xl:h-6 xl:w-6" />
        </Link>
      )}
    </div>
  );
}
