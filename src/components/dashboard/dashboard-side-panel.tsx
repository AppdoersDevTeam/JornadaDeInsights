import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  ShoppingCart,
  ShoppingBag,
  BookOpen,
  Mic,
  LifeBuoy,
  Languages,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TabType } from '@/types/dashboard';
import { useLanguage } from '@/context/language-context';

interface DashboardSidePanelProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function DashboardSidePanel({ activeTab, onTabChange }: DashboardSidePanelProps) {
  const { t, openLanguagePrompt, language } = useLanguage();
  const navigate = useNavigate();
  return (
    <div className="h-full mt-[52px]">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">{t('admin.panelTitle', 'Admin')}</h2>
      </div>
      <nav className="space-y-1 p-4">
        <Button
          variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('overview')}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {t('admin.tab.overview', 'Overview')}
        </Button>
        <Button
          variant={activeTab === 'ebooks' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('ebooks')}
        >
          <FileText className="mr-2 h-4 w-4" />
          {t('admin.tab.ebooks', 'eBooks')}
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('analytics')}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          {t('admin.tab.analytics', 'Analytics')}
        </Button>
        <Button
          variant={activeTab === 'users' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('users')}
        >
          <Users className="mr-2 h-4 w-4" />
          {t('admin.tab.users', 'Users')}
        </Button>
        <Button
          variant={activeTab === 'orders' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('orders')}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {t('admin.tab.orders', 'Completed orders')}
        </Button>
        <Button
          variant={activeTab === 'support' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('support')}
        >
          <LifeBuoy className="mr-2 h-4 w-4" />
          {t('admin.tab.support', 'Support')}
        </Button>
        <Button
          variant={activeTab === 'curiosidades' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('curiosidades')}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          {t('admin.tab.curiosidades', 'Insights')}
        </Button>
        <Button
          variant={activeTab === 'podcastArticles' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('podcastArticles')}
        >
          <Mic className="mr-2 h-4 w-4" />
          {t('admin.tab.podcastArticles', 'Podcast SEO articles')}
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
          className="w-full justify-start min-h-[44px]"
          onClick={() => onTabChange('settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          {t('admin.tab.settings', 'Settings')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start min-h-[44px]"
          onClick={openLanguagePrompt}
        >
          <Languages className="mr-2 h-4 w-4" />
          {t('lang.switch', 'Change language')}
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {language === 'pt-BR' ? 'PT' : 'EN'}
          </span>
        </Button>

        <div className="mt-4 border-t pt-4">
          <p className="px-2 mb-1 text-xs font-medium text-muted-foreground">
            {t('admin.quickLinks.title', 'Quick links')}
          </p>
          <Button
            variant="ghost"
            className="w-full justify-start min-h-[44px]"
            onClick={() => navigate('/shop')}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {t('nav.shop', 'Shop')}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start min-h-[44px]"
            onClick={() => navigate('/curiosidades')}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {t('admin.tab.curiosidades', 'Insights')}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start min-h-[44px]"
            onClick={() => navigate('/podcast')}
          >
            <Mic className="mr-2 h-4 w-4" />
            {t('nav.podcast', 'Podcast')}
          </Button>
        </div>
      </nav>
    </div>
  );
} 