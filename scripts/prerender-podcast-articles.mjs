// Runs after `vite build`. Emits one static HTML file per published podcast
// article (dist/podcast/<slug>/index.html) with real article text and meta
// tags baked in, so search engines and AI crawlers that don't execute
// JavaScript can actually read episode content. Vercel's filesystem-first
// routing (see vercel.json) serves these real files ahead of the SPA
// fallback. Browsers that do run JS still get the full React app: main.tsx
// mounts with createRoot (not hydrateRoot), so it simply replaces this
// static content once the bundle loads - no hydration mismatch risk.
import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const siteUrl = 'https://jornadadeinsights.com';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeAttr = (value) => escapeHtml(value).replace(/'/g, '&#39;');

const pickText = (pt, en) => {
  const ptTrim = (pt || '').trim();
  const enTrim = (en || '').trim();
  return ptTrim || enTrim;
};

const buildArticlePage = (template, article) => {
  const title = pickText(article.title_pt, article.title_en) || article.episode_title;
  const bodyText = pickText(article.body_pt, article.body_en) || '';
  const description = bodyText.slice(0, 160).replace(/\s+/g, ' ').trim();
  const pageUrl = `${siteUrl}/podcast/${article.slug}`;
  const publishedDate = article.episode_published_at || article.published_at || article.created_at;

  let html = template;

  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)} | Jornada de Insights</title>`);
  html = html.replace(
    /<meta name="description" content=".*?">/s,
    `<meta name="description" content="${escapeAttr(description)}">`
  );
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/s,
    `<meta property="og:title" content="${escapeAttr(title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content=".*?" \/>/s,
    `<meta property="og:description" content="${escapeAttr(description)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content=".*?" \/>/s,
    `<meta property="og:url" content="${escapeAttr(pageUrl)}" />`
  );
  html = html.replace(
    /<meta property="og:type" content=".*?" \/>/s,
    '<meta property="og:type" content="article" />'
  );
  html = html.replace(
    /<link rel="canonical" href=".*?" \/>/s,
    `<link rel="canonical" href="${escapeAttr(pageUrl)}" />`
  );

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    author: { '@type': 'Person', name: 'Patricia da Silva' },
    datePublished: publishedDate,
    dateModified: article.updated_at || publishedDate,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    publisher: { '@type': 'Organization', name: 'Jornada de Insights' },
  };

  const staticBody = `
    <article style="max-width:720px;margin:0 auto;padding:96px 24px 64px;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;color:#1a1a1a;">
      <p><a href="/podcast" style="color:#BC6C25;text-decoration:none;">&larr; ${escapeHtml('Voltar para episódios')}</a></p>
      <h1 style="font-size:2rem;font-weight:700;margin:16px 0;">${escapeHtml(title)}</h1>
      <p style="color:#666;font-size:0.9rem;margin-bottom:32px;">${escapeHtml(article.episode_title)}</p>
      <div style="white-space:pre-line;font-size:1.05rem;">${escapeHtml(bodyText)}</div>
      <p style="margin-top:40px;">
        ${article.spotify_url ? `<a href="${escapeAttr(article.spotify_url)}" style="margin-right:16px;color:#BC6C25;">${escapeHtml('Ouvir no Spotify')}</a>` : ''}
        ${article.youtube_url ? `<a href="${escapeAttr(article.youtube_url)}" style="color:#BC6C25;">${escapeHtml('Assistir no YouTube')}</a>` : ''}
      </p>
    </article>
    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  `;

  html = html.replace('<div id="root"></div>', `<div id="root">${staticBody}</div>`);

  return html;
};

const run = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[prerender-podcast-articles] Missing Supabase env vars, skipping prerender.');
    return;
  }

  let template;
  try {
    template = await readFile(path.join(distDir, 'index.html'), 'utf-8');
  } catch (error) {
    console.warn('[prerender-podcast-articles] dist/index.html not found, skipping prerender.', error.message);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: articles, error } = await supabase
    .from('podcast_articles')
    .select('*')
    .eq('status', 'published');

  if (error) {
    console.error('[prerender-podcast-articles] Failed to fetch published articles:', error.message);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('[prerender-podcast-articles] No published articles yet, nothing to prerender.');
    return;
  }

  for (const article of articles) {
    const outDir = path.join(distDir, 'podcast', article.slug);
    await mkdir(outDir, { recursive: true });
    const html = buildArticlePage(template, article);
    await writeFile(path.join(outDir, 'index.html'), html, 'utf-8');
    console.log(`[prerender-podcast-articles] Wrote /podcast/${article.slug}/index.html`);
  }

  await appendToSitemap(articles);
};

const appendToSitemap = async (articles) => {
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  let sitemap;
  try {
    sitemap = await readFile(sitemapPath, 'utf-8');
  } catch (error) {
    console.warn('[prerender-podcast-articles] dist/sitemap.xml not found, skipping sitemap update.', error.message);
    return;
  }

  if (!sitemap.includes('</urlset>')) return;

  const entries = articles
    .map(
      (article) => `  <url>
    <loc>${siteUrl}/podcast/${escapeHtml(article.slug)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    )
    .join('\n');

  sitemap = sitemap.replace('</urlset>', `${entries}\n</urlset>`);
  await writeFile(sitemapPath, sitemap, 'utf-8');
  console.log(`[prerender-podcast-articles] Added ${articles.length} article URL(s) to sitemap.xml`);
};

run();
