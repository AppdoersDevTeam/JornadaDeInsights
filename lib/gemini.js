const DEFAULT_MODEL = 'gemini-flash-lite-latest';

// The show runs multi-part series (e.g. "Uma Jornada pelo Livro de Rute - 1..10"
// and its English counterpart "A Journey Through the Book of Ruth - 1..10").
// Left to its own devices the model invents a fresh generic title per episode,
// so ten episodes on the same book produced ten interchangeable titles that
// competed with each other in search. The prompt now requires the series name
// and episode number to survive into the generated title.
const buildPrompt = ({ title, description, showName }) => `You are an SEO content writer for the podcast "${showName}". Write a short, original blog-style article (250-400 words) based on the episode below. Do not just repeat the description verbatim - expand on the topic, write in a natural editorial voice, and make it genuinely useful for someone who finds this via a search engine before they've listened to the episode.

Episode title: ${title}
Episode description: ${description}

TITLE RULES - these matter more than sounding catchy:
- This show publishes multi-part series where many episodes cover the same book or theme. Your title must identify THIS episode specifically and must not be interchangeable with another episode in the same series.
- If the episode title contains a part or episode number (e.g. "- 4", "Ep.4", "- 09"), carry that exact number into your title.
- If the episode title names a series, book, or chapter, keep that name in your title. Do not swap it for a synonym and do not translate a proper name inconsistently.
- Add specificity from the description - the particular passage, question, or idea this episode covers - rather than generic phrasing like "Licoes Profundas" or "Um Estudo Profundo" that would fit any episode.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "title_pt": "SEO-friendly Portuguese (Brazil) title following the TITLE RULES above",
  "body_pt": "Full Portuguese article, plain text with \\n\\n paragraph breaks",
  "title_en": "English adaptation of the same title, following the same TITLE RULES",
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
