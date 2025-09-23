import { NextApiRequest, NextApiResponse } from 'next';
import NodeCache from 'node-cache';

// Cache for 24 hours with a check period of 1 hour
const cache = new NodeCache({ 
  stdTTL: 86400, // 24 hours
  checkperiod: 3600, // 1 hour
  useClones: false // Better performance
});

// Get API key from environment variable
const API_KEY = process.env.VITE_YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.VITE_YOUTUBE_CHANNEL_ID;

// Track quota usage
let quotaUsed = 0;
const QUOTA_LIMIT = 10000; // Daily quota limit
const QUOTA_RESET_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let lastQuotaReset = Date.now();

// Reset quota counter if 24 hours have passed
function checkAndResetQuota() {
  const now = Date.now();
  if (now - lastQuotaReset >= QUOTA_RESET_TIME) {
    quotaUsed = 0;
    lastQuotaReset = now;
  }
}

// Calculate quota cost for API calls
function calculateQuotaCost(endpoint: string, parts: string[]): number {
  // Base costs for different endpoints
  const costs: { [key: string]: number } = {
    'search': 100,
    'videos': 1
  };
  
  // Additional cost for each part
  const partCosts: { [key: string]: number } = {
    'snippet': 1,
    'contentDetails': 1,
    'id': 0
  };

  const baseCost = costs[endpoint] || 0;
  const partsCost = parts.reduce((sum, part) => sum + (partCosts[part] || 0), 0);
  
  return baseCost + partsCost;
}

// Log all environment variables (for debugging)
console.log('All environment variables:', {
  viteApiKey: process.env.VITE_YOUTUBE_API_KEY,
  viteChannelId: process.env.VITE_YOUTUBE_CHANNEL_ID,
  nextPublicApiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
  nextPublicChannelId: process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID,
  rawApiKey: process.env.YOUTUBE_API_KEY,
  rawChannelId: process.env.YOUTUBE_CHANNEL_ID
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check and reset quota if needed
  checkAndResetQuota();

  // Debug logging
  console.log('Environment variables in handler:', {
    hasApiKey: !!API_KEY,
    apiKeyLength: API_KEY?.length,
    apiKeyFirstChars: API_KEY?.substring(0, 10),
    hasChannelId: !!CHANNEL_ID,
    channelId: CHANNEL_ID,
    allEnvVars: Object.keys(process.env).filter(key => key.includes('YOUTUBE'))
  });

  if (!API_KEY) {
    console.error('YouTube API key is not set in environment variables');
    return res.status(500).json({ error: 'YouTube API key is not configured' });
  }

  try {
    // Calculate quota cost for search request
    const searchQuotaCost = calculateQuotaCost('search', ['snippet', 'id']);
    
    // Check if we have enough quota
    if (quotaUsed + searchQuotaCost > QUOTA_LIMIT) {
      console.error('YouTube API quota limit reached');
      return res.status(429).json({ error: 'YouTube API quota limit reached' });
    }

    // Check cache first
    const cachedData = cache.get('youtube-videos');
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Log the request details
    console.log('Fetching YouTube videos with:', {
      channelId: CHANNEL_ID,
      apiKeyLength: API_KEY.length,
      apiKeyFirstChars: API_KEY.substring(0, 10),
      referer: req.headers.referer,
      origin: req.headers.origin,
      host: req.headers.host
    });

    // Fetch videos from YouTube API
    const searchUrl = `https://youtube.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&type=video&order=date&maxResults=20`;
    console.log('Search URL:', searchUrl);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'Origin': req.headers.origin || 'https://jornadadeinsights.com'
      }
    });

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      console.error('YouTube API error:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        error: error,
        headers: Object.fromEntries(searchResponse.headers.entries()),
        requestUrl: searchUrl
      });
      return res.status(searchResponse.status).json({ 
        error: error.error?.message || 'Failed to fetch videos',
        details: error
      });
    }

    const searchData = await searchResponse.json();
    quotaUsed += searchQuotaCost;
    
    if (!searchData.items?.length) {
      console.log('No videos found in search response');
      return res.status(200).json({ items: [] });
    }

    // Get video details
    const videoIds = searchData.items
      .filter((item: any) => item.id?.videoId)
      .map((item: any) => item.id.videoId)
      .join(',');

    // Calculate quota cost for videos request
    const videosQuotaCost = calculateQuotaCost('videos', ['snippet', 'contentDetails']);
    
    // Check if we have enough quota for the second request
    if (quotaUsed + videosQuotaCost > QUOTA_LIMIT) {
      console.error('YouTube API quota limit reached');
      return res.status(429).json({ error: 'YouTube API quota limit reached' });
    }

    const detailsUrl = `https://youtube.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=snippet,contentDetails`;
    console.log('Details URL:', detailsUrl);

    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'Accept': 'application/json',
        'Origin': req.headers.origin || 'https://jornadadeinsights.com'
      }
    });

    if (!detailsResponse.ok) {
      const error = await detailsResponse.json();
      console.error('YouTube API error:', {
        status: detailsResponse.status,
        statusText: detailsResponse.statusText,
        error: error,
        headers: Object.fromEntries(detailsResponse.headers.entries()),
        requestUrl: detailsUrl
      });
      return res.status(detailsResponse.status).json({ 
        error: error.error?.message || 'Failed to fetch video details',
        details: error
      });
    }

    const detailsData = await detailsResponse.json();
    quotaUsed += videosQuotaCost;

    // Process and format the data
    const parseISO8601 = (iso: string): number => {
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match?.[1] ?? '0', 10);
      const minutes = parseInt(match?.[2] ?? '0', 10);
      const seconds = parseInt(match?.[3] ?? '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
    };

    const allowedIds = detailsData.items
      .filter((d: any) => parseISO8601(d.contentDetails.duration) > 120)
      .map((d: any) => d.id);

    const videos = searchData.items
      .filter((item: any) => allowedIds.includes(item.id.videoId))
      .map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        date: new Date(item.snippet.publishedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        duration: '',
        image: `https://img.youtube.com/vi/${item.id.videoId}/hqdefault.jpg`,
        youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        spotifyUrl: 'https://open.spotify.com/show/6woq3ZR2Z9SWbl2n6FAlrW',
      }));

    console.log(`Successfully processed ${videos.length} videos. Quota used: ${quotaUsed}`);

    // Cache the processed data
    cache.set('youtube-videos', { items: videos });

    return res.status(200).json({ items: videos });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 