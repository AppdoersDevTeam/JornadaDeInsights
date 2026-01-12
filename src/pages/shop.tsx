import { useState, useEffect } from 'react';
import { Search, ShoppingCart, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EbookCard, type Ebook } from '@/components/shop/ebook-card';
import { useCart } from '@/context/cart-context';
import { LazyImage } from '@/components/shop/lazy-image';
import { AnimatedGridItem } from '@/components/shop/animated-grid-item';
import { AnimatedCartIcon } from '@/components/shop/animated-cart-icon';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';
import { getEbooks, getCategories, type Category } from '@/lib/supabase';
import { Link } from 'react-router-dom';

// Add CTA animations
const ctaContainerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } };
const ctaButtonVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 20 } } };

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const headerOffset = 80;
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
};

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

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
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ebooksData, categoriesData] = await Promise.all([
          getEbooks(),
          getCategories()
        ]);
        setEbooks(ebooksData);
        setFilteredEbooks(ebooksData);
        setCategories(categoriesData);
        
        // Select a random ebook for the featured section
        if (ebooksData.length > 0) {
          const randomIndex = Math.floor(Math.random() * ebooksData.length);
          setFeaturedEbook(ebooksData[randomIndex]);
        }
      } catch (err) {
        setError('Failed to load ebooks. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filtered = ebooks.filter((book: Ebook) => {
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             book.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategoryId || book.category_id === selectedCategoryId || book.category?.id === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
    
    setFilteredEbooks(filtered);
  }, [searchQuery, selectedCategoryId, ebooks]);

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
        className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-fixed bg-center bg-gradient-to-br from-primary/10 to-background"
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
        
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 py-20">
          <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Descubra Nossa Coleção de eBooks
          </h1>
          <motion.p className="text-lg text-muted-foreground mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Explore nossa seleção curada de eBooks projetados para inspirar e transformar sua vida.
          </motion.p>
          <motion.div
            variants={ctaContainerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto px-4 sm:px-0"
          >
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <a 
                  href="#featured-ebook" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToSection('featured-ebook');
                  }}
                >
                  eBook em Destaque <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <a 
                  href="#all-ebooks" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToSection('all-ebooks');
                  }}
                >
                  Todos os eBooks <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Featured eBook */}
      <section id="featured-ebook" className="py-16 bg-background">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8">eBook em Destaque</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-w-4xl mx-auto items-stretch">
            {isLoading ? (
              <>
                <div className="aspect-[3/4] bg-muted animate-pulse rounded-lg max-w-xs mx-auto md:mx-0" />
                <div className="p-4 flex flex-col justify-center bg-card rounded-lg shadow-md border border-border/50 animate-pulse max-w-md mx-auto md:mx-0">
                  <div className="h-5 w-3/4 bg-muted rounded mb-3" />
                  <div className="h-3 w-full bg-muted rounded mb-2" />
                  <div className="h-3 w-5/6 bg-muted rounded mb-4" />
                  <div className="h-5 w-20 bg-muted rounded mb-3" />
                  <div className="h-9 w-28 bg-muted rounded" />
                </div>
              </>
            ) : featuredEbook ? (
              <>
                {/* Image Section - Left - Separate Element */}
                <Link to={`/shop/ebook/${featuredEbook.id}`} className="relative w-full overflow-hidden rounded-lg max-w-xs mx-auto md:mx-0 cursor-pointer hover:opacity-90 transition-opacity h-full flex items-stretch">
                  <LazyImage
                    src={featuredEbook.cover_url || ''}
                    alt={featuredEbook.title}
                    className="w-full h-full object-contain"
                  />
                </Link>
                
                {/* Content Section - Right - Separate Element */}
                <Link to={`/shop/ebook/${featuredEbook.id}`} className="p-4 flex flex-col justify-center bg-card rounded-lg shadow-md border border-border/50 max-w-md mx-auto md:mx-0 cursor-pointer hover:border-primary/50 transition-colors group h-full">
                  <h3 className="font-heading font-medium text-xl mb-2 group-hover:text-primary transition-colors">{featuredEbook.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{featuredEbook.description}</p>
                  <p className="font-medium text-lg mb-4 group-hover:text-primary transition-colors">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(featuredEbook.price)}
                  </p>
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addItem(featuredEbook);
                    }}
                    className="transition-all duration-300 hover:scale-105 hover:shadow-md w-full sm:w-auto"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar ao carrinho
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* All eBooks with Search and Filter */}
      <section id="all-ebooks" className="py-16 bg-muted/30">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-heading font-semibold">Todos os eBooks</h2>
            <AnimatedCartIcon count={totalCount} />
          </div>
          
          {/* Search and Category Filter */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar eBooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-md border border-input bg-background cursor-text"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategoryId === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryId('')}
              >
                Todos
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Ebooks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEbooks.map((book) => (
              <AnimatedGridItem key={book.id}>
                <EbookCard book={book} />
              </AnimatedGridItem>
            ))}
          </div>

          {filteredEbooks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhum eBook encontrado para sua pesquisa.</p>
            </div>
          )}
        </div>
      </section>

      {/* Why Buy From Me */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-2xl md:text-3xl font-heading font-semibold mb-12 text-center"
          >
            Por que comprar meus eBooks?
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"/><line x1="16" x2="2" y1="8" y2="22"/><line x1="17.5" x2="9" y1="15" y2="15"/></svg>
              </motion.div>
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="font-heading font-medium text-lg mb-2"
              >
                Sabedoria Prática
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="text-muted-foreground"
              >
                Conselhos acionáveis que você pode implementar imediatamente, não apenas conceitos teóricos.
              </motion.p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="text-center p-6"
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m14.5 9-5 5"/><path d="m9.5 9 5 5"/></svg>
              </motion.div>
              <motion.h3 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="font-heading font-medium text-lg mb-2"
              >
                Entrega Segura
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="text-muted-foreground"
              >
                Acesso instantâneo à sua compra com processamento de pagamento seguro.
              </motion.p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="text-center p-6 relative overflow-hidden"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5"
                animate={{
                  background: [
                    'linear-gradient(to bottom right, var(--primary) 5%, var(--primary) 10%, var(--primary) 5%)',
                    'linear-gradient(to bottom right, var(--primary) 10%, var(--primary) 5%, var(--primary) 10%)',
                    'linear-gradient(to bottom right, var(--primary) 5%, var(--primary) 10%, var(--primary) 5%)',
                  ],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="relative z-10">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M4 4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2"/><polyline points="14 2 14 8 20 8"/><path d="m10 12.5 2 2 4-4"/></svg>
                </motion.div>
                <motion.h3 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="font-heading font-medium text-lg mb-2"
                >
                  Conteúdo de Qualidade
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="text-muted-foreground"
                >
                  Guias bem pesquisados e profissionalmente editados, baseados em métodos comprovados.
                </motion.p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-background"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-12 text-center">Depoimentos de Leitores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ amount: 0.3 }}
              className="bg-card rounded-lg shadow-md p-6 border border-border/50"
            >
              <p className="text-muted-foreground mb-4 italic">"O eBook Digital Detox me ajudou a recuperar o controle sobre o uso do meu smartphone. Agora estou mais produtivo e presente."</p>
              <div>
                <p className="font-medium">Michael T.</p>
                <p className="text-sm text-muted-foreground">Engenheiro de Software</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ amount: 0.3 }}
              className="bg-card rounded-lg shadow-md p-6 border border-border/50"
            >
              <p className="text-muted-foreground mb-4 italic">"Vida Consciente transformou minha rotina diária. O plano de 30 dias foi fácil de seguir e vi melhorias reais nos meus níveis de estresse."</p>
              <div>
                <p className="font-medium">Jennifer L.</p>
                <p className="text-sm text-muted-foreground">Diretora de Marketing</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ amount: 0.3 }}
              className="bg-card rounded-lg shadow-md p-6 border border-border/50"
            >
              <p className="text-muted-foreground mb-4 italic">"A Arte de Viver em Equilíbrio é agora minha referência sempre que me sinto sobrecarregado. Os conselhos da Patricia são práticos e transformadores."</p>
              <div>
                <p className="font-medium">David R.</p>
                <p className="text-sm text-muted-foreground">Profissional de Saúde</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

    </div>
  );
}