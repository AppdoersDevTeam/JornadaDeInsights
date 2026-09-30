import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/courses/course-card';
import { AnimatedGridItem } from '@/components/shop/animated-grid-item';
import { useLanguage } from '@/context/language-context';
import { fetchPublishedCourses, type Course } from '@/lib/courses';

const MAX_SHOWN = 3;

/** Shop-page teaser for courses; renders nothing until at least one course is published. */
export function ShopCoursesSection() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedCourses()
      .then((data) => {
        if (!cancelled) setCourses(data);
      })
      .catch((error) => console.error('Failed to load courses for shop:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  if (courses.length === 0) return null;

  return (
    <section id="courses" className="py-16 bg-background">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-semibold">{t('courses.shop.title', 'Courses')}</h2>
            <p className="text-muted-foreground">{t('courses.subtitle', 'Video courses to go deeper in the Word, at your own pace.')}</p>
          </div>
          {courses.length > MAX_SHOWN && (
            <Button asChild variant="ghost">
              <Link to="/courses">
                {t('courses.browse', 'Browse courses')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.slice(0, MAX_SHOWN).map((course) => (
            <AnimatedGridItem key={course.id}>
              <CourseCard course={course} />
            </AnimatedGridItem>
          ))}
        </div>
      </div>
    </section>
  );
}
