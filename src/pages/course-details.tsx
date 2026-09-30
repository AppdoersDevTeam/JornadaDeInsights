import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, CreditCard, Lock, PlayCircle, ShieldCheck, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/shop/lazy-image';
import { StructuredData } from '@/components/seo/structured-data';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { useLanguage } from '@/context/language-context';
import { trackLifecycleEvent } from '@/lib/lifecycle';
import {
  courseCoverUrl,
  courseToCartProduct,
  fetchCourseBySlug,
  fetchCourseOutline,
  fetchOwnedCourseIds,
  formatBRL,
  formatDuration,
  formatLessonClock,
  type Course,
  type CourseLessonOutline,
} from '@/lib/courses';

const FAQ_ITEMS = [
  {
    key: 'access',
    q: 'How do I watch the course?',
    a: 'After payment, the course appears in your account under "My courses". Sign in with the same email you used to buy.',
  },
  {
    key: 'devices',
    q: 'Can I watch on my phone?',
    a: 'Yes. Lessons play in the browser on phones, tablets and computers.',
  },
  {
    key: 'download',
    q: 'Can I download the videos?',
    a: 'No. Lessons are streamed inside your account and are for your personal use only.',
  },
  {
    key: 'payment',
    q: 'Is it a subscription?',
    a: 'No. It is a one-time payment, processed securely by Stripe.',
  },
] as const;

export function CourseDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLessonOutline[]>([]);
  const [owned, setOwned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!slug) return;
      try {
        setIsLoading(true);
        setNotFound(false);
        const [courseData, outline] = await Promise.all([
          fetchCourseBySlug(slug),
          fetchCourseOutline({ slug }).catch(() => [] as CourseLessonOutline[]),
        ]);
        if (cancelled) return;
        if (!courseData || !courseData.is_published) {
          setNotFound(true);
          return;
        }
        setCourse(courseData);
        setLessons(outline);
        void trackLifecycleEvent('view_item', { courseId: courseData.id, title: courseData.title, price: courseData.price });
      } catch (err) {
        console.error('Failed to load course:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!user || !course) {
      setOwned(false);
      return;
    }
    void fetchOwnedCourseIds().then((ids) => setOwned(ids.has(course.id)));
  }, [user, course]);

  useEffect(() => {
    if (!course) return;
    document.title = `${course.title} | ${language === 'en' ? 'Journey of Insights' : 'Jornada de Insights'}`;
    const description = course.subtitle || course.description || '';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description.slice(0, 160));
  }, [course, language]);

  const structuredData = useMemo(
    () =>
      course
        ? {
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: course.title,
            description: course.subtitle || course.description || course.title,
            inLanguage: course.content_locale,
            image: courseCoverUrl(course),
            provider: {
              '@type': 'Organization',
              name: 'Jornada de Insights',
              sameAs: 'https://jornadadeinsights.com',
            },
            offers: {
              '@type': 'Offer',
              category: 'Paid',
              url: `https://jornadadeinsights.com/courses/${course.slug}`,
              priceCurrency: 'BRL',
              price: course.price.toFixed(2),
              availability: 'https://schema.org/InStock',
            },
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: 'Online',
              ...(course.total_duration_seconds > 0
                ? { courseWorkload: `PT${Math.max(1, Math.round(course.total_duration_seconds / 60))}M` }
                : {}),
            },
          }
        : null,
    [course]
  );

  const handleBuy = () => {
    if (!course) return;
    addItem(courseToCartProduct(course));
    void trackLifecycleEvent('add_to_cart', { courseId: course.id, title: course.title, price: course.price, source: 'course_page' });
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 container mx-auto px-6">
        <div className="h-72 rounded-lg bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="pt-24 pb-16 container mx-auto px-6 text-center">
        <h1 className="text-2xl font-heading font-semibold mb-4">{t('courses.notFound', 'Course not found')}</h1>
        <Button asChild>
          <Link to="/courses">{t('courses.backToCourses', 'All courses')}</Link>
        </Button>
      </div>
    );
  }

  const cover = courseCoverUrl(course);
  const buyBox = (
    <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm space-y-4">
      {owned ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" />
            {t('courses.owned', 'You own this course')}
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to={`/user-dashboard/courses/${course.slug}`}>{t('courses.goToCourse', 'Go to course')}</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold">{formatBRL(course.price, language)}</p>
          <Button size="lg" className="w-full" onClick={handleBuy}>
            <ShoppingCart className="mr-2 h-5 w-5" />
            {t('courses.enroll', 'Buy course')}
          </Button>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('courses.trust.secure', 'Secure payment with Stripe')}
            </li>
            <li className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              {t('courses.trust.oneTime', 'One-time payment, no subscription')}
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              {t('courses.trust.account', 'Watch in your account on any device')}
            </li>
          </ul>
        </>
      )}
    </div>
  );

  return (
    <div className="pt-24 pb-16">
      {structuredData && <StructuredData id={`course-${course.id}`} data={structuredData} />}
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('courses.backToCourses', 'All courses')}
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <header className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{t('courses.badge', 'Online course')}</p>
              <h1 className="text-3xl md:text-4xl font-heading font-bold">{course.title}</h1>
              {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
              <p className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <PlayCircle className="h-4 w-4" />
                  {t('courses.lessonCount', '{count} lessons').replace('{count}', String(course.lesson_count))}
                </span>
                {course.total_duration_seconds > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatDuration(course.total_duration_seconds, language)}
                  </span>
                )}
              </p>
            </header>

            {course.preview_youtube_id ? (
              <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-black">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(course.preview_youtube_id)}?rel=0&modestbranding=1&playsinline=1`}
                  title={t('courses.trailer', 'Course trailer')}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ) : (
              cover && (
                <LazyImage src={cover} alt={course.title} className="w-full rounded-lg object-cover aspect-video" />
              )
            )}

            <div className="lg:hidden">{buyBox}</div>

            {course.learn_points.length > 0 && (
              <section>
                <h2 className="text-2xl font-heading font-semibold mb-4">{t('courses.learn.title', 'What you will learn')}</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.learn_points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {course.description && (
              <section>
                <h2 className="text-2xl font-heading font-semibold mb-4">{t('courses.about', 'About this course')}</h2>
                <p className="whitespace-pre-line text-muted-foreground leading-relaxed">{course.description}</p>
              </section>
            )}

            {lessons.length > 0 && (
              <section>
                <h2 className="text-2xl font-heading font-semibold mb-4">{t('courses.content', 'Course content')}</h2>
                <ol className="divide-y divide-border/60 rounded-lg border border-border/60">
                  {lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-6 shrink-0 text-muted-foreground">{lesson.position}</span>
                        <span className="truncate">{lesson.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                        {formatLessonClock(lesson.durationSeconds)}
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-heading font-semibold mb-4">{t('courses.faq.title', 'Frequently asked questions')}</h2>
              <div className="space-y-3">
                {FAQ_ITEMS.map((item) => (
                  <details key={item.key} className="group rounded-lg border border-border/60 bg-card p-4">
                    <summary className="cursor-pointer font-medium">{t(`courses.faq.${item.key}.q`, item.q)}</summary>
                    <p className="mt-2 text-sm text-muted-foreground">{t(`courses.faq.${item.key}.a`, item.a)}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {cover && course.preview_youtube_id && (
                <LazyImage src={cover} alt={course.title} className="w-full rounded-lg object-cover aspect-video" />
              )}
              {buyBox}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
