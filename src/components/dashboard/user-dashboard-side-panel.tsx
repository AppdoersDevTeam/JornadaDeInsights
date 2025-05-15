import { 
  Book, 
  ShoppingBag, 
  Mail, 
  Settings,
  LogOut,
  LayoutDashboard,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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

interface UserDashboardSidePanelProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function UserDashboardSidePanel({ activeTab, onTabChange }: UserDashboardSidePanelProps) {
  const navigate = useNavigate();
  const { totalCount } = useCart();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <div className="h-full mt-[62px]">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Meu Dashboard</h2>
        </div>
        <nav className="space-y-1 p-4">
          <Button
            variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('overview')}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Visão Geral
          </Button>
          <Button
            variant={activeTab === 'ebooks' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('ebooks')}
          >
            <Book className="mr-2 h-4 w-4" />
            Meus eBooks
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('orders')}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Pedidos
          </Button>
          <Button
            variant={activeTab === 'cart' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('cart')}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Meu Carrinho
            {totalCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'newsletter' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('newsletter')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Newsletter
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowSignOutDialog(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </nav>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Saída</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair da sua conta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 