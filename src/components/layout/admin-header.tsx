import { Link } from 'react-router-dom';
import { Search, LogOut, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function AdminHeader() {
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
        {/* Logo Section */}
        <Link to="/dashboard" className="flex items-center gap-2 text-background">
          <Headphones className="h-6 w-6 text-current" />
          <span className="text-xl font-heading font-semibold">Patricia Dashboard</span>
        </Link>

        {/* Search Section */}
        <div className="hidden md:flex items-center gap-2 max-w-md w-full mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-background/70" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-9 bg-background/10 text-background placeholder:text-background/70 border-background/20"
            />
          </div>
        </div>

        {/* Logout Button */}
        <Button variant="ghost" size="icon" className="text-background hover:text-secondary" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
} 