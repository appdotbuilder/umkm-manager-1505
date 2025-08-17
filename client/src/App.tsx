import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Warehouse,
  Store
} from 'lucide-react';

// Import feature components
import ProductManagement from '@/components/ProductManagement';
import CustomerManagement from '@/components/CustomerManagement';
import SalesManagement from '@/components/SalesManagement';
import InventoryManagement from '@/components/InventoryManagement';
import ReportsModule from '@/components/ReportsModule';

function App() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Store className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent">
              Manajemen UMKM
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Sistem manajemen terpadu untuk usaha mikro, kecil, dan menengah 🏪
          </p>
          <Badge variant="secondary" className="mt-2">
            Dashboard Utama
          </Badge>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full h-14 bg-white shadow-lg rounded-xl p-2">
            <TabsTrigger 
              value="products" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produk/Layanan</span>
              <span className="sm:hidden">Produk</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Penjualan</span>
              <span className="sm:hidden">Sales</span>
            </TabsTrigger>
            <TabsTrigger 
              value="customers" 
              className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Pelanggan</span>
              <span className="sm:hidden">Customer</span>
            </TabsTrigger>
            <TabsTrigger 
              value="inventory" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Warehouse className="h-4 w-4" />
              <span className="hidden sm:inline">Inventaris</span>
              <span className="sm:hidden">Stock</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Laporan</span>
              <span className="sm:hidden">Report</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <div className="mt-6">
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    Manajemen Produk & Layanan
                  </CardTitle>
                  <CardDescription>
                    Kelola produk fisik dan layanan yang ditawarkan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductManagement />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                    Manajemen Penjualan
                  </CardTitle>
                  <CardDescription>
                    Catat transaksi dan kelola riwayat penjualan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesManagement />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Manajemen Pelanggan
                  </CardTitle>
                  <CardDescription>
                    Kelola data pelanggan dan riwayat pembelian
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerManagement />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-orange-600" />
                    Manajemen Inventaris
                  </CardTitle>
                  <CardDescription>
                    Pantau stok dan kelola penyesuaian inventaris
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryManagement />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-red-600" />
                    Laporan & Analisis
                  </CardTitle>
                  <CardDescription>
                    Analisis penjualan, produk terlaris, dan ringkasan bisnis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportsModule />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default App;