import { Link } from 'react-router-dom';
import { Headphones } from 'lucide-react';

export function AdminFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t footer-wave relative">
      {/* Wave SVG at top */}
      <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none -mt-10 h-10">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[200%] h-full" style={{ animation: 'waveScroll 8s linear infinite' }} xmlns="http://www.w3.org/2000/svg">
          <path d="M0,50 C300,150 900,-50 1200,50 L1200,0 L0,0 Z" fill="hsl(var(--primary)/0.3)" />
        </svg>
      </div>
      <div className="container mx-auto px-4 py-6 bg-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col">
            <Link to="/dashboard" className="flex items-center gap-2 mb-4">
              <Headphones className="h-6 w-6 text-primary" />
              <span className="text-xl font-heading font-semibold">Patricia Dashboard</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Admin Dashboard - Your control center
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-medium mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/dashboard/content" className="text-sm text-muted-foreground hover:text-primary">
                  Content Management
                </Link>
              </li>
              <li>
                <Link to="/dashboard/analytics" className="text-sm text-muted-foreground hover:text-primary">
                  Analytics
                </Link>
              </li>
              <li>
                <Link to="/dashboard/support" className="text-sm text-muted-foreground hover:text-primary">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-medium mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h3 className="font-medium mb-4">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Contact our support team for assistance with your admin dashboard.
            </p>
            <Link 
              to="/dashboard/support"
              className="text-sm text-primary hover:underline"
            >
              Get Support →
            </Link>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Patricia. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground mt-2 md:mt-0">
            Website developed by <a href="https://buildwithsds.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">buildwithsds.com</a>
          </p>
        </div>
      </div>
    </footer>
  );
} 