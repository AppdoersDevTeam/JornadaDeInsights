import { Link } from 'react-router-dom';
import { LogOut, Headphones, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function AdminHeader({ onMenuToggle, isMenuOpen }: AdminHeaderProps) {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Menu Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-background hover:text-secondary md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2 text-background">
            <Headphones className="h-6 w-6 text-current" />
            <span className="text-xl font-heading font-semibold">Patricia Dashboard</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-background hover:text-secondary transition-colors">
            Dashboard
          </Link>
          <Link to="/" className="text-background hover:text-secondary transition-colors">
            Home
          </Link>
          <Link to="/shop" className="text-background hover:text-secondary transition-colors">
            Shop
          </Link>
          <Link to="/podcast" className="text-background hover:text-secondary transition-colors">
            Podcast
          </Link>
        </nav>

        {/* Logout Button */}
        <Button variant="ghost" size="icon" className="text-background hover:text-secondary" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
} 