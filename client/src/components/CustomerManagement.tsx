import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  History,
  User
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../../server/src/schema';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Customer | null>(null);
  
  // Form state for create/update
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    phone: null,
    email: null,
    address: null
  });

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query();
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: null,
      email: null,
      address: null
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createCustomer.mutate(formData);
      setCustomers((prev: Customer[]) => [...prev, response]);
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateCustomerInput = {
        id: editingCustomer.id,
        ...formData
      };
      const response = await trpc.updateCustomer.mutate(updateData);
      setCustomers((prev: Customer[]) => 
        prev.map((c: Customer) => c.id === response.id ? response : c)
      );
      resetForm();
      setEditingCustomer(null);
    } catch (error) {
      console.error('Failed to update customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address
    });
  };

  const viewCustomerHistory = async (customer: Customer) => {
    setViewingHistory(customer);
    // This will be handled in a future implementation
    // For now, we just open the dialog
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Daftar Pelanggan</h3>
          <p className="text-sm text-gray-600">
            Total: {customers.length} pelanggan terdaftar
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pelanggan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Pelanggan *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nama lengkap pelanggan"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({
                      ...prev,
                      phone: e.target.value || null
                    }))
                  }
                  placeholder="Contoh: 08123456789"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({
                      ...prev,
                      email: e.target.value || null
                    }))
                  }
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({
                      ...prev,
                      address: e.target.value || null
                    }))
                  }
                  placeholder="Alamat lengkap pelanggan"
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customers Grid */}
      {customers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Belum ada pelanggan terdaftar
            </h3>
            <p className="text-gray-500 mb-4">
              Mulai dengan menambahkan data pelanggan pertama Anda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer: Customer) => (
            <Card key={customer.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-600" />
                      {customer.name}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1">
                      ID: {customer.id}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewCustomerHistory(customer)}
                      title="Lihat Riwayat Pembelian"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(customer)}
                      title="Edit Pelanggan"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 line-clamp-2">{customer.address}</span>
                  </div>
                )}
                
                {!customer.phone && !customer.email && !customer.address && (
                  <p className="text-sm text-gray-400 italic">
                    Tidak ada informasi kontak
                  </p>
                )}
                
                <div className="text-xs text-gray-400 pt-2 border-t">
                  Terdaftar: {customer.created_at.toLocaleDateString('id-ID')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingCustomer !== null} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Pelanggan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nama Pelanggan *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nama lengkap pelanggan"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-phone">Nomor Telepon</Label>
              <Input
                id="edit-phone"
                value={formData.phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCustomerInput) => ({
                    ...prev,
                    phone: e.target.value || null
                  }))
                }
                placeholder="Contoh: 08123456789"
              />
            </div>

            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCustomerInput) => ({
                    ...prev,
                    email: e.target.value || null
                  }))
                }
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Alamat</Label>
              <Textarea
                id="edit-address"
                value={formData.address || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateCustomerInput) => ({
                    ...prev,
                    address: e.target.value || null
                  }))
                }
                placeholder="Alamat lengkap pelanggan"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setEditingCustomer(null);
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

      {/* Customer History Dialog */}
      <Dialog open={viewingHistory !== null} onOpenChange={(open) => !open && setViewingHistory(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Riwayat Pembelian - {viewingHistory?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Fitur riwayat pembelian akan segera tersedia</p>
              <p className="text-sm">Data akan diintegrasikan dengan modul penjualan</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}