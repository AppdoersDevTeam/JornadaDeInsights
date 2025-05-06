import { Link } from 'react-router-dom';
import { Search, LogOut, Headphones, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function AdminHeader() {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo Section */}
        <Link to="/dashboard" className="flex items-center gap-2 text-background min-w-fit">
          <Headphones className="h-6 w-6 text-current" />
          <span className="text-xl font-heading font-semibold hidden sm:inline">Patricia Dashboard</span>
          <span className="text-xl font-heading font-semibold sm:hidden">Dashboard</span>
        </Link>

        {/* Search Section - Desktop */}
        <div className="hidden md:flex items-center gap-2 max-w-md w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-background/70" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-9 bg-background/10 text-background placeholder:text-background/70 border-background/20 focus:bg-background focus:text-foreground focus:placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Search Section - Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-background hover:text-secondary"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-background hover:text-secondary ml-auto md:ml-0"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>

      {/* Mobile Search Overlay */}
      <div
        className={cn(
          "absolute left-0 right-0 bg-primary border-b px-4 py-3 transition-all duration-300 ease-in-out md:hidden",
          isSearchOpen ? "top-16 opacity-100" : "-top-full opacity-0"
        )}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-background/70" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full pl-9 bg-background/10 text-background placeholder:text-background/70 border-background/20 focus:bg-background focus:text-foreground focus:placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </header>
  );
} 