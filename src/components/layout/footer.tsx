import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Youtube, Instagram, Headphones, ChevronDown } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa';

export function Footer() {
  const [quickOpen, setQuickOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t footer-wave relative">
      {/* Wave SVG at top */}
      <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none -mt-10 h-10">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[200%] h-full" style={{ animation: 'waveScroll 8s linear infinite' }} xmlns="http://www.w3.org/2000/svg">
          <path d="M0,50 C300,150 900,-50 1200,50 L1200,0 L0,0 Z" fill="hsl(var(--primary)/0.3)" />
        </svg>
      </div>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 justify-items-center md:justify-items-start">
          {/* Brand Column */}
          <div className="md:col-span-1 flex flex-col items-center text-center md:items-start md:text-left">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Headphones className="h-6 w-6 text-primary" />
              <span className="text-xl font-heading font-semibold">Patricia</span>
            </Link>
            <p className="text-muted-foreground mb-6">
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
            <h3
              onClick={() => setQuickOpen(!quickOpen)}
              className="flex justify-between items-center w-full text-base font-medium mb-4 cursor-pointer md:cursor-auto"
            >
              Links Rápidos
              <ChevronDown className={`${quickOpen ? 'rotate-180' : ''} inline-block md:hidden h-4 w-4`} />
            </h3>
            <ul className={`${quickOpen ? 'block' : 'hidden'} space-y-3 md:block`}>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Início</Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">Sobre</Link>
              </li>
              <li>
                <Link to="/podcast" className="text-muted-foreground hover:text-primary transition-colors">Podcast</Link>
              </li>
              <li>
                <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors">Loja</Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contato</Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left w-full max-w-xs">
            <h3
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex justify-between items-center w-full text-base font-medium mb-4 cursor-pointer md:cursor-auto"
            >
              Recursos
              <ChevronDown className={`${resourcesOpen ? 'rotate-180' : ''} inline-block md:hidden h-4 w-4`} />
            </h3>
            <ul className={`${resourcesOpen ? 'block' : 'hidden'} space-y-3 md:block`}>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Política de Privacidade</a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Termos de Serviço</a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Suporte</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left w-full max-w-xs">
            <h3 className="text-base font-medium mb-4">Newsletter</h3>
            <p className="text-muted-foreground mb-4">Assine para receber os últimos episódios, eBooks e conteúdos exclusivos.</p>
            <form className="space-y-2">
              <input 
                type="email" 
                placeholder="Seu email" 
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md transition-colors"
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
            Website desenvolvido por <a href="https://buildwithsds.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">buildwithsds.com</a>
          </p>
        </div>
      </div>
    </footer>
  );
}