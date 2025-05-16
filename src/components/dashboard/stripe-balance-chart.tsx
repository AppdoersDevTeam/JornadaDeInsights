import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface BalanceData {
  day: string;
  current_balance: number;
  payouts: number;
  net_transactions: number;
  payments: number;
  refunds: number;
  transfers: number;
  chargeback_withdrawals: number;
  chargeback_reversals: number;
  other_adjustments: number;
  other_transactions: number;
}

interface StripeBalanceChartProps {
  data: BalanceData[];
}

export function StripeBalanceChart({ data }: StripeBalanceChartProps) {
  const [activeTab, setActiveTab] = useState('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const renderChart = (data: BalanceData[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    const colors = {
      current_balance: '#4CAF50',
      payouts: '#FF9800',
      net_transactions: '#2196F3',
      payments: '#2196F3',
      refunds: '#F44336',
      transfers: '#9C27B0',
      chargeback_withdrawals: '#FF5722',
      chargeback_reversals: '#009688',
      other_adjustments: '#607D8B',
      other_transactions: '#795548'
    };

    const renderLines = () => {
      switch (activeTab) {
        case 'all':
          return (
            <>
              <Line
                type="monotone"
                dataKey="current_balance"
                name="Current Balance"
                stroke={colors.current_balance}
                strokeWidth={2}
                dot={{ fill: colors.current_balance, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.current_balance }}
              />
              <Line
                type="monotone"
                dataKey="payments"
                name="Payments"
                stroke={colors.payments}
                strokeWidth={2}
                dot={{ fill: colors.payments, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.payments }}
              />
              <Line
                type="monotone"
                dataKey="refunds"
                name="Refunds"
                stroke={colors.refunds}
                strokeWidth={2}
                dot={{ fill: colors.refunds, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.refunds }}
              />
            </>
          );
        case 'transactions':
          return (
            <>
              <Line
                type="monotone"
                dataKey="net_transactions"
                name="Net Transactions"
                stroke={colors.net_transactions}
                strokeWidth={2}
                dot={{ fill: colors.net_transactions, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.net_transactions }}
              />
              <Line
                type="monotone"
                dataKey="transfers"
                name="Transfers"
                stroke={colors.transfers}
                strokeWidth={2}
                dot={{ fill: colors.transfers, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.transfers }}
              />
            </>
          );
        case 'chargebacks':
          return (
            <>
              <Line
                type="monotone"
                dataKey="chargeback_withdrawals"
                name="Chargeback Withdrawals"
                stroke={colors.chargeback_withdrawals}
                strokeWidth={2}
                dot={{ fill: colors.chargeback_withdrawals, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.chargeback_withdrawals }}
              />
              <Line
                type="monotone"
                dataKey="chargeback_reversals"
                name="Chargeback Reversals"
                stroke={colors.chargeback_reversals}
                strokeWidth={2}
                dot={{ fill: colors.chargeback_reversals, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.chargeback_reversals }}
              />
            </>
          );
        default:
          return null;
      }
    };

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="day" 
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
            formatter={(value: number) => [formatCurrency(value), 'Amount']}
          />
          <Legend />
          {renderLines()}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Visão Geral do Saldo Stripe (NZD)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="chargebacks">Chargebacks</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {renderChart(data)}
          </TabsContent>
          <TabsContent value="transactions" className="mt-4">
            {renderChart(data)}
          </TabsContent>
          <TabsContent value="chargebacks" className="mt-4">
            {renderChart(data)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 