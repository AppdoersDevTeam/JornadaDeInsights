import { Link } from 'react-router-dom';
import { LogOut, Headphones, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AdminHeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function AdminHeader({ onMenuToggle, isMenuOpen }: AdminHeaderProps) {
  const navigate = useNavigate();
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo Section - Left */}
          <Link to="/dashboard" className="flex items-center gap-2 text-background">
            <Headphones className="h-6 w-6 text-current" />
            <span className="text-xl font-heading font-semibold">Patricia</span>
          </Link>

          {/* Right Section - Menu and Logout */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-background hover:text-secondary" onClick={() => setShowSignOutDialog(true)}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sair</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-background hover:text-secondary md:hidden"
              onClick={onMenuToggle}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
      </header>

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