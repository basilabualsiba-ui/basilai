import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancial } from '@/contexts/FinancialContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, Edit2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// This component now uses the CurrencyContext for live rates

export const QuickTransferDialog = () => {
  const { accounts, transferBetweenAccounts } = useFinancial();
  const { getRate, getCurrencySymbol } = useCurrency();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [customRate, setCustomRate] = useState<number | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [transferDate, setTransferDate] = useState<Date>(new Date());
  const [transferTime, setTransferTime] = useState<string>(format(new Date(), 'HH:mm'));

  const fromAccount = accounts.find(acc => acc.id === fromAccountId);
  const toAccount = accounts.find(acc => acc.id === toAccountId);
  const hasDifferentCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;
  
  // Get live exchange rate or use custom rate
  const liveRate = fromAccount && toAccount 
    ? getRate(fromAccount.currency, toAccount.currency)
    : 1;
  const exchangeRate = customRate !== null ? customRate : liveRate;
  
  const fromCurrencySymbol = fromAccount ? getCurrencySymbol(fromAccount.currency) : '₪';
  const toCurrencySymbol = toAccount ? getCurrencySymbol(toAccount.currency) : '₪';

  const handleEditRate = () => {
    setIsEditingRate(true);
    setCustomRate(liveRate);
  };

  const handleSaveRate = () => {
    setIsEditingRate(false);
  };

  const handleCancelEditRate = () => {
    setIsEditingRate(false);
    setCustomRate(null);
  };

  const handleTransfer = () => {
    const transferAmount = parseFloat(amount);
    
    if (!fromAccountId || !toAccountId) {
      toast({
        title: "Error",
        description: "Please select both accounts",
        variant: "destructive"
      });
      return;
    }

    if (fromAccountId === toAccountId) {
      toast({
        title: "Error", 
        description: "Cannot transfer to the same account",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    if (fromAccount && fromAccount.amount < transferAmount) {
      toast({
        title: "Error",
        description: "Insufficient funds",
        variant: "destructive"
      });
      return;
    }

    transferBetweenAccounts(fromAccountId, toAccountId, transferAmount, exchangeRate, transferDate, transferTime);
    
    const convertedAmount = transferAmount * exchangeRate;
    
    toast({
      title: "Success",
      description: hasDifferentCurrency 
        ? `Transferred ${fromCurrencySymbol}${transferAmount.toLocaleString()} → ${toCurrencySymbol}${convertedAmount.toLocaleString()} (Rate: ${exchangeRate.toFixed(4)})`
        : `Transferred ${fromCurrencySymbol}${transferAmount.toLocaleString()} successfully`
    });
    
    setOpen(false);
    setFromAccountId('');
    setToAccountId('');
    setAmount('');
    setCustomRate(null);
    setIsEditingRate(false);
    setTransferDate(new Date());
    setTransferTime(format(new Date(), 'HH:mm'));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1">
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Quick Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Between Accounts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="from-account">From Account</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({getCurrencySymbol(account.currency)}{account.amount.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="to-account">To Account</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({getCurrencySymbol(account.currency)}{account.amount.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount ({fromAccount?.currency || 'Currency'})</Label>
            <Input
              id="amount"
              type="number"
              placeholder={`Enter amount in ${fromAccount?.currency || 'currency'}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !transferDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transferDate ? format(transferDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transferDate}
                    onSelect={(date) => date && setTransferDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={transferTime}
                onChange={(e) => setTransferTime(e.target.value)}
              />
            </div>
          </div>

          {hasDifferentCurrency && parseFloat(amount || '0') > 0 && !isNaN(parseFloat(amount || '0')) && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Currency Conversion</h4>
                {!isEditingRate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditRate}
                    className="h-6 px-2 text-xs gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit Rate
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveRate}
                      className="h-6 px-2 text-xs text-green-600"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditRate}
                      className="h-6 px-2 text-xs text-red-600"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>From:</span>
                  <span className="font-medium">{fromCurrencySymbol}{parseFloat(amount || '0').toLocaleString()} {fromAccount?.currency}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Exchange Rate:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">1 {fromAccount?.currency} =</span>
                    {isEditingRate ? (
                      <Input
                        type="number"
                        step="0.000001"
                        value={customRate || ''}
                        onChange={(e) => setCustomRate(parseFloat(e.target.value) || null)}
                        className="w-20 h-6 text-xs"
                      />
                    ) : (
                      <span className="font-medium font-mono">{exchangeRate.toFixed(6)}</span>
                    )}
                    <span className="text-xs">{toAccount?.currency}</span>
                  </div>
                </div>
                
                {customRate !== null && customRate !== liveRate && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Live Rate:</span>
                    <span>1 {fromAccount?.currency} = {liveRate.toFixed(6)} {toAccount?.currency}</span>
                  </div>
                )}
                
                <div className="flex justify-between border-t pt-2">
                  <span>To:</span>
                  <span className="font-medium text-primary">{toCurrencySymbol}{(parseFloat(amount || '0') * exchangeRate).toLocaleString()} {toAccount?.currency}</span>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleTransfer} className="w-full">
            Transfer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};