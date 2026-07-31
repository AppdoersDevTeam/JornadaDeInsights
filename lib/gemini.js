const DEFAULT_MODEL = 'gemini-2.0-flash';

const buildPrompt = ({ title, description, showName }) => `You are an SEO content writer for the podcast "${showName}". Write a short, original blog-style article (250-400 words) based on the episode below. Do not just repeat the description verbatim — expand on the topic, write in a natural editorial voice, and make it genuinely useful for someone who finds this via a search engine before they've listened to the episode.

Episode title: ${title}
Episode description: ${description}

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "title_pt": "SEO-friendly Portuguese (Brazil) title, can differ slightly from the episode title",
  "body_pt": "Full Portuguese article, plain text with \\n\\n paragraph breaks",
  "title_en": "English translation/adaptation of the title",
  "body_en": "Full English article, plain text with \\n\\n paragraph breaks"
}`;

const extractJson = (text) => {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  return JSON.parse(candidate);
};

export const generateEpisodeArticle = async ({ title, description, showName = 'Jornada de Insights' }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt({ title, description, showName }) }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned no content');
  }

  const parsed = extractJson(text);
  const { title_pt, body_pt, title_en, body_en } = parsed;
  if (!title_pt || !body_pt || !title_en || !body_en) {
    throw new Error('Gemini API response missing required fields');
  }

  return { title_pt, body_pt, title_en, body_en };
};
