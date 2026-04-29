import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface SiteTrafficDailyPoint {
  date: string;
  views: number;
}

interface SiteTrafficDailyChartProps {
  data: SiteTrafficDailyPoint[];
}

export function SiteTrafficDailyChart({ data }: SiteTrafficDailyChartProps) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  }

  const chartData = data.map((p) => ({
    label: new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    views: p.views,
    fullDate: p.date,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} width={36} allowDecimals={false} />
        <Tooltip
          formatter={(value: number) => [`${value}`, 'Visualizações']}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload as { fullDate?: string } | undefined;
            return row?.fullDate
              ? new Date(row.fullDate).toLocaleDateString('pt-BR')
              : '';
          }}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
