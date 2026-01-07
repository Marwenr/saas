'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createStockMovement } from '../lib/inventory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';

/**
 * StockAdjustmentForm component - Modal form for adjusting stock
 */
export default function StockAdjustmentForm({
  product,
  onClose,
  onSuccess,
  open = true,
}) {
  const { toast } = useToast();
  const [error, setError] = useState(null);

  const form = useForm({
    defaultValues: {
      type: 'IN',
      quantity: '',
      reason: '',
    },
  });

  const type = form.watch('type');

  const onSubmit = async data => {
    setError(null);

    try {
      const quantity = parseFloat(data.quantity);

      if (isNaN(quantity)) {
        throw new Error('La quantité doit être un nombre valide');
      }

      if (data.type === 'ADJUST') {
        if (quantity < 0) {
          throw new Error(
            'La quantité doit être supérieure ou égale à 0 pour un ajustement'
          );
        }
      } else {
        if (quantity <= 0) {
          throw new Error(
            'La quantité doit être supérieure à 0 pour une entrée ou sortie'
          );
        }
      }

      const payload = {
        productId: product._id || product.id,
        type: data.type,
        quantity: quantity,
        reason: data.reason.trim() || undefined,
      };

      await createStockMovement(payload);
      toast({
        title: 'Stock adjusted',
        description: 'Stock has been adjusted successfully.',
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Failed to create stock movement:', err);
      setError(err.message || "Échec de l'ajustement de stock");
    }
  };

  const getTypeLabel = type => {
    switch (type) {
      case 'IN':
        return 'Entrée';
      case 'OUT':
        return 'Sortie';
      case 'ADJUST':
        return 'Ajustement';
      default:
        return type;
    }
  };

  const getTypeDescription = type => {
    switch (type) {
      case 'IN':
        return 'Ajouter du stock';
      case 'OUT':
        return 'Retirer du stock';
      case 'ADJUST':
        return 'Définir le stock à une valeur spécifique';
      default:
        return '';
    }
  };

  const currentStock = product.stockQty !== undefined ? product.stockQty : 0;
  const minStock = product.minStock !== undefined ? product.minStock : 0;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuster le stock</DialogTitle>
          <DialogDescription>{product.name || product.sku}</DialogDescription>
        </DialogHeader>

        {/* Current stock info */}
        <div className="p-4 border rounded-lg bg-muted">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Stock actuel</div>
              <div className="text-lg font-semibold">{currentStock}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Stock minimum</div>
              <div className="text-lg font-semibold">{minStock}</div>
            </div>
          </div>
          {currentStock <= minStock && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Stock faible</AlertDescription>
            </Alert>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="type"
              rules={{ required: 'Type is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Type d&apos;opération{' '}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IN">Entrée (Ajouter)</SelectItem>
                      <SelectItem value="OUT">Sortie (Retirer)</SelectItem>
                      <SelectItem value="ADJUST">
                        Ajustement (Définir)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>{getTypeDescription(type)}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              rules={{
                required: 'Quantity is required',
                min: {
                  value: type === 'ADJUST' ? 0 : 0.01,
                  message:
                    type === 'ADJUST'
                      ? 'Quantity must be >= 0'
                      : 'Quantity must be > 0',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {type === 'ADJUST' ? 'Nouveau stock' : 'Quantité'}{' '}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={type === 'ADJUST' ? '0' : '0.00'}
                      {...field}
                      value={field.value || ''}
                      onChange={e =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : ''
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Ex: Réception de commande, Inventaire, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
