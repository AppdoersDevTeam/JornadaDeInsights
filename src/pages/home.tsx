import { ArrowRight, Play, Bookmark, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { EbookCard, type Ebook } from '@/components/shop/ebook-card';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import plogo from '@/plogo.png';
import { getEbooks, getCuriosidades, type Curiosidade } from '@/lib/supabase';
import { CuriosidadeCard } from '@/components/curiosidades/curiosidade-card';
import { decode } from 'html-entities';
import { needsIOSVideoFix, getYouTubeEmbedUrl, handleIframeLoad, reloadIframeForIOS } from '@/lib/device-utils';

// Define type for YouTube API items
type YouTubeVideo = {
  id: { videoId: string };
  snippet: { title: string; description: string };
};

const testimonials = [
  {
    id: "1",
    quote: "O podcast da Patricia transformou minha maneira de entender as Escrituras. Suas reflexões profundas e acessíveis me ajudaram a aplicar a fé no meu dia a dia.",
    author: "Fernanda M.",
    title: "Professora de História"
  },
  {
    id: "2",
    quote: "O eBook 'Reflexões de Fé' me guiou a enxergar a Bíblia de uma forma nova. Agora, me sinto mais conectada com minha espiritualidade e com mais equilíbrio na vida.",
    author: "Lucas P.",
    title: "Empreendedor"
  },
  {
    id: "3",
    quote: "Acompanho a Patricia há anos. Seus conteúdos sempre trazem sabedoria prática e inspiradora, ajudando-me a crescer na fé e em minha jornada pessoal.",
    author: "Juliana R.",
    title: "Coach Espiritual"
  }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const ctaButtonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  // ... existing code ...
};

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const headerOffset = 80;
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

  // Use smooth scrolling with a fallback
  try {
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  } catch (e) {
    // Fallback for browsers that don't support smooth scrolling
    window.scrollTo(0, offsetPosition);
  }
};

