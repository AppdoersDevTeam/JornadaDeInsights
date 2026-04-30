import { 
  Book, 
  ShoppingBag, 
  Settings,
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TabType } from '@/types/dashboard';
import { useLanguage } from '@/context/language-context';

interface UserDashboardSidePanelProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function UserDashboardSidePanel({ activeTab, onTabChange }: UserDashboardSidePanelProps) {
  const { t, openLanguagePrompt, language } = useLanguage();
  const navigate = useNavigate();
  const { totalCount } = useCart();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <div className="h-full mt-[52px]">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold">{t('user.panelTitle', 'My dashboard')}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={openLanguagePrompt}
            aria-label={t('lang.switch', 'Change language')}
            title={t('lang.switch', 'Change language')}
          >
            <Languages className="h-4 w-4" />
          </Button>
        </div>
        <nav className="space-y-1 p-4">
          <Button
            variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('overview')}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {t('user.tab.overview', 'Overview')}
          </Button>
          <Button
            variant={activeTab === 'ebooks' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('ebooks')}
          >
            <Book className="mr-2 h-4 w-4" />
            {t('user.tab.ebooks', 'My eBooks')}
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('orders')}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {t('user.tab.orders', 'Orders')}
          </Button>
          <Button
            variant={activeTab === 'cart' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('cart')}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('user.tab.cart', 'My cart')}
            {totalCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            {t('user.tab.settings', 'Settings')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={openLanguagePrompt}
          >
            <Languages className="mr-2 h-4 w-4" />
            {t('lang.switch', 'Change language')}
            <span className="ml-auto text-xs font-medium text-muted-foreground">
              {language === 'pt-BR' ? 'PT' : 'EN'}
            </span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowSignOutDialog(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('user.signOut.cta', 'Sign out')}
          </Button>
        </nav>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('user.signOut.confirmTitle', 'Sign out?')}</DialogTitle>
            <DialogDescription>
              {t('user.signOut.confirmBody', 'Are you sure you want to sign out?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>
              {t('user.signOut.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              {t('user.signOut.cta', 'Sign out')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 