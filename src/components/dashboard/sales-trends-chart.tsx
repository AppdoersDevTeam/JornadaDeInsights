import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface SalesData {
  date: string;
  sales: number;
}

interface SalesTrendsChartProps {
  dailyData: SalesData[];
  weeklyData: SalesData[];
  monthlyData: SalesData[];
}

export function SalesTrendsChart({ dailyData, weeklyData, monthlyData }: SalesTrendsChartProps) {
  const [activeTab, setActiveTab] = useState('daily');

  const renderChart = (data: SalesData[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No data available</p>
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
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px'
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']}
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
        <CardTitle>Sales Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
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