export function HomePage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [heroVideo, setHeroVideo] = useState<YouTubeVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [featuredEbooks, setFeaturedEbooks] = useState<Ebook[]>([]);
  const [isLoadingEbooks, setIsLoadingEbooks] = useState(true);
  const [isHeroPlaying, setIsHeroPlaying] = useState(false);
  const [curiosidades, setCuriosidades] = useState<Curiosidade[]>([]);
  const [isLoadingCuriosidades, setIsLoadingCuriosidades] = useState(true);

  // Enhanced play handler for iOS compatibility
  const handleVideoPlay = (setPlaying: (playing: boolean) => void) => {
    setPlaying(true);
    reloadIframeForIOS();
  };

  useEffect(() => {
    // Fetch featured ebooks
    const fetchEbooks = async () => {
      try {
        const ebooks = await getEbooks();
        setFeaturedEbooks(ebooks);
      } catch (error) {
        console.error('Error fetching ebooks:', error);
      } finally {
        setIsLoadingEbooks(false);
      }
    };

    // Fetch curiosidades
    const fetchCuriosidades = async () => {
      try {
        const data = await getCuriosidades();
        setCuriosidades(data.slice(0, 3)); // Show only the 3 most recent
      } catch (error) {
        console.error('Error fetching curiosidades:', error);
      } finally {
        setIsLoadingCuriosidades(false);
      }
    };

    fetchEbooks();
    fetchCuriosidades();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    // bump cache key to v4 to clear any old cached items and implement better caching
    const CACHE_KEY = 'youtube-videos-v4';
    const CACHE_TIME_KEY = 'youtube-videos-v4-timestamp';
    const CACHE_ERROR_KEY = 'youtube-videos-v4-error';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const lastError = localStorage.getItem(CACHE_ERROR_KEY);

    // If we have cached data and it's not expired, use it
    if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < CACHE_DURATION) {
      try {
        const vids = JSON.parse(cachedData) as YouTubeVideo[];
        setVideos(vids);
        setHeroVideo(vids[Math.floor(Math.random() * vids.length)]);
        setIsLoading(false);
        return;
      } catch (e) {
        console.error('Error parsing cached data:', e);
        // If there's an error parsing the cache, we'll fetch fresh data
      }
    }

    // If we had an error in the last 1 hour, don't try to fetch again
    if (lastError && now - parseInt(lastError, 10) < 60 * 60 * 1000) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
    const CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
    
    if (!API_KEY || !CHANNEL_ID) {
      console.error('YouTube API key or Channel ID not found in environment variables');
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // First, try to get videos from our own API endpoint which has better caching
    fetch('/api/youtube-videos')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.items && data.items.length > 0) {
          setVideos(data.items);
          setHeroVideo(data.items[Math.floor(Math.random() * data.items.length)]);
          // Cache the successful response
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.items));
          localStorage.setItem(CACHE_TIME_KEY, now.toString());
          localStorage.removeItem(CACHE_ERROR_KEY);
        } else {
          throw new Error('No videos found in API response');
        }
      })
      .catch(error => {
        console.error('Error fetching from API endpoint:', error);
        // If our API endpoint fails, fall back to direct YouTube API call
        return fetch(`https://youtube.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&type=video&order=date&maxResults=10`)
          .then((response) => {
            if (!response.ok) {
              return response.json().then(err => {
                console.error('YouTube API error:', err);
                // If we hit quota limits, cache the error
                if (err.error?.code === 403 || err.error?.message?.includes('quota')) {
                  localStorage.setItem(CACHE_ERROR_KEY, now.toString());
                }
                throw new Error(err.error?.message || `HTTP ${response.status}`);
              });
            }
            return response.json() as Promise<{ items: YouTubeVideo[] }>;
          })
          .then((data) => {
            if (!data.items) {
              setVideos([]);
              setHeroVideo(null);
              return;
            }
            const searchItems = (data.items as YouTubeVideo[]).filter(item => item.id.videoId);
            if (searchItems.length === 0) {
              setVideos([]);
              setHeroVideo(null);
              return;
            }
            const idList = searchItems.map(item => item.id.videoId).join(',');
            return fetch(`https://youtube.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${idList}&part=contentDetails`)
              .then(res2 => res2.json())
              .then((detailData: { items: { id: string; contentDetails: { duration: string } }[] }) => {
                const parseISO8601 = (iso: string): number => {
                  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                  const hours = parseInt(match?.[1] ?? '0', 10);
                  const minutes = parseInt(match?.[2] ?? '0', 10);
                  const seconds = parseInt(match?.[3] ?? '0', 10);
                  return hours * 3600 + minutes * 60 + seconds;
                };
                const allowedIds = detailData.items
                  .filter(d => parseISO8601(d.contentDetails.duration) > 120)
                  .map(d => d.id);
                const filtered = searchItems.filter(item => allowedIds.includes(item.id.videoId));
                setVideos(filtered);
                setHeroVideo(filtered[Math.floor(Math.random() * filtered.length)] || null);
                // Cache the successful response
                localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
                localStorage.setItem(CACHE_TIME_KEY, now.toString());
                localStorage.removeItem(CACHE_ERROR_KEY);
              });
          });
      })
      .catch((error: unknown) => {
        console.error('Error fetching YouTube videos:', error);
        setHasError(true);
        // Cache the error timestamp
        localStorage.setItem(CACHE_ERROR_KEY, now.toString());
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
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
        
        <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2 text-left">
              <motion.h1
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ amount: 0.3 }}
                className="text-3xl md:text-5xl font-heading font-bold mb-2 leading-tight"
              >
                Jornada de <span className="text-primary">Insights</span>
              </motion.h1>
              <motion.h2
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ amount: 0.3 }}
                className="text-2xl md:text-3xl font-heading font-medium mb-6 text-muted-foreground"
              >
                Com Patricia da Silva
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ amount: 0.3 }}
                className="text-lg text-muted-foreground mb-2"
              >
                A verdade da Bíblia é eterna, mas há sempre novos insights a serem descobertos.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                viewport={{ amount: 0.3 }}
                className="text-lg text-muted-foreground mb-2"
              >
                Ouça agora os nossos episódios no YouTube, Spotify e iHeartRadio.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ amount: 0.3 }}
                className="text-lg text-muted-foreground mb-8"
              >
                Explore nossos e-books e recursos para crianças, jovens e adultos.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ amount: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <Link to="/podcast">
                      Ouvir o Podcast <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                    <Link to="/shop">
                      Explorar eBooks <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
            <div className="w-full md:w-1/2">
              <div className="relative rounded-t-lg rounded-b-none overflow-hidden shadow-xl">
                {/* 'Vídeo em Destaque' overlay at top left */}
                <div className="absolute top-4 left-4 bg-gradient-to-tr from-black/80 to-black/30 p-2 rounded-lg z-10 flex items-center gap-2 text-white">
                  <Award className="h-5 w-5" />
                  <span className="text-sm font-medium">Vídeo em Destaque</span>
                </div>
                {(isLoading || hasError) ? (
                  <div className="w-full aspect-video bg-black" />
                ) : heroVideo ? (
                  !isHeroPlaying ? (
                    <div
                      className="w-full aspect-video bg-cover bg-center cursor-pointer relative video-thumbnail"
                      style={{ backgroundImage: `url(https://img.youtube.com/vi/${heroVideo.id.videoId}/hqdefault.jpg)` }}
                      onClick={() => handleVideoPlay(setIsHeroPlaying)}
                      onTouchStart={() => {}} // Enable touch events on iOS
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-16 w-16 text-white bg-primary p-4 rounded-full shadow-lg play-button video-play-button" />
                      </div>
                    </div>
                  ) : (
                    <div className="iframe-container">
                      <iframe
                        src={getYouTubeEmbedUrl(heroVideo.id.videoId, {
                          language: 'pt-BR',
                          autoplay: true
                        })}
                        title={heroVideo.snippet.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full aspect-video"
                        style={{ 
                          border: 'none',
                          WebkitTransform: 'translate3d(0, 0, 0)',
                          transform: 'translate3d(0, 0, 0)'
                        }}
                        onLoad={(e) => {
                          const iframe = e.target as HTMLIFrameElement;
                          handleIframeLoad(iframe);
                        }}
                      />
                    </div>
                  )
                ) : null}
              </div>
              {heroVideo && (
                <div className="bg-white rounded-b-lg px-6 pt-4 pb-6 border-t border-border/50">
                  <h3 className="font-heading text-lg font-medium mb-0 line-clamp-2 text-[#65623c]">{decode(heroVideo.snippet.title)}</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Featured Podcast Episodes */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-background"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-heading font-semibold">Episódios Recentes</h2>
            <Button variant="ghost" asChild>
              <Link to="/podcast" className="flex items-center">
                Ver Todos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <div className="p-4">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-4 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : hasError ? (
              <div className="col-span-full text-center py-12">
                <p className="text-lg text-muted-foreground">Não foi possível carregar os episódios. Por favor, tente novamente mais tarde.</p>
              </div>
            ) : (
              videos.slice(0, 3).map((video) => (
                <PodcastCard key={video.id.videoId} video={video} />
              ))
            )}
          </div>
        </div>
      </motion.section>

      {/* About & Mission */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-muted/30"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ amount: 0.3 }}
              className="w-full md:w-5/12"
            >
              <div className="relative">
                <img
                  src={plogo}
                  alt="Patricia speaking at an event"
                  className="rounded-full shadow-lg w-full"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ amount: 0.3 }}
              className="w-full md:w-7/12"
            >
              <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-4">Sobre Mim – Patricia da Silva</h2>
              <p className="text-muted-foreground mb-4 font-medium">
                Podcaster, educadora e contadora de histórias bíblicas.
              </p>
              <p className="text-muted-foreground mb-4">
                Minha missão é compartilhar insights profundos e acessíveis das Escrituras, trazendo o contexto histórico, cultural e espiritual que dá vida aos textos bíblicos — de forma clara, envolvente e transformadora.
              </p>
              <p className="text-muted-foreground mb-4">
                Com meu projeto "Jornada de Insights", alcanço pessoas de todas as idades, com materiais que vão desde estudos bíblicos para adultos, até e-books e recursos criativos para crianças, ajudando famílias a crescerem juntas na fé.
              </p>
              <p className="text-muted-foreground mb-4">
                Falar da Bíblia é minha paixão, e procuro falar com simplicidade e reverência — combinando pesquisa, ensino e aplicação prática com uma linguagem que conecta mente e coração.
              </p>
              <p className="text-muted-foreground mb-6">
                Amo ensinar com propósito, educar com criatividade e inspirar com amor pela Palavra de Deus.
              </p>
              <Button asChild>
                <Link to="/about">Saiba mais sobre mim</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Featured eBooks */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-muted/30"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-heading font-semibold">eBooks em Destaque</h2>
            <Button variant="ghost" asChild>
              <Link to="/shop" className="flex items-center">
                Ver Todos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingEbooks ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 animate-pulse">
                  <div className="aspect-[3/4] bg-muted" />
                  <div className="p-4">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-4 w-1/2 bg-muted rounded mb-4" />
                    <div className="h-4 w-1/4 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : (
              featuredEbooks.slice(0, 3).map((ebook) => (
                <EbookCard key={ebook.id} book={ebook} />
              ))
            )}
          </div>
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-background"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-12 text-center">Depoimentos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ amount: 0.3 }}
                className="bg-card rounded-lg shadow-md p-6 border border-border/50"
              >
                <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-medium">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Curiosidades Section */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-muted/30"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-heading font-semibold">Curiosidades</h2>
            {curiosidades.length > 0 && (
              <Button variant="ghost" asChild>
                <Link to="/curiosidades" className="flex items-center">
                  Ver Todas <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingCuriosidades ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 animate-pulse">
                  <div className="p-6">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-4 w-1/2 bg-muted rounded mb-4" />
                    <div className="h-20 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : curiosidades.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-lg text-muted-foreground">Nenhuma curiosidade disponível ainda.</p>
              </div>
            ) : (
              curiosidades.map((curiosidade) => (
                <CuriosidadeCard key={curiosidade.id} curiosidade={curiosidade} />
              ))
            )}
          </div>
        </div>
      </motion.section>

    </>
  );
}

