import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Youtube, Instagram, Headphones, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import jornadaLogo from '@/Jornada logo footer.png';

export function Footer() {
  const [quickOpen, setQuickOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowComingSoon(true);
  };

  return (
    <>
      <footer className="bg-muted/30 border-t footer-wave relative">
        {/* Wave SVG at top */}
        <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none -mt-10 h-10">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[200%] h-full" style={{ animation: 'waveScroll 8s linear infinite' }} xmlns="http://www.w3.org/2000/svg">
            <path d="M0,50 C300,150 900,-50 1200,50 L1200,0 L0,0 Z" fill="hsl(var(--primary)/0.3)" />
          </svg>
        </div>
        <div className="container mx-auto px-4 py-12">
          {/* Mobile: Accordions */}
          <div className="md:hidden space-y-4">
            {/* Brand Column */}
            <div className="flex flex-col items-center text-center">
              <Link to="/" className="mb-4">
                <img src={jornadaLogo} alt="Jornada de Insights" className="h-16 w-auto" />
              </Link>
              <p className="text-muted-foreground mb-6 text-base">
                Podcaster, autora e criadora de conteúdo, compartilhando insights sobre crescimento pessoal e bem-estar.
              </p>
              <div className="flex space-x-4">
                <a href="https://www.youtube.com/channel/UCCJzity3rNbZd_pkBZsZOkw" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors footer-icon">
                  <Youtube className="h-5 w-5" />
                </a>
                <a href="https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW?si=ZkJHnMx6SGmz0WIrMczEjw&nd=1&dlsi=1bf146313df84baa" target="_blank" rel="noopener noreferrer" aria-label="Spotify" className="text-muted-foreground hover:text-primary transition-colors footer-icon">
                  <FaSpotify className="h-5 w-5" />
                </a>
                <a href="https://www.instagram.com/uma_jornada_de_insights?igsh=dmQ0OWozOTBvdWh3" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors footer-icon">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
            {/* Quick Links Accordion */}
            <div className="w-full max-w-xs mx-auto bg-background rounded-lg shadow-sm">
              <button onClick={() => setQuickOpen(!quickOpen)} className="flex justify-between items-center w-full text-base font-medium text-foreground py-3 px-4 focus:outline-none">
                Links Rápidos
                {quickOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <ul className={`${quickOpen ? 'block' : 'hidden'} space-y-3 py-2 px-4`}>
                <li>
                  <Link to="/user-dashboard" className="text-muted-foreground hover:text-primary transition-colors text-base">Dashboard</Link>
                </li>
                <li>
                  <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-base">Início</Link>
                </li>
                <li>
                  <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors text-base">Sobre</Link>
                </li>
                <li>
                  <Link to="/podcast" className="text-muted-foreground hover:text-primary transition-colors text-base">Podcast</Link>
                </li>
                <li>
                  <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors text-base">Loja</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-base">Contato</Link>
                </li>
              </ul>
            </div>
            {/* Resources Accordion */}
            <div className="w-full max-w-xs mx-auto bg-background rounded-lg shadow-sm">
              <button onClick={() => setResourcesOpen(!resourcesOpen)} className="flex justify-between items-center w-full text-base font-medium text-foreground py-3 px-4 focus:outline-none">
                Recursos
                {resourcesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <ul className={`${resourcesOpen ? 'block' : 'hidden'} space-y-3 py-2 px-4`}>
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-base">Política de Privacidade</Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-base">Termos de Serviço</Link>
                </li>
                <li>
                  <Link to="/contact#faq-section" className="text-muted-foreground hover:text-primary transition-colors text-base">FAQ</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-base">Suporte</Link>
                </li>
              </ul>
            </div>
            {/* Newsletter Accordion */}
            <div className="w-full max-w-xs mx-auto bg-background rounded-lg shadow-sm">
              <button onClick={() => setNewsletterOpen(!newsletterOpen)} className="flex justify-between items-center w-full text-base font-medium text-foreground py-3 px-4 focus:outline-none">
                Newsletter
                {newsletterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <div className={`${newsletterOpen ? 'block' : 'hidden'} py-2 px-4`}>
                <p className="text-muted-foreground mb-4 text-base">Assine para receber os últimos episódios, eBooks e conteúdos exclusivos.</p>
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <input 
                    type="email" 
                    placeholder="Seu email" 
                    className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base"
                    required
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md transition-colors text-base"
                  >
                    Inscreva-se
                  </button>
                </form>
              </div>
            </div>
          </div>
          {/* Desktop: Grid */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-8 justify-items-center md:justify-items-start">
            {/* Brand Column */}
            <div className="md:col-span-1 flex flex-col items-center text-center md:items-start md:text-left">
              <Link to="/" className="mb-4">
                <img src={jornadaLogo} alt="Jornada de Insights" className="h-16 w-auto" />
              </Link>
              <p className="text-muted-foreground mb-6 text-base">
                Podcaster, autora e criadora de conteúdo, compartilhando insights sobre crescimento pessoal e bem-estar.
              </p>
              <div className="flex space-x-4">
                <a href="https://www.youtube.com/channel/UCCJzity3rNbZd_pkBZsZOkw" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors footer-icon">
                  <Youtube className="h-5 w-5" />
                </a>
                <a href="https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW?si=ZkJHnMx6SGmz0WIrMczEjw&nd=1&dlsi=1bf146313df84baa" target="_blank" rel="noopener noreferrer" aria-label="Spotify" className="text-muted-foreground hover:text-primary transition-colors footer-icon">
                  <FaSpotify className="h-5 w-5" />
                </a>
                <a href="https://www.instagram.com/uma_jornada_de_insights?igsh=dmQ0OWozOTBvdWh3" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors footer-icon">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
            {/* Quick Links */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left w-full max-w-xs">
              <h3 className="text-base font-medium mb-4 text-foreground">Links Rápidos</h3>
              <ul className="space-y-3 md:block">
                <li>
                  <Link to="/user-dashboard" className="text-muted-foreground hover:text-primary transition-colors text-base">Dashboard</Link>
                </li>
                <li>
                  <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-base">Início</Link>
                </li>
                <li>
                  <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors text-base">Sobre</Link>
                </li>
                <li>
                  <Link to="/podcast" className="text-muted-foreground hover:text-primary transition-colors text-base">Podcast</Link>
                </li>
                <li>
                  <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors text-base">Loja</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-base">Contato</Link>
                </li>
              </ul>
            </div>
            {/* Resources */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left w-full max-w-xs">
              <h3 className="text-base font-medium mb-4 text-foreground">Recursos</h3>
              <ul className="space-y-3 md:block">
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-base">Política de Privacidade</Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-base">Termos de Serviço</Link>
                </li>
                <li>
                  <Link to="/contact#faq-section" className="text-muted-foreground hover:text-primary transition-colors text-base">FAQ</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-base">Suporte</Link>
                </li>
              </ul>
            </div>
            {/* Newsletter */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left w-full max-w-xs">
              <h3 className="text-base font-medium mb-4 text-foreground">Newsletter</h3>
              <p className="text-muted-foreground mb-4 text-base">Assine para receber os últimos episódios, eBooks e conteúdos exclusivos.</p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <input 
                  type="email" 
                  placeholder="Seu email" 
                  className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base"
                  required
                />
                <button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md transition-colors text-base"
                >
                  Inscreva-se
                </button>
              </form>
            </div>
          </div>
          <div className="border-t border-border/50 mt-12 pt-6 flex flex-col md:flex-row justify-center md:justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Patricia. Todos os direitos reservados.
            </p>
            <p className="text-sm text-muted-foreground mt-2 md:mt-0">
              Website desenvolvido por <a href="https://appdoers.co.nz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">appdoers.co.nz</a> em parceria com <a href="https://buildwithsds.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">buildwithsds.com</a>
            </p>
          </div>
        </div>
      </footer>

      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Em Breve
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              A funcionalidade de newsletter estará disponível em breve. Agradecemos seu interesse!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}