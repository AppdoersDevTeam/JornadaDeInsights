import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Edit, 
  Users, 
  Settings,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabType } from '@/types/dashboard';

interface DashboardSidePanelProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function DashboardSidePanel({ activeTab, onTabChange }: DashboardSidePanelProps) {
  return (
    <div className="h-full mt-[62px]">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Admin Dashboard</h2>
      </div>
      <nav className="space-y-1 p-4">
        <Button
          variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('overview')}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Overview
        </Button>
        <Button
          variant={activeTab === 'ebooks' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('ebooks')}
        >
          <FileText className="mr-2 h-4 w-4" />
          eBooks
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('analytics')}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </Button>
        <Button
          variant={activeTab === 'content' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('content')}
        >
          <Edit className="mr-2 h-4 w-4" />
          Content
        </Button>
        <Button
          variant={activeTab === 'users' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('users')}
        >
          <Users className="mr-2 h-4 w-4" />
          Users
        </Button>
        <Button
          variant={activeTab === 'orders' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('orders')}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Completed Orders
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onTabChange('settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </nav>
    </div>
  );
} 