// Add PodcastCard component for flip animation
function PodcastCard({ video }: { video: YouTubeVideo }) {
  const [flipped, setFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Enhanced play handler for iOS compatibility
  const handleVideoPlay = () => {
    setIsPlaying(true);
    reloadIframeForIOS();
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ amount: 0.3 }}
      className="group bg-card rounded-lg shadow-md overflow-hidden border border-border/50 hover:shadow-xl transition-shadow"
    >
      <div className="aspect-video relative overflow-hidden" style={{ perspective: 1000 }}>
        <motion.div
          initial={{ rotateY: 0 }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="w-full h-full"
        >
          {/* Front face: video embed with overlay play icon */}
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            {!isPlaying ? (
              <div
                className="w-full h-full bg-cover bg-center cursor-pointer video-thumbnail"
                style={{ backgroundImage: `url(https://img.youtube.com/vi/${video.id.videoId}/hqdefault.jpg)` }}
                onClick={handleVideoPlay}
                onTouchStart={() => {}} // Enable touch events on iOS
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-12 w-12 text-white bg-primary p-2 rounded-full play-button video-play-button" />
                </div>
              </div>
            ) : (
              <div className="iframe-container">
                <iframe
                  src={getYouTubeEmbedUrl(video.id.videoId, {
                    language: 'pt-BR',
                    autoplay: true
                  })}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full object-cover transition-transform duration-500"
                  title={video.snippet.title}
                  style={{ 
                    border: 'none',
                    WebkitTransform: 'translate3d(0, 0, 0)',
                    transform: 'translate3d(0, 0, 0)'
                  }}
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    handleIframeLoad(iframe);
                  }}
                />
              </div>
            )}
          </div>
          {/* Back face: description */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-background p-4"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-sm text-muted-foreground">
              {video.snippet.description || 'No description available.'}
            </p>
          </div>
        </motion.div>
        <button
          onClick={() => setFlipped(!flipped)}
          className="absolute bottom-2 left-2 bg-primary text-white px-2 py-1 text-xs rounded"
        >
          {flipped ? 'Ver vídeo' : 'Ver descrição'}
        </button>
      </div>
      <div className="p-6">
        <h3 className="font-heading text-lg font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {decode(video.snippet.title)}
        </h3>
      </div>
    </motion.div>
  );
}