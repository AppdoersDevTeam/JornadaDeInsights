import { useState, useEffect } from 'react';
import { getCuriosidades, type Curiosidade } from '@/lib/supabase';
import { CuriosidadeCard } from '@/components/curiosidades/curiosidade-card';
import { motion } from 'framer-motion';

export function CuriosidadesPage() {
  const [curiosidades, setCuriosidades] = useState<Curiosidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCuriosidades = async () => {
      try {
        setLoading(true);
        const data = await getCuriosidades();
        setCuriosidades(data);
      } catch (error) {
        console.error('Error fetching curiosidades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCuriosidades();
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <motion.section
        className="relative min-h-[60vh] pt-32 md:pt-36 pb-16 flex items-center justify-center overflow-hidden bg-fixed bg-center bg-gradient-to-br from-primary/10 to-background"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Background blurred blobs */}
        <motion.div
          className="absolute top-0 -left-8 w-64 h-64 bg-secondary/20 rounded-full blur-2xl pointer-events-none"
          animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 -right-8 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none"
          animate={{ x: [0, -20, 0], y: [0, -10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ amount: 0.3 }}
            className="text-3xl md:text-5xl font-heading font-bold mb-4 leading-tight"
          >
            Curiosidades
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ amount: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Descubra insights interessantes e curiosidades sobre a Bíblia e a fé cristã.
          </motion.p>
        </div>
      </motion.section>

      {/* Curiosidades Grid Section */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-background"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 animate-pulse">
                  <div className="p-6">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-4 w-1/2 bg-muted rounded mb-4" />
                    <div className="h-20 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : curiosidades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhuma curiosidade disponível ainda.</p>
              <p className="text-sm text-muted-foreground mt-2">Volte em breve para novos conteúdos!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curiosidades.map((curiosidade) => (
                <CuriosidadeCard key={curiosidade.id} curiosidade={curiosidade} />
              ))}
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}

