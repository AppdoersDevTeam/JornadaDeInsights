import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface SalesData {
  date: string;
  sales: number;
  refunds: number;
  disputes: number;
  disputesWon: number;
  otherAdjustments: number;
  totalGrossActivity: number;
  customersCount: number;
  salesCount: number;
  refundCount: number;
  disputeCount: number;
  disputesWonCount: number;
}

interface SalesTrendsChartProps {
  dailyData: SalesData[];
  weeklyData: SalesData[];
  monthlyData: SalesData[];
}

export function SalesTrendsChart({ dailyData, weeklyData, monthlyData }: SalesTrendsChartProps) {
  const [activeTab, setActiveTab] = useState('daily');

  // Debug data
  useEffect(() => {
    console.log('Chart Data:', {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData
    });
  }, [dailyData, weeklyData, monthlyData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$ ${(value / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {payload[0]?.payload?.customersCount !== undefined && (
            <p className="text-gray-500 mt-2">
              Customers: {payload[0].payload.customersCount}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = (data: SalesData[]) => {
    console.log('Rendering chart with data:', data);
    
    if (!data || data.length === 0) {
      return (
        <div className="h-[300px] w-full flex items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    // Ensure all required fields are present and are numbers
    const processedData = data.map(item => ({
      ...item,
      sales: Number(item.sales) || 0,
      refunds: Number(item.refunds) || 0,
      disputes: Number(item.disputes) || 0,
      disputesWon: Number(item.disputesWon) || 0,
      date: item.date || 'Unknown'
    }));

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              tickFormatter={(value) => value}
            />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="sales"
              name="Sales"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e' }}
            />
            <Line
              type="monotone"
              dataKey="refunds"
              name="Refunds"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444' }}
            />
            <Line
              type="monotone"
              dataKey="disputes"
              name="Disputes"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b' }}
            />
            <Line
              type="monotone"
              dataKey="disputesWon"
              name="Disputes Won"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Report</CardTitle>
        <CardDescription>Sales, refunds, disputes, and customer data</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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