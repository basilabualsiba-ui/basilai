import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFinancial } from '@/contexts/FinancialContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { EditSubCategoryDialog } from './edit-subcategory-dialog';
import { SubcategoryButton } from './subcategory-button';
import { Plus, X, DollarSign, Wallet, PiggyBank, CreditCard, Calendar, Delete, Banknote, Building2, Landmark, Car, Home, ShoppingCart, Coffee, Gamepad2, Gift, Plane, Music, BookOpen, Camera, LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
interface AddTransactionDialogProps {
  trigger?: React.ReactNode;
  defaultType?: 'income' | 'expense';
  defaultCategoryId?: string;
  defaultAccountId?: string;
  editTransaction?: {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    categoryId: string;
    subcategoryId: string;
    accountId: string;
    description: string;
    date: Date;
    time?: string;
  };
  onEditComplete?: () => void;
}
export const AddTransactionDialog = ({
  trigger,
  defaultType,
  defaultCategoryId,
  defaultAccountId,
  editTransaction,
  onEditComplete
}: AddTransactionDialogProps) => {
  const {
    accounts,
    categories,
    addTransaction,
    updateTransaction,
    addSubCategory
  } = useFinancial();
  const { getRate, getCurrencySymbol } = useCurrency();
  const {
    toast
  } = useToast();
  const [open, setOpen] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [displayExpression, setDisplayExpression] = useState(editTransaction?.amount.toString() || '');
  const [calculatorMemory, setCalculatorMemory] = useState('');
  const [operator, setOperator] = useState('');

  // Get all supported currencies instead of just account currencies
  const availableCurrencies = ['USD', 'EUR', 'JOD', 'ILS', 'TL'];
  
  const currencies = availableCurrencies.map(currency => ({
    code: currency,
    symbol: getCurrencySymbol(currency),
    name: currency === 'USD' ? 'US Dollar' :
          currency === 'EUR' ? 'Euro' :
          currency === 'GBP' ? 'British Pound' :
          currency === 'JPY' ? 'Japanese Yen' :
          currency === 'CAD' ? 'Canadian Dollar' :
          currency === 'AUD' ? 'Australian Dollar' :
          currency === 'CHF' ? 'Swiss Franc' :
          currency === 'JOD' ? 'Jordanian Dinar' :
          currency === 'ILS' ? 'Israeli Shekel' : currency
  }));

  
  // Get default cash account or first account
  const defaultAccount = accounts.find(acc => acc.type === 'cash') || accounts[0];
  
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    editTransaction ? (accounts.find(a => a.id === editTransaction.accountId)?.currency || 'ILS') : 
    (defaultAccountId ? (accounts.find(a => a.id === defaultAccountId)?.currency || 'ILS') : 
    (defaultAccount?.currency || 'ILS'))
  );
  
  const [formData, setFormData] = useState({
    amount: editTransaction?.amount.toString() || '',
    type: editTransaction?.type || defaultType || 'expense' as 'income' | 'expense',
    categoryId: editTransaction?.categoryId || defaultCategoryId || '',
    subcategoryId: editTransaction?.subcategoryId || '',
    accountId: editTransaction?.accountId || defaultAccountId || defaultAccount?.id || '',
    date: editTransaction?.date && editTransaction.date instanceof Date && !isNaN(editTransaction.date.getTime()) 
      ? (() => {
          const transactionDate = new Date(editTransaction.date);
          // If there's a time field, use it to set the time part
          if (editTransaction.time) {
            const [hours, minutes] = editTransaction.time.split(':');
            transactionDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
          }
          const localDate = new Date(transactionDate.getTime() - transactionDate.getTimezoneOffset() * 60000);
          return localDate.toISOString().slice(0, 16);
        })()
      : (() => {
          const now = new Date();
          const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
          return localDate.toISOString().slice(0, 16);
        })(),
    description: editTransaction?.description || ''
  });
  // Auto-open drawer when editing and sync form values
  useEffect(() => {
    if (editTransaction) {
      setOpen(true);
      setFormData({
        amount: editTransaction.amount.toString(),
        type: editTransaction.type,
        categoryId: editTransaction.categoryId || '',
        subcategoryId: editTransaction.subcategoryId || '',
        accountId: editTransaction.accountId || defaultAccount?.id || '',
        date: editTransaction.date && editTransaction.date instanceof Date && !isNaN(editTransaction.date.getTime())
          ? (() => {
              const transactionDate = new Date(editTransaction.date);
              // If there's a time field, use it to set the time part
              if (editTransaction.time) {
                const [hours, minutes] = editTransaction.time.split(':');
                transactionDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
              }
              const localDate = new Date(transactionDate.getTime() - transactionDate.getTimezoneOffset() * 60000);
              return localDate.toISOString().slice(0, 16);
            })()
          : (() => {
              const now = new Date();
              const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
              return localDate.toISOString().slice(0, 16);
            })(),
        description: editTransaction.description || ''
      });
      setDisplayExpression(editTransaction.amount.toString());
    }
  }, [editTransaction, defaultAccount?.id]);
  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const getAccountIcon = (iconName: string) => {
    // Check if it's a URL (custom icon)
    if (iconName && iconName.startsWith('http')) {
      return ({ className }: { className?: string }) => (
        <img src={iconName} alt="Account Icon" className={`${className} object-cover rounded`} />
      );
    }
    
    // Built-in icons mapping
    const iconMap: { [key: string]: LucideIcon } = {
      Wallet,
      PiggyBank,
      CreditCard,
      DollarSign,
      Banknote,
      Building2,
      Landmark,
      Car,
      Home,
      ShoppingCart,
      Coffee,
      Gamepad2,
      Gift,
      Plane,
      Music,
      BookOpen,
      Camera
    };
    
    return iconMap[iconName] || Wallet;
  };
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount;
    const rate = getRate(fromCurrency, toCurrency);
    return amount * rate;
  };
  const handleCalculatorInput = (input: string) => {
    if (['+', '-'].includes(input)) {
      if (displayExpression && !operator) {
        setCalculatorMemory(displayExpression);
        setOperator(input);
        setDisplayExpression('');
      }
    } else if (input === '=') {
      if (calculatorMemory && operator && displayExpression) {
        const num1 = parseFloat(calculatorMemory);
        const num2 = parseFloat(displayExpression);
        let result = 0;
        switch (operator) {
          case '+':
            result = num1 + num2;
            break;
          case '-':
            result = num1 - num2;
            break;
        }
        setDisplayExpression(result.toString());
        setFormData(prev => ({
          ...prev,
          amount: result.toString()
        }));
        setCalculatorMemory('');
        setOperator('');
      }
    } else if (input === 'clear') {
      setDisplayExpression('');
      setCalculatorMemory('');
      setOperator('');
      setFormData(prev => ({
        ...prev,
        amount: ''
      }));
    } else if (input === 'backspace') {
      const newExpression = displayExpression.slice(0, -1);
      setDisplayExpression(newExpression);
      setFormData(prev => ({
        ...prev,
        amount: newExpression
      }));
    } else {
      const newExpression = displayExpression + input;
      setDisplayExpression(newExpression);
      setFormData(prev => ({
        ...prev,
        amount: newExpression
      }));
    }
  };
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.amount || !formData.accountId) {
      toast({
        title: "Error",
        description: "Please fill in amount and select account",
        variant: "destructive"
      });
      return;
    }

    // Convert amount to account's currency if different currency selected
    const selectedAccount = accounts.find(a => a.id === formData.accountId);
    const accountCurrency = selectedAccount?.currency || 'ILS';
    const finalAmount = selectedCurrency !== accountCurrency ? 
      convertCurrency(parseFloat(formData.amount), selectedCurrency, accountCurrency) : 
      parseFloat(formData.amount);

    // Use defaults if not provided - ensure empty strings become null for UUIDs
    const transactionData = {
      amount: finalAmount,
      type: formData.type,
      categoryId: formData.categoryId || defaultCategoryId || null,
      subcategoryId: formData.subcategoryId || null,
      accountId: formData.accountId,
      date: new Date(formData.date),
      time: new Date(formData.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      description: formData.description
    };
    if (editTransaction) {
      updateTransaction(editTransaction.id, transactionData);
      toast({
        title: "Success",
        description: "Transaction updated successfully"
      });
      onEditComplete?.();
    } else {
      addTransaction(transactionData);
      toast({
        title: "Success",
        description: "Transaction added successfully"
      });
    }
    setOpen(false);
    setDisplayExpression('');
    setCalculatorMemory('');
    setOperator('');
    setFormData({
      amount: '',
      type: defaultType || 'expense',
      categoryId: defaultCategoryId || '',
      subcategoryId: '',
      accountId: defaultAccountId || defaultAccount?.id || '',
      date: (() => {
        const now = new Date();
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
      })(),
      description: ''
    });
  };
  const handleAccountSelect = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    setFormData(prev => ({
      ...prev,
      accountId
    }));
    // Update selected currency to match account currency
    if (account?.currency) {
      setSelectedCurrency(account.currency);
    }
    setShowAccountSelector(false);
  };
  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim() || !formData.categoryId) return;
    try {
      await addSubCategory(formData.categoryId, {
        name: newSubcategoryName.trim()
      });
      setNewSubcategoryName('');
      setShowNewSubcategoryInput(false);
    } catch (error) {
      console.error('Error adding subcategory:', error);
    }
  };
  const handleSubcategoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubcategory();
    } else if (e.key === 'Escape') {
      setShowNewSubcategoryInput(false);
      setNewSubcategoryName('');
    }
  };
  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    setShowCurrencySelector(false);
  };
  const handleLongPressStart = () => {
    const timeout = setTimeout(() => {
      setShowContextMenu(true);
    }, 500); // 500ms long press
    setLongPressTimeout(timeout);
  };
  const handleLongPressEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };
  const handleEdit = () => {
    setShowContextMenu(false);
    // Edit functionality - clear current input and allow editing
    setDisplayExpression('');
    setCalculatorMemory('');
    setOperator('');
    setFormData(prev => ({
      ...prev,
      amount: ''
    }));
  };
  const handleDelete = () => {
    setShowContextMenu(false);
    // Delete functionality - clear everything
    setDisplayExpression('');
    setCalculatorMemory('');
    setOperator('');
    setFormData(prev => ({
      ...prev,
      amount: ''
    }));
  };

  // Currency Selector Component
  const CurrencySelector = () => (
    <Drawer open={showCurrencySelector} onOpenChange={setShowCurrencySelector}>
      <DrawerContent className="h-[70vh] bg-background border-t border-border/50 rounded-t-3xl">
        <div className="flex items-center justify-center py-4">
          <span className="text-base font-semibold text-foreground">Select Currency</span>
        </div>
        <DrawerDescription className="sr-only">Select a currency for this transaction</DrawerDescription>
        <div className="p-4 space-y-2">
          {currencies.map(currency => (
            <button 
              key={currency.code} 
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                currency.code === selectedCurrency 
                  ? 'bg-primary/10 ring-1 ring-primary/30' 
                  : 'bg-muted/30 hover:bg-muted/50'
              }`} 
              onClick={() => handleCurrencySelect(currency.code)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{currency.symbol}</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{currency.code}</p>
                  <p className="text-xs text-muted-foreground">{currency.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  1 = {getRate(currency.code, 'ILS').toFixed(2)} ₪
                </span>
                {currency.code === selectedCurrency && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );

  // Note Drawer Component
  const NoteDrawer = () => (
    <Drawer open={showNoteDrawer} onOpenChange={setShowNoteDrawer}>
      <DrawerContent className="h-[50vh] bg-background border-t border-border/50 rounded-t-3xl">
        <div className="flex items-center justify-center py-4">
          <span className="text-base font-semibold text-foreground">Add Note</span>
        </div>
        <DrawerDescription className="sr-only">Add a note to this transaction</DrawerDescription>
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <Textarea 
            value={formData.description} 
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
            placeholder="What was this for?" 
            className="flex-1 resize-none rounded-2xl bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30" 
          />
          <Button 
            onClick={() => setShowNoteDrawer(false)} 
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90"
          >
            Save Note
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );

  // Date Picker Drawer Component
  const DatePickerDrawer = () => (
    <Drawer open={showDatePicker} onOpenChange={setShowDatePicker}>
      <DrawerContent className="h-[55vh] bg-background border-t border-border/50 rounded-t-3xl">
        <div className="flex items-center justify-center py-4">
          <span className="text-base font-semibold text-foreground">Select Date & Time</span>
        </div>
        <DrawerDescription className="sr-only">Select date and time for this transaction</DrawerDescription>
        <div className="p-4 space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                <p className="text-foreground font-medium">
                  {new Date(formData.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short', 
                    year: 'numeric'
                  })} at {new Date(formData.date).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={new Date(formData.date)}
                onSelect={(date) => {
                  if (date) {
                    const currentDate = new Date(formData.date);
                    const newDate = new Date(date);
                    newDate.setHours(currentDate.getHours());
                    newDate.setMinutes(currentDate.getMinutes());
                    const year = newDate.getFullYear();
                    const month = String(newDate.getMonth() + 1).padStart(2, '0');
                    const day = String(newDate.getDate()).padStart(2, '0');
                    const hours = String(newDate.getHours()).padStart(2, '0');
                    const minutes = String(newDate.getMinutes()).padStart(2, '0');
                    const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                    setFormData(prev => ({ ...prev, date: localDateTimeString }));
                  }
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
              <div className="p-3 border-t">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <div className="flex gap-2">
                    <Select
                      value={new Date(formData.date).getHours().toString()}
                      onValueChange={(hour) => {
                        const currentDate = new Date(formData.date);
                        currentDate.setHours(parseInt(hour));
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const day = String(currentDate.getDate()).padStart(2, '0');
                        const hours = String(currentDate.getHours()).padStart(2, '0');
                        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                        const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                        setFormData(prev => ({ ...prev, date: localDateTimeString }));
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="flex items-center">:</span>
                    <Select
                      value={new Date(formData.date).getMinutes().toString()}
                      onValueChange={(minute) => {
                        const currentDate = new Date(formData.date);
                        currentDate.setMinutes(parseInt(minute));
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const day = String(currentDate.getDate()).padStart(2, '0');
                        const hours = String(currentDate.getHours()).padStart(2, '0');
                        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                        const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                        setFormData(prev => ({ ...prev, date: localDateTimeString }));
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            onClick={() => setShowDatePicker(false)} 
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90"
          >
            Done
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );

  // Account Selector Component
  const AccountSelector = () => (
    <Drawer open={showAccountSelector} onOpenChange={setShowAccountSelector}>
      <DrawerContent className="h-[70vh] bg-background border-t border-border/50 rounded-t-3xl">
        <div className="flex items-center justify-center py-4">
          <span className="text-base font-semibold text-foreground">Select Account</span>
        </div>
        <DrawerDescription className="sr-only">Select an account for this transaction</DrawerDescription>
        <div className="p-4 space-y-2">
          {accounts.map(account => {
            const IconComponent = getAccountIcon(account.icon);
            return (
              <button 
                key={account.id} 
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  account.id === formData.accountId 
                    ? 'bg-primary/10 ring-1 ring-primary/30' 
                    : 'bg-muted/30 hover:bg-muted/50'
                }`} 
                onClick={() => handleAccountSelect(account.id)}
              >
                {account.icon && account.icon.startsWith('http') ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <IconComponent className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{account.name}</p>
                  <p className="text-lg font-bold text-primary">
                    {getCurrencySymbol(account.currency)}{account.amount.toLocaleString()}
                  </p>
                </div>
                {account.id === formData.accountId && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
  return <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="h-[90vh] bg-background border-t border-border/50 rounded-t-3xl">
          {/* Minimal Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <button 
              onClick={() => setOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-base font-semibold text-primary">
              {editTransaction ? 'Edit Transaction' : categories.find(c => c.id === formData.categoryId)?.name || 'New Transaction'}
            </span>
            <div className="w-10" />
          </div>
          <DrawerDescription className="sr-only">
            {editTransaction ? 'Edit an existing transaction' : 'Add a new financial transaction'}
          </DrawerDescription>
          
          <div className="flex-1 flex flex-col" onClick={() => setShowContextMenu(false)}>
            {/* Amount Display - Clean and Minimal */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="text-7xl font-extralight tracking-tight text-foreground mb-1">
                <span className="text-4xl opacity-60 mr-1">{currencies.find(c => c.code === selectedCurrency)?.symbol || '₪'}</span>
                {displayExpression || '0'}
              </div>
              {calculatorMemory && operator && (
                <div className="text-sm text-muted-foreground/60 mt-2">
                  {calculatorMemory} {operator} {displayExpression}
                </div>
              )}
            </div>

            {/* Subcategory Bubbles - Horizontal Scroll */}
            {formData.categoryId && (
              <div className="px-4 pb-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {categories.find(c => c.id === formData.categoryId)?.subcategories?.map(subcategory => (
                    <SubcategoryButton 
                      key={subcategory.id} 
                      subcategory={subcategory} 
                      isSelected={formData.subcategoryId === subcategory.id} 
                      onSelect={() => setFormData(prev => ({
                        ...prev,
                        subcategoryId: subcategory.id
                      }))} 
                      onEdit={() => setEditingSubcategory(subcategory)} 
                    />
                  ))}
                  {showNewSubcategoryInput ? (
                    <Input 
                      value={newSubcategoryName} 
                      onChange={e => setNewSubcategoryName(e.target.value)} 
                      onKeyDown={handleSubcategoryKeyPress} 
                      onBlur={() => {
                        if (!newSubcategoryName.trim()) {
                          setShowNewSubcategoryInput(false);
                        }
                      }} 
                      placeholder="New..." 
                      className="h-8 text-xs w-24 rounded-full border-dashed" 
                      autoFocus 
                    />
                  ) : (
                    <button 
                      onClick={() => setShowNewSubcategoryInput(true)} 
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modern Calculator Section */}
            <div className="bg-muted/30 rounded-t-3xl pt-4 pb-6 px-4 space-y-4">
              {/* Quick Actions Row */}
              <div className="grid grid-cols-4 gap-3">
                <button 
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-background/60 hover:bg-background transition-all"
                  onClick={() => {/* Tag functionality */}}
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <span className="text-sm">🏷️</span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Tag</span>
                </button>
                
                <button 
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-background/60 hover:bg-background transition-all"
                  onClick={() => setShowNoteDrawer(true)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-sm">📝</span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Note</span>
                </button>
                
                <button 
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-background/60 hover:bg-background transition-all"
                  onClick={() => setShowAccountSelector(true)}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center overflow-hidden">
                    {selectedAccount?.icon?.startsWith('http') ? (
                      <img src={selectedAccount.icon} alt={selectedAccount.name} className="w-full h-full object-cover" />
                    ) : (
                      (() => {
                        const IconComponent = getAccountIcon(selectedAccount?.icon || 'Wallet');
                        return <IconComponent className="w-4 h-4 text-emerald-500" />;
                      })()
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[60px]">
                    {selectedAccount?.name || 'Account'}
                  </span>
                </button>
                
                <button 
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-background/60 hover:bg-background transition-all"
                  onClick={() => setShowDatePicker(true)}
                >
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                    <span className="text-sm">📅</span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Today</span>
                </button>
              </div>
              
              {/* Number Pad - Modern Grid */}
              <div className="grid grid-cols-4 gap-2">
                {/* Row 1 */}
                {[7, 8, 9].map(key => (
                  <button 
                    key={key} 
                    className="h-14 rounded-2xl bg-background/80 hover:bg-background text-xl font-medium text-foreground transition-all active:scale-95"
                    onClick={() => handleCalculatorInput(key.toString())}
                  >
                    {key}
                  </button>
                ))}
                <button 
                  className="h-14 rounded-2xl bg-background/80 hover:bg-background flex items-center justify-center transition-all active:scale-95"
                  onClick={() => handleCalculatorInput('backspace')}
                >
                  <Delete className="h-5 w-5 text-muted-foreground" />
                </button>
                
                {/* Row 2 */}
                {[4, 5, 6].map(key => (
                  <button 
                    key={key} 
                    className="h-14 rounded-2xl bg-background/80 hover:bg-background text-xl font-medium text-foreground transition-all active:scale-95"
                    onClick={() => handleCalculatorInput(key.toString())}
                  >
                    {key}
                  </button>
                ))}
                <button 
                  className="h-14 rounded-2xl bg-background/80 hover:bg-background text-xl font-medium text-muted-foreground transition-all active:scale-95"
                  onClick={() => handleCalculatorInput('-')}
                >
                  −
                </button>
                
                {/* Row 3 */}
                {[1, 2, 3].map(key => (
                  <button 
                    key={key} 
                    className="h-14 rounded-2xl bg-background/80 hover:bg-background text-xl font-medium text-foreground transition-all active:scale-95"
                    onClick={() => handleCalculatorInput(key.toString())}
                  >
                    {key}
                  </button>
                ))}
                <button 
                  className="h-14 rounded-2xl bg-background/80 hover:bg-background text-xl font-medium text-muted-foreground transition-all active:scale-95"
                  onClick={() => handleCalculatorInput('+')}
                >
                  +
                </button>
                
                {/* Row 4 */}
                <button 
                  className="h-14 rounded-2xl bg-background/80 hover:bg-background text-lg font-semibold text-primary transition-all active:scale-95"
                  onClick={() => setShowCurrencySelector(true)}
                >
                  {currencies.find(c => c.code === selectedCurrency)?.symbol || '₪'}
                </button>
                <button 
                  className="h-14 rounded-2xl bg-background/80 hover:bg-background text-xl font-medium text-foreground transition-all active:scale-95"
                  onClick={() => handleCalculatorInput('0')}
                >
                  0
                </button>
                <button 
                  className="h-14 rounded-2xl bg-background/80 hover:bg-background text-xl font-medium text-foreground transition-all active:scale-95"
                  onClick={() => handleCalculatorInput('.')}
                >
                  .
                </button>
                <button 
                  className={`h-14 rounded-2xl font-semibold text-lg transition-all active:scale-95 ${
                    displayExpression && formData.accountId 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                  onClick={operator ? () => handleCalculatorInput('=') : handleSubmit} 
                  disabled={!displayExpression || !formData.accountId}
                >
                  {operator ? '=' : '✓'}
                </button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <CurrencySelector />
      <AccountSelector />
      <NoteDrawer />
      <DatePickerDrawer />
      
      {/* Edit Subcategory Dialog */}
      {editingSubcategory && <EditSubCategoryDialog subcategory={editingSubcategory} open={!!editingSubcategory} onOpenChange={open => !open && setEditingSubcategory(null)} />}
    </>;
};