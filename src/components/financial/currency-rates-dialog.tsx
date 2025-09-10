import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { DollarSign, RefreshCw, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CURRENCIES = ['USD', 'EUR', 'JOD', 'ILS', 'TL'];

interface CurrencyRatesDialogProps {
  isActive?: boolean;
}

export const CurrencyRatesDialog = ({ isActive = false }: CurrencyRatesDialogProps) => {
  const { rates, isLoading, updateRate, refreshRates, getCurrencySymbol } = useCurrency();
  const [open, setOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (rateId: string, currentRate: number) => {
    setEditingRate(rateId);
    setEditValue(currentRate.toString());
  };

  const handleSaveEdit = async (fromCurrency: string, toCurrency: string) => {
    const newRate = parseFloat(editValue);
    if (!isNaN(newRate) && newRate > 0) {
      await updateRate(fromCurrency, toCurrency, newRate);
    }
    setEditingRate(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingRate(null);
    setEditValue('');
  };

  const getRateForPair = (from: string, to: string) => {
    return rates.find(r => r.from_currency === from && r.to_currency === to);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex items-center gap-2 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
        >
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Currency Rates</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Currency Exchange Rates</DialogTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshRates}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading currency rates...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Currency Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CURRENCIES.map(baseCurrency => (
                <Card key={baseCurrency}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{getCurrencySymbol(baseCurrency)}</span>
                      {baseCurrency}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {CURRENCIES.filter(currency => currency !== baseCurrency).map(targetCurrency => {
                      const rate = getRateForPair(baseCurrency, targetCurrency);
                      const rateId = `${baseCurrency}-${targetCurrency}`;
                      const isEditing = editingRate === rateId;
                      
                      return (
                        <div key={targetCurrency} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              1 {baseCurrency} = 
                            </span>
                            <span className="text-lg">{getCurrencySymbol(targetCurrency)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.000001"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveEdit(baseCurrency, targetCurrency)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {rate?.rate.toFixed(6) || '1.000000'}
                                </span>
                                {rate && !rate.is_live && (
                                  <Badge variant="secondary" className="text-xs">Custom</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(rateId, rate?.rate || 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Legend */}
            <div className="bg-muted/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Legend</h4>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Custom</Badge>
                  <span>Manually updated rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Edit2 className="h-3 w-3" />
                  <span>Click to edit rate</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};