import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnimatedCartIconProps {
  count: number;
  className?: string;
  useLink?: boolean;
}

export function AnimatedCartIcon({ count, className = '', useLink = true }: AnimatedCartIconProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [count]);

  const cartContent = (
    <>
      <ShoppingCart 
        className={`h-6 w-6 transition-transform duration-300 ${
          isAnimating ? 'animate-bounce' : ''
        } ${className}`} 
      />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </>
  );

  if (useLink) {
    return (
      <Link to="/cart" className="relative">
        {cartContent}
      </Link>
    );
  }

  return <div className="relative">{cartContent}</div>;
} 