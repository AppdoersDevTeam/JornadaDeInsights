import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPodcastArticleBySlug, type PodcastArticle } from '@/lib/supabase';
import { podcastArticleDisplayBody, podcastArticleDisplayTitle } from '@/lib/curiosidade-locale';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { StructuredData } from '@/components/seo/structured-data';
import { useLanguage } from '@/context/language-context';

export function PodcastArticleDetailsPage() {
  const { t, language } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<PodcastArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) {
        setError(t('podcastArticle.slugMissing', 'Article not found'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getPodcastArticleBySlug(slug);
        setArticle(data);
      } catch (err) {
        console.error('Error fetching podcast article:', err);
        setError(t('podcastArticle.loadError', 'Could not load this article'));
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug, t]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(language === 'en' ? 'en-NZ' : 'pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{t('common.error', 'Error')}</h1>
          <p className="text-muted-foreground mb-6">{error || t('podcastArticle.notFound', '')}</p>
          <Button asChild>
            <Link to="/podcast">{t('podcastArticle.backToPodcast', 'Back to episodes')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayTitle = podcastArticleDisplayTitle(article, language);
  const displayBody = podcastArticleDisplayBody(article, language);

  return (
    <div className="container mx-auto px-6 sm:px-8 lg:px-10 pt-28 pb-16 overflow-x-hidden">
      <StructuredData
        id={`podcast-article-${article.id}`}
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: displayTitle,
          author: {
            '@type': 'Person',
            name: 'Patricia da Silva',
          },
          datePublished: article.published_at || article.created_at,
          dateModified: article.updated_at || article.created_at,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://jornadadeinsights.com/podcast/${article.slug}`,
          },
          publisher: {
            '@type': 'Organization',
            name: 'Jornada de Insights',
          },
        }}
      />
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button variant="ghost" asChild className="mb-8 mt-2">
            <Link to="/podcast">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('podcastArticle.backToPodcast', 'Back to episodes')}
            </Link>
          </Button>

          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{displayTitle}</h1>
          <p className="text-sm text-muted-foreground mb-8">
            {formatDate(article.episode_published_at || article.published_at)}
          </p>

          <div className="prose prose-lg max-w-none whitespace-pre-line">{displayBody}</div>

          <div className="flex flex-wrap gap-3 mt-10">
            {article.spotify_url && (
              <Button asChild variant="outline">
                <a href={article.spotify_url} target="_blank" rel="noopener noreferrer">
                  {t('podcastArticle.listenSpotify', 'Listen on Spotify')}
                </a>
              </Button>
            )}
            {article.youtube_url && (
              <Button asChild variant="outline">
                <a href={article.youtube_url} target="_blank" rel="noopener noreferrer">
                  {t('podcastArticle.watchYoutube', 'Watch on YouTube')}
                </a>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
