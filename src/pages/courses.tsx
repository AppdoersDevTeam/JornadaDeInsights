import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { CourseCard } from '@/components/courses/course-card';
import { AnimatedGridItem } from '@/components/shop/animated-grid-item';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { fetchOwnedCourseIds, fetchPublishedCourses, type Course } from '@/lib/courses';

export function CoursesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchPublishedCourses();
        if (!cancelled) setCourses(data);
      } catch (err) {
        console.error('Failed to load courses:', err);
        if (!cancelled) setError(t('courses.loadError', 'Could not load courses. Please try again later.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!user) {
      setOwnedIds(new Set());
      return;
    }
    void fetchOwnedCourseIds().then(setOwnedIds);
  }, [user]);

  return (
    <>
      <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10 text-center max-w-3xl">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">{t('courses.title', 'Courses')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('courses.subtitle', 'Video courses to go deeper in the Word, at your own pace.')}
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-80 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-center text-destructive">{error}</p>
          ) : courses.length === 0 ? (
            <p className="text-center text-muted-foreground">{t('courses.empty', 'New courses are coming soon.')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <AnimatedGridItem key={course.id}>
                  <CourseCard course={course} owned={ownedIds.has(course.id)} />
                </AnimatedGridItem>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
