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
      <DrawerContent className="h-[70vh]">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="text-lg font-semibold">Select Currency</DrawerTitle>
          <DrawerDescription className="sr-only">Select a currency for this transaction</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-3">
          {currencies.map(currency => (
            <Card key={currency.code} className={`cursor-pointer transition-colors ${currency.code === selectedCurrency ? 'ring-2 ring-primary' : ''}`} onClick={() => handleCurrencySelect(currency.code)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{currency.symbol}</span>
                    <div>
                      <h4 className="font-medium text-foreground">{currency.code}</h4>
                      <p className="text-sm text-muted-foreground">{currency.name}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    1 {currency.code} = {getRate(currency.code, 'ILS').toFixed(4)} ₪
                  </p>
                </div>
                {currency.code === selectedCurrency && <div className="w-2 h-2 bg-primary rounded-full" />}
              </CardContent>
            </Card>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );

  // Note Drawer Component
  const NoteDrawer = () => <Drawer open={showNoteDrawer} onOpenChange={setShowNoteDrawer}>
      <DrawerContent className="h-[60vh]">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="text-lg font-semibold">Add Note</DrawerTitle>
          <DrawerDescription className="sr-only">Add a note to this transaction</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <Textarea value={formData.description} onChange={e => setFormData(prev => ({
          ...prev,
          description: e.target.value
        }))} placeholder="Add a note..." className="resize-none" rows={6} />
          <Button onClick={() => setShowNoteDrawer(false)} className="w-full">
            Save Note
          </Button>
        </div>
      </DrawerContent>
    </Drawer>;

  // Date Picker Drawer Component
  const DatePickerDrawer = () => <Drawer open={showDatePicker} onOpenChange={setShowDatePicker}>
      <DrawerContent className="h-[60vh]">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="text-lg font-semibold">Select Date & Time</DrawerTitle>
          <DrawerDescription className="sr-only">Select date and time for this transaction</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="datetime">Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <div className="mt-2 p-3 border rounded-md bg-background cursor-pointer hover:bg-accent/50 transition-colors">
                  <span className="text-foreground">
                    {new Date(formData.date).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric'
                    })} {new Date(formData.date).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
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
                      // Format as local datetime string to avoid timezone issues
                      const year = newDate.getFullYear();
                      const month = String(newDate.getMonth() + 1).padStart(2, '0');
                      const day = String(newDate.getDate()).padStart(2, '0');
                      const hours = String(newDate.getHours()).padStart(2, '0');
                      const minutes = String(newDate.getMinutes()).padStart(2, '0');
                      const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                      setFormData(prev => ({
                        ...prev,
                        date: localDateTimeString
                      }));
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
                <div className="p-3 border-t">
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <div className="flex gap-2">
                      <Select
                        value={new Date(formData.date).getHours().toString()}
                        onValueChange={(hour) => {
                          const currentDate = new Date(formData.date);
                          currentDate.setHours(parseInt(hour));
                          // Format as local datetime string to avoid timezone issues
                          const year = currentDate.getFullYear();
                          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                          const day = String(currentDate.getDate()).padStart(2, '0');
                          const hours = String(currentDate.getHours()).padStart(2, '0');
                          const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                          const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                          setFormData(prev => ({
                            ...prev,
                            date: localDateTimeString
                          }));
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
                          // Format as local datetime string to avoid timezone issues
                          const year = currentDate.getFullYear();
                          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                          const day = String(currentDate.getDate()).padStart(2, '0');
                          const hours = String(currentDate.getHours()).padStart(2, '0');
                          const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                          const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                          setFormData(prev => ({
                            ...prev,
                            date: localDateTimeString
                          }));
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
          </div>
          <Button onClick={() => setShowDatePicker(false)} className="w-full">
            Save Date
          </Button>
        </div>
      </DrawerContent>
    </Drawer>;

  // Account Selector Component
  const AccountSelector = () => <Drawer open={showAccountSelector} onOpenChange={setShowAccountSelector}>
      <DrawerContent className="h-[80vh]">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="text-lg font-semibold">Select Account</DrawerTitle>
          <DrawerDescription className="sr-only">Select an account for this transaction</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-3">
          {accounts.map(account => {
          const IconComponent = getAccountIcon(account.icon);
          return <Card key={account.id} className={`cursor-pointer transition-colors ${account.id === formData.accountId ? 'ring-2 ring-primary' : ''}`} onClick={() => handleAccountSelect(account.id)}>
                <CardContent className="flex items-center gap-3 p-4">
                  {account.icon && account.icon.startsWith('http') ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm">
                      <IconComponent className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`p-3 rounded-full ${account.type === 'cash' ? 'bg-green-100' : account.type === 'bank' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      <IconComponent className={`h-6 w-6 ${account.type === 'cash' ? 'text-green-600' : account.type === 'bank' ? 'text-blue-600' : 'text-purple-600'}`} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{account.name}</h4>
                    <p className="text-lg font-bold text-foreground">{getCurrencySymbol(account.currency)}{account.amount.toLocaleString()}</p>
                  </div>
                  {account.id === formData.accountId && <div className="w-2 h-2 bg-primary rounded-full" />}
                </CardContent>
              </Card>;
        })}
        </div>
      </DrawerContent>
    </Drawer>;
  return <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <X className="h-6 w-6 cursor-pointer text-muted-foreground" onClick={() => setOpen(false)} />
              <DrawerTitle className="text-lg font-semibold">
                {editTransaction ? 'Edit Transaction' : categories.find(c => c.id === formData.categoryId)?.name || 'Add Transaction'}
              </DrawerTitle>
              <div className="w-6" />
            </div>
            <DrawerDescription className="sr-only">
              {editTransaction ? 'Edit an existing transaction' : 'Add a new financial transaction'}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 flex flex-col" onClick={() => setShowContextMenu(false)}>
            {/* Amount Display */}
            <div className="text-center py-4">
              <div className="text-6xl font-light text-foreground mb-2">
                {currencies.find(c => c.code === selectedCurrency)?.symbol || '₪'}{displayExpression || '0'}
              </div>
              {calculatorMemory && operator && <div className="text-sm text-muted-foreground">
                  {calculatorMemory} {operator} {displayExpression}
                </div>}
            </div>

            {/* Subcategory Bubbles */}
            {formData.categoryId && <div className="px-4 mb-4">
                <div className="flex flex-wrap gap-2">
                  {categories.find(c => c.id === formData.categoryId)?.subcategories?.map(subcategory => <SubcategoryButton key={subcategory.id} subcategory={subcategory} isSelected={formData.subcategoryId === subcategory.id} onSelect={() => setFormData(prev => ({
                ...prev,
                subcategoryId: subcategory.id
              }))} onEdit={() => setEditingSubcategory(subcategory)} />)}
                  {showNewSubcategoryInput ? <Input value={newSubcategoryName} onChange={e => setNewSubcategoryName(e.target.value)} onKeyDown={handleSubcategoryKeyPress} onBlur={() => {
                if (!newSubcategoryName.trim()) {
                  setShowNewSubcategoryInput(false);
                }
               }} placeholder="New subcategory" className="h-7 text-xs w-32" autoFocus /> : <button onClick={() => setShowNewSubcategoryInput(true)} className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80 border-2 border-dashed border-muted-foreground/30 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ touchAction: 'manipulation' }}>
                      <Plus className="h-3 w-3" />
                    </button>}
                </div>
              </div>}

            {/* Calculator */}
            <div className="p-4 border-t border-border bg-muted/20 space-y-3 mt-auto">
              {/* Function Buttons - Only show Tag, Note, Cash, Today */}
              <div className="grid grid-cols-4 gap-2">
                <Button variant="ghost" className="h-12 flex flex-col items-center justify-center text-xs" onClick={() => {/* Tag functionality */}}>
                  <span className="text-blue-500">🏷️</span>
                  <span>Tag</span>
                </Button>
                <Button variant="ghost" className="h-12 flex flex-col items-center justify-center text-xs" onClick={() => setShowNoteDrawer(true)}>
                  <span className="text-blue-500">📝</span>
                  <span>Note</span>
                </Button>
                <Button variant="ghost" className="h-12 flex flex-col items-center justify-center text-xs gap-0.5 px-1" onClick={() => setShowAccountSelector(true)}>
                  {selectedAccount ? (
                    <>
                      {selectedAccount.icon?.startsWith('http') ? (
                        <img src={selectedAccount.icon} alt={selectedAccount.name} className="w-4 h-4 object-cover rounded flex-shrink-0" />
                      ) : (
                        (() => {
                          const IconComponent = getAccountIcon(selectedAccount.icon || 'Wallet');
                          return <IconComponent className="w-4 h-4 text-green-500 flex-shrink-0" />;
                        })()
                      )}
                      <span className="text-xs leading-none text-center break-words w-full px-0.5" style={{ fontSize: '10px', lineHeight: '1.1' }}>
                        {selectedAccount.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-green-500">💵</span>
                      <span>Cash</span>
                    </>
                  )}
                </Button>
                <Button variant="ghost" className="h-12 flex flex-col items-center justify-center text-xs" onClick={() => setShowDatePicker(true)}>
                  <span className="text-blue-500">📅</span>
                  <span>Today</span>
                </Button>
              </div>
              
              {/* Number Pad */}
              <div className="grid grid-cols-4 gap-3">
                {[7, 8, 9].map(key => <Button key={key} variant="ghost" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput(key.toString())}>
                    {key}
                  </Button>)}
                <Button variant="outline" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput('backspace')}>
                  <Delete className="h-5 w-5" />
                </Button>
                
                {[4, 5, 6].map(key => <Button key={key} variant="ghost" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput(key.toString())}>
                    {key}
                  </Button>)}
                <Button variant="ghost" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput('-')}>
                  -
                </Button>
                
                {[1, 2, 3].map(key => <Button key={key} variant="ghost" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput(key.toString())}>
                    {key}
                  </Button>)}
                <Button variant="ghost" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput('+')}>
                  +
                </Button>
                
                <Button variant="ghost" className="h-14 text-xl font-medium" onClick={() => setShowCurrencySelector(true)}>
                  {currencies.find(c => c.code === selectedCurrency)?.symbol || '₪'}
                </Button>
                <Button variant="ghost" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput('0')}>
                  0
                </Button>
                <Button variant="ghost" className="h-14 text-xl font-medium" onClick={() => handleCalculatorInput('.')}>
                  .
                </Button>
                
                <Button className="h-14 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-2xl" onClick={operator ? () => handleCalculatorInput('=') : handleSubmit} disabled={!displayExpression || !formData.accountId}>
                  {operator ? '=' : '✓'}
                </Button>
                
                
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