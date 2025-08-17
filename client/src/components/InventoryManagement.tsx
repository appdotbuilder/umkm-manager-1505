import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Warehouse, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Edit3,
  Package,
  History,
  Calendar
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Product, 
  StockAdjustment, 
  CreateStockAdjustmentInput,
  LowStockReport 
} from '../../../server/src/schema';

export default function InventoryManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Form state for stock adjustment
  const [adjustmentForm, setAdjustmentForm] = useState<CreateStockAdjustmentInput>({
    product_id: 0,
    adjustment_type: 'increase',
    quantity_change: 0,
    reason: '',
    adjusted_by: 'Admin', // In real app, this would come from user session
    adjustment_date: new Date()
  });

  const loadData = useCallback(async () => {
    try {
      const [productsResult, adjustmentsResult, lowStockResult] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getStockAdjustments.query(),
        trpc.getLowStockProducts.query()
      ]);
      
      // Filter only physical products for inventory
      const physicalProducts = productsResult.filter((p: Product) => !p.is_service);
      setProducts(physicalProducts);
      setStockAdjustments(adjustmentsResult);
      setLowStockProducts(lowStockResult);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setAdjustmentForm({
      product_id: 0,
      adjustment_type: 'increase',
      quantity_change: 0,
      reason: '',
      adjusted_by: 'Admin',
      adjustment_date: new Date()
    });
    setSelectedProduct(null);
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    try {
      const adjustmentData = {
        ...adjustmentForm,
        product_id: selectedProduct.id
      };

      await trpc.createStockAdjustment.mutate(adjustmentData);
      
      // Reload data to get updated stock levels
      await loadData();
      
      resetForm();
      setIsAdjustDialogOpen(false);
    } catch (error) {
      console.error('Failed to create stock adjustment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAdjustmentDialog = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentForm((prev) => ({
      ...prev,
      product_id: product.id
    }));
    setIsAdjustDialogOpen(true);
  };

  const getAdjustmentIcon = (type: 'increase' | 'decrease' | 'correction') => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'correction':
        return <Edit3 className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAdjustmentLabel = (type: 'increase' | 'decrease' | 'correction') => {
    switch (type) {
      case 'increase': return 'Tambah Stok';
      case 'decrease': return 'Kurangi Stok';
      case 'correction': return 'Koreksi Stok';
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === null) return null;
    
    const isLowStock = lowStockProducts.some((low) => low.product_id === product.id);
    if (isLowStock) {
      return <Badge variant="destructive">Stok Rendah</Badge>;
    }
    
    if (product.stock_quantity === 0) {
      return <Badge variant="secondary">Habis</Badge>;
    }
    
    return <Badge variant="default">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Peringatan Stok Rendah!</strong> {lowStockProducts.length} produk memiliki stok di bawah batas minimum.
            Segera lakukan pengadaan atau penyesuaian stok.
          </AlertDescription>
        </Alert>
      )}

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Manajemen Inventaris</h3>
          <p className="text-sm text-gray-600">
            {products.length} produk fisik • {stockAdjustments.length} penyesuaian stok
          </p>
        </div>

        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Penyesuaian Stok
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Penyesuaian Stok</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <Label>Pilih Produk</Label>
                <Select
                  value={selectedProduct?.id.toString() || ''}
                  onValueChange={(value) => {
                    const product = products.find((p: Product) => p.id === Number(value));
                    setSelectedProduct(product || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk untuk disesuaikan stoknya" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product: Product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} (Stok saat ini: {product.stock_quantity ?? 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <p><strong>Produk:</strong> {selectedProduct.name}</p>
                      <p><strong>Stok Saat Ini:</strong> {selectedProduct.stock_quantity ?? 'N/A'}</p>
                      {selectedProduct.low_stock_threshold && (
                        <p><strong>Batas Minimum:</strong> {selectedProduct.low_stock_threshold}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Jenis Penyesuaian</Label>
                    <Select
                      value={adjustmentForm.adjustment_type}
                      onValueChange={(value) =>
                        setAdjustmentForm((prev) => ({
                          ...prev,
                          adjustment_type: value as 'increase' | 'decrease' | 'correction'
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="increase">Tambah Stok (Pembelian/Produksi)</SelectItem>
                        <SelectItem value="decrease">Kurangi Stok (Kerusakan/Kehilangan)</SelectItem>
                        <SelectItem value="correction">Koreksi Stok (Opname)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>
                      {adjustmentForm.adjustment_type === 'correction' 
                        ? 'Jumlah Stok Baru' 
                        : 'Jumlah Perubahan'
                      }
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={adjustmentForm.quantity_change}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAdjustmentForm((prev) => ({
                          ...prev,
                          quantity_change: Number(e.target.value) || 0
                        }))
                      }
                      placeholder={adjustmentForm.adjustment_type === 'correction' 
                        ? 'Stok yang benar'
                        : 'Jumlah yang ditambah/dikurangi'
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label>Alasan Penyesuaian</Label>
                    <Textarea
                      value={adjustmentForm.reason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setAdjustmentForm((prev) => ({
                          ...prev,
                          reason: e.target.value
                        }))
                      }
                      placeholder="Jelaskan alasan penyesuaian stok"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label>Disesuaikan Oleh</Label>
                    <Input
                      value={adjustmentForm.adjusted_by}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAdjustmentForm((prev) => ({
                          ...prev,
                          adjusted_by: e.target.value
                        }))
                      }
                      placeholder="Nama petugas"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        resetForm();
                        setIsAdjustDialogOpen(false);
                      }}
                    >
                      Batal
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Produk</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stok Rendah</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stok Habis</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter((p: Product) => p.stock_quantity === 0).length}
                </p>
              </div>
              <Warehouse className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Penyesuaian Hari Ini</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stockAdjustments.filter((adj: StockAdjustment) => 
                    new Date(adj.adjustment_date).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <History className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Stock Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Level Stok Saat Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Warehouse className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Belum ada produk fisik untuk dikelola stoknya</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Stok Saat Ini</TableHead>
                  <TableHead>Batas Minimum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: Product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">ID: {product.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {product.stock_quantity ?? 'N/A'}
                    </TableCell>
                    <TableCell>
                      {product.low_stock_threshold ?? 'Tidak ditetapkan'}
                    </TableCell>
                    <TableCell>
                      {getStockStatus(product)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustmentDialog(product)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Sesuaikan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Stock Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penyesuaian Stok</CardTitle>
        </CardHeader>
        <CardContent>
          {stockAdjustments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Belum ada riwayat penyesuaian stok</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Perubahan</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockAdjustments.slice(0, 10).map((adjustment: StockAdjustment) => {
                  const product = products.find((p: Product) => p.id === adjustment.product_id);
                  return (
                    <TableRow key={adjustment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {adjustment.adjustment_date.toLocaleDateString('id-ID')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product?.name || `ID: ${adjustment.product_id}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAdjustmentIcon(adjustment.adjustment_type)}
                          {getAdjustmentLabel(adjustment.adjustment_type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {adjustment.adjustment_type === 'increase' && '+'}
                        {adjustment.adjustment_type === 'decrease' && '-'}
                        {adjustment.quantity_change}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={adjustment.reason}>
                        {adjustment.reason}
                      </TableCell>
                      <TableCell>{adjustment.adjusted_by}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}