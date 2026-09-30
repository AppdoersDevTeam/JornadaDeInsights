// YouTube Data API playlist import for courses (server-side only).

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const ID_RE = /^[A-Za-z0-9_-]{10,64}$/;

export class PlaylistImportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Accepts a full playlist URL (…?list=ID) or a bare playlist id. */
export const parsePlaylistId = (input) => {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (!['youtube.com', 'youtu.be', 'music.youtube.com'].includes(host)) return null;
    const list = url.searchParams.get('list');
    return list && ID_RE.test(list) ? list : null;
  } catch {
    return ID_RE.test(raw) ? raw : null;
  }
};

/** ISO 8601 duration (PT1H2M3S) → seconds. */
export const parseIsoDuration = (value) => {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value || '');
  if (!match) return 0;
  const [, d, h, m, s] = match.map((part) => Number(part || 0));
  return d * 86400 + h * 3600 + m * 60 + s;
};

const youtubeGet = async (path, params) => {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new PlaylistImportError('YouTube API key is not configured', 500);
  }
  const search = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(`${API_BASE}/${path}?${search.toString()}`, {
    headers: { Referer: 'https://jornadadeinsights.com' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = body?.error?.errors?.[0]?.reason || '';
    if (response.status === 404 || reason === 'playlistNotFound') {
      throw new PlaylistImportError(
        'Playlist not found. It may be Private: set the playlist to Unlisted (or Public) and try again.',
        400
      );
    }
    throw new PlaylistImportError(
      `YouTube API error (${response.status}${reason ? `: ${reason}` : ''})`,
      502
    );
  }
  return body;
};

/** Playlist title and video count, for the admin "paste a link" check. */
export const fetchPlaylistInfo = async (playlistId) => {
  const body = await youtubeGet('playlists', { part: 'snippet,contentDetails', id: playlistId });
  const playlist = body.items?.[0];
  if (!playlist) {
    throw new PlaylistImportError(
      'Playlist not found. It may be Private: set the playlist to Unlisted (or Public) and try again.',
      400
    );
  }
  return {
    title: playlist.snippet?.title || '',
    description: playlist.snippet?.description || '',
    videoCount: playlist.contentDetails?.itemCount ?? 0,
  };
};

const UNAVAILABLE_TITLES = new Set(['Private video', 'Deleted video']);

/**
 * Import a playlist in order. Private/deleted items are skipped.
 * Returns { lessons: [{ position, title, youtube_video_id, duration_seconds }], skipped, notEmbeddable }.
 */
export const importPlaylist = async (playlistId) => {
  const entries = [];
  let skipped = 0;
  let pageToken;

  do {
    const page = await youtubeGet('playlistItems', {
      part: 'snippet,contentDetails,status',
      playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of page.items || []) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title || '';
      if (!videoId || UNAVAILABLE_TITLES.has(title) || item.status?.privacyStatus === 'private') {
        skipped += 1;
        continue;
      }
      entries.push({ videoId, title });
    }
    pageToken = page.nextPageToken;
  } while (pageToken && entries.length < 1000);

  const details = new Map();
  for (let index = 0; index < entries.length; index += 50) {
    const ids = entries.slice(index, index + 50).map((entry) => entry.videoId);
    const page = await youtubeGet('videos', { part: 'contentDetails,status', id: ids.join(',') });
    for (const video of page.items || []) {
      details.set(video.id, {
        durationSeconds: parseIsoDuration(video.contentDetails?.duration),
        embeddable: video.status?.embeddable !== false,
      });
    }
  }

  const notEmbeddable = [];
  const lessons = [];
  for (const entry of entries) {
    const detail = details.get(entry.videoId);
    if (!detail) {
      skipped += 1;
      continue;
    }
    if (!detail.embeddable) {
      notEmbeddable.push(entry.title);
    }
    lessons.push({
      position: lessons.length + 1,
      title: entry.title.slice(0, 300),
      youtube_video_id: entry.videoId,
      duration_seconds: detail.durationSeconds,
    });
  }

  if (lessons.length === 0) {
    throw new PlaylistImportError(
      'No playable videos found. Check the playlist is Unlisted and its videos are Unlisted or Public.',
      400
    );
  }

  return { lessons, skipped, notEmbeddable };
};
