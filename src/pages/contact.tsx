import { useState } from 'react';
import { Mail, MapPin, Send, Clock, CheckCircle, ChevronDown, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, Variants } from 'framer-motion';

// Add CTA animations
const ctaContainerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } };
const ctaButtonVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 20 } } };

export function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormState({
        name: '',
        email: '',
        subject: '',
        message: ''
      });

      // Smooth scroll to success message
      const successMessage = document.getElementById('success-message');
      if (successMessage) {
        successMessage.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 1500);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-fixed bg-center bg-gradient-to-br from-primary/10 to-background pt-[60px]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4 animate-in fade-in duration-1000 slide-in-from-bottom-4">Entre em Contato</h1>
            <p className="text-lg text-muted-foreground mb-6 animate-in fade-in duration-1000 slide-in-from-bottom-4 delay-500">
              Tem perguntas sobre meu podcast, eBooks ou palestras? Vamos nos conectar!
            </p>
            <motion.div
              variants={ctaContainerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
            >
              <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <a href="#contact-form">
                    Enviar Mensagem <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </motion.div>
              <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                  <a href="#faq-section">
                    Perguntas Frequentes <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Form and Info */}
      <section id="contact-form" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8">Informações de Contato</h2>
              
              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Mail className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Email</h3>
                    <p className="text-muted-foreground">patricia@example.com</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <MapPin className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Localização</h3>
                    <p className="text-muted-foreground">San Francisco, California</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Clock className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Tempo de Resposta</h3>
                    <p className="text-muted-foreground">Normalmente em 1-2 dias úteis</p>
                  </div>
                </div>
              </div>
              
              <h3 className="font-medium mb-4">Conecte-se Comigo</h3>
              <div className="flex space-x-4">
                <a href="https://www.youtube.com/@umajornadadeinsights" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="bg-primary/10 p-3 rounded-full transition-all duration-300 hover:bg-primary/20 hover:-translate-y-1 hover:shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                </a>
                <a href="https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW?si=ZkJHnMx6SGmz0WIrMczEjw&nd=1&dlsi=1bf146313df84baa" target="_blank" rel="noopener noreferrer" aria-label="Spotify" className="bg-primary/10 p-3 rounded-full transition-all duration-300 hover:bg-primary/20 hover:-translate-y-1 hover:shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><path d="M8 11.8A5.5 5.5 0 0 1 14.5 8"/><path d="M6 14.5a8 8 0 0 1 8-4"/><path d="M16 6.5a12 12 0 0 0-14 5"/></svg>
                </a>
                <a href="https://www.instagram.com/uma_jornada_de_insights?igsh=dmQ0OWozOTBvdWh3" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="bg-primary/10 p-3 rounded-full transition-all duration-300 hover:bg-primary/20 hover:-translate-y-1 hover:shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8">Enviar uma Mensagem</h2>
              
              {isSubmitted ? (
                <div id="success-message" className="bg-secondary/10 text-secondary rounded-md p-6 flex items-center gap-3 animate-in fade-in duration-500 slide-in-from-bottom-4">
                  <CheckCircle className="h-6 w-6 flex-shrink-0 animate-in bounce-in duration-1000" />
                  <div>
                    <h3 className="font-medium mb-1">Obrigado por entrar em contato!</h3>
                    <p>Sua mensagem foi recebida. Eu retornarei o mais breve possível.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">Seu Nome</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 rounded-md border border-input bg-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary),0.1)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">Seu Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 rounded-md border border-input bg-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary),0.1)]"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">Assunto</label>
                    <select
                      id="subject"
                      name="subject"
                      value={formState.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-md border border-input bg-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary),0.1)]"
                    >
                      <option value="">Selecione um assunto</option>
                      <option value="Podcast Inquiry">Inquérito de Podcast</option>
                      <option value="eBook Support">Suporte ao eBook</option>
                      <option value="Speaking Engagement">Palestras</option>
                      <option value="Other">Outro</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">Sua Mensagem</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formState.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-2 rounded-md border border-input bg-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary),0.1)]"
                    />
                  </div>
                  
                  <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Enviar Mensagem <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq-section" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">Perguntas Frequentes</h2>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "Como posso ser um convidado no seu podcast?",
                answer: "Estou sempre em busca de convidados interessantes com perspectivas únicas. Por favor, use o formulário de contato acima e selecione 'Consulta sobre Podcast' como assunto. Inclua detalhes sobre sua experiência e os tópicos que gostaria de discutir."
              },
              {
                question: "Você oferece palestras?",
                answer: "Sim, estou disponível para palestras principais, workshops e discussões em painéis sobre temas relacionados à atenção plena, produtividade e vida equilibrada. Entre em contato com os detalhes do evento para verificar disponibilidade e tarifas."
              },
              {
                question: "Comprei um eBook, mas não o recebi. O que devo fazer?",
                answer: "Verifique primeiro sua pasta de spam/lixo eletrônico. Se ainda não conseguir localizar sua compra, entre em contato comigo com os detalhes do pedido e eu reenviarei imediatamente."
              },
              {
                question: "Você oferece coaching ou consultorias?",
                answer: "Tenho disponibilidade limitada para sessões de coaching individuais. Por favor, entre em contato através do formulário de contato para saber sobre disponibilidade e tarifas atuais."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-card rounded-lg shadow-sm border border-border/50 overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                  <h3 className="font-medium text-lg">{faq.question}</h3>
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}
                  />
                </button>
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${
                    openFaq === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="p-6 pt-0 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}