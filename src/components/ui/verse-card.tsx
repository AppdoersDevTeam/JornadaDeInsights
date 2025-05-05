import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

interface VerseCardProps {
  verse: string;
  reference: string;
  className?: string;
}

export function VerseCard({ verse, reference, className = '' }: VerseCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative p-6 bg-card rounded-lg shadow-lg border border-border/50 overflow-hidden ${className}`}
    >
      <Quote className="absolute top-4 right-4 text-primary/20 h-12 w-12" />
      <div className="relative z-10">
        <p className="text-lg mb-4 italic">{verse}</p>
        <p className="text-sm text-muted-foreground font-medium">{reference}</p>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
    </motion.div>
  );
}