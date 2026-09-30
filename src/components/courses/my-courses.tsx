import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/courses/course-card';
import { useLanguage } from '@/context/language-context';
import { fetchCoursesByIds, fetchOwnedCourseIds, type Course } from '@/lib/courses';

export function MyCourses() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const ids = await fetchOwnedCourseIds();
        const data = await fetchCoursesByIds(Array.from(ids));
        if (!cancelled) setCourses(data.sort((a, b) => a.sort_order - b.sort_order));
      } catch (err) {
        console.error('Failed to load my courses:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {[0, 1].map((key) => (
          <div key={key} className="h-72 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{t('courses.loadError', 'Could not load courses. Please try again later.')}</p>;
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <GraduationCap className="mx-auto mb-3 h-10 w-10 text-primary/70" />
        <p className="mb-4 text-muted-foreground">{t('courses.mine.empty', 'You have not bought any courses yet.')}</p>
        <Button asChild>
          <Link to="/courses">{t('courses.browse', 'Browse courses')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} owned />
      ))}
    </div>
  );
}
