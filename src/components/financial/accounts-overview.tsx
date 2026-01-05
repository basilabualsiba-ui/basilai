import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, PiggyBank, CreditCard, TrendingUp, TrendingDown, Eye, DollarSign, Building, Banknote, Building2, Landmark, Car, Home, ShoppingCart, Coffee, Gamepad2, Gift, Plane, Music, BookOpen, Camera, Upload, X, LucideIcon } from "lucide-react";
import { useFinancial } from "@/contexts/FinancialContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AddAccountDialog } from "./add-account-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuickTransferDialog } from "./quick-transfer-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { AddTransactionDialog } from "./add-transaction-dialog";
import { useLongPress } from "@/hooks/use-long-press";
import { supabase } from '@/integrations/supabase/client';

const ACCOUNT_ICONS: { name: string; icon: LucideIcon }[] = [
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
// Transaction View Dialog
const AccountTransactionsDialog = ({
  account,
  open,
  onOpenChange,
}: {
  account: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { getTransactionsByAccount, categories, accounts } = useFinancial();
  const { getCurrencySymbol } = useCurrency();
  const transactions = getTransactionsByAccount(account.id);
  const currencySymbol = getCurrencySymbol(account.currency);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getIconComponent = (iconName: string) => {
    // Check if it's a URL (custom icon)
    if (iconName && iconName.startsWith('http')) {
      return ({ className }: { className?: string }) => (
        <img src={iconName} alt="Account Icon" className={`${className} object-cover`} />
      );
    }
    
    // Find built-in icon
    const iconData = ACCOUNT_ICONS.find(icon => icon.name === iconName);
    return iconData ? iconData.icon : Wallet;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account.name} Transactions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-semibold text-lg">Current Balance</h4>
            <p className="text-2xl font-bold text-foreground">
              {currencySymbol}{account.amount.toLocaleString()}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Transaction History</h4>
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                transactions.map(transaction => {
                  const account = accounts.find(a => a.id === transaction.accountId);
                  const IconComponent = getIconComponent(account?.icon || 'Wallet');
                  
                  return (
                    <div key={transaction.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        {/* Account Icon */}
                        {account?.icon && account.icon.startsWith('http') ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
                            <IconComponent className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={`p-1.5 rounded-full ${
                            account?.type === 'cash' ? 'bg-green-100 text-green-600' : 
                            account?.type === 'bank' ? 'bg-blue-100 text-blue-600' : 
                            'bg-purple-100 text-purple-600'
                          }`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                        )}
                        
                        <div>
                          <p className="font-medium">{transaction.description || getCategoryName(transaction.categoryId)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${
                        transaction.type === 'transfer' 
                          ? (transaction.description?.toLowerCase().includes('transfer from') ? 'text-green-600' : 'text-red-500')
                          : (transaction.type === 'income' ? 'text-green-600' : 'text-red-500')
                      }`}>
                         {transaction.type === 'transfer' 
                           ? (transaction.description?.toLowerCase().includes('transfer from') ? '+' : '-') 
                           : (transaction.type === 'income' ? '+' : '-')
                         }{currencySymbol}{Math.abs(transaction.amount).toLocaleString()}
                     </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Account Edit/Delete Dialog
const AccountEditDialog = ({
  account,
  open,
  onOpenChange,
}: {
  account: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { updateAccount, deleteAccount } = useFinancial();
  const { toast } = useToast();
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: account?.name || '',
    amount: account?.amount?.toString() || '',
    currency: account?.currency || 'ILS',
    icon: account?.icon || 'Wallet'
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        amount: account.amount.toString(),
        currency: account.currency,
        icon: account.icon || 'Wallet'
      });
    }
  }, [account]);

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

  const handleUpdate = async () => {
    const newAmount = parseFloat(formData.amount);
    if (isNaN(newAmount)) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    await updateAccount(account.id, {
      name: formData.name,
      amount: newAmount,
      currency: formData.currency as any,
      icon: formData.icon
    });
    
    toast({ title: "Success", description: "Account updated successfully" });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${account.name}"? This action cannot be undone.`)) {
      await deleteAccount(account.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {account?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Account Name</Label>
            <Input 
              id="edit-name"
              value={formData.name} 
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
            />
          </div>
          
          <div>
            <Label htmlFor="edit-amount">Current Balance</Label>
            <Input 
              id="edit-amount"
              type="number" 
              value={formData.amount} 
              onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} 
            />
          </div>
          
          <div>
            <Label htmlFor="edit-currency">Currency</Label>
            <Select 
              value={formData.currency}
              onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="ILS">ILS (₪)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="JPY">JPY (¥)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
                <SelectItem value="AUD">AUD (A$)</SelectItem>
                <SelectItem value="CHF">CHF (CHF)</SelectItem>
                <SelectItem value="JOD">JOD (JD)</SelectItem>
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
                  id="edit-icon-upload"
                />
                <Label
                  htmlFor="edit-icon-upload"
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
          
          <div className="flex gap-2">
            <Button onClick={handleUpdate} className="flex-1">
              Update Account
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export const AccountsOverview = () => {
  const {
    accounts
  } = useFinancial();
  const { getRate, getCurrencySymbol } = useCurrency();
  const {
    isPrivacyMode,
    togglePrivacyMode,
    formatPrivateValue
  } = usePrivacy();
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showAccountEdit, setShowAccountEdit] = useState(false);
  const [showAccountTransactions, setShowAccountTransactions] = useState(false);
  const getIconComponent = (iconName: string) => {
    // Check if it's a URL (custom icon)
    if (iconName && iconName.startsWith('http')) {
      return ({ className }: { className?: string }) => (
        <img src={iconName} alt="Account Icon" className={`${className} object-cover`} />
      );
    }
    
    // Find built-in icon
    const iconData = ACCOUNT_ICONS.find(icon => icon.name === iconName);
    return iconData ? iconData.icon : Wallet;
  };
  // Calculate total balance in ILS (convert all currencies to ILS)
  const totalBalance = accounts.reduce((sum, account) => {
    const conversionRate = getRate(account.currency, 'ILS');
    return sum + (account.amount * conversionRate);
  }, 0);
  return <div className="space-y-6">
      {/* Net Worth Card - Modern Design */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-2xl shadow-emerald-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-semibold text-white/90">Net Worth</CardTitle>
          </div>
          <button 
            onClick={togglePrivacyMode} 
            className={`p-2.5 rounded-xl transition-all duration-300 ${isPrivacyMode ? 'bg-white/25 shadow-inner' : 'bg-white/15'} hover:bg-white/30 active:scale-95`}
          >
            <Eye className={`h-4 w-4 ${isPrivacyMode ? 'text-white' : 'text-white/80'}`} />
          </button>
        </CardHeader>
        <CardContent className="relative z-10 pt-2 pb-6">
          <div className="text-4xl font-bold tracking-tight mb-2">₪{formatPrivateValue(totalBalance.toLocaleString())}</div>
          <p className="text-sm text-white/70 font-medium">Total across all accounts</p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <QuickTransferDialog />
        <AddAccountDialog />
      </div>

      {/* Accounts Sections */}
      <div className="space-y-8">
        {/* Cash Accounts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Banknote className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Cash</h3>
            </div>
            <span className="text-base font-bold text-green-600">
              ₪{formatPrivateValue(
                accounts
                  .filter(account => account.type === 'cash')
                  .reduce((sum, account) => {
                    const conversionRate = getRate(account.currency, 'ILS');
                    return sum + (account.amount * conversionRate);
                  }, 0)
                  .toLocaleString()
              )}
            </span>
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            {accounts
              .filter(account => account.type === 'cash')
              .map(account => {
                const IconComponent = getIconComponent(account.icon);
                const currencySymbol = getCurrencySymbol(account.currency);
                
                const longPressHandlers = useLongPress({
                  onLongPress: () => {
                    setSelectedAccount(account);
                    setShowAccountEdit(true);
                  },
                  onClick: () => {
                    setSelectedAccount(account);
                    setShowAccountTransactions(true);
                  },
                  threshold: 500
                });
                
                return (
                  <Card 
                    key={account.id} 
                    className="group relative overflow-hidden border border-border/40 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm"
                    {...longPressHandlers}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 text-center relative z-10">
                      {account.icon && account.icon.startsWith('http') ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-auto mb-3 ring-2 ring-border/50 group-hover:ring-green-500/30 transition-all">
                          <IconComponent className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-green-500/15 to-emerald-500/10 mb-3 group-hover:from-green-500/25 group-hover:to-emerald-500/15 transition-all shadow-sm">
                          <IconComponent className="h-6 w-6 text-green-600" />
                        </div>
                      )}
                      <h4 className="font-semibold text-foreground mb-0.5 text-sm">{account.name}</h4>
                      <p className="text-lg font-bold text-foreground">
                        {currencySymbol}{formatPrivateValue(account.amount.toLocaleString())}
                      </p>
                      {account.currency !== 'ILS' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ≈ ₪{formatPrivateValue((account.amount * getRate(account.currency, 'ILS')).toLocaleString())}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Bank</h3>
            </div>
            <span className="text-base font-bold text-blue-600">
              ₪{formatPrivateValue(
                accounts
                  .filter(account => account.type === 'bank')
                  .reduce((sum, account) => {
                    const conversionRate = getRate(account.currency, 'ILS');
                    return sum + (account.amount * conversionRate);
                  }, 0)
                  .toLocaleString()
              )}
            </span>
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            {accounts
              .filter(account => account.type === 'bank')
              .map(account => {
                const IconComponent = getIconComponent(account.icon);
                const currencySymbol = getCurrencySymbol(account.currency);
                
                const longPressHandlers = useLongPress({
                  onLongPress: () => {
                    setSelectedAccount(account);
                    setShowAccountEdit(true);
                  },
                  onClick: () => {
                    setSelectedAccount(account);
                    setShowAccountTransactions(true);
                  },
                  threshold: 500
                });
                
                return (
                  <Card 
                    key={account.id} 
                    className="group relative overflow-hidden border border-border/40 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm"
                    {...longPressHandlers}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 text-center relative z-10">
                      {account.icon && account.icon.startsWith('http') ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-auto mb-3 ring-2 ring-border/50 group-hover:ring-blue-500/30 transition-all">
                          <IconComponent className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/10 mb-3 group-hover:from-blue-500/25 group-hover:to-cyan-500/15 transition-all shadow-sm">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                      )}
                      <h4 className="font-semibold text-foreground mb-0.5 text-sm">{account.name}</h4>
                      <p className="text-lg font-bold text-foreground">
                        {currencySymbol}{formatPrivateValue(account.amount.toLocaleString())}
                      </p>
                      {account.currency !== 'ILS' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ≈ ₪{formatPrivateValue((account.amount * getRate(account.currency, 'ILS')).toLocaleString())}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>

        {/* Credit Accounts */}
        {accounts.filter(account => account.type === 'credit').length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Credit</h3>
              </div>
              <span className="text-base font-bold text-purple-600">
                ₪{formatPrivateValue(
                  accounts
                    .filter(account => account.type === 'credit')
                    .reduce((sum, account) => {
                      const conversionRate = getRate(account.currency, 'ILS');
                      return sum + (account.amount * conversionRate);
                    }, 0)
                    .toLocaleString()
                )}
              </span>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {accounts
                .filter(account => account.type === 'credit')
                .map(account => {
                  const IconComponent = getIconComponent(account.icon);
                  const currencySymbol = getCurrencySymbol(account.currency);
                  
                  const longPressHandlers = useLongPress({
                    onLongPress: () => {
                      setSelectedAccount(account);
                      setShowAccountEdit(true);
                    },
                    onClick: () => {
                      setSelectedAccount(account);
                      setShowAccountTransactions(true);
                    },
                    threshold: 500
                  });
                  
                  return (
                    <Card 
                      key={account.id} 
                      className="group relative overflow-hidden border border-border/40 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm"
                      {...longPressHandlers}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardContent className="p-4 text-center relative z-10">
                        {account.icon && account.icon.startsWith('http') ? (
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-auto mb-3 ring-2 ring-border/50 group-hover:ring-purple-500/30 transition-all">
                            <IconComponent className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/15 to-violet-500/10 mb-3 group-hover:from-purple-500/25 group-hover:to-violet-500/15 transition-all shadow-sm">
                            <IconComponent className="h-6 w-6 text-purple-600" />
                          </div>
                        )}
                        <h4 className="font-semibold text-foreground mb-0.5 text-sm">{account.name}</h4>
                        <p className="text-lg font-bold text-foreground">
                          {currencySymbol}{formatPrivateValue(account.amount.toLocaleString())}
                        </p>
                        {account.currency !== 'ILS' && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ≈ ₪{formatPrivateValue((account.amount * getRate(account.currency, 'ILS')).toLocaleString())}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}
      </div>
      
      {/* Account Edit Dialog */}
      {selectedAccount && (
        <AccountEditDialog
          account={selectedAccount}
          open={showAccountEdit}
          onOpenChange={setShowAccountEdit}
        />
      )}
      
      {/* Account Transactions Dialog */}
      {selectedAccount && (
        <AccountTransactionsDialog
          account={selectedAccount}
          open={showAccountTransactions}
          onOpenChange={setShowAccountTransactions}
        />
      )}
    </div>;
};