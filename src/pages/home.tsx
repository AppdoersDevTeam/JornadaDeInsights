import { ArrowRight, Play, Bookmark, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { NewsletterForm } from '@/components/newsletter-form';
import { EbookCard, type Ebook } from '@/components/shop/ebook-card';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import plogo from '@/plogo.png';
import { getEbooks } from '@/lib/supabase';

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

export function HomePage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [heroVideo, setHeroVideo] = useState<YouTubeVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [featuredEbooks, setFeaturedEbooks] = useState<Ebook[]>([]);
  const [isLoadingEbooks, setIsLoadingEbooks] = useState(true);

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

    fetchEbooks();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    // bump cache key to v3 to clear any old cached items without the duration filter
    const CACHE_KEY = 'youtube-videos-v3';
    const CACHE_TIME_KEY = 'youtube-videos-v3-timestamp';
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < oneDay) {
      const vids = JSON.parse(cachedData) as YouTubeVideo[];
      setVideos(vids);
      setHeroVideo(vids[Math.floor(Math.random() * vids.length)]);
      setIsLoading(false);
      return;
    }

    const API_KEY = 'AIzaSyDFVf55ZCzoknpER5JA-AeUK_cVLoTsrlo';
    const CHANNEL_ID = 'UCCJzity3rNbZd_pkBZsZOkw';
    fetch(`https://youtube.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&type=video&order=date&maxResults=10`)
      .then((response) => {
        if (!response.ok) {
          // Treat HTTP errors (e.g. quota exceeded) as exceptions
          return response.json().then(err => {
            console.error('YouTube API error:', err);
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
        fetch(`https://youtube.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${idList}&part=contentDetails`)
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
            localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
          })
          .catch(err => console.error('Error fetching video details:', err));
      })
      .catch((error: unknown) => {
        console.error('Error fetching YouTube videos:', error);
        setHasError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ amount: 0.3 }}
        className="relative bg-fixed bg-center bg-gradient-to-br from-primary/5 to-background pt-20 pb-16 md:pt-32 md:pb-24"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 mb-10 md:mb-0">
              <motion.h1
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ amount: 0.3 }}
                className="text-3xl md:text-5xl font-heading font-bold mb-4 leading-tight"
              >
                Uma Jornada de <span className="text-primary">Insights</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ amount: 0.3 }}
                className="text-lg text-muted-foreground mb-6 md:max-w-md"
              >
                A verdade da biblia e eterna, mas sempre ha novos insights a serem descobertos.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ amount: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="inline-block"
                >
                  <Button asChild size="lg">
                    <Link to="/podcast">
                      Ouvir o Podcast <Play className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="inline-block"
                >
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/shop">
                      Explorar eBooks <Bookmark className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
            <div className="w-full md:w-1/2">
              <div className="relative rounded-lg overflow-hidden shadow-xl">
                {(isLoading || hasError) ? (
                  <div className="w-full aspect-video bg-black" />
                ) : heroVideo ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${heroVideo.id.videoId}?hl=pt-BR&controls=0&modestbranding=1&rel=0`}
                    title={heroVideo.snippet.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full aspect-video"
                    onLoad={(e) => {
                      try {
                        const iframe = e.target as HTMLIFrameElement;
                        if (iframe.contentWindow) {
                        }
                      } catch (err) {
                        console.debug('Erro relacionado à extensão:', err);
                      }
                    }}
                  />
                ) : null}
                <div className="absolute bottom-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-tl-lg z-10">
                  <div className="flex items-center gap-2 text-white">
                    <Award className="h-5 w-5" />
                    <span className="text-sm font-medium">Vídeo em Destaque</span>
                  </div>
                </div>
              </div>
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
              <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-4">Oi, eu sou a Patricia.</h2>
              <p className="text-muted-foreground mb-4">
                Sou apaixonada por explorar a Bíblia com um olhar criativo e reflexivo.
                Criei este espaço para compartilhar meus estudos, pensamentos e descobertas através de podcasts, vídeos e eBooks.
                </p>
              <p className="text-muted-foreground mb-6">
                Se você busca aprofundar sua fé e enxergar as Escrituras de uma forma nova, seja muito bem-vindo.
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

      {/* Newsletter */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ amount: 0.3 }}
        className="py-16 bg-muted/30"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-10 max-w-4xl">
          <NewsletterForm />
        </div>
      </motion.section>
    </>
  );
}

// Add PodcastCard component for flip animation
function PodcastCard({ video }: { video: YouTubeVideo }) {
  const [flipped, setFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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
                className="w-full h-full bg-cover bg-center cursor-pointer"
                style={{ backgroundImage: `url(https://img.youtube.com/vi/${video.id.videoId}/hqdefault.jpg)` }}
                onClick={() => setIsPlaying(true)}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-12 w-12 text-white bg-primary p-2 rounded-full" />
                </div>
              </div>
            ) : (
              <iframe
                src={`https://www.youtube.com/embed/${video.id.videoId}?hl=pt-BR&controls=1&modestbranding=1&rel=0&autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full object-cover transition-transform duration-500"
                title={video.snippet.title}
              />
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
          {video.snippet.title}
        </h3>
      </div>
    </motion.div>
  );
}