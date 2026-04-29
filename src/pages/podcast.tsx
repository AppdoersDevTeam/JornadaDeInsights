import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PodcastCard, type PodcastEpisode } from '@/components/podcast/podcast-card';
import { motion, Variants, useInView } from 'framer-motion';
import { useLanguage } from '@/context/language-context';

type PodcastCategoryId = 'all' | 'rute' | 'sobrenatural' | 'apocalipse';

// Define YouTube API snippet type for fetching channel videos
type YouTubeVideo = {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
      medium: { url: string };
      default: { url: string };
    };
  };
};

// Define detailed video type with full snippet and duration
type VideoDetail = {
  id: string;
  snippet: YouTubeVideo['snippet'];
  contentDetails: { duration: string };
};

// Define animation variants for the episodes grid and cards
const gridVariants: Variants = { 
  hidden: {}, 
  visible: { 
    transition: { 
      staggerChildren: 0.15, 
      delayChildren: 0.2 
    } 
  } 
};
const cardVariants: Variants = { 
  hidden: { 
    opacity: 0, 
    y: 50 
  }, 
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200
    }
  } 
};

// CTA animations: delay children until 2s after mount
const ctaContainerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } };
const ctaButtonVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 20 } } };

// Background ring and particle animations for Hero
const ringVariants: Variants = { hidden: { scale: 0.8, opacity: 0.3 }, visible: { scale: 1.3, opacity: 0.05, transition: { duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' } } };
// Animation variants for Hero headline
const headlineContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const headlineChildVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } },
};
// Subtext animation
const subtextVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function PodcastPage() {
  const { t, language } = useLanguage();
  const categories = useMemo(
    () =>
      [
        { id: 'all' as const, label: t('common.all', 'Todos') },
        { id: 'rute' as const, label: 'Rute' },
        { id: 'sobrenatural' as const, label: 'Sobrenatural' },
        { id: 'apocalipse' as const, label: 'Apocalipse' },
      ] satisfies { id: PodcastCategoryId; label: string }[],
    [t],
  );
  const headlineText = t('podcast.page.headline', 'Jornada de Insights Podcast');
  const headlineWords = headlineText.split(' ');
  const subtextDelay = headlineWords.length * 0.08 + 0.3;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PodcastCategoryId>('all');
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const episodesRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(episodesRef, { once: true, margin: "-100px" });

  useEffect(() => {
    // bump cache key to v4 to clear old cached episodes and include Spotify links
    const CACHE_KEY = "youtube-videos-podcast-v4";
    const CACHE_TIME_KEY = "youtube-videos-podcast-v4-timestamp";
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < oneDay) {
      setEpisodes(JSON.parse(cachedData) as PodcastEpisode[]);
      setIsLoading(false);
    } else {
      const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
      const CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
      
      if (!API_KEY || !CHANNEL_ID) {
        console.error('YouTube API key or Channel ID not found in environment variables');
        setHasError(true);
        setIsLoading(false);
        return;
      }

      fetch(`https://youtube.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&type=video&order=date&maxResults=20`)
        .then(res => res.json())
        .then((searchData) => {
          const validItems = (searchData.items as YouTubeVideo[]).filter(item => item.id.videoId);
          if (!validItems.length) return Promise.resolve([] as VideoDetail[]);
          const idList = validItems.map(item => item.id.videoId).join(',');
          return fetch(`https://youtube.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${idList}&part=snippet,contentDetails`)
            .then(res2 => res2.json())
            .then(detailData => {
              // exclude any video shorter than 2 minutes (exclude shorts <= 2m)
              const details = detailData.items as VideoDetail[];
              const parseISO8601 = (iso: string): number => {
                const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                const hours = parseInt(match?.[1] ?? '0', 10);
                const minutes = parseInt(match?.[2] ?? '0', 10);
                const seconds = parseInt(match?.[3] ?? '0', 10);
                return hours * 3600 + minutes * 60 + seconds;
              };
              const allowedDetails = details.filter(d => parseISO8601(d.contentDetails.duration) > 120);
              return allowedDetails;
            });
        })
        .then((filteredItems: VideoDetail[]) => {
          const mapped = filteredItems.map(item => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,
            date: new Date(item.snippet.publishedAt).toLocaleDateString('pt-BR', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            duration: '',
            image: item.snippet.thumbnails.high.url || item.snippet.thumbnails.medium.url,
            youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
            spotifyUrl: item.snippet.description.match(/https:\/\/open\.spotify\.com\/\S+/)?.[0] || 'https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW',
          }));
          setEpisodes(mapped);
          localStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
          localStorage.setItem(CACHE_TIME_KEY, now.toString());
        })
        .catch(err => {
          console.error('Error fetching podcast videos:', err);
          setHasError(true);
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  const episodesForLocale = useMemo(() => {
    const loc = language === 'en' ? 'en-US' : 'pt-BR';
    return episodes.map((ep) => {
      if (!ep.publishedAt) return ep;
      return {
        ...ep,
        date: new Date(ep.publishedAt).toLocaleDateString(loc, { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    });
  }, [episodes, language]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section
        className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-fixed bg-center bg-gradient-to-br from-primary/10 to-background"
        initial="hidden"
        animate="visible"
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
        <motion.div
          variants={ringVariants}
          className="absolute inset-0 bg-primary/5 rounded-full pointer-events-none"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
        
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 py-20">
          <motion.div
            variants={headlineContainerVariants}
            className="max-w-3xl mx-auto text-center mb-10"
          >
            {headlineWords.map((word, i) => (
              <motion.span
                key={i}
                variants={headlineChildVariants}
                className="inline-block mr-2 text-3xl md:text-5xl font-heading font-bold text-secondary"
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
          <motion.p
            variants={subtextVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: subtextDelay, duration: 0.6 }}
            className="text-lg text-muted-foreground text-center mb-14 max-w-2xl mx-auto"
          >
            {t(
              'podcast.page.subtext',
              'Reflexões profundas sobre fé, vida e espiritualidade. Episódios semanais para inspirar e transformar sua jornada.',
            )}
          </motion.p>
          <motion.div
            variants={ctaContainerVariants}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full max-w-md mx-auto"
          >
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <a href="https://www.youtube.com/@Jornadadeinsights/videos" target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 w-4" /> {t('podcast.watchYoutube', 'Assista no YouTube')}
                </a>
              </Button>
            </motion.div>
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <a href="https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW" target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 w-4" /> {t('podcast.listenSpotify', 'Ouça no Spotify')}
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Search and Filter */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('podcast.searchPlaceholder', 'Pesquisar episódios...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-md border border-input bg-background"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Episodes Grid */}
      <section className="py-12 bg-muted/30 episodes-section">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <motion.div
            ref={episodesRef}
            variants={gridVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <motion.div
                  key={i}
                  variants={cardVariants}
                  className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 animate-pulse"
                >
                  <div className="aspect-video bg-muted" />
                  <div className="p-4">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-4 w-1/2 bg-muted rounded" />
                  </div>
                </motion.div>
              ))
            ) : hasError ? (
              <div className="col-span-full text-center py-12">
                <p className="text-lg text-muted-foreground">{t('podcast.loadError', '')}</p>
              </div>
            ) : (
              episodesForLocale
                .filter((episode) => {
                  const matchesSearch =
                    episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    episode.description.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory =
                    selectedCategory === 'all' ||
                    (selectedCategory === 'rute'
                      ? episode.title.toLowerCase().includes('rute') ||
                        episode.title.toLowerCase().includes('ruth')
                      : episode.title.toLowerCase().includes(selectedCategory));
                  return matchesSearch && matchesCategory;
                })
                .slice(0, visibleCount)
                .map((episode) => (
                  <motion.div key={episode.id} variants={cardVariants}>
                    <PodcastCard
                      episode={episode}
                      isPlaying={playingId === episode.id}
                      onPlay={() => setPlayingId(episode.id)}
                    />
                  </motion.div>
                ))
            )}
          </motion.div>

          {!isLoading && !hasError && episodesForLocale.length > visibleCount && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 6)}
              >
                {t('podcast.loadMore', '')}
              </Button>
            </div>
          )}
          {!isLoading && !hasError && visibleCount > 6 && (
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setVisibleCount(6);
                  const episodesSection = document.querySelector('.episodes-section');
                  if (episodesSection) {
                    episodesSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {t('podcast.showLess', '')}
              </Button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}