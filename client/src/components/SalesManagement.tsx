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
import { 
  Plus, 
  ShoppingCart, 
  Receipt, 
  Eye, 
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  MoreHorizontal,
  Calendar
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Sale, CreateSaleInput, Product, Customer, PaymentMethod } from '../../../server/src/schema';

export default function SalesManagement() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  
  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'cancelled'>('paid');
  const [notes, setNotes] = useState('');
  const [saleItems, setSaleItems] = useState<Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>>([]);

  const loadData = useCallback(async () => {
    try {
      const [salesResult, productsResult, customersResult] = await Promise.all([
        trpc.getSales.query(),
        trpc.getProducts.query(),
        trpc.getCustomers.query()
      ]);
      setSales(salesResult);
      setProducts(productsResult);
      setCustomers(customersResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setSelectedCustomerId(null);
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setNotes('');
    setSaleItems([]);
  };

  const addSaleItem = () => {
    setSaleItems((prev) => [...prev, {
      product_id: 0,
      quantity: 1,
      unit_price: 0,
      subtotal: 0
    }]);
  };

  const updateSaleItem = (index: number, field: string, value: number | string) => {
    setSaleItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      
      if (field === 'product_id') {
        const product = products.find((p: Product) => p.id === Number(value));
        item.product_id = Number(value);
        item.unit_price = product?.price || 0;
      } else {
        (item as any)[field] = field === 'quantity' ? Number(value) : value;
      }
      
      // Recalculate subtotal
      item.subtotal = item.quantity * item.unit_price;
      updated[index] = item;
      
      return updated;
    });
  };

  const removeSaleItem = (index: number) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleItems.length === 0) return;

    setIsLoading(true);
    try {
      const saleData: CreateSaleInput = {
        customer_id: selectedCustomerId,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        transaction_date: new Date(),
        notes: notes || null,
        items: saleItems.filter(item => item.product_id > 0)
      };

      const response = await trpc.createSale.mutate(saleData);
      setSales((prev: Sale[]) => [response, ...prev]);
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create sale:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'credit_card': return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer': return <Building2 className="h-4 w-4" />;
      case 'e_wallet': return <Smartphone className="h-4 w-4" />;
      default: return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'credit_card': return 'Kartu Kredit';
      case 'bank_transfer': return 'Transfer Bank';
      case 'e_wallet': return 'E-Wallet';
      case 'other': return 'Lainnya';
    }
  };

  const getStatusBadge = (status: 'pending' | 'paid' | 'cancelled') => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Lunas</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Dibatalkan</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Riwayat Penjualan</h3>
          <p className="text-sm text-gray-600">
            Total: {sales.length} transaksi
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Transaksi Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Transaksi Penjualan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSale} className="space-y-6">
              {/* Customer Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Pelanggan</Label>
                  <Select
                    value={selectedCustomerId?.toString() || 'walk-in'}
                    onValueChange={(value) => 
                      setSelectedCustomerId(value === 'walk-in' ? null : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pelanggan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">Pelanggan Umum (Walk-in)</SelectItem>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_method">Metode Pembayaran</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="credit_card">Kartu Kredit</SelectItem>
                      <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                      <SelectItem value="e_wallet">E-Wallet</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sale Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Item Penjualan</Label>
                  <Button type="button" onClick={addSaleItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Item
                  </Button>
                </div>

                {saleItems.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-6">
                      <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Belum ada item. Klik "Tambah Item" untuk mulai.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {saleItems.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-4">
                              <Label>Produk</Label>
                              <Select
                                value={item.product_id.toString()}
                                onValueChange={(value) => updateSaleItem(index, 'product_id', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih produk" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product: Product) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.name} - Rp {product.price.toLocaleString('id-ID')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="col-span-2">
                              <Label>Jumlah</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateSaleItem(index, 'quantity', e.target.value)
                                }
                              />
                            </div>

                            <div className="col-span-2">
                              <Label>Harga Satuan</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateSaleItem(index, 'unit_price', e.target.value)
                                }
                              />
                            </div>

                            <div className="col-span-3">
                              <Label>Subtotal</Label>
                              <Input
                                value={`Rp ${item.subtotal.toLocaleString('id-ID')}`}
                                readOnly
                                className="bg-gray-50"
                              />
                            </div>

                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeSaleItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Total */}
                    <Card className="bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span>Total Penjualan:</span>
                          <span className="text-green-700">
                            Rp {calculateTotal().toLocaleString('id-ID')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk transaksi ini"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || saleItems.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sales List */}
      {sales.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Belum ada transaksi penjualan
            </h3>
            <p className="text-gray-500 mb-4">
              Mulai dengan membuat transaksi penjualan pertama Anda
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: Sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">#{sale.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {sale.transaction_date.toLocaleDateString('id-ID')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.customer_id ? (
                        customers.find((c: Customer) => c.id === sale.customer_id)?.name || 'Unknown'
                      ) : (
                        <span className="text-gray-500 italic">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      Rp {sale.total_amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(sale.payment_method)}
                        {getPaymentMethodLabel(sale.payment_method)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(sale.payment_status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingSale(sale)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sale Detail Dialog */}
      <Dialog open={viewingSale !== null} onOpenChange={(open) => !open && setViewingSale(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi #{viewingSale?.id}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Detail transaksi akan segera tersedia</p>
              <p className="text-sm">Fitur ini akan menampilkan detail item dan informasi lengkap transaksi</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}