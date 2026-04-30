import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Users, 
  ShoppingCart,
  BookOpen,
  LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabType } from '@/types/dashboard';
import { useLanguage } from '@/context/language-context';

interface DashboardSidePanelProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function DashboardSidePanel({ activeTab, onTabChange }: DashboardSidePanelProps) {
  const { t } = useLanguage();
  return (
    <div className="h-full mt-[52px]">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">{t('admin.panelTitle', 'Admin')}</h2>
      </div>
      <nav className="space-y-1 p-4">
        <Button
          variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('overview')}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {t('admin.tab.overview', 'Overview')}
        </Button>
        <Button
          variant={activeTab === 'ebooks' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('ebooks')}
        >
          <FileText className="mr-2 h-4 w-4" />
          {t('admin.tab.ebooks', 'eBooks')}
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('analytics')}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          {t('admin.tab.analytics', 'Analytics')}
        </Button>
        <Button
          variant={activeTab === 'users' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('users')}
        >
          <Users className="mr-2 h-4 w-4" />
          {t('admin.tab.users', 'Users')}
        </Button>
        <Button
          variant={activeTab === 'orders' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('orders')}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {t('admin.tab.orders', 'Completed orders')}
        </Button>
        <Button
          variant={activeTab === 'support' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('support')}
        >
          <LifeBuoy className="mr-2 h-4 w-4" />
          {t('admin.tab.support', 'Support')}
        </Button>
        <Button
          variant={activeTab === 'curiosidades' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('curiosidades')}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          {t('admin.tab.curiosidades', 'Insights')}
        </Button>
      </nav>
    </div>
  );
} 