import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSupabaseAccessToken } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Save, FileText, X } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface PodcastArticle {
  id: string;
  episode_title: string;
  episode_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  slug: string;
  title_pt: string | null;
  body_pt: string | null;
  title_en: string | null;
  body_en: string | null;
  status: 'draft' | 'published';
  created_at: string;
  episode_published_at: string | null;
}

const callAdminApi = async (path: string, options: RequestInit = {}) => {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`/api/podcast-articles-admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return response.json();
};

export default function PodcastArticlesList() {
  const { t, language } = useLanguage();
  const [articles, setArticles] = useState<PodcastArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<PodcastArticle>>({});

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await callAdminApi('', { method: 'GET' });
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching podcast articles:', error);
      toast.error(t('admin.podcastArticles.loadFail', 'Could not load podcast articles.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const startEdit = (article: PodcastArticle) => {
    setEditingId(article.id);
    setForm({
      title_pt: article.title_pt ?? '',
      body_pt: article.body_pt ?? '',
      title_en: article.title_en ?? '',
      body_en: article.body_en ?? '',
      spotify_url: article.spotify_url ?? '',
      youtube_url: article.youtube_url ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const saveArticle = async (id: string, status?: 'draft' | 'published') => {
    try {
      setSaving(true);
      const payload: Record<string, string> = {};
      if (typeof form.title_pt === 'string') payload.title_pt = form.title_pt;
      if (typeof form.body_pt === 'string') payload.body_pt = form.body_pt;
      if (typeof form.title_en === 'string') payload.title_en = form.title_en;
      if (typeof form.body_en === 'string') payload.body_en = form.body_en;
      if (typeof form.spotify_url === 'string') payload.spotify_url = form.spotify_url;
      if (typeof form.youtube_url === 'string') payload.youtube_url = form.youtube_url;
      if (status) payload.status = status;

      await callAdminApi(`?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      toast.success(
        status === 'published'
          ? t('admin.podcastArticles.publishSuccess', 'Article published!')
          : t('admin.podcastArticles.saveSuccess', 'Changes saved.')
      );
      cancelEdit();
      fetchArticles();
    } catch (error) {
      console.error('Error saving podcast article:', error);
      toast.error(t('admin.podcastArticles.saveFail', 'Could not save changes.'));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(language === 'en' ? 'en' : 'pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const drafts = articles.filter((a) => a.status === 'draft');
  const published = articles.filter((a) => a.status === 'published');

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const renderArticle = (article: PodcastArticle) => {
    const isEditing = editingId === article.id;

    return (
      <Card key={article.id} className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold">{article.title_pt || article.episode_title}</h3>
              <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                {article.status === 'published'
                  ? t('admin.podcastArticles.status.published', 'Published')
                  : t('admin.podcastArticles.status.draft', 'Draft')}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 mb-2 text-sm text-muted-foreground">
              <span>{t('admin.podcastArticles.episode', 'Episode:')} {article.episode_title}</span>
              <span>• {formatDate(article.episode_published_at || article.created_at)}</span>
              {article.episode_url && (
                <a href={article.episode_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {t('admin.podcastArticles.spreakerLink', 'Spreaker link')}
                </a>
              )}
            </div>
            {!isEditing && (
              <p className="text-sm text-muted-foreground line-clamp-3">{article.body_pt}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => startEdit(article)}>
                <Edit className="h-4 w-4 mr-2" />
                {t('admin.actions.edit', 'Edit')}
              </Button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 space-y-3">
              <h4 className="text-sm font-semibold">{t('admin.podcastArticles.sectionPt', 'Portuguese (Brazil)')}</h4>
              <div>
                <Label htmlFor={`title-pt-${article.id}`}>{t('admin.podcastArticles.titlePt', 'Title (Portuguese)')}</Label>
                <Input
                  id={`title-pt-${article.id}`}
                  value={form.title_pt ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, title_pt: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`body-pt-${article.id}`}>{t('admin.podcastArticles.bodyPt', 'Article (Portuguese)')}</Label>
                <Textarea
                  id={`body-pt-${article.id}`}
                  value={form.body_pt ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, body_pt: e.target.value }))}
                  rows={8}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 space-y-3">
              <h4 className="text-sm font-semibold">{t('admin.podcastArticles.sectionEn', 'English')}</h4>
              <div>
                <Label htmlFor={`title-en-${article.id}`}>{t('admin.podcastArticles.titleEn', 'Title (English)')}</Label>
                <Input
                  id={`title-en-${article.id}`}
                  value={form.title_en ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`body-en-${article.id}`}>{t('admin.podcastArticles.bodyEn', 'Article (English)')}</Label>
                <Textarea
                  id={`body-en-${article.id}`}
                  value={form.body_en ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, body_en: e.target.value }))}
                  rows={8}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`spotify-${article.id}`}>{t('admin.podcastArticles.spotifyUrl', 'Spotify URL (optional)')}</Label>
                <Input
                  id={`spotify-${article.id}`}
                  value={form.spotify_url ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, spotify_url: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`youtube-${article.id}`}>{t('admin.podcastArticles.youtubeUrl', 'YouTube URL (optional)')}</Label>
                <Input
                  id={`youtube-${article.id}`}
                  value={form.youtube_url ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="outline" onClick={() => saveArticle(article.id)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {t('admin.podcastArticles.saveDraft', 'Save changes')}
              </Button>
              <Button onClick={() => saveArticle(article.id, 'published')} disabled={saving}>
                <Eye className="h-4 w-4 mr-2" />
                {article.status === 'published'
                  ? t('admin.podcastArticles.republish', 'Save & keep published')
                  : t('admin.podcastArticles.publish', 'Publish')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t('admin.tab.podcastArticles', 'Podcast SEO articles')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          'admin.podcastArticles.hint',
          'Drafts are generated automatically from new Spreaker episodes. Review, edit, and publish them here.'
        )}
      </p>

      {drafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('admin.podcastArticles.drafts', 'Drafts awaiting review')} ({drafts.length})
          </h3>
          <div className="space-y-4">{drafts.map(renderArticle)}</div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {t('admin.podcastArticles.published', 'Published')} ({published.length})
        </h3>
        {articles.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-lg text-muted-foreground">
              {t('admin.podcastArticles.empty', 'No episode articles yet.')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('admin.podcastArticles.emptyHint', 'They will appear here once the daily check finds a new episode.')}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">{published.map(renderArticle)}</div>
        )}
      </div>
    </div>
  );
}
