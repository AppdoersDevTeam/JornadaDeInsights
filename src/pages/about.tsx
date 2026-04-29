import { Headphones, Book, Users, CalendarDays, ArrowRight } from 'lucide-react';
import plogo from '@/plogo.png';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
import CountUp from 'react-countup';
import { useLanguage } from '@/context/language-context';

// Add CTA animations
const ctaContainerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } };
const ctaButtonVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 20 } } };

export function AboutPage() {
  const { t, language } = useLanguage();
  const heroWord = t('about.hero.typewriter', 'Sobre a Patricia');
  const [text] = useTypewriter({ words: [heroWord], loop: 1, typeSpeed: 100 });

  return (
    <>
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
          <h1 key={language} className="text-3xl md:text-5xl font-heading font-bold mb-4">
            {text}
            <Cursor cursorStyle="|" />
          </h1>
          <motion.p className="text-lg text-muted-foreground mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t(
              'about.hero.lead',
              'Podcaster, autora e criadora de conteúdo, compartilhando insights sobre crescimento pessoal e bem-estar.',
            )}
          </motion.p>
          <motion.div
            variants={ctaContainerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto px-4 sm:px-0"
          >
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <a href="#bio-section" onClick={(e) => {
                  e.preventDefault();
                  setTimeout(() => {
                    const element = document.getElementById('bio-section');
                    if (element) {
                      const headerOffset = 80;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }, 100);
                }}>
                  {t('about.cta.story', 'Explorar Minha História')} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <a href="#timeline-section" onClick={(e) => {
                  e.preventDefault();
                  setTimeout(() => {
                    const element = document.getElementById('timeline-section');
                    if (element) {
                      const headerOffset = 80;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }, 100);
                }}>
                  {t('about.cta.journey', 'Explorar Minha Jornada')} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Bio Section */}
      <motion.section
        id="bio-section"
        className="py-16"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-2/5">
              <div className="relative">
                <img 
                  src={plogo} 
                  alt="Patricia" 
                  className="rounded-full shadow-lg w-full"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <a href="https://www.youtube.com/@Jornadadeinsights/videos" target="_blank" rel="noopener noreferrer" className="bg-white p-2 rounded-full shadow-md text-muted-foreground transition-transform transition-colors hover:scale-110 hover:text-primary footer-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                  </a>
                  <a href="https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW" target="_blank" rel="noopener noreferrer" className="bg-white p-2 rounded-full shadow-md text-muted-foreground transition-transform transition-colors hover:scale-110 hover:text-primary footer-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 11.8A5.5 5.5 0 0 1 14.5 8"/><path d="M6 14.5a8 8 0 0 1 8-4"/><path d="M16 6.5a12 12 0 0 0-14 5"/></svg>
                  </a>
                  <a href="https://www.instagram.com/jornada_de_insights/" target="_blank" rel="noopener noreferrer" className="bg-white p-2 rounded-full shadow-md text-muted-foreground transition-transform transition-colors hover:scale-110 hover:text-primary footer-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                  </a>
                  <a href="https://www.facebook.com/people/Uma-Jornada-de-Insights/61569588175573/" target="_blank" rel="noopener noreferrer" className="bg-white p-2 rounded-full shadow-md text-muted-foreground transition-transform transition-colors hover:scale-110 hover:text-primary footer-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="lg:w-3/5">
              <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-4">
                {t('about.bio.title', 'Minha História')}
              </h2>
              
              <motion.p className="text-muted-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {t('about.bio.p1', '')}
              </motion.p>
              
              <motion.p className="text-muted-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {t('about.bio.p2', '')}
              </motion.p>
              
              <motion.p className="text-muted-foreground mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                {t('about.bio.p3', '')}
              </motion.p>
              
              <div className="flex flex-wrap gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ amount: 0.3 }}
                  transition={{ duration: 0.5, bounce: 0.4 }}
                >
                  <Button asChild>
                    <Link to="/podcast">{t('about.podcastCta', 'Explorar Meu Podcast')}</Link>
                  </Button>
                </motion.div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ amount: 0.3 }}
                  transition={{ duration: 0.5, bounce: 0.4, delay: 0.2 }}
                >
                  <Button variant="outline" asChild>
                    <Link to="/contact">{t('about.contactCta', 'Entre em Contato')}</Link>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Como Comecou Jornada de Insights */}
      <motion.section
        className="py-16 bg-muted/30"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.1, once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">
              {t('about.journey.title', 'Como Começou Jornada de Insights')}
            </h2>
            
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">{t('about.journey.h1', '')}</h3>
                <p className="text-muted-foreground mb-4">{t('about.journey.h1.p1', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h1.p2', '')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">{t('about.journey.h2', '')}</h3>
                <p className="text-muted-foreground mb-4">{t('about.journey.h2.p1', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h2.p2', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h2.p3', '')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">{t('about.journey.h3', '')}</h3>
                <p className="text-muted-foreground mb-4">{t('about.journey.h3.p1', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h3.p2', '')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-card p-6 rounded-lg border border-border/50 shadow-sm"
              >
                <h3 className="text-xl font-heading font-medium mb-4">{t('about.journey.h4', '')}</h3>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p1', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p2', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p3', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p4', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p5', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p6', '')}</p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p7', '')}</p>
                <p className="text-muted-foreground mb-4 italic text-center bg-muted/50 p-4 rounded-lg">
                  {t('about.journey.h4.quote', '')}
                </p>
                <p className="text-muted-foreground mb-4">{t('about.journey.h4.p8', '')}</p>
                <p className="text-muted-foreground">{t('about.journey.h4.p9', '')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-primary/5 p-6 rounded-lg border border-primary/20"
              >
                <p className="text-muted-foreground mb-2">
                  <strong>{t('about.journey.note2024', '')}</strong> {t('about.journey.note2024b', '')}
                </p>
                <p className="text-muted-foreground">
                  <strong>{t('about.journey.note2025', '')}</strong> {t('about.journey.note2025b', '')}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section
        className="py-12 bg-muted/30"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <motion.div
              className="p-6"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.5, bounce: 0.3, delay: 0 }}
            >
              <div className="text-primary text-3xl font-bold mb-2">
                <CountUp end={1} suffix="K+" duration={1.5} enableScrollSpy scrollSpyOnce />
              </div>
              <div className="text-muted-foreground">{t('about.stats.listeners', '')}</div>
            </motion.div>
            <motion.div
              className="p-6"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.5, bounce: 0.3, delay: 0.1 }}
            >
              <div className="text-primary text-3xl font-bold mb-2">
                <CountUp end={10} suffix="+" duration={1.5} enableScrollSpy scrollSpyOnce />
              </div>
              <div className="text-muted-foreground">{t('about.stats.ebooks', '')}</div>
            </motion.div>
            <motion.div
              className="p-6"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.5, bounce: 0.3, delay: 0.2 }}
            >
              <div className="text-primary text-3xl font-bold mb-2">
                <CountUp end={50} suffix="+" duration={1.5} enableScrollSpy scrollSpyOnce />
              </div>
              <div className="text-muted-foreground">{t('about.stats.episodes', '')}</div>
            </motion.div>
            <motion.div
              className="p-6"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.5, bounce: 0.3, delay: 0.3 }}
            >
              <div className="text-primary text-3xl font-bold mb-2">
                <CountUp end={130} suffix="+" duration={1.5} enableScrollSpy scrollSpyOnce />
              </div>
              <div className="text-muted-foreground">{t('about.stats.followers', '')}</div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* What I Do */}
      <motion.section
        className="py-16 bg-background"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">
            {t('about.what.title', '')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Headphones className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">{t('about.what.podcast.title', '')}</h3>
              <p className="text-muted-foreground">{t('about.what.podcast.body', '')}</p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Book className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">{t('about.what.write.title', '')}</h3>
              <p className="text-muted-foreground">{t('about.what.write.body', '')}</p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Users className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">{t('about.what.talks.title', '')}</h3>
              <p className="text-muted-foreground">{t('about.what.talks.body', '')}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Timeline */}
      <motion.section
        id="timeline-section"
        className="py-16 bg-muted/30"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">
            {t('about.timeline.title', '')}
          </h2>
          
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-primary/20" />
            
            <div className="space-y-12">
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 w-4 h-4 rounded-full bg-primary hidden md:block" />
                <div className="ml-auto w-5/6 md:w-1/2 pl-8">
                  <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="text-primary h-4 w-4" />
                      <span className="text-sm text-muted-foreground">2020</span>
                    </div>
                    <h3 className="text-xl font-heading font-medium mb-2">{t('about.timeline.2020.title', '')}</h3>
                    <p className="text-muted-foreground">{t('about.timeline.2020.body', '')}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 w-4 h-4 rounded-full bg-primary hidden md:block" />
                <div className="w-5/6 md:w-1/2 pr-8">
                  <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="text-primary h-4 w-4" />
                      <span className="text-sm text-muted-foreground">2021</span>
                    </div>
                    <h3 className="text-xl font-heading font-medium mb-2">{t('about.timeline.2021.title', '')}</h3>
                    <p className="text-muted-foreground">{t('about.timeline.2021.body', '')}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 w-4 h-4 rounded-full bg-primary hidden md:block" />
                <div className="ml-auto w-5/6 md:w-1/2 pl-8">
                  <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="text-primary h-4 w-4" />
                      <span className="text-sm text-muted-foreground">2022</span>
                    </div>
                    <h3 className="text-xl font-heading font-medium mb-2">{t('about.timeline.2022.title', '')}</h3>
                    <p className="text-muted-foreground">{t('about.timeline.2022.body', '')}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 w-4 h-4 rounded-full bg-primary hidden md:block" />
                <div className="w-5/6 md:w-1/2 pr-8">
                  <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="text-primary h-4 w-4" />
                      <span className="text-sm text-muted-foreground">2023</span>
                    </div>
                    <h3 className="text-xl font-heading font-medium mb-2">{t('about.timeline.2023.title', '')}</h3>
                    <p className="text-muted-foreground">{t('about.timeline.2023.body', '')}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Support My Work Section */}
      <motion.section
        className="py-16 bg-background"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-6">{t('about.support.title', '')}</h2>
            <motion.p 
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {t('about.support.p1', '')}
            </motion.p>
            <motion.div
              className="bg-card p-8 rounded-lg border border-border/50 shadow-md"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex flex-col items-center gap-6">
                <p className="text-lg text-muted-foreground">
                  {t('about.support.p2', '')}
                </p>
                <Button size="lg" className="mt-4" asChild>
                  <Link to="/donation">
                    {t('about.support.cta', '')}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.section
        className="py-16 bg-background"
        initial={{ opacity: 0, y: 50, rotate: -3, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">
            {t('about.testimonials.title', '')}
          </h2>
          
          <div className="max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-lg border border-border/50 shadow-md relative">
              <div className="text-5xl text-primary/20 absolute top-6 left-6">"</div>
              <div className="relative z-10">
                <p className="text-lg italic mb-6">
                  {t('about.testimonials.quote', '')}
                </p>
                <div className="flex items-center">
                  <img 
                    src="https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                    alt="Jennifer" 
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <p className="font-medium">{t('about.testimonials.name', '')}</p>
                    <p className="text-sm text-muted-foreground">{t('about.testimonials.role', '')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

    </>
  );
}