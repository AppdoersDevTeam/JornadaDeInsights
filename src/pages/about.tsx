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
  const [text] = useTypewriter({ words: ['About Patricia'], loop: 1, typeSpeed: 100 });

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
            Podcaster, author, and content creator, sharing insights on personal growth and well-being.
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
                  Explore My Story <ArrowRight className="ml-2 h-4 w-4" />
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
                  Explore My Journey <ArrowRight className="ml-2 h-4 w-4" />
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
              <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-4">My Story</h2>
              
              <motion.p className="text-muted-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Hi, I'm Patricia.
                I'm passionate about exploring the Bible with a creative and reflective perspective. I'm a podcaster, author, and content creator dedicated to sharing deep insights about the Bible and topics related to personal growth and well-being. With my experience, I seek to take listeners and readers on a journey of spiritual discovery, where reflection and faith meet new perspectives.
              </motion.p>
              
              <motion.p className="text-muted-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Over the years, I've developed a space where I study the Bible in a creative and accessible way, bringing to light stories that are often seen differently. I believe that by understanding the Scriptures more deeply, we can improve our daily lives and strengthen our faith in a practical and inspiring way.
              </motion.p>
              
              <motion.p className="text-muted-foreground mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                Beyond my podcast, I also write eBooks with exclusive content, where I share reflections and teachings that help people apply biblical teachings to their personal lives. Each work is thoughtfully crafted with care and focus on bringing real transformations to those seeking more clarity and spiritual growth.
              </motion.p>
              
              <div className="flex flex-wrap gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ amount: 0.3 }}
                  transition={{ duration: 0.5, bounce: 0.4 }}
                >
                  <Button asChild>
                    <Link to="/podcast">Explore My Podcast</Link>
                  </Button>
                </motion.div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ amount: 0.3 }}
                  transition={{ duration: 0.5, bounce: 0.4, delay: 0.2 }}
                >
                  <Button variant="outline" asChild>
                    <Link to="/contact">Get in Touch</Link>
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
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">How Journey of Insights Began</h2>
            
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">Where it all began and what inspired my Journey</h3>
                <p className="text-muted-foreground mb-4">
                  Since childhood, I carry with me the vivid memory of my mother taking us to church. But it was at age 8 that my heart truly awakened: I desired to be baptized and consciously make a personal commitment to God. Since then, I've been moved by a growing love for study, both of the Bible and books that deepened my understanding of the Scriptures.
                </p>
                <p className="text-muted-foreground mb-4">
                  My family moved from Santo André-SP to Marília-SP, and there, in my adolescence, I was deeply marked by the care and investment of Pastor Venilson and Pastor Márcia, who trained and inspired me to be a leader in the Christian community.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">Key moments and turning points in my Journey</h3>
                <p className="text-muted-foreground mb-4">
                  At age 18, I met Fabiano, a new convert, but full of willingness to grow. Some time later, he received the missionary call, something that together we discerned and embraced.
                </p>
                <p className="text-muted-foreground mb-4">
                  In 2004, we took one of the boldest steps of our lives: we moved to South Africa and then to Botswana, where we lived in a village called Palapye. After that missionary period, we returned to Brazil, where our children were born. Those were years of preparation, learning, and new experiences — always with God guiding every detail.
                </p>
                <p className="text-muted-foreground mb-4">
                  In 2012, we returned to Botswana, now with our children, and remained there until 2017. The following year, we began a new chapter in New Zealand. Each change brought new challenges: different cultures, different homes, new churches, friends and linguistic expressions that renewed themselves, suitcases always open — and, in the midst of everything, God's hand being evident in every step.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-xl font-heading font-medium mb-4">What led me to create a space to share</h3>
                <p className="text-muted-foreground mb-4">
                  I've always been involved with biblical teaching and music in the churches I've been part of. In recent years, I've noticed how technology has opened doors to share my experiences, learnings, and even challenges with people around the world — family, friends, brothers and sisters in faith.
                </p>
                <p className="text-muted-foreground mb-4">
                  I see that my mission is, with honesty and hope, to share the journey that God has designed for me: to show that, even in the midst of changes and uncertainties, it's possible to live with purpose, faith, knowledge, and fellowship. My desire is to encourage others to also deepen their relationship with God and to realize that faith is alive, practical, and transforms every stage of life.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.1, once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-card p-6 rounded-lg border border-border/50 shadow-sm"
              >
                <h3 className="text-xl font-heading font-medium mb-4">How "A Journey Through the Book of Revelation" was born</h3>
                <p className="text-muted-foreground mb-4">
                  In 2022, we started something very special. Every week, a group of brothers and sisters would gather to pray and study the Bible. We decided to start with the book of Revelation.
                </p>
                <p className="text-muted-foreground mb-4">
                  Midway through, already in the letters to the seven churches, one of the sisters — 80 years old, very busy caring for her bedridden husband after several strokes — shared something that left us in silence. She said she wouldn't come anymore. That she no longer believed in God, didn't understand the Bible, and that she was discouraged and without hope.
                </p>
                <p className="text-muted-foreground mb-4">
                  That night, another sister and I called her to talk. We prayed together, encouraged her, and in the end she decided to keep coming.
                </p>
                <p className="text-muted-foreground mb-4">
                  And that's when we began to see a transformation. At first, she didn't understand much, but she made an effort. I started recording the study audios and sending them to her. She not only listened, but read all the passages before Wednesday's study. And when she got home, she reviewed everything again with the notes I gave her. She still had many doubts, but she continued with the purpose of reading and studying the Bible. She shared that she had been in the church for more than 15 years, she had a study Bible that her sister had given her more than 30 years ago, but she had never read it. But at this time, she decided that she would make an effort, read, study, take notes, and learn what she could.
                </p>
                <p className="text-muted-foreground mb-4">
                  Her husband didn't improve. The situation at home didn't change. But she changed. Her countenance changed. Her faith was renewed. And more: she began to share with the nurses who came to help at home everything she was learning. Even the desire to cook and prepare delicious recipes to share with the group increased.
                </p>
                <p className="text-muted-foreground mb-4">
                  For a year and a half, we studied the book of Revelation in our cell group with material from a ministry called verse by verse. There were elderly people, children, teenagers, people from various cultures and nationalities. And each week we saw something different: faces shining, testimonies being born, the Word creating life.
                </p>
                <p className="text-muted-foreground mb-4">
                  I was able to see with my own eyes the promise of Revelation 1:3 being fulfilled:
                </p>
                <p className="text-muted-foreground mb-4 italic text-center bg-muted/50 p-4 rounded-lg">
                  "Blessed is the one who reads aloud the words of this prophecy, and blessed are those who hear it and take to heart what is written in it."
                </p>
                <p className="text-muted-foreground mb-4">
                  Revelation may seem like a confusing book, full of prophecies difficult to understand. But we experienced the promise: true blessedness. It's not about circumstances changing, but about us being transformed. I saw this happen in that sister's life. And I also saw it happen in my life and my family's, at a time when my own circumstances were not easy.
                </p>
                <p className="text-muted-foreground">
                  And that's how "A Journey Through the Book of Revelation" was born: not as a theoretical study, but as a real walk, of tears, hope, and transformation.
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
                  <strong>In 2024,</strong> I started the podcast and posting on YouTube and Spotify.
                </p>
                <p className="text-muted-foreground">
                  <strong>In 2025,</strong> my website page was completed.
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
              <div className="text-muted-foreground">Podcast Listeners</div>
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
              <div className="text-muted-foreground">Published eBooks</div>
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
              <div className="text-muted-foreground">Podcast Episodes</div>
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
              <div className="text-muted-foreground">Followers</div>
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
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">What I Do</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Headphones className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">Podcasting</h3>
              <p className="text-muted-foreground">
                I host a weekly podcast where I share reflections and conversations about biblical topics, personal growth, and well-being. In each episode, I invite listeners to explore God's Word in a deep and inspiring way.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Book className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">Writing</h3>
              <p className="text-muted-foreground">
                I'm the author of eBooks that offer practical teachings and biblical insights to help with daily faith application and personal development. My books seek to guide you on a journey of spiritual transformation and balance.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border border-border/50 shadow-sm transform transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Users className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-heading font-medium mb-2">Speaking</h3>
              <p className="text-muted-foreground">
                I conduct talks and workshops, both at in-person events and online, focused on well-being, spiritual growth, and how to live according to biblical principles in our daily lives.
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
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">My Journey</h2>
          
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
                    <h3 className="text-xl font-heading font-medium mb-2">Podcast Launch</h3>
                    <p className="text-muted-foreground">
                      I began sharing my Bible studies and reflections through the podcast, creating a space for deep discussions about faith and personal growth.
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
                    <h3 className="text-xl font-heading font-medium mb-2">First eBook</h3>
                    <p className="text-muted-foreground">
                      I published my first eBook, expanding the reach of my teachings and offering more in-depth content for my readers.
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
                    <h3 className="text-xl font-heading font-medium mb-2">Content Expansion</h3>
                    <p className="text-muted-foreground">
                      I expanded my reach with more eBooks and podcast episodes, in addition to starting to offer online workshops and talks.
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
                    <h3 className="text-xl font-heading font-medium mb-2">Growing Community</h3>
                    <p className="text-muted-foreground">
                      I built an engaged community of listeners and readers, reaching thousands of people with messages of faith and personal growth.
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
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-6">Support My Work</h2>
            <motion.p 
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              If you have been blessed by my content and would like to support this ministry, your contribution makes all the difference. Each donation helps maintain this work and create more inspiring content.
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
                  Your generosity allows me to continue sharing God's Word and creating content that transforms lives.
                </p>
                <Button size="lg" className="mt-4" asChild>
                  <Link to="/donation">
                    Make a Donation
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
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-8 text-center">What People Are Saying</h2>
          
          <div className="max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-lg border border-border/50 shadow-md relative">
              <div className="text-5xl text-primary/20 absolute top-6 left-6">"</div>
              <div className="relative z-10">
                <p className="text-lg italic mb-6">
                  Patricia has a unique ability to transform complex concepts about well-being into practical and actionable advice. Her podcast episodes are like talking to a wise friend, and her eBooks have become my essential resources whenever I feel overwhelmed or out of balance.
                </p>
                <div className="flex items-center">
                  <img 
                    src="https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                    alt="Jennifer" 
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <p className="font-medium">Jennifer Wilson</p>
                    <p className="text-sm text-muted-foreground">Wellness Coach & Podcast Listener</p>
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