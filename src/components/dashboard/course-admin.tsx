import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CheckCircle2, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Settings2, Trash2, UserPlus } from 'lucide-react';
import { supabase, getSupabaseAccessToken, getCategories, type Category } from '@/lib/supabase';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { COURSE_COLUMNS, courseCoverUrl, formatBRL, formatDuration, formatLessonClock, type Course, type CourseLocale } from '@/lib/courses';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface AdminLesson {
  id: string;
  position: number;
  title: string;
  duration_seconds: number;
  youtube_video_id: string;
}

interface AccessLogEntry {
  id: string;
  lessonTitle: string | null;
  lessonPosition: number | null;
  email: string;
  createdAt: string;
}

interface CourseBuyer {
  email: string;
  name: string | null;
  manual: boolean;
  createdAt: string;
}

async function adminRequest<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('Not signed in');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init?.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Accepts a YouTube URL (watch, youtu.be, embed, shorts) or a bare 11-char id. */
const parseYouTubeVideoId = (value: string): string | null => {
  const raw = value.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get('v');
    if (fromQuery && /^[A-Za-z0-9_-]{11}$/.test(fromQuery)) return fromQuery;
    const match = /(?:youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(url.href);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// --- Create / edit ---------------------------------------------------------

interface PlaylistPreview {
  title: string;
  videoCount: number;
}

interface SyncResult {
  lessons: AdminLesson[];
  skipped: number;
  notEmbeddable: string[];
  lastSyncedAt: string;
}

const looksLikePlaylistLink = (value: string) => /[?&]list=[A-Za-z0-9_-]{10,}/.test(value);

interface CourseFormDialogProps {
  open: boolean;
  course: Course | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function CourseFormDialog({ open, course, categories, onClose, onSaved }: CourseFormDialogProps) {
  const { t } = useLanguage();
  const isNew = !course;
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistPreview, setPlaylistPreview] = useState<PlaylistPreview | null>(null);
  const [playlistError, setPlaylistError] = useState('');
  const [isCheckingPlaylist, setIsCheckingPlaylist] = useState(false);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [learnPoints, setLearnPoints] = useState('');
  const [price, setPrice] = useState('');
  const [locale, setLocale] = useState<CourseLocale>('pt-BR');
  const [categoryId, setCategoryId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStep, setSavingStep] = useState('');

  useEffect(() => {
    if (!open) return;
    setPlaylistUrl('');
    setPlaylistPreview(null);
    setPlaylistError('');
    setTitle(course?.title || '');
    setTitleTouched(Boolean(course));
    setSlug(course?.slug || '');
    setSlugTouched(Boolean(course));
    setSubtitle(course?.subtitle || '');
    setDescription(course?.description || '');
    setLearnPoints((course?.learn_points || []).join('\n'));
    setPrice(course ? String(course.price) : '');
    setLocale(course?.content_locale || 'pt-BR');
    setCategoryId(course?.category_id || '');
    setPreviewUrl(course?.preview_youtube_id || '');
    setSortOrder(String(course?.sort_order ?? 0));
    // New courses go on sale as soon as their lessons import; edits keep the current state.
    setIsPublished(course ? course.is_published : true);
    setCover(null);
    setSavingStep('');
  }, [open, course]);

  const applyTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  // Check the playlist as soon as a link is pasted, and fill in the course name from YouTube.
  useEffect(() => {
    if (!isNew) return;
    const link = playlistUrl.trim();
    setPlaylistPreview(null);
    setPlaylistError('');
    if (!link) return;
    if (!looksLikePlaylistLink(link)) {
      setPlaylistError(
        t('admin.courses.playlist.notPlaylist', 'This is not a playlist link. Open the playlist on YouTube, click Share, then Copy.')
      );
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsCheckingPlaylist(true);
      try {
        const info = await adminRequest<PlaylistPreview>('/api/admin-course-playlist-preview', {
          method: 'POST',
          body: { playlistUrl: link },
        });
        if (cancelled) return;
        setPlaylistPreview(info);
        if (!titleTouched && info.title) applyTitle(info.title);
      } catch (error) {
        if (!cancelled) setPlaylistError(error instanceof Error ? error.message : 'Could not check this playlist');
      } finally {
        if (!cancelled) setIsCheckingPlaylist(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // applyTitle/titleTouched are read at call time; re-running on them would re-check the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistUrl, isNew, t]);

  const canPublish = isNew ? Boolean(playlistPreview) : Boolean(course && course.lesson_count > 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const finalSlug = slugify(slug || title);
    const priceValue = Number(price.replace(',', '.'));
    const previewId = previewUrl.trim() ? parseYouTubeVideoId(previewUrl) : null;

    if (isNew && !playlistPreview) {
      toast.error(t('admin.courses.form.playlistRequired', 'Paste a working YouTube playlist link first.'));
      return;
    }
    if (!title.trim() || !finalSlug) {
      toast.error(t('admin.courses.form.titleRequired', 'Title is required.'));
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      toast.error(t('admin.courses.form.priceInvalid', 'Enter a price greater than zero.'));
      return;
    }
    if (previewUrl.trim() && !previewId) {
      toast.error(t('admin.courses.form.previewInvalid', 'The trailer must be a YouTube video link.'));
      return;
    }
    if (cover && !cover.type.startsWith('image/')) {
      toast.error(t('admin.courses.form.coverInvalid', 'The cover must be an image.'));
      return;
    }

    setIsSaving(true);
    try {
      setSavingStep(t('admin.courses.step.saving', 'Saving course…'));
      let coverFilename = course?.cover_filename || null;
      if (cover) {
        const extension = (cover.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const filename = `${finalSlug}-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('store-assets')
          .upload(`course-covers/${filename}`, cover, { contentType: cover.type, upsert: false });
        if (uploadError) throw uploadError;
        if (course?.cover_filename) {
          await supabase.storage.from('store-assets').remove([`course-covers/${course.cover_filename}`]);
        }
        coverFilename = filename;
      }

      const row = {
        title: title.trim(),
        slug: finalSlug,
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        learn_points: learnPoints
          .split('\n')
          .map((point) => point.trim())
          .filter(Boolean)
          .slice(0, 30),
        price: Math.round(priceValue * 100) / 100,
        content_locale: locale,
        category_id: categoryId || null,
        preview_youtube_id: previewId,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
        cover_filename: coverFilename,
      };

      if (!isNew && course) {
        const { error } = await supabase
          .from('courses')
          .update({ ...row, is_published: canPublish && isPublished })
          .eq('id', course.id);
        if (error) throw error;
        toast.success(t('admin.courses.saved', 'Course saved.'));
        onSaved();
        onClose();
        return;
      }

      // New course: create as a draft, import the playlist, then publish if asked.
      const { data: created, error: insertError } = await supabase
        .from('courses')
        .insert({ ...row, is_published: false })
        .select('id')
        .single();
      if (insertError) throw insertError;

      setSavingStep(t('admin.courses.step.importing', 'Importing lessons from YouTube…'));
      let result: SyncResult;
      try {
        result = await adminRequest<SyncResult>('/api/admin-course-save-playlist', {
          method: 'POST',
          body: { courseId: created.id, playlistUrl: playlistUrl.trim() },
        });
      } catch (importError) {
        toast.error(
          t(
            'admin.courses.importFailedDraft',
            'The course was saved as a draft, but the lessons could not be imported: {error}. Open "Lessons & access" to try again.'
          ).replace('{error}', importError instanceof Error ? importError.message : 'unknown error')
        );
        onSaved();
        onClose();
        return;
      }

      if (isPublished && result.lessons.length > 0) {
        const { error: publishError } = await supabase.from('courses').update({ is_published: true }).eq('id', created.id);
        if (publishError) throw publishError;
      }

      toast.success(
        (isPublished
          ? t('admin.courses.createdLive', 'Course is on sale with {count} lessons.')
          : t('admin.courses.createdDraft', 'Course saved as a draft with {count} lessons.')
        ).replace('{count}', String(result.lessons.length)),
        { duration: 5000 }
      );
      if (result.notEmbeddable.length > 0) {
        toast.error(
          t('admin.courses.sync.notEmbeddable', 'Embedding is turned off for: {titles}. Allow embedding in YouTube Studio.').replace(
            '{titles}',
            result.notEmbeddable.join(', ')
          ),
          { duration: 8000 }
        );
      }
      onSaved();
      onClose();
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === '23505') {
        toast.error(t('admin.courses.form.slugTaken', 'Another course already uses this URL. Change the slug.'));
      } else {
        console.error('Failed to save course:', error);
        toast.error(t('admin.courses.saveFailed', 'Could not save the course.'));
      }
    } finally {
      setIsSaving(false);
      setSavingStep('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isNew ? t('admin.courses.new', 'New course') : t('admin.courses.edit', 'Edit course')}</DialogTitle>
            {isNew && (
              <DialogDescription>
                {t('admin.courses.form.simpleHelp', 'Paste your YouTube playlist link, set a price, and save. The lessons are added for you.')}
              </DialogDescription>
            )}
          </DialogHeader>

          {isNew && (
            <div className="space-y-2">
              <Label htmlFor="course-playlist" className="text-base">
                1. {t('admin.courses.form.playlistLabel', 'YouTube playlist link')}
              </Label>
              <Input
                id="course-playlist"
                value={playlistUrl}
                onChange={(event) => setPlaylistUrl(event.target.value)}
                placeholder="https://www.youtube.com/playlist?list=…"
                autoFocus
              />
              {isCheckingPlaylist ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('admin.courses.playlist.checking', 'Checking the playlist…')}
                </p>
              ) : playlistPreview ? (
                <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {t('admin.courses.playlist.found', 'Found "{title}" with {count} videos.')
                    .replace('{title}', playlistPreview.title)
                    .replace('{count}', String(playlistPreview.videoCount))}
                </p>
              ) : playlistError ? (
                <p className="text-sm text-destructive">{playlistError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('admin.courses.form.playlistHelp', 'On YouTube, open the playlist, click Share, then Copy, and paste it here. The playlist must be Unlisted.')}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="course-title" className="text-base">
              {isNew && '2. '}
              {t('admin.courses.form.title', 'Title')}
            </Label>
            <Input
              id="course-title"
              value={title}
              onChange={(event) => {
                setTitleTouched(true);
                applyTitle(event.target.value);
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-price" className="text-base">
              {isNew && '3. '}
              {t('admin.courses.form.price', 'Price (BRL)')}
            </Label>
            <Input
              id="course-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="97,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-cover">{t('admin.courses.form.coverOptional', 'Cover image (optional)')}</Label>
            <Input id="course-cover" type="file" accept="image/*" onChange={(event) => setCover(event.target.files?.[0] || null)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-description">{t('admin.courses.form.descriptionOptional', 'Description (optional)')}</Label>
            <Textarea id="course-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border/60 p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={isPublished}
              disabled={!isNew && !canPublish}
              onChange={(event) => setIsPublished(event.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">{t('admin.courses.form.onSale', 'Put on sale now')}</span>
              <span className="block text-xs text-muted-foreground">
                {!isNew && !canPublish
                  ? t('admin.courses.form.publishNeedsLessons', 'Import the playlist before publishing.')
                  : t('admin.courses.form.onSaleHelp', 'Untick to keep it hidden as a draft.')}
              </span>
            </span>
          </label>

          <details className="rounded-md border border-border/60 p-3">
            <summary className="cursor-pointer text-sm font-medium">{t('admin.courses.form.more', 'More options')}</summary>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="course-subtitle">{t('admin.courses.form.subtitle', 'Subtitle')}</Label>
                <Input id="course-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="course-learn">{t('admin.courses.form.learnPoints', 'What students will learn (one per line)')}</Label>
                <Textarea id="course-learn" rows={4} value={learnPoints} onChange={(event) => setLearnPoints(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="course-preview">{t('admin.courses.form.preview', 'Trailer (public YouTube video link, optional)')}</Label>
                <Input id="course-preview" value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} placeholder="https://youtu.be/…" />
                <p className="text-xs text-muted-foreground">
                  {t('admin.courses.form.previewHelp', 'Anyone can watch the trailer. Do not use a lesson video here.')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-locale">{t('admin.courses.form.language', 'Course language')}</Label>
                <select id="course-locale" className={SELECT_CLASS} value={locale} onChange={(event) => setLocale(event.target.value as CourseLocale)}>
                  <option value="pt-BR">Português</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-category">{t('admin.courses.form.category', 'Category')}</Label>
                <select id="course-category" className={SELECT_CLASS} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">{t('admin.courses.form.noCategory', 'No category')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-order">{t('admin.courses.form.sortOrder', 'Display order')}</Label>
                <Input id="course-order" type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="course-slug">{t('admin.courses.form.slug', 'Page URL')}</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0">/courses/</span>
                  <Input
                    id="course-slug"
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(slugify(event.target.value));
                    }}
                  />
                </div>
              </div>
            </div>
          </details>

          <DialogFooter className="gap-2 sm:items-center">
            {savingStep && <p className="mr-auto text-sm text-muted-foreground">{savingStep}</p>}
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSaving || (isNew && !playlistPreview)}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? t('admin.courses.form.create', 'Create course') : t('admin.courses.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Manage: playlist, lessons, grant, access log -------------------------

function CourseManagePanel({ course, onChanged }: { course: Course; onChanged: () => void }) {
  const { t, language } = useLanguage();
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [log, setLog] = useState<AccessLogEntry[]>([]);
  const [buyers, setBuyers] = useState<CourseBuyer[]>([]);

  const loadPrivate = useCallback(async () => {
    try {
      const data = await adminRequest<{ playlistUrl: string; lastSyncedAt: string | null; lessons: AdminLesson[] }>(
        `/api/admin-course-private?courseId=${course.id}`
      );
      setPlaylistUrl(data.playlistUrl);
      setLastSyncedAt(data.lastSyncedAt);
      setLessons(data.lessons);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load course details');
    }
  }, [course.id]);

  const loadLog = useCallback(async () => {
    try {
      const data = await adminRequest<{ entries: AccessLogEntry[]; buyers: CourseBuyer[] }>(
        `/api/admin-course-access-log?courseId=${course.id}&limit=50`
      );
      setLog(data.entries);
      setBuyers(data.buyers);
    } catch (error) {
      console.error('Failed to load access log:', error);
    }
  }, [course.id]);

  useEffect(() => {
    void loadPrivate();
    void loadLog();
  }, [loadPrivate, loadLog]);

  const applySyncResult = (result: { lessons: AdminLesson[]; skipped: number; notEmbeddable: string[]; lastSyncedAt: string }) => {
    setLessons(result.lessons);
    setLastSyncedAt(result.lastSyncedAt);
    const next: string[] = [];
    if (result.skipped > 0) {
      next.push(
        t('admin.courses.sync.skipped', '{count} private or deleted videos were skipped.').replace('{count}', String(result.skipped))
      );
    }
    if (result.notEmbeddable.length > 0) {
      next.push(
        t('admin.courses.sync.notEmbeddable', 'Embedding is turned off for: {titles}. Allow embedding in YouTube Studio.').replace(
          '{titles}',
          result.notEmbeddable.join(', ')
        )
      );
    }
    setWarnings(next);
    toast.success(t('admin.courses.sync.done', 'Imported {count} lessons.').replace('{count}', String(result.lessons.length)));
    onChanged();
  };

  const savePlaylist = async () => {
    setIsSyncing(true);
    try {
      const result = await adminRequest<{ lessons: AdminLesson[]; skipped: number; notEmbeddable: string[]; lastSyncedAt: string }>(
        '/api/admin-course-save-playlist',
        { method: 'POST', body: { courseId: course.id, playlistUrl } }
      );
      applySyncResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const resync = async () => {
    setIsSyncing(true);
    try {
      const result = await adminRequest<{ lessons: AdminLesson[]; skipped: number; notEmbeddable: string[]; lastSyncedAt: string }>(
        '/api/admin-course-resync',
        { method: 'POST', body: { courseId: course.id } }
      );
      applySyncResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Re-sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const grant = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsGranting(true);
    try {
      const result = await adminRequest<{ granted: boolean; alreadyOwned?: boolean }>('/api/admin-course-grant', {
        method: 'POST',
        body: { courseId: course.id, email: grantEmail },
      });
      toast.success(
        result.alreadyOwned
          ? t('admin.courses.grant.already', 'This email already has access.')
          : t('admin.courses.grant.done', 'Access granted.')
      );
      setGrantEmail('');
      void loadLog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Grant failed');
    } finally {
      setIsGranting(false);
    }
  };

  const dateFormatter = new Intl.DateTimeFormat(language === 'en' ? 'en' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-6 border-t border-border/60 pt-4">
      <section className="space-y-2">
        <Label htmlFor={`playlist-${course.id}`}>{t('admin.courses.playlist', 'YouTube playlist link (Unlisted)')}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`playlist-${course.id}`}
            value={playlistUrl}
            onChange={(event) => setPlaylistUrl(event.target.value)}
            placeholder="https://www.youtube.com/playlist?list=…"
          />
          <Button type="button" onClick={() => void savePlaylist()} disabled={isSyncing || !playlistUrl.trim()}>
            {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('admin.courses.playlist.save', 'Save & import')}
          </Button>
          <Button type="button" variant="outline" onClick={() => void resync()} disabled={isSyncing || !lastSyncedAt}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('admin.courses.playlist.resync', 'Re-sync')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {lastSyncedAt
            ? t('admin.courses.playlist.lastSynced', 'Last imported: {date}').replace('{date}', dateFormatter.format(new Date(lastSyncedAt)))
            : t('admin.courses.playlist.never', 'Not imported yet. Set the playlist and its videos to Unlisted with embedding allowed.')}
        </p>
        {warnings.map((warning) => (
          <p key={warning} className="text-xs text-amber-600">
            {warning}
          </p>
        ))}
      </section>

      {lessons.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-semibold">
            {t('admin.courses.lessons', 'Lessons')} ({lessons.length})
          </h4>
          <ol className="max-h-64 overflow-y-auto divide-y divide-border/60 rounded-md border border-border/60 text-sm">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate">
                  {lesson.position}. {lesson.title}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {formatLessonClock(lesson.duration_seconds)}
                  <a
                    href={`https://www.youtube.com/watch?v=${lesson.youtube_video_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary"
                    aria-label="YouTube"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">{t('admin.courses.grant', 'Grant access')}</h4>
        <form onSubmit={grant} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            required
            value={grantEmail}
            onChange={(event) => setGrantEmail(event.target.value)}
            placeholder={t('admin.courses.grant.placeholder', 'Student email')}
          />
          <Button type="submit" variant="outline" disabled={isGranting}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('admin.courses.grant.cta', 'Grant')}
          </Button>
        </form>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="mb-2 text-sm font-semibold">
            {t('admin.courses.buyers', 'Students')} ({buyers.length})
          </h4>
          {buyers.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('admin.courses.buyers.empty', 'No students yet.')}</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto divide-y divide-border/60 rounded-md border border-border/60 text-xs">
              {buyers.map((buyer) => (
                <li key={`${buyer.email}-${buyer.createdAt}`} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate">{buyer.email}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {buyer.manual && <Badge variant="outline" className="mr-2">{t('admin.courses.buyers.manual', 'Manual')}</Badge>}
                    {dateFormatter.format(new Date(buyer.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">{t('admin.courses.log', 'Recent lesson views')}</h4>
          {log.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('admin.courses.log.empty', 'No views yet.')}</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto divide-y divide-border/60 rounded-md border border-border/60 text-xs">
              {log.map((entry) => (
                <li key={entry.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{entry.email}</span>
                    <span className="shrink-0 text-muted-foreground">{dateFormatter.format(new Date(entry.createdAt))}</span>
                  </div>
                  {entry.lessonTitle && (
                    <p className="truncate text-muted-foreground">
                      {entry.lessonPosition}. {entry.lessonTitle}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// --- List ------------------------------------------------------------------

export default function CourseAdmin() {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(COURSE_COLUMNS)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(
        (data || []).map((row) => ({
          ...(row as unknown as Course),
          price: Number((row as { price: unknown }).price),
          learn_points: Array.isArray((row as { learn_points: unknown }).learn_points)
            ? ((row as { learn_points: unknown[] }).learn_points.filter((point) => typeof point === 'string') as string[])
            : [],
        }))
      );
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error(t('admin.courses.loadFailed', 'Could not load courses.'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCourses();
    getCategories()
      .then(setCategories)
      .catch((error) => console.error('Failed to load categories:', error));
  }, [loadCourses]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await adminRequest('/api/admin-course-delete', { method: 'POST', body: { courseId: deleting.id } });
      toast.success(t('admin.courses.deleted', 'Course deleted.'));
      setDeleting(null);
      void loadCourses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
          <div>
            <CardTitle>{t('admin.tab.courses', 'Courses')}</CardTitle>
            <CardDescription>
              {t('admin.courses.desc', 'Sell video courses from Unlisted YouTube playlists. Lessons play only for buyers.')}
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.courses.new', 'New course')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-24 rounded-md bg-muted/40 animate-pulse" />
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.courses.empty', 'No courses yet.')}</p>
          ) : (
            courses.map((course) => {
              const cover = courseCoverUrl(course);
              const managing = managingId === course.id;
              return (
                <div key={course.id} className="rounded-lg border border-border/60 p-4 space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-20 w-full sm:w-36 shrink-0 overflow-hidden rounded-md bg-muted">
                      {cover && <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold truncate">{course.title}</h3>
                        <Badge variant={course.is_published ? 'default' : 'secondary'}>
                          {course.is_published ? t('admin.courses.published', 'Published') : t('admin.courses.draft', 'Draft')}
                        </Badge>
                        <Badge variant="outline">{course.content_locale === 'en' ? 'EN' : 'PT'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatBRL(course.price, language)} ·{' '}
                        {t('courses.lessonCount', '{count} lessons').replace('{count}', String(course.lesson_count))}
                        {course.total_duration_seconds > 0 && ` · ${formatDuration(course.total_duration_seconds, language)}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">/courses/{course.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant={managing ? 'secondary' : 'outline'} onClick={() => setManagingId(managing ? null : course.id)}>
                        <Settings2 className="mr-1.5 h-4 w-4" />
                        {t('admin.courses.manage', 'Lessons & access')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(course);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="mr-1.5 h-4 w-4" />
                        {t('admin.courses.edit', 'Edit course')}
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/courses/${course.slug}`} target="_blank" rel="noreferrer" aria-label={t('courses.viewCourse', 'View course')}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(course)}
                        aria-label={t('admin.courses.delete', 'Delete course')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {managing && <CourseManagePanel course={course} onChanged={() => void loadCourses()} />}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CourseFormDialog
        open={formOpen}
        course={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => void loadCourses()}
      />

      <Dialog open={Boolean(deleting)} onOpenChange={(next) => !next && !isDeleting && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.courses.delete', 'Delete course')}</DialogTitle>
            <DialogDescription>
              {t(
                'admin.courses.delete.confirm',
                'Delete "{title}" and its lessons? Courses with students cannot be deleted; unpublish them instead.'
              ).replace('{title}', deleting?.title || '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('admin.courses.delete', 'Delete course')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
