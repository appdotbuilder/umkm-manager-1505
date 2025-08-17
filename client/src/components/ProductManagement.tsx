import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Wrench, 
  AlertTriangle,
  DollarSign,
  Hash
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form state for create/update
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    description: null,
    price: 0,
    stock_quantity: null,
    is_service: false,
    low_stock_threshold: null
  });

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: null,
      price: 0,
      stock_quantity: null,
      is_service: false,
      low_stock_threshold: null
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createProduct.mutate(formData);
      setProducts((prev: Product[]) => [...prev, response]);
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateProductInput = {
        id: editingProduct.id,
        ...formData
      };
      const response = await trpc.updateProduct.mutate(updateData);
      setProducts((prev: Product[]) => 
        prev.map((p: Product) => p.id === response.id ? response : p)
      );
      resetForm();
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      await trpc.deleteProduct.mutate({ id: productId });
      setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock_quantity: product.stock_quantity,
      is_service: product.is_service,
      low_stock_threshold: product.low_stock_threshold
    });
  };

  const isLowStock = (product: Product) => {
    return !product.is_service && 
           product.stock_quantity !== null && 
           product.low_stock_threshold !== null &&
           product.stock_quantity <= product.low_stock_threshold;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Daftar Produk & Layanan</h3>
          <p className="text-sm text-gray-600">
            Total: {products.length} item ({products.filter(p => p.is_service).length} layanan, {products.filter(p => !p.is_service).length} produk)
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk/Layanan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Produk/Layanan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Produk/Layanan</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Masukkan nama produk atau layanan"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateProductInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  placeholder="Deskripsi produk/layanan (opsional)"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="price">Harga (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ 
                      ...prev, 
                      price: parseFloat(e.target.value) || 0 
                    }))
                  }
                  placeholder="0"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_service"
                  checked={formData.is_service}
                  onCheckedChange={(checked: boolean) =>
                    setFormData((prev: CreateProductInput) => ({ 
                      ...prev, 
                      is_service: checked,
                      // Reset stock fields when switching to service
                      stock_quantity: checked ? null : prev.stock_quantity,
                      low_stock_threshold: checked ? null : prev.low_stock_threshold
                    }))
                  }
                />
                <Label htmlFor="is_service">Ini adalah layanan (bukan produk fisik)</Label>
              </div>

              {!formData.is_service && (
                <>
                  <div>
                    <Label htmlFor="stock_quantity">Stok Awal</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ 
                          ...prev, 
                          stock_quantity: parseInt(e.target.value) || null
                        }))
                      }
                      placeholder="Jumlah stok awal"
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="low_stock_threshold">Batas Stok Minimum</Label>
                    <Input
                      id="low_stock_threshold"
                      type="number"
                      value={formData.low_stock_threshold || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({ 
                          ...prev, 
                          low_stock_threshold: parseInt(e.target.value) || null
                        }))
                      }
                      placeholder="Peringatan ketika stok di bawah angka ini"
                      min="0"
                    />
                  </div>
                </>
              )}

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
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Belum ada produk atau layanan
            </h3>
            <p className="text-gray-500 mb-4">
              Mulai dengan menambahkan produk atau layanan pertama Anda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product: Product) => (
            <Card key={product.id} className="relative">
              {isLowStock(product) && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Stok Rendah
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {product.is_service ? (
                        <Wrench className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Package className="h-4 w-4 text-blue-600" />
                      )}
                      {product.name}
                    </CardTitle>
                    <Badge variant={product.is_service ? "secondary" : "default"} className="mt-1">
                      {product.is_service ? "Layanan" : "Produk"}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Produk/Layanan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus "{product.name}"? 
                            Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(product.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {product.description && (
                  <p className="text-sm text-gray-600">{product.description}</p>
                )}
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-600">
                    Rp {product.price.toLocaleString('id-ID')}
                  </span>
                </div>
                
                {!product.is_service && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <span>Stok:</span>
                      </div>
                      <span className={`font-medium ${isLowStock(product) ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.stock_quantity ?? 'N/A'}
                      </span>
                    </div>
                    {product.low_stock_threshold !== null && (
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Batas minimum:</span>
                        <span>{product.low_stock_threshold}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-gray-400 pt-2 border-t">
                  Dibuat: {product.created_at.toLocaleDateString('id-ID')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingProduct !== null} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Produk/Layanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nama Produk/Layanan</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Masukkan nama produk atau layanan"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateProductInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                placeholder="Deskripsi produk/layanan (opsional)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-price">Harga (Rp)</Label>
              <Input
                id="edit-price"
                type="number"
                value={formData.price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateProductInput) => ({ 
                    ...prev, 
                    price: parseFloat(e.target.value) || 0 
                  }))
                }
                placeholder="0"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_service"
                checked={formData.is_service}
                onCheckedChange={(checked: boolean) =>
                  setFormData((prev: CreateProductInput) => ({ 
                    ...prev, 
                    is_service: checked,
                    stock_quantity: checked ? null : prev.stock_quantity,
                    low_stock_threshold: checked ? null : prev.low_stock_threshold
                  }))
                }
              />
              <Label htmlFor="edit-is_service">Ini adalah layanan (bukan produk fisik)</Label>
            </div>

            {!formData.is_service && (
              <>
                <div>
                  <Label htmlFor="edit-stock_quantity">Stok Saat Ini</Label>
                  <Input
                    id="edit-stock_quantity"
                    type="number"
                    value={formData.stock_quantity || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ 
                        ...prev, 
                        stock_quantity: parseInt(e.target.value) || null
                      }))
                    }
                    placeholder="Jumlah stok saat ini"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-low_stock_threshold">Batas Stok Minimum</Label>
                  <Input
                    id="edit-low_stock_threshold"
                    type="number"
                    value={formData.low_stock_threshold || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ 
                        ...prev, 
                        low_stock_threshold: parseInt(e.target.value) || null
                      }))
                    }
                    placeholder="Peringatan ketika stok di bawah angka ini"
                    min="0"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setEditingProduct(null);
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}