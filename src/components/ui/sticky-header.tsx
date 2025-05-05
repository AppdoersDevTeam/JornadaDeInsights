import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

interface StickyHeaderProps {
  children: React.ReactNode;
}

export function StickyHeader({ children }: StickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  
  const backdropBlur = useTransform(
    scrollY,
    [0, 100],
    ['blur(0px)', 'blur(10px)']
  );

  useEffect(() => {
    const unsubscribe = scrollY.onChange(latest => {
      setIsScrolled(latest > 50);
    });
    return () => unsubscribe();
  }, [scrollY]);

  return (
    <motion.header
      style={{
        backdropFilter: backdropBlur,
      }}
      className={`fixed top-0 left-0 right-0 z-50 bg-primary transition-shadow ${
        isScrolled ? 'shadow-lg' : ''
      }`}
    >
      {children}
    </motion.header>
  );
}