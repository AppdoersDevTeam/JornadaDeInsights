import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  trimValues: true,
});

const unwrapCdata = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '__cdata' in value) return String(value.__cdata ?? '');
  return String(value);
};

const stripHtml = (value) =>
  unwrapCdata(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const slugify = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

export const fetchSpreakerEpisodes = async (rssUrl) => {
  const response = await fetch(rssUrl, {
    headers: { 'User-Agent': 'JornadaDeInsights-ArticleBot/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Spreaker RSS feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;
  const itemList = Array.isArray(items) ? items : items ? [items] : [];

  return itemList.map((item) => {
    const guid = unwrapCdata(item.guid) || unwrapCdata(item.link);
    const title = stripHtml(item.title);
    const description = stripHtml(item['itunes:summary'] ?? item.description ?? '');
    const link = unwrapCdata(item.link);
    const pubDate = unwrapCdata(item.pubDate);

    return {
      guid: String(guid || link || title).trim(),
      title,
      description,
      link,
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
    };
  }).filter((episode) => episode.guid && episode.title);
};
