import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ExternalLink, Loader2, Pencil, Plus, RefreshCw, Settings2, Trash2, UserPlus } from 'lucide-react';
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

interface CourseFormDialogProps {
  open: boolean;
  course: Course | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function CourseFormDialog({ open, course, categories, onClose, onSaved }: CourseFormDialogProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
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

  useEffect(() => {
    if (!open) return;
    setTitle(course?.title || '');
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
    setIsPublished(course?.is_published || false);
    setCover(null);
  }, [open, course]);

  const canPublish = Boolean(course && course.lesson_count > 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const finalSlug = slugify(slug || title);
    const priceValue = Number(price.replace(',', '.'));
    const previewId = previewUrl.trim() ? parseYouTubeVideoId(previewUrl) : null;

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
        is_published: canPublish && isPublished,
        cover_filename: coverFilename,
      };

      const { error } = course
        ? await supabase.from('courses').update(row).eq('id', course.id)
        : await supabase.from('courses').insert(row);
      if (error) {
        if (error.code === '23505') {
          toast.error(t('admin.courses.form.slugTaken', 'Another course already uses this URL. Change the slug.'));
          return;
        }
        throw error;
      }

      toast.success(course ? t('admin.courses.saved', 'Course saved.') : t('admin.courses.created', 'Course created. Now add its playlist.'));
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save course:', error);
      toast.error(t('admin.courses.saveFailed', 'Could not save the course.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{course ? t('admin.courses.edit', 'Edit course') : t('admin.courses.new', 'New course')}</DialogTitle>
            <DialogDescription>
              {t('admin.courses.form.help', 'Create the course as a draft, import its playlist, then publish it.')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="course-title">{t('admin.courses.form.title', 'Title')}</Label>
              <Input
                id="course-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (!slugTouched) setSlug(slugify(event.target.value));
                }}
                required
              />
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
                  required
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="course-subtitle">{t('admin.courses.form.subtitle', 'Subtitle')}</Label>
              <Input id="course-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="course-description">{t('admin.courses.form.description', 'Description')}</Label>
              <Textarea id="course-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="course-learn">{t('admin.courses.form.learnPoints', 'What students will learn (one per line)')}</Label>
              <Textarea id="course-learn" rows={4} value={learnPoints} onChange={(event) => setLearnPoints(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-price">{t('admin.courses.form.price', 'Price (BRL)')}</Label>
              <Input id="course-price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} required />
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
              <Label htmlFor="course-preview">{t('admin.courses.form.preview', 'Trailer (public YouTube video link, optional)')}</Label>
              <Input
                id="course-preview"
                value={previewUrl}
                onChange={(event) => setPreviewUrl(event.target.value)}
                placeholder="https://youtu.be/…"
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.courses.form.previewHelp', 'Anyone can watch the trailer. Do not use a lesson video here.')}
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="course-cover">{t('admin.courses.form.cover', 'Cover image (16:9)')}</Label>
              <Input id="course-cover" type="file" accept="image/*" onChange={(event) => setCover(event.target.files?.[0] || null)} />
            </div>
            <label className="flex items-start gap-3 sm:col-span-2">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={canPublish && isPublished}
                disabled={!canPublish}
                onChange={(event) => setIsPublished(event.target.checked)}
              />
              <span className="text-sm">
                {t('admin.courses.form.published', 'Published (visible and for sale)')}
                {!canPublish && (
                  <span className="block text-xs text-muted-foreground">
                    {t('admin.courses.form.publishNeedsLessons', 'Import the playlist before publishing.')}
                  </span>
                )}
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('admin.courses.save', 'Save')}
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
