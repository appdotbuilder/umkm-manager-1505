import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package,
  Calendar,
  Download,
  Star,
  Trophy,
  Target
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  SalesReport, 
  TopProductsReport, 
  TopCustomersReport,
  Customer,
  Product
} from '../../../server/src/schema';

export default function ReportsModule() {
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductsReport[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomersReport[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<{
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly'>('daily');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      const [salesResult, topProductsResult, topCustomersResult, revenueResult] = await Promise.all([
        trpc.getSalesReport.query({
          start_date: startDate,
          end_date: endDate,
          period: reportPeriod
        }),
        trpc.getTopProducts.query({ limit: 10 }),
        trpc.getTopCustomers.query({ limit: 10 }),
        trpc.getRevenueSummary.query({
          startDate,
          endDate
        })
      ]);

      setSalesReports(Array.isArray(salesResult) ? salesResult : []);
      setTopProducts(topProductsResult);
      setTopCustomers(topCustomersResult);
      setRevenueSummary(revenueResult);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Set empty states on error
      setSalesReports([]);
      setTopProducts([]);
      setTopCustomers([]);
      setRevenueSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, reportPeriod]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID');
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Laporan & Analisis Bisnis</h3>
          <p className="text-sm text-gray-600">
            Analisis performa penjualan dan tren bisnis
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-2 items-center">
            <Label htmlFor="start-date" className="text-sm">Dari:</Label>
            <Input
              id="start-date"
              type="date"
              value={dateRange.startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-auto"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Label htmlFor="end-date" className="text-sm">Sampai:</Label>
            <Input
              id="end-date"
              type="date"
              value={dateRange.endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-auto"
            />
          </div>

          <Select
            value={reportPeriod}
            onValueChange={(value) => setReportPeriod(value as 'daily' | 'monthly')}
          >
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Harian</SelectItem>
              <SelectItem value="monthly">Bulanan</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={loadReports} disabled={isLoading}>
            {isLoading ? 'Memuat...' : 'Perbarui Laporan'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                <p className="text-2xl font-bold text-green-600">
                  {revenueSummary ? formatCurrency(revenueSummary.total_revenue) : 'Rp 0'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-blue-600">
                  {revenueSummary?.total_transactions || 0}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rata-rata Transaksi</p>
                <p className="text-2xl font-bold text-purple-600">
                  {revenueSummary ? formatCurrency(revenueSummary.average_transaction) : 'Rp 0'}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produk Terlaris</p>
                <p className="text-2xl font-bold text-orange-600">{topProducts.length}</p>
              </div>
              <Trophy className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Penjualan
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produk Terlaris
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pelanggan Terbaik
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Ekspor Data
          </TabsTrigger>
        </TabsList>

        {/* Sales Report Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Laporan Penjualan {reportPeriod === 'daily' ? 'Harian' : 'Bulanan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Tidak ada data penjualan untuk periode yang dipilih</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead>Total Penjualan</TableHead>
                      <TableHead>Jumlah Transaksi</TableHead>
                      <TableHead>Rata-rata per Transaksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReports.map((report: SalesReport, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {report.period}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(report.total_sales)}
                        </TableCell>
                        <TableCell>{report.total_transactions}</TableCell>
                        <TableCell>{formatCurrency(report.average_transaction)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-600" />
                Produk Terlaris
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Belum ada data penjualan produk</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peringkat</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Total Terjual</TableHead>
                      <TableHead>Total Pendapatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product: TopProductsReport, index: number) => (
                      <TableRow key={product.product_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={index < 3 ? "default" : "secondary"}
                              className={
                                index === 0 ? "bg-yellow-500" :
                                index === 1 ? "bg-gray-400" :
                                index === 2 ? "bg-orange-600" : ""
                              }
                            >
                              #{index + 1}
                            </Badge>
                            {index < 3 && <Trophy className="h-4 w-4 text-yellow-600" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell>{product.total_quantity_sold}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {formatCurrency(product.total_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Pelanggan Terbaik
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Belum ada data pembelian pelanggan</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peringkat</TableHead>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead>Jumlah Pembelian</TableHead>
                      <TableHead>Total Pengeluaran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((customer: TopCustomersReport, index: number) => (
                      <TableRow key={customer.customer_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={index < 3 ? "default" : "secondary"}
                              className={
                                index === 0 ? "bg-purple-500" :
                                index === 1 ? "bg-blue-500" :
                                index === 2 ? "bg-green-500" : ""
                              }
                            >
                              #{index + 1}
                            </Badge>
                            {index < 3 && <Star className="h-4 w-4 text-yellow-600" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>{customer.total_purchases}</TableCell>
                        <TableCell className="text-purple-600 font-semibold">
                          {formatCurrency(customer.total_spent)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-gray-600" />
                Ekspor Data Laporan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Fitur Ekspor Akan Segera Tersedia</h3>
                <p className="mb-4">
                  Anda akan dapat mengekspor laporan dalam format Excel, PDF, dan CSV
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </Button>
                  <Button variant="outline" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}