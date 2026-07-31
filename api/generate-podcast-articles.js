import { createClient } from '@supabase/supabase-js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';
import { fetchSpreakerEpisodes, slugify } from '../lib/podcast-rss.js';
import { generateEpisodeArticle } from '../lib/gemini.js';

const DEFAULT_SPREAKER_RSS_URL = 'https://www.spreaker.com/show/6718982/episodes/feed';

// Cap per invocation so one cron run can't blow past Gemini's free-tier rate
// limit or the Vercel function's execution time budget.
const MAX_ARTICLES_PER_RUN = 5;

const requireCronAuth = (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // No secret configured yet (e.g. first deploy) - allow, but log loudly.
    logger.warn('generate_podcast_articles_no_cron_secret_configured', {});
    return true;
  }

  const authHeader = req.headers.authorization || '';
  if (authHeader === `Bearer ${cronSecret}`) return true;

  res.status(401).json({ error: 'Unauthorized' });
  return false;
};

const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const buildUniqueSlug = async (supabase, baseSlug) => {
  let candidate = baseSlug || 'episodio';
  let suffix = 1;
  for (;;) {
    const { data, error } = await supabase
      .from('podcast_articles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);

  if (!requireCronAuth(req, res)) {
    logger.warn('generate_podcast_articles_unauthorized', requestMeta);
    return;
  }

  try {
    const rssUrl = process.env.SPREAKER_RSS_URL || DEFAULT_SPREAKER_RSS_URL;
    const supabase = createSupabaseAdmin();

    const episodes = await fetchSpreakerEpisodes(rssUrl);
    if (episodes.length === 0) {
      logger.warn('generate_podcast_articles_no_episodes_found', requestMeta);
      res.status(200).json({ ok: true, processed: 0, message: 'No episodes found in feed' });
      return;
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('podcast_articles')
      .select('spreaker_episode_id');
    if (existingError) throw existingError;

    const existingIds = new Set((existingRows || []).map((row) => row.spreaker_episode_id));
    const allNewEpisodes = episodes.filter((episode) => !existingIds.has(episode.guid));
    const newEpisodes = allNewEpisodes.slice(0, MAX_ARTICLES_PER_RUN);

    const results = [];
    for (const episode of newEpisodes) {
      try {
        const article = await generateEpisodeArticle({
          title: episode.title,
          description: episode.description,
        });

        const baseSlug = slugify(article.title_pt || episode.title);
        const slug = await buildUniqueSlug(supabase, baseSlug);

        const { error: insertError } = await supabase.from('podcast_articles').insert({
          spreaker_episode_id: episode.guid,
          episode_title: episode.title,
          episode_url: episode.link || null,
          slug,
          title_pt: article.title_pt,
          body_pt: article.body_pt,
          title_en: article.title_en,
          body_en: article.body_en,
          status: 'draft',
          episode_published_at: episode.pubDate,
        });

        if (insertError) throw insertError;

        results.push({ episode: episode.title, slug, status: 'draft_created' });
        logger.info('generate_podcast_articles_draft_created', { ...requestMeta, slug });
      } catch (error) {
        captureServerError(error, { route: 'generate-podcast-articles', episode: episode.title });
        logger.error('generate_podcast_articles_episode_failed', {
          ...requestMeta,
          episode: episode.title,
          errorName: error?.name ?? typeof error,
          errorMessage: error?.message || String(error),
          errorStack: typeof error?.stack === 'string' ? error.stack.slice(0, 500) : undefined,
        });
        results.push({ episode: episode.title, status: 'failed' });
      }
    }

    res.status(200).json({
      ok: true,
      totalInFeed: episodes.length,
      newFound: allNewEpisodes.length,
      processed: results.length,
      results,
    });
  } catch (error) {
    captureServerError(error, { route: 'generate-podcast-articles' });
    logger.error('generate_podcast_articles_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}
