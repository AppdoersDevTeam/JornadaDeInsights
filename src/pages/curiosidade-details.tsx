import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCuriosidadeById, type Curiosidade } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function CuriosidadeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [curiosidade, setCuriosidade] = useState<Curiosidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCuriosidade = async () => {
      if (!id) {
        setError('ID não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getCuriosidadeById(id);
        setCuriosidade(data);
      } catch (err) {
        console.error('Error fetching curiosidade:', err);
        setError('Erro ao carregar curiosidade');
      } finally {
        setLoading(false);
      }
    };

    fetchCuriosidade();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !curiosidade) {
    return (
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Erro</h1>
          <p className="text-muted-foreground mb-6">{error || 'Curiosidade não encontrada'}</p>
          <Button asChild>
            <Link to="/">Voltar para Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 sm:px-8 lg:px-10 pt-28 pb-16 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button variant="ghost" asChild className="mb-8 mt-2">
            <Link to="/curiosidades">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <article className="bg-card rounded-lg shadow-md border border-border/50 p-8 overflow-hidden">
            <div className="flex flex-wrap gap-2 mb-4">
              {curiosidade.category && (
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded">
                  {curiosidade.category.name}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {formatDate(curiosidade.created_at)}
              </span>
            </div>

            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              {curiosidade.title}
            </h1>

            <p className="text-muted-foreground mb-8">
              Por: <span className="font-medium">{curiosidade.author}</span>
            </p>

            <div 
              className="curiosidade-content text-muted-foreground overflow-wrap break-words"
              dangerouslySetInnerHTML={{ __html: curiosidade.body }}
              style={{
                lineHeight: '1.8',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}
            />
            <style>{`
              .curiosidade-content {
                font-size: 1.125rem;
              }
              .curiosidade-content img {
                max-width: 100%;
                width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 1.5rem 0;
                display: block;
                object-fit: contain;
              }
              .curiosidade-content p {
                margin-bottom: 1rem;
              }
              .curiosidade-content h1,
              .curiosidade-content h2,
              .curiosidade-content h3,
              .curiosidade-content h4 {
                margin-top: 1.5rem;
                margin-bottom: 1rem;
                font-weight: 600;
              }
              .curiosidade-content ul,
              .curiosidade-content ol {
                margin: 1rem 0;
                padding-left: 2rem;
              }
              .curiosidade-content li {
                margin-bottom: 0.5rem;
              }
            `}</style>
          </article>
        </motion.div>
      </div>
    </div>
  );
}

