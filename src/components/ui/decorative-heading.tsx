import { motion } from 'framer-motion';

interface DecorativeHeadingProps {
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}

export function DecorativeHeading({ children, className = '', center = false }: DecorativeHeadingProps) {
  return (
    <div className={`relative ${center ? 'text-center' : ''} ${className}`}>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-2xl md:text-3xl font-heading font-semibold relative z-10 gradient-text"
      >
        {children}
      </motion.h2>
      <div className="absolute -bottom-2 left-0 w-24 h-1 bg-secondary/50" />
    </div>
  );
}