import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export function CancelPage() {
  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background min-h-screen">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <XCircle className="mx-auto mb-6 h-16 w-16 text-destructive" />
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Checkout Cancelled
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your checkout process was cancelled. No charge was made to your account.
            Feel free to try again when you're ready.
          </p>
          <div className="space-y-4">
            <Button asChild size="lg">
              <Link to="/cart">Back to Cart</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Need help? <Link to="/contact" className="text-primary hover:underline">Contact Us</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 