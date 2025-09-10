import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancial } from '@/contexts/FinancialContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Plus, Wallet, PiggyBank, CreditCard, Banknote, Building2, Landmark, Car, Home, ShoppingCart, Coffee, Gamepad2, Gift, Plane, Music, BookOpen, Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ACCOUNT_ICONS = [
  { name: 'Wallet', icon: Wallet },
  { name: 'PiggyBank', icon: PiggyBank },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Banknote', icon: Banknote },
  { name: 'Building2', icon: Building2 },
  { name: 'Landmark', icon: Landmark },
  { name: 'Car', icon: Car },
  { name: 'Home', icon: Home },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'Coffee', icon: Coffee },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'Gift', icon: Gift },
  { name: 'Plane', icon: Plane },
  { name: 'Music', icon: Music },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Camera', icon: Camera }
];

interface CustomIcon {
  id: string;
  name: string;
  image_url: string;
}

export const AddAccountDialog = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { addAccount } = useFinancial();
  const { getCurrencySymbol } = useCurrency();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    icon: 'Wallet',
    type: 'cash' as 'cash' | 'bank' | 'credit',
    currency: 'ILS' as 'ILS' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'JOD' | 'TL'
  });

  useEffect(() => {
    if (open) {
      loadCustomIcons();
    }
  }, [open]);

  const loadCustomIcons = async () => {
    try {
      const { data, error } = await supabase
        .from('icons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomIcons(data || []);
    } catch (error) {
      console.error('Error loading custom icons:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${Date.now()}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('account-icons')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage
        .from('account-icons')
        .getPublicUrl(filePath);

      // Save icon info to database
      const { error: dbError } = await supabase
        .from('icons')
        .insert({
          name: file.name.split('.')[0],
          image_url: data.publicUrl
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Custom icon uploaded successfully"
      });

      // Reload custom icons
      await loadCustomIcons();
      
      // Select the new custom icon
      setFormData(prev => ({ ...prev, icon: data.publicUrl }));

    } catch (error: any) {
      console.error('Error uploading icon:', error);
      toast({
        title: "Error",
        description: "Failed to upload icon. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    addAccount({
      name: formData.name,
      amount: parseFloat(formData.amount),
      icon: formData.icon,
      type: formData.type,
      currency: formData.currency
    });

    toast({
      title: "Success",
      description: "Account added successfully"
    });

    setOpen(false);
    setFormData({
      name: '',
      amount: '',
      icon: 'Wallet',
      type: 'cash',
      currency: 'ILS' as 'ILS' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'JOD' | 'TL'
    });
  };

  const deleteCustomIcon = async (iconId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(-2).join('/'); // Get last two parts (folder/filename)

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('account-icons')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('icons')
        .delete()
        .eq('id', iconId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Custom icon deleted successfully"
      });

      // Reload custom icons
      await loadCustomIcons();

      // If the deleted icon was selected, reset to default
      if (formData.icon === imageUrl) {
        setFormData(prev => ({ ...prev, icon: 'Wallet' }));
      }

    } catch (error: any) {
      console.error('Error deleting icon:', error);
      toast({
        title: "Error",
        description: "Failed to delete icon. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="icon" className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., My Wallet"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Initial Amount</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Account Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'cash' | 'bank' | 'credit') => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Account</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select 
              value={formData.currency}
              onValueChange={(value: 'ILS' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'JOD' | 'TL') => setFormData(prev => ({ ...prev, currency: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { code: 'ILS', name: 'Israeli Shekel' },
                  { code: 'USD', name: 'US Dollar' },
                  { code: 'EUR', name: 'Euro' },
                  { code: 'GBP', name: 'British Pound' },
                  { code: 'JPY', name: 'Japanese Yen' },
                  { code: 'CAD', name: 'Canadian Dollar' },
                  { code: 'AUD', name: 'Australian Dollar' },
                  { code: 'CHF', name: 'Swiss Franc' },
                  { code: 'JOD', name: 'Jordanian Dinar' },
                  { code: 'TL', name: 'Turkish Lira' }
                ].map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} ({getCurrencySymbol(currency.code)}) - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Icon</Label>
            
            {/* Built-in Icons */}
            <div className="mt-2">
              <h4 className="text-sm font-medium mb-2">Built-in Icons</h4>
              <div className="grid grid-cols-4 gap-2">
                {ACCOUNT_ICONS.map(({ name, icon: Icon }) => (
                  <Button
                    key={name}
                    type="button"
                    variant={formData.icon === name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, icon: name }))}
                    className="h-12 flex flex-col gap-1"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Upload Custom Icon */}
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Upload Custom Icon</h4>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="icon-upload"
                />
                <Label
                  htmlFor="icon-upload"
                  className="flex-1 cursor-pointer"
                >
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    className="w-full"
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Image"}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>

            {/* Custom Icons */}
            {customIcons.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Your Custom Icons</h4>
                <div className="grid grid-cols-4 gap-2">
                  {customIcons.map((customIcon) => (
                    <div key={customIcon.id} className="relative">
                      <Button
                        type="button"
                        variant={formData.icon === customIcon.image_url ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, icon: customIcon.image_url }))}
                        className="h-12 w-full p-1"
                      >
                        <img 
                          src={customIcon.image_url} 
                          alt={customIcon.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                        onClick={() => deleteCustomIcon(customIcon.id, customIcon.image_url)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">
            Add Account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};