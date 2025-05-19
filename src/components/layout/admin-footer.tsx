import { Link } from 'react-router-dom';
import { Headphones, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function AdminFooter() {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (section: string) => setOpen(open === section ? null : section);

  return (
    <footer className="bg-muted border-t footer-wave relative">
      {/* Wave SVG at top */}
      <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none -mt-10 h-10">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[200%] h-full" style={{ animation: 'waveScroll 8s linear infinite' }} xmlns="http://www.w3.org/2000/svg">
          <path d="M0,50 C300,150 900,-50 1200,50 L1200,0 L0,0 Z" fill="hsl(var(--primary)/0.3)" />
        </svg>
      </div>
      <div className="container mx-auto px-4 py-6 bg-muted/30">
        {/* Mobile: Accordions */}
        <div className="md:hidden space-y-4">
          {/* Brand Section */}
          <div className="flex flex-col items-center text-center">
            <Link to="/dashboard" className="flex items-center gap-2 mb-4">
              <Headphones className="h-6 w-6 text-primary" />
              <span className="text-xl font-heading font-semibold">Patricia Dashboard</span>
            </Link>
            <p className="text-muted-foreground text-base mb-2">
              Painel de Controle - Seu centro de controle
            </p>
          </div>
          {/* Quick Links Accordion */}
          <div className="w-full max-w-xs mx-auto bg-background rounded-lg shadow-sm">
            <button className="flex justify-between items-center w-full text-base font-medium text-foreground py-3 px-4 focus:outline-none" onClick={() => toggle('quick')}>
              Links Rápidos {open === 'quick' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open === 'quick' && (
              <ul className="space-y-3 py-2 px-4">
                <li>
                  <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors text-base">Dashboard</Link>
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
                  <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors text-base">Ebooks</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-base">Contato</Link>
                </li>
              </ul>
            )}
          </div>
          {/* Legal Accordion */}
          <div className="w-full max-w-xs mx-auto bg-background rounded-lg shadow-sm">
            <button className="flex justify-between items-center w-full text-base font-medium text-foreground py-3 px-4 focus:outline-none" onClick={() => toggle('legal')}>
              Recursos {open === 'legal' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open === 'legal' && (
              <ul className="space-y-3 py-2 px-4">
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
            )}
          </div>
          {/* Support Accordion */}
          <div className="w-full max-w-xs mx-auto bg-background rounded-lg shadow-sm">
            <button className="flex justify-between items-center w-full text-base font-medium text-foreground py-3 px-4 focus:outline-none" onClick={() => toggle('support')}>
              Precisa de Ajuda? {open === 'support' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open === 'support' && (
              <div className="py-2 px-4">
                <p className="text-muted-foreground text-base mb-2">Entre em contato com nossa equipe de suporte para obter ajuda com seu painel de controle.</p>
                <Link to="/dashboard/support" className="text-primary hover:underline text-base">Obter Suporte →</Link>
              </div>
            )}
          </div>
        </div>
        {/* Desktop: Grid */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col">
            <Link to="/dashboard" className="flex items-center gap-2 mb-4">
              <Headphones className="h-6 w-6 text-primary" />
              <span className="text-xl font-heading font-semibold">Patricia Dashboard</span>
            </Link>
            <p className="text-muted-foreground text-base mb-2">
              Painel de Controle - Seu centro de controle
            </p>
          </div>
          {/* Quick Links */}
          <div>
            <h3 className="text-base font-medium mb-4 text-foreground">Links Rápidos</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors text-base">Dashboard</Link>
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
                <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors text-base">Ebooks</Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-base">Contato</Link>
              </li>
            </ul>
          </div>
          {/* Legal Links */}
          <div>
            <h3 className="text-base font-medium mb-4 text-foreground">Recursos</h3>
            <ul className="space-y-3">
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
          {/* Support Section */}
          <div>
            <h3 className="text-base font-medium mb-4 text-foreground">Precisa de Ajuda?</h3>
            <p className="text-muted-foreground text-base mb-2">Entre em contato com nossa equipe de suporte para obter ajuda com seu painel de controle.</p>
            <Link to="/dashboard/support" className="text-primary hover:underline text-base">Obter Suporte →</Link>
          </div>
        </div>
        <div className="border-t border-border/50 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">© {currentYear} Patricia. Todos os direitos reservados.</p>
          <p className="text-sm text-muted-foreground mt-2 md:mt-0">Website desenvolvido por <a href="https://appdoers.co.nz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">appdoers.co.nz</a> em parceria com <a href="https://buildwithsds.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">buildwithsds.com</a></p>
        </div>
      </div>
    </footer>
  );
} 