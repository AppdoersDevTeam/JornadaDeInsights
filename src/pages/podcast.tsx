import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PodcastCard, type PodcastEpisode } from '@/components/podcast/podcast-card';
import { NewsletterForm } from '@/components/newsletter-form';
import { motion, Variants, useInView } from 'framer-motion';

// Mock data
const allEpisodes: PodcastEpisode[] = [
  {
    id: "1",
    title: "Finding Balance in a Digital World",
    description: "Discover strategies for maintaining mental health while navigating social media and digital connectivity.",
    date: "Mar 15, 2023",
    duration: "42:18",
    image: "https://images.pexels.com/photos/4144179/pexels-photo-4144179.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "2",
    title: "The Science of Productivity: Work Smarter, Not Harder",
    description: "Learn research-backed techniques to enhance your productivity without burning out.",
    date: "Feb 28, 2023",
    duration: "38:45",
    image: "https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "3",
    title: "Mindfulness Practices for Everyday Life",
    description: "Simple mindfulness techniques you can incorporate into your daily routine for better mental health.",
    date: "Feb 14, 2023",
    duration: "45:30",
    image: "https://images.pexels.com/photos/3759659/pexels-photo-3759659.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "4",
    title: "The Power of Habit Formation",
    description: "Understanding the psychology behind habits and how to build positive routines that stick.",
    date: "Jan 30, 2023",
    duration: "51:22",
    image: "https://images.pexels.com/photos/5717451/pexels-photo-5717451.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "5",
    title: "Nutrition for Optimal Brain Performance",
    description: "How diet affects cognitive function and which foods can help you think more clearly and focus better.",
    date: "Jan 15, 2023",
    duration: "47:05",
    image: "https://images.pexels.com/photos/8844888/pexels-photo-8844888.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "6",
    title: "Building Meaningful Relationships in a Digital Age",
    description: "Strategies for creating and maintaining authentic connections in our increasingly online world.",
    date: "Dec 30, 2022",
    duration: "49:18",
    image: "https://images.pexels.com/photos/7433822/pexels-photo-7433822.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "7",
    title: "Sleep Optimization: The Foundation of Wellness",
    description: "The science of sleep and practical tips for improving your sleep quality and duration.",
    date: "Dec 15, 2022",
    duration: "53:40",
    image: "https://images.pexels.com/photos/6787202/pexels-photo-6787202.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "8",
    title: "Managing Anxiety in Uncertain Times",
    description: "Practical tools and techniques for coping with anxiety and building resilience.",
    date: "Nov 30, 2022",
    duration: "46:15",
    image: "https://images.pexels.com/photos/897817/pexels-photo-897817.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  },
  {
    id: "9",
    title: "Financial Wellness: A Mindful Approach to Money",
    description: "How to develop a healthy relationship with money and make financial decisions aligned with your values.",
    date: "Nov 15, 2022",
    duration: "44:32",
    image: "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    youtubeUrl: "https://youtube.com",
    spotifyUrl: "https://spotify.com",
  }
];

const categories = [
  "Todos",
  "Rute",
  "Sobrenatural",
  "Apocalipse"
];

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
const particleVariants: Variants = { hidden: { x: 0, y: 0 }, visible: custom => ({ x: custom.x, y: custom.y, transition: { duration: custom.duration, repeat: Infinity, ease: 'linear' } }) };

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

// Featured Episode entrance animation
const featuredVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};

export function PodcastPage() {
  const headlineText = "Uma Jornada de Insights Podcast";
  const headlineWords = headlineText.split(" ");
  const subtextDelay = headlineWords.length * 0.08 + 0.3;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLatestPlaying, setIsLatestPlaying] = useState(false);
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
            date: new Date(item.snippet.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            duration: "",
            image: item.snippet.thumbnails.high.url || item.snippet.thumbnails.medium.url,
            youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
            spotifyUrl: item.snippet.description.match(/https:\/\/open\.spotify\.com\/\S+/)?.[0] || 'https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW?si=ZkJHnMx6SGmz0WIrMczEjw&nd=1&dlsi=1bf146313df84baa',
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

  // Determine which source to use: fetched episodes or fallback mock data on error
  const displayEpisodes = hasError ? allEpisodes : episodes;
  // Filter episodes by search term
  const filteredEpisodes = displayEpisodes.filter(episode =>
    episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    episode.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Slice to the number of episodes currently visible
  const visibleEpisodes = filteredEpisodes.slice(0, visibleCount);

  // Determine the latest episode (first in list)
  const latestEpisode = (hasError ? allEpisodes : episodes)[0] || allEpisodes[0];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        className="relative min-h-[60vh] pt-28 pb-20 md:py-20 flex items-center justify-center overflow-hidden bg-fixed bg-center bg-gradient-to-br from-primary/10 to-background"
      >
        {/* Background blurred blobs */}
        <motion.div
          className="absolute top-0 -left-8 w-64 h-64 bg-secondary/20 rounded-full blur-2xl"
          animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 -right-8 w-72 h-72 bg-primary/20 rounded-full blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, -10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          variants={ringVariants}
          className="absolute inset-0 bg-primary/5 rounded-full"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
        <div className="container mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
          <motion.div
            variants={headlineContainerVariants}
            className="max-w-3xl mx-auto text-center mb-6 md:mb-8"
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
            className="text-lg text-muted-foreground text-center mb-8 md:mb-12 max-w-2xl mx-auto"
          >
            Reflexões profundas sobre fé, vida e espiritualidade. Episódios semanais para inspirar e transformar sua jornada.
          </motion.p>
          <motion.div
            variants={ctaContainerVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto px-4 sm:px-0"
          >
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <a href="https://www.youtube.com/@Umajornadadeinsights" target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 w-4" /> Assista no YouTube
                </a>
              </Button>
            </motion.div>
            <motion.div variants={ctaButtonVariants} className="w-full sm:w-auto">
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <a href="https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW" target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 w-4" /> Ouça no Spotify
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
                placeholder="Pesquisar episódios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-md border border-input bg-background"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category}
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
                <p className="text-lg text-muted-foreground">Não foi possível carregar os episódios. Por favor, tente novamente mais tarde.</p>
              </div>
            ) : (
              episodes
                .filter((episode) => {
                  const matchesSearch = episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    episode.description.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = selectedCategory === "Todos" || 
                    (selectedCategory === "Rute" ? 
                      (episode.title.toLowerCase().includes("rute") || episode.title.toLowerCase().includes("ruth")) :
                      episode.title.toLowerCase().includes(selectedCategory.toLowerCase()));
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

          {!isLoading && !hasError && episodes.length > visibleCount && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 6)}
              >
                Carregar Mais Episódios
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
                Mostrar Menos
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10 max-w-4xl">
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}