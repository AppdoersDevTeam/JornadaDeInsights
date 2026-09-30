import { supabase } from '@/lib/supabase';
import type { CartProduct } from '@/context/cart-context';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export type CourseLocale = 'pt-BR' | 'en';

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  learn_points: string[];
  price: number;
  cover_filename: string | null;
  preview_youtube_id: string | null;
  content_locale: CourseLocale;
  category_id: string | null;
  lesson_count: number;
  total_duration_seconds: number;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseLessonOutline {
  id: string;
  position: number;
  title: string;
  durationSeconds: number;
}

export const COURSE_COLUMNS =
  'id, slug, title, subtitle, description, learn_points, price, cover_filename, preview_youtube_id, content_locale, category_id, lesson_count, total_duration_seconds, is_published, sort_order, created_at, updated_at';

const normalizeCourse = (row: Record<string, unknown>): Course => ({
  ...(row as unknown as Course),
  price: Number(row.price),
  learn_points: Array.isArray(row.learn_points)
    ? (row.learn_points as unknown[]).filter((point): point is string => typeof point === 'string')
    : [],
});

export const courseCoverUrl = (course: Pick<Course, 'cover_filename' | 'updated_at'>): string | undefined =>
  course.cover_filename
    ? `${supabase.storage.from('store-assets').getPublicUrl(`course-covers/${course.cover_filename}`).data.publicUrl}?v=${encodeURIComponent(course.updated_at || '')}`
    : undefined;

export const formatDuration = (totalSeconds: number, language: string): string => {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return language === 'en' ? `${hours}h ${minutes}m` : `${hours}h ${minutes}min`;
  }
  if (minutes > 0) {
    return language === 'en' ? `${minutes} min` : `${minutes} min`;
  }
  return `${seconds}s`;
};

export const formatLessonClock = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
};

export const formatBRL = (value: number, language: string): string =>
  new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const courseToCartProduct = (course: Course): CartProduct => ({
  id: course.id,
  type: 'course',
  slug: course.slug,
  title: course.title,
  description: course.subtitle || '',
  price: course.price,
  filename: '',
  cover_url: courseCoverUrl(course),
  created_at: course.created_at,
});

/** Published courses (RLS hides drafts from everyone but admins). */
export async function fetchPublishedCourses(locale?: CourseLocale): Promise<Course[]> {
  let query = supabase
    .from('courses')
    .select(COURSE_COLUMNS)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (locale) query = query.eq('content_locale', locale);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => normalizeCourse(row as Record<string, unknown>));
}

export async function fetchCourseBySlug(slug: string): Promise<Course | null> {
  const { data, error } = await supabase.from('courses').select(COURSE_COLUMNS).eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? normalizeCourse(data as Record<string, unknown>) : null;
}

export async function fetchCoursesByIds(ids: string[]): Promise<Course[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('courses').select(COURSE_COLUMNS).in('id', ids);
  if (error) throw error;
  return (data || []).map((row) => normalizeCourse(row as Record<string, unknown>));
}

export async function fetchCourseOutline(params: { slug?: string; courseId?: string }): Promise<CourseLessonOutline[]> {
  const search = new URLSearchParams();
  if (params.slug) search.set('slug', params.slug);
  if (params.courseId) search.set('courseId', params.courseId);
  const response = await fetch(`${API_BASE_URL}/api/course-outline?${search.toString()}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('Failed to load course outline');
  const body = (await response.json()) as { lessons?: CourseLessonOutline[] };
  return body.lessons || [];
}

const authHeaders = async (): Promise<Record<string, string> | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : null;
};

/** Course ids the signed-in user has bought (from /api/my-orders). */
export async function fetchOwnedCourseIds(): Promise<Set<string>> {
  const headers = await authHeaders();
  if (!headers) return new Set();
  const response = await fetch(`${API_BASE_URL}/api/my-orders`, { headers });
  if (!response.ok) return new Set();
  const body = (await response.json()) as {
    orders?: Array<{ items?: Array<{ type?: string; courseId?: string | null }> }>;
  };
  const ids = new Set<string>();
  for (const order of body.orders || []) {
    for (const item of order.items || []) {
      if (item.type === 'course' && item.courseId) ids.add(item.courseId);
    }
  }
  return ids;
}

export class CourseAccessError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface LessonAccess {
  lesson: CourseLessonOutline;
  lessons: CourseLessonOutline[];
  videoId: string;
  watermark: string;
}

/** Ownership-checked lesson access. Throws CourseAccessError (401/403/404). */
export async function fetchLessonAccess(courseId: string, lessonId?: string): Promise<LessonAccess> {
  const headers = await authHeaders();
  if (!headers) throw new CourseAccessError('Not signed in', 401);
  const search = new URLSearchParams({ courseId });
  if (lessonId) search.set('lessonId', lessonId);
  const response = await fetch(`${API_BASE_URL}/api/course-access?${search.toString()}`, {
    headers,
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as Partial<LessonAccess> & { error?: string };
  if (!response.ok || !body.videoId || !body.lesson) {
    throw new CourseAccessError(body.error || 'Failed to load lesson', response.status || 500);
  }
  return { lesson: body.lesson, lessons: body.lessons || [], videoId: body.videoId, watermark: body.watermark || '' };
}
