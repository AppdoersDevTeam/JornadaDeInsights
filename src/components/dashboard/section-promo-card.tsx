import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface SectionPromoCardProps {
  to: '/shop' | '/curiosidades' | '/podcast';
  title: string;
  description: string;
  ctaLabel: string;
  icon: React.ReactNode;
}

export function SectionPromoCard({ to, title, description, ctaLabel, icon }: SectionPromoCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="mb-2 text-primary">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          variant="outline"
          className="w-full justify-between min-h-[44px]"
          onClick={() => navigate(to)}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
