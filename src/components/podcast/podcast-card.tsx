import { motion } from 'framer-motion';
import { ExternalLink, Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getYouTubeEmbedUrl, handleIframeLoad, reloadIframeForIOS } from '@/lib/device-utils';

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  date: string;
  duration: string;
  image: string;
  verse?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
}

interface PodcastCardProps {
  episode: PodcastEpisode;
  onPlay?: () => void;
  isPlaying?: boolean;
}

export function PodcastCard({ episode, onPlay, isPlaying }: PodcastCardProps) {
  // Enhanced play handler for iOS compatibility
  const handleVideoPlay = () => {
    if (onPlay) {
      onPlay();
      reloadIframeForIOS();
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="group bg-card rounded-lg shadow-md overflow-hidden border border-border/50 hover:shadow-xl transition-shadow"
    >
      <div className="aspect-video relative overflow-hidden">
        {isPlaying ? (
          <div className="iframe-container">
            <iframe
              src={getYouTubeEmbedUrl(episode.id, { autoplay: true })}
              title={episode.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
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
        ) : (
          <>
            <img 
              src={episode.image} 
              alt={episode.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.button
                  type="button"
                  onClick={handleVideoPlay}
                  onTouchStart={() => {}} // Enable touch events on iOS
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1 }}
                  whileInView={{ scale: 0.9, opacity: 1 }}
                  className="bg-primary rounded-full p-4 focus:outline-none play-button video-play-button"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  <Play className="h-8 w-8 text-white" />
                </motion.button>
              </div>
            </div>
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 text-white">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{episode.duration}</span>
          </div>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-2">{episode.date}</p>
        <h3 className="font-heading text-lg font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {episode.title}
        </h3>
        {episode.verse && (
          <p className="text-sm italic text-muted-foreground mb-3 verse-highlight">
            "{episode.verse}"
          </p>
        )}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{episode.description}</p>
        <div className="flex flex-wrap gap-2">
          {episode.youtubeUrl && (
            <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
              <a href={episode.youtubeUrl} target="_blank" rel="noopener noreferrer">
                YouTube <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          {episode.spotifyUrl && (
            <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
              <a href={episode.spotifyUrl} target="_blank" rel="noopener noreferrer">
                Spotify <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}