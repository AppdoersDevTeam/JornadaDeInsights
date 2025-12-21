import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const DONATION_POPUP_KEY = 'donation-popup-seen';
const DONATION_POPUP_DELAY = 2 * 60 * 1000; // 2 minutes in milliseconds

// Pages where we don't want to show the popup
const EXCLUDED_PAGES = [
  '/donation',
  '/dashboard',
  '/user-dashboard',
  '/signin',
  '/signup',
  '/check-email',
  '/confirm-email',
];

export function DonationPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user has already seen the popup in this session
    const hasSeenPopup = sessionStorage.getItem(DONATION_POPUP_KEY);
    
    // Don't show on excluded pages
    if (EXCLUDED_PAGES.some(page => location.pathname.startsWith(page))) {
      return;
    }

    if (hasSeenPopup) {
      return;
    }

    // Set timer to show popup after 2 minutes
    const timer = setTimeout(() => {
      setIsOpen(true);
      // Mark as seen in session storage
      sessionStorage.setItem(DONATION_POPUP_KEY, 'true');
    }, DONATION_POPUP_DELAY);

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleDonate = () => {
    setIsOpen(false);
    navigate('/donation');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"
          >
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
          </motion.div>
          <DialogTitle className="text-2xl font-heading text-center">
            Apoie Este Ministério
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            Se você tem sido abençoado pelo conteúdo, considere fazer uma doação para ajudar a manter este trabalho e criar mais conteúdo inspirador.
          </DialogDescription>
        </DialogHeader>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground text-center">
            Sua generosidade permite que eu continue compartilhando a Palavra de Deus e criando conteúdo que transforma vidas.
          </p>
        </motion.div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Talvez Depois
          </Button>
          <Button
            onClick={handleDonate}
            className="w-full sm:w-auto"
          >
            Fazer uma Doação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

