import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/context/language-context';

export interface SalesData {
  date: string;
  sales: number;
  refunds?: number;
  disputes?: number;
  disputesWon?: number;
}

interface SalesTrendsChartProps {
  dailyData: SalesData[];
  weeklyData: SalesData[];
  monthlyData: SalesData[];
}

export function SalesTrendsChart({ dailyData, weeklyData, monthlyData }: SalesTrendsChartProps) {
  const [activeTab, setActiveTab] = useState('daily');
  const { t, language } = useLanguage();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const renderChart = (data: SalesData[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">{t('admin.salesTrends.empty', 'No sales in the selected period.')}</p>
        </div>
      );
    }

    const allZero = data.every((row) => Number(row.sales || 0) === 0);
    if (allZero) {
      const windowLabel =
        activeTab === 'daily'
          ? t('admin.salesTrends.window.daily', 'last 7 days')
          : activeTab === 'weekly'
            ? t('admin.salesTrends.window.weekly', 'last 4 weeks')
            : t('admin.salesTrends.window.monthly', 'last 3 months');

      return (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">
            {t('admin.salesTrends.noSalesInWindow', 'No sales in {window}.').replace('{window}', windowLabel)}
          </p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#666' }}
            tickLine={{ stroke: '#666' }}
          />
          <YAxis 
            tick={{ fill: '#666' }}
            tickLine={{ stroke: '#666' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px'
            }}
            formatter={(value: number) => [formatCurrency(value), t('admin.salesTrends.series.sales', 'Sales')]}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#4CAF50"
            strokeWidth={2}
            dot={{ fill: '#4CAF50', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#4CAF50' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('admin.salesTrends.title', 'Sales trends')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">{t('admin.salesTrends.tab.daily', 'Daily')}</TabsTrigger>
            <TabsTrigger value="weekly">{t('admin.salesTrends.tab.weekly', 'Weekly')}</TabsTrigger>
            <TabsTrigger value="monthly">{t('admin.salesTrends.tab.monthly', 'Monthly')}</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            {renderChart(dailyData)}
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            {renderChart(weeklyData)}
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            {renderChart(monthlyData)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 