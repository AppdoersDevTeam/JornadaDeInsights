import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/shop/lazy-image';
import { useCart } from '@/context/cart-context';
import { useLanguage } from '@/context/language-context';
import { trackLifecycleEvent } from '@/lib/lifecycle';
import { courseCoverUrl, courseToCartProduct, formatBRL, formatDuration, type Course } from '@/lib/courses';

interface CourseCardProps {
  course: Course;
  owned?: boolean;
}

export function CourseCard({ course, owned = false }: CourseCardProps) {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const cover = courseCoverUrl(course);

  const handleBuy = () => {
    addItem(courseToCartProduct(course));
    void trackLifecycleEvent('add_to_cart', {
      courseId: course.id,
      title: course.title,
      price: course.price,
      source: 'course_card',
    });
    navigate('/cart');
  };

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:border-primary/20 group">
      <Link to={`/courses/${course.slug}`} className="block">
        <div className="relative w-full aspect-video overflow-hidden bg-muted/30">
          {cover ? (
            <LazyImage
              src={cover}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/60">
              <PlayCircle className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
            {t('courses.badge', 'Online course')}
          </p>
          <h3 className="font-heading font-medium text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {course.subtitle && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.subtitle}</p>
          )}
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="h-3.5 w-3.5" />
              {t('courses.lessonCount', '{count} lessons').replace('{count}', String(course.lesson_count))}
            </span>
            {course.total_duration_seconds > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(course.total_duration_seconds, language)}
              </span>
            )}
          </p>
        </div>
      </Link>
      <div className="p-4 pt-0 mt-auto space-y-2">
        {owned ? (
          <Button asChild size="sm" className="w-full">
            <Link to={`/user-dashboard/courses/${course.slug}`}>{t('courses.goToCourse', 'Go to course')}</Link>
          </Button>
        ) : (
          <>
            <p className="font-medium group-hover:text-primary transition-colors">{formatBRL(course.price, language)}</p>
            <Button size="sm" onClick={handleBuy} className="w-full">
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">{t('courses.enroll', 'Buy course')}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
