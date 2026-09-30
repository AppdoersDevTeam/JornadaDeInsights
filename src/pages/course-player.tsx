import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProtectedPlayer } from '@/components/courses/protected-player';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import {
  CourseAccessError,
  fetchCourseBySlug,
  fetchLessonAccess,
  formatLessonClock,
  type Course,
  type CourseLessonOutline,
  type LessonAccess,
} from '@/lib/courses';

type PageState = 'loading' | 'ready' | 'forbidden' | 'notFound' | 'error';

export function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonParam = searchParams.get('lesson') || undefined;
  const { t } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLessonOutline[]>([]);
  const [access, setAccess] = useState<LessonAccess | null>(null);
  const [state, setState] = useState<PageState>('loading');
  const [lessonLoading, setLessonLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin', { state: { from: location.pathname, returnTo: `${location.pathname}${location.search}` } });
    }
  }, [authLoading, user, navigate, location.pathname, location.search]);

  const loadLesson = useCallback(async (courseId: string, lessonId?: string) => {
    setLessonLoading(true);
    try {
      const result = await fetchLessonAccess(courseId, lessonId);
      setAccess(result);
      setLessons(result.lessons);
      setState('ready');
    } catch (err) {
      if (err instanceof CourseAccessError && err.status === 403) setState('forbidden');
      else if (err instanceof CourseAccessError && err.status === 404) setState('notFound');
      else {
        console.error('Failed to load lesson:', err);
        setState('error');
      }
    } finally {
      setLessonLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !slug) return;
    let cancelled = false;
    const load = async () => {
      try {
        setState('loading');
        const data = await fetchCourseBySlug(slug);
        if (cancelled) return;
        if (!data) {
          setState('notFound');
          return;
        }
        setCourse(data);
      } catch (err) {
        console.error('Failed to load course:', err);
        if (!cancelled) setState('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, slug]);

  // Ownership is checked server-side on every lesson request; the player mounts only after it passes.
  useEffect(() => {
    if (!course) return;
    if (access && access.lesson.id === lessonParam) return;
    void loadLesson(course.id, lessonParam);
    // access is intentionally excluded: it is the result of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, lessonParam, loadLesson]);

  const selectLesson = (lessonId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('lesson', lessonId);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentIndex = access ? lessons.findIndex((lesson) => lesson.id === access.lesson.id) : -1;
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const backLink = (
    <Button asChild variant="ghost" className="mb-4 -ml-2">
      <Link to="/user-dashboard?tab=courses">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('courses.mine.title', 'My courses')}
      </Link>
    </Button>
  );

  if (authLoading || !user || state === 'loading') {
    return (
      <div className="p-4 sm:p-6">
        <div className="aspect-video w-full max-w-5xl rounded-lg bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (state === 'forbidden') {
    return (
      <div className="p-4 sm:p-6 max-w-xl">
        {backLink}
        <div className="rounded-lg border border-border/60 bg-card p-8 text-center space-y-4">
          <Lock className="mx-auto h-10 w-10 text-primary/70" />
          <p className="text-muted-foreground">
            {t('courses.player.forbidden', 'This course is not in your account yet. If you just bought it, wait a minute and refresh.')}
          </p>
          {course && (
            <Button asChild>
              <Link to={`/courses/${course.slug}`}>{t('courses.viewCourse', 'View course')}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state === 'notFound' || state === 'error' || !course || !access) {
    return (
      <div className="p-4 sm:p-6 max-w-xl">
        {backLink}
        <p className="text-muted-foreground">
          {state === 'notFound'
            ? t('courses.notFound', 'Course not found')
            : t('courses.player.error', 'This lesson could not be played. Please try again later.')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {backLink}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <ProtectedPlayer videoId={access.videoId} watermark={access.watermark} title={access.lesson.title} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{course.title}</p>
              <h1 className="text-xl font-heading font-semibold">
                {access.lesson.position}. {access.lesson.title}
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!previous || lessonLoading}
                onClick={() => previous && selectLesson(previous.id)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('courses.player.previous', 'Previous')}
              </Button>
              <Button size="sm" disabled={!next || lessonLoading} onClick={() => next && selectLesson(next.id)}>
                {t('courses.player.next', 'Next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-border/60 bg-card">
          <h2 className="border-b border-border/60 px-4 py-3 font-semibold">{t('courses.content', 'Course content')}</h2>
          <ol className="max-h-[60vh] overflow-y-auto divide-y divide-border/60">
            {lessons.map((lesson) => {
              const active = lesson.id === access.lesson.id;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => selectLesson(lesson.id)}
                    disabled={lessonLoading}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <PlayCircle className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="truncate">
                        {lesson.position}. {lesson.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatLessonClock(lesson.durationSeconds)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
