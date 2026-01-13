import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { type Curiosidade } from '@/lib/supabase';

interface CuriosidadeCardProps {
  curiosidade: Curiosidade;
}

export function CuriosidadeCard({ curiosidade }: CuriosidadeCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Extract a preview of the body (first 200 characters, strip HTML)
  const getPreview = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ amount: 0.3 }}
      className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 hover:shadow-xl transition-shadow"
    >
      <div className="p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {curiosidade.category && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
              {curiosidade.category.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDate(curiosidade.created_at)}
          </span>
        </div>
        <h3 className="font-heading text-xl font-semibold mb-2 line-clamp-2 hover:text-primary transition-colors">
          {curiosidade.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Por: {curiosidade.author}
        </p>
        <p className="text-muted-foreground mb-4 line-clamp-3">
          {getPreview(curiosidade.body)}
        </p>
        <Link
          to={`/curiosidades/${curiosidade.id}`}
          className="text-primary hover:underline font-medium text-sm inline-flex items-center"
        >
          Ler mais →
        </Link>
      </div>
    </motion.div>
  );
}

