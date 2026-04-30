import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/language-context';

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
  const { t } = useLanguage();

  useEffect(() => {
    // Don't show on excluded pages
    if (EXCLUDED_PAGES.some(page => location.pathname.startsWith(page))) {
      return;
    }

    // Check if user has dismissed the popup in this session
    const hasDismissedPopup = sessionStorage.getItem(DONATION_POPUP_KEY);
    
    // If they've dismissed it, don't show again
    if (hasDismissedPopup === 'dismissed') {
      return;
    }

    // Reset and start timer on each page load/navigation
    const timer = setTimeout(() => {
      // Check again before showing (in case they navigated away)
      if (!EXCLUDED_PAGES.some(page => location.pathname.startsWith(page))) {
        setIsOpen(true);
      }
    }, DONATION_POPUP_DELAY);

    // Cleanup timer on unmount or navigation
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleDonate = () => {
    setIsOpen(false);
    navigate('/donation');
  };

  const handleClose = () => {
    setIsOpen(false);
    // Mark as dismissed so it doesn't show again in this session
    sessionStorage.setItem(DONATION_POPUP_KEY, 'dismissed');
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
            {t('donation.popup.title', 'Support this ministry')}
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            {t('donation.popup.body', 'If this content has blessed you, consider giving to help keep this work going and create more inspiring resources.')}
          </DialogDescription>
        </DialogHeader>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground text-center">
            {t('donation.subtitle', 'Your generosity helps me keep sharing God’s Word and creating life-changing content.')}
          </p>
        </motion.div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            {t('donation.popup.later', 'Maybe later')}
          </Button>
          <Button
            onClick={handleDonate}
            className="w-full sm:w-auto"
          >
            {t('donation.popup.cta', 'Give')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

