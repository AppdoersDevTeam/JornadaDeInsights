import { useState, useEffect } from 'react';
import { Search, ShoppingCart, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EbookCard, type Ebook } from '@/components/shop/ebook-card';
import { NewsletterForm } from '@/components/newsletter-form';
import { useCart } from '@/context/cart-context';
import { LazyImage } from '@/components/shop/lazy-image';
import { AnimatedGridItem } from '@/components/shop/animated-grid-item';
import { AnimatedCartIcon } from '@/components/shop/animated-cart-icon';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getEbooks } from '@/lib/supabase';

// Remove mock data
// const allEbooks: Ebook[] = [ ... ];

const categories = [
  "Todos",
  "Autoajuda",
  "Produtividade",
  "Estilo de Vida",
  "Saúde",
  "Carreira",
];

export function ShopPage() {
  const { addItem } = useCart();
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [filteredEbooks, setFilteredEbooks] = useState<Ebook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredEbook, setFeaturedEbook] = useState<Ebook | null>(null);
  const { totalCount } = useCart();
  const { scrollYProgress } = useScroll();

  // Parallax effect for hero section
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Smooth scroll behavior
  useEffect(() => {
    const handleSmoothScroll = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link?.hash) {
        e.preventDefault();
        const element = document.querySelector(link.hash);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    };

    document.addEventListener('click', handleSmoothScroll);
    return () => document.removeEventListener('click', handleSmoothScroll);
  }, []);

  useEffect(() => {
    const fetchEbooks = async () => {
      try {
        setIsLoading(true);
        const data = await getEbooks();
        setEbooks(data);
        setFilteredEbooks(data);
        
        // Select a random ebook for the featured section
        if (data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          setFeaturedEbook(data[randomIndex]);
        }
      } catch (err) {
        setError('Failed to load ebooks. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEbooks();
  }, []);

  useEffect(() => {
    const filtered = ebooks.filter((book: Ebook) => {
      return book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             book.description.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    setFilteredEbooks(filtered);
  }, [searchQuery, ebooks]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-500 mb-4">Erro</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ scrollBehavior: 'smooth' }}>
      {/* Hero Section */}
      <motion.section 
        className="relative min-h-[60vh] sm:h-[60vh] flex items-center justify-center bg-gradient-to-b from-primary/10 to-background overflow-hidden py-12 sm:py-0"
        style={{ y: heroY, opacity: heroOpacity }}
      >
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background"
          animate={{
            background: [
              'linear-gradient(to bottom right, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.05), var(--background))',
              'linear-gradient(to bottom right, rgba(var(--primary-rgb), 0.05), rgba(var(--primary-rgb), 0.1), var(--background))',
              'linear-gradient(to bottom right, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.05), var(--background))',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mb-6"
            >
              <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-primary" />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: [1, 1.02, 1],
              }}
              transition={{ 
                duration: 0.6, 
                ease: "easeOut",
                scale: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              }}
              className="text-2xl sm:text-3xl md:text-5xl font-heading font-bold mb-4 px-4"
            >
              Descubra Nossa Coleção de eBooks
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-base sm:text-lg text-muted-foreground mb-6 px-4"
            >
              Explore nossa seleção curada de eBooks projetados para inspirar e transformar sua vida.
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Featured eBook */}
      <section className="py-12 sm:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-semibold mb-6 sm:mb-8">eBook em Destaque</h2>
          
          {isLoading ? (
            <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="lg:order-2 aspect-[3/4] lg:aspect-auto lg:h-full max-h-[400px] lg:max-h-none bg-muted" />
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-6 w-3/4 bg-muted rounded mb-3" />
                  <div className="h-4 w-32 bg-muted rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-5/6 bg-muted rounded" />
                    <div className="h-4 w-4/6 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </div>
          ) : featuredEbook ? (
            <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-lg hover:border-primary/20 group">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="lg:order-2 aspect-[3/4] lg:aspect-auto lg:h-full max-h-[400px] lg:max-h-none overflow-hidden">
                  <LazyImage 
                    src={featuredEbook.cover_url || ''} 
                    alt={featuredEbook.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-purple-600 uppercase tracking-wider mb-2">Mais Vendido</p>
                    <h3 className="font-heading text-lg sm:text-xl lg:text-2xl font-semibold mb-3 group-hover:text-primary transition-colors">{featuredEbook.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">por Patricia</p>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      {featuredEbook.description}
                    </p>
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <div className="text-yellow-400 flex">
                        {Array(5).fill(0).map((_, i) => (
                          <motion.span 
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            animate={{
                              y: [0, -5, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.2,
                              ease: "easeInOut",
                              opacity: { duration: 0.3, delay: 0.5 + i * 0.1 },
                              scale: { duration: 0.3, delay: 0.5 + i * 0.1 }
                            }}
                            className="text-yellow-400 inline-block mx-0.5"
                          >
                            ★
                          </motion.span>
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">(128 avaliações)</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-medium mb-4 sm:mb-6 group-hover:text-primary transition-colors">R${featuredEbook.price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto"
                      onClick={() => addItem(featuredEbook)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Adicionar ao Carrinho
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      Saiba Mais
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar eBooks..."
                  className="w-full sm:w-[300px] pl-10 pr-4 py-2 rounded-md border border-border bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <AnimatedCartIcon count={totalCount} />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                className="text-sm"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* eBooks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredEbooks.map((ebook, index) => (
              <AnimatedGridItem key={ebook.id} index={index}>
                <EbookCard book={ebook} />
              </AnimatedGridItem>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-12 sm:py-16 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-semibold mb-4">
              Fique por dentro das novidades
            </h2>
            <p className="text-sm sm:text-base text-white/80 mb-8">
              Receba atualizações sobre novos eBooks e conteúdos exclusivos.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  );
}