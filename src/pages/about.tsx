import { Headphones, Book, Users, CalendarDays, Facebook } from 'lucide-react';
import plogo from '@/plogo.png';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
import CountUp from 'react-countup';
import { ArrowRight } from 'lucide-react';

// Add CTA animations
const ctaContainerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } };
const ctaButtonVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 20 } } };

export function AboutPage() {
  const [text] = useTypewriter({ words: ['Sobre a Patricia'], loop: 1, typeSpeed: 100 });

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
          <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            {text}
            <Cursor cursorStyle="|" />
          </h1>
          <motion.p className="text-lg text-muted-foreground mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Podcaster, autora e criadora de conteúdo, compartilhando insights sobre crescimento pessoal e bem-estar.
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
                  Explorar Minha História <ArrowRight className="ml-2 h-4 w-4" />
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
                  Explorar Minha Jornada <ArrowRight className="ml-2 h-4 w-4" />
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
              <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-4">Minha História</h2>
              
              <motion.p className="text-muted-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Oi, eu sou a Patricia.
                Sou apaixonada por explorar a Bíblia com um olhar criativo e reflexivo. Sou podcaster, autora e criadora de conteúdo dedicada a compartilhar insights profundos sobre a Bíblia e temas relacionados ao crescimento pessoal e bem-estar. Com a minha experiência, busco levar os ouvintes e leitores a uma jornada de descoberta espiritual, onde a reflexão e a fé se encontram com novas perspectivas.
              </motion.p>
              
              <motion.p className="text-muted-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Ao longo dos anos, desenvolvi um espaço onde estudo a Bíblia de uma forma criativa e acessível, trazendo à tona histórias que muitas vezes são vistas de uma maneira diferente. Acredito que, ao entender mais profundamente as Escrituras, podemos melhorar nossa vida cotidiana e fortalecer nossa fé de maneira prática e inspiradora.
              </motion.p>
              
              <motion.p className="text-muted-foreground mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                Além do meu podcast, também escrevo eBooks com conteúdos exclusivos, onde compartilho reflexões e ensinamentos que ajudem as pessoas a aplicar os ensinamentos bíblicos em sua vida pessoal. Cada trabalho é pensado com carinho e foco em trazer transformações reais para quem busca mais clareza e crescimento espiritual.
              </motion.p>
              
              <div className="flex flex-wrap gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ amount: 0.3 }}
                  transition={{ duration: 0.5, bounce: 0.4 }}
                >
                  <Button asChild>
                    <Link to="/podcast">Explorar Meu Podcast</Link>
                  </Button>
                </motion.div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ amount: 0.3 }}
                  transition={{ duration: 0.5, bounce: 0.4, delay: 0.2 }}
                >
                  <Button variant="outline" asChild>
                    <Link to="/contact">Entre em Contato</Link>
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
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">Como Começou Jornada de Insights</h2>
            
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">De onde tudo começou e o que inspirou minha Jornada</h3>
                <p className="text-muted-foreground mb-4">
                  Desde criança, trago comigo a lembrança marcante da minha mãe nos levando para a igreja. Mas foi aos 8 anos que meu coração realmente despertou: desejei me batizar e assumir, com consciência, um compromisso pessoal com Deus. Desde então, fui movida por um amor crescente pelo estudo, tanto da Bíblia quanto de livros que aprofundassem meu entendimento das Escrituras.
                </p>
                <p className="text-muted-foreground mb-4">
                  Minha família saiu de Santo André-SP rumo a Marília-SP, e ali, na adolescência, fui profundamente marcada pelo cuidado e investimento do Pr. Venilson e da Pra. Márcia, que me treinaram e inspiraram a ser uma líder na comunidade cristã.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">Momentos-chave e viradas na minha Jornada</h3>
                <p className="text-muted-foreground mb-4">
                  Aos 18 anos conheci o Fabiano, um novo convertido, mas cheio de disposição para crescer. Algum tempo depois, ele recebeu o chamado missionário, algo que, juntos, discernimos e abraçamos.
                </p>
                <p className="text-muted-foreground mb-4">
                  Em 2004, demos um dos passos mais ousados das nossas vidas: nos mudamos para a África do Sul e, em seguida, para Botswana, onde vivemos numa vila chamada Palapye. Passado esse período missionário, voltamos ao Brasil, onde nasceram nossos filhos. Foram anos de preparo, aprendizado e novas experiências — sempre com Deus conduzindo cada detalhe.
                </p>
                <p className="text-muted-foreground mb-4">
                  Em 2012 retornamos para Botswana, agora com nossos filhos, e ali permanecemos até 2017. No ano seguinte, começamos uma nova etapa em Nova Zelândia. Cada mudança trouxe novos desafios: culturas diferentes, lares diferentes, igrejas novas, amigos e expressões linguísticas que se renovavam, malas sempre abertas — e, em meio a tudo, a mão de Deus sendo evidente em cada passo.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">O que me levou a criar espaço para compartilhar</h3>
                <p className="text-muted-foreground mb-4">
                  Sempre estive envolvida com ensino bíblico e música nas igrejas por onde passei. Nos últimos anos, tenho percebido como a tecnologia abriu portas para compartilhar minhas experiências, aprendizados e até desafios com pessoas ao redor do mundo — família, amigos, irmãos na fé.
                </p>
                <p className="text-muted-foreground mb-4">
                  Vejo que minha missão é, com honestidade e esperança, repartir a jornada que Deus tem desenhado para mim: mostrar que, mesmo no meio das mudanças e incertezas, é possível viver com propósito, fé, conhecimento e comunhão. Meu desejo é encorajar outros a também se aprofundarem no relacionamento com Deus e a perceberem que a fé é viva, prática, e transforma cada etapa da vida.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-card p-6 rounded-lg border border-border/50 shadow-sm"
              >
                <h3 className="text-xl font-heading font-medium mb-4">Como nasceu "Uma Jornada pelo Livro de Apocalipse"</h3>
                <p className="text-muted-foreground mb-4">
                  Em 2022, começamos algo muito especial. Toda semana, um grupo de irmãos se reunia para orar e estudar a Bíblia. Decidimos começar pelo livro do Apocalipse.
                </p>
                <p className="text-muted-foreground mb-4">
                  No meio do caminho, já nas cartas às sete igrejas, uma das irmãs — com 80 anos, muito ocupada cuidando do marido acamado após vários derrames — compartilhou algo que nos deixou em silêncio. Ela disse que não viria mais. Que já não acreditava em Deus, não entendia a Bíblia, e que estava desanimada e sem esperança.
                </p>
                <p className="text-muted-foreground mb-4">
                  Naquele noite, eu e outra irmã a chamamos para conversar. Oramos juntas, encorajamos, e no fim ela decidiu continuar vindo.
                </p>
                <p className="text-muted-foreground mb-4">
                  E foi aí que começamos a ver uma transformação. No início, ela não entendia muito, mas se esforçava. Eu comecei a gravar os áudios dos estudos e enviar para ela. Ela não só ouvia, mas lia todas as passagens antes do estudo de quarta-feira. E quando chegava em casa, revisava tudo de novo com as anotações que eu dava. Ela ainda continuava com muitas duvidas, mas continuou com o proposito de ler e estudar a Biblia. Ela compartilhou que ela já estava na igreja há mais de 15 anos, ela tinha uma bíblia de estudo que a irma dela havia dado a ela há mais de 30 anos, mas ela nunca a tinha lido. Mas nesta epoca, ela decidiu que ia se esforçar, ler, estudar, fazer anotações e aprender o que pudesse.
                </p>
                <p className="text-muted-foreground mb-4">
                  O marido dela não melhorou. A situação em casa não mudou. Mas ela mudou. O semblante dela mudou. A fé dela se renovou. E mais: ela começou a compartilhar com as enfermeiras que vinham ajudar em casa tudo o que estava aprendendo. Até o desejo de cozinhar e preparar deliciosas receitas para compartilhar com o grupo aumentou.
                </p>
                <p className="text-muted-foreground mb-4">
                  Durante um ano e meio, estudamos o livro do Apocalipse em nossa célula com o material de um ministério chamado versículo por versículo. Estavam ali pessoas idosas, crianças, adolescentes, pessoas de várias culturas e nacionalidades. E cada semana víamos algo diferente: os rostos brilhando, os testemunhos nascendo, a Palavra criando vida.
                </p>
                <p className="text-muted-foreground mb-4">
                  Eu pude ver com meus olhos a promessa de Apocalipse 1:3 se cumprir:
                </p>
                <p className="text-muted-foreground mb-4 italic text-center bg-muted/50 p-4 rounded-lg">
                  "Bem-aventurados os que leem, os que ouvem e guardam as palavras desta profecia."
                </p>
                <p className="text-muted-foreground mb-4">
                  O Apocalipse pode parecer um livro confuso, cheio de profecias difíceis de entender. Mas nós experimentamos a promessa: a verdadeira bem-aventurança. Não é sobre circunstâncias mudarem, mas sobre nós sermos transformados. Eu vi isso acontecer na vida dessa irmã. E vi também acontecer na minha vida e de minha família, em um tempo em que as minhas próprias circunstâncias não eram fáceis.
                </p>
                <p className="text-muted-foreground">
                  E foi assim que nasceu "Uma Jornada pelo Livro de Apocalipse": não como um estudo teórico, mas como uma caminhada real, de lágrimas, esperança e transformação.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-primary/5 p-6 rounded-lg border border-primary/20"
              >
                <p className="text-muted-foreground mb-2">
                  <strong>Em 2024,</strong> comecei o podcast, e postar no Youtube e Spotify.
                </p>
                <p className="text-muted-foreground">
                  <strong>Em 2025,</strong> a minha pagina de website ficou pronta.
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
              <div className="text-muted-foreground">Ouvintes do Podcast</div>
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
              <div className="text-muted-foreground">eBooks Publicados</div>
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
              <div className="text-muted-foreground">Episódios de Podcast</div>
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
              <div className="text-muted-foreground">Seguidores</div>
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
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">O Que Eu Faço</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Headphones className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">Podcasting</h3>
              <p className="text-muted-foreground">
                Apresento um podcast semanal onde compartilho reflexões e conversas sobre temas bíblicos, crescimento pessoal e bem-estar. A cada episódio, convido os ouvintes a explorar a Palavra de Deus de forma profunda e inspiradora.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Book className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">Escrita</h3>
              <p className="text-muted-foreground">
                Sou autora de eBooks que oferecem ensinamentos práticos e insights bíblicos para ajudar na aplicação diária da fé e no desenvolvimento pessoal. Meus livros buscam guiar você em uma jornada de transformação espiritual e equilíbrio.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Users className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">Palestras</h3>
              <p className="text-muted-foreground">
                Realizo palestras e workshops, tanto em eventos presenciais quanto online, focados em bem-estar, crescimento espiritual e como viver de acordo com os princípios bíblicos em nossa vida cotidiana.
              </p>
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
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">Minha Jornada</h2>
          
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
                    <h3 className="text-xl font-heading font-medium mb-2">Início do Podcast</h3>
                    <p className="text-muted-foreground">
                      Comecei a compartilhar meus estudos bíblicos e reflexões através do podcast, criando um espaço para discussões profundas sobre fé e crescimento pessoal.
                    </p>
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
                    <h3 className="text-xl font-heading font-medium mb-2">Primeiro eBook</h3>
                    <p className="text-muted-foreground">
                      Publiquei meu primeiro eBook, expandindo o alcance dos meus ensinamentos e oferecendo conteúdo mais aprofundado para meus leitores.
                    </p>
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
                    <h3 className="text-xl font-heading font-medium mb-2">Expansão do Conteúdo</h3>
                    <p className="text-muted-foreground">
                      Ampliei meu alcance com mais eBooks e episódios de podcast, além de começar a oferecer workshops e palestras online.
                    </p>
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
                    <h3 className="text-xl font-heading font-medium mb-2">Comunidade Crescente</h3>
                    <p className="text-muted-foreground">
                      Construí uma comunidade engajada de ouvintes e leitores, alcançando milhares de pessoas com mensagens de fé e crescimento pessoal.
                    </p>
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
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-6">Apoie Meu Trabalho</h2>
            <motion.p 
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Se você tem sido abençoado pelo meu conteúdo e gostaria de apoiar este ministério, sua contribuição faz toda a diferença. Cada doação ajuda a manter este trabalho e a criar mais conteúdo inspirador.
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
                  Sua generosidade permite que eu continue compartilhando a Palavra de Deus e criando conteúdo que transforma vidas.
                </p>
                <Button size="lg" className="mt-4" asChild>
                  <Link to="/donation">
                    Fazer uma Doação
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
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">O Que as Pessoas Estão Dizendo</h2>
          
          <div className="max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-lg border border-border/50 shadow-md relative">
              <div className="text-5xl text-primary/20 absolute top-6 left-6">"</div>
              <div className="relative z-10">
                <p className="text-lg italic mb-6">
                  Patricia tem uma habilidade única de transformar conceitos complexos sobre bem-estar em conselhos práticos e acionáveis. Seus episódios de podcast são como conversar com uma amiga sábia, e seus eBooks se tornaram meus recursos essenciais sempre que me sinto sobrecarregada ou fora de equilíbrio.
                </p>
                <div className="flex items-center">
                  <img 
                    src="https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                    alt="Jennifer" 
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <p className="font-medium">Jennifer Wilson</p>
                    <p className="text-sm text-muted-foreground">Coach de Bem-Estar & Ouvinte do Podcast</p>
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