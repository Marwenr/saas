'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSale } from '../lib/pos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from './ui/table';
import { Loader2, User, History, Calendar, CreditCard } from 'lucide-react';

export default function SaleDetailModal({ saleId, isOpen, onClose }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sale, setSale] = useState(null);

  const loadSale = useCallback(async () => {
    if (!saleId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchSale(saleId);
      setSale(result.sale);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load sale');
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    if (isOpen && saleId) {
      loadSale();
    } else {
      setSale(null);
      setError(null);
      setLoading(true);
    }
  }, [isOpen, saleId, loadSale]);

  const getPaymentMethodBadge = method => {
    const variantMap = {
      CASH: 'default',
      CHECK: 'secondary',
      CREDIT: 'outline',
    };
    const labels = {
      CASH: 'Espèces',
      CHECK: 'Chèque',
      CREDIT: 'Crédit',
    };
    return (
      <Badge variant={variantMap[method] || 'outline'}>
        {labels[method] || method}
      </Badge>
    );
  };

  const customer = sale?.customerId;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Détail de la vente</DialogTitle>
          {sale?.reference && (
            <DialogDescription>Référence: {sale.reference}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {customer && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  router.push(`/clients/${customer._id || customer.id}`);
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Client
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  router.push(`/clients/${customer._id || customer.id}/sales`);
                }}
              >
                <History className="h-4 w-4 mr-2" />
                Historique
              </Button>
            </>
          )}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !sale ? (
            <div className="text-center py-12 text-muted-foreground">
              Vente non trouvée
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status badges */}
              <div className="flex gap-2 flex-wrap">
                {sale.isReturn && (
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700"
                  >
                    Retour
                  </Badge>
                )}
                {sale.isReplacement && (
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary"
                  >
                    Remplacement
                  </Badge>
                )}
                {sale.returnSaleId && (
                  <Badge variant="outline">
                    Vente originale:{' '}
                    {sale.returnSaleId.reference ||
                      sale.returnSaleId._id ||
                      sale.returnSaleId.id}
                  </Badge>
                )}
              </div>

              {/* Main Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sale Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Informations de vente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date de vente
                      </div>
                      <div className="font-medium">
                        {new Date(
                          sale.saleDate || sale.createdAt
                        ).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Créée par
                      </div>
                      <div>
                        {sale.createdBy?.name || sale.createdBy?.email || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Mode de paiement
                      </div>
                      <div>{getPaymentMethodBadge(sale.paymentMethod)}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Nom
                      </div>
                      <div className="font-medium">
                        {customer ? (
                          <>
                            {customer.firstName} {customer.lastName}
                            {customer.internalCode && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({customer.internalCode})
                              </span>
                            )}
                          </>
                        ) : (
                          sale.customerName || 'client comptoir'
                        )}
                      </div>
                    </div>
                    {sale.vehicleInfo && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Véhicule
                        </div>
                        <div>
                          <div className="font-medium">
                            {sale.vehicleInfo.brand} {sale.vehicleInfo.model}
                            {sale.vehicleInfo.year &&
                              ` (${sale.vehicleInfo.year})`}
                          </div>
                          {sale.vehicleInfo.vin && (
                            <div className="text-xs text-muted-foreground">
                              VIN: {sale.vehicleInfo.vin}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Articles ({sale.items?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sale.items && sale.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-center">Qté</TableHead>
                            <TableHead className="text-right">
                              Prix avant remise
                            </TableHead>
                            <TableHead className="text-center">
                              Taux remise
                            </TableHead>
                            <TableHead className="text-right">
                              Prix après remise
                            </TableHead>
                            <TableHead className="text-center">TVA</TableHead>
                            <TableHead className="text-right">
                              Total HT
                            </TableHead>
                            <TableHead className="text-right">
                              Total TTC
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sale.items.map((item, index) => {
                            const product = item.productId;
                            const baseUnitPrice =
                              item.baseUnitPrice || item.unitPrice || 0;
                            const discountRate = item.discountRate || 0;
                            const finalUnitPrice = item.unitPrice || 0;
                            const hasDiscount =
                              discountRate > 0 &&
                              baseUnitPrice !== finalUnitPrice;

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {item.name || '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item.sku || product?.sku || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.qty || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  {baseUnitPrice.toFixed(2)} TND
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasDiscount ? (
                                    <Badge
                                      variant="outline"
                                      className="text-orange-600"
                                    >
                                      {discountRate.toFixed(1)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      0%
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasDiscount ? (
                                    <span className="text-green-600 font-medium">
                                      {finalUnitPrice.toFixed(2)} TND
                                    </span>
                                  ) : (
                                    <span>{finalUnitPrice.toFixed(2)} TND</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.taxRate || 0}%
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.totalExclTax?.toFixed(2) || '0.00'} TND
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {item.totalInclTax?.toFixed(2) || '0.00'} TND
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell
                              colSpan="7"
                              className="text-right font-semibold"
                            >
                              Sous-total HT:
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {sale.totalExclTax?.toFixed(2) || '0.00'} TND
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell
                              colSpan="7"
                              className="text-right font-semibold"
                            >
                              TVA:
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {sale.totalTax?.toFixed(2) || '0.00'} TND
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          {sale.loyaltyDiscountAmount > 0 && (
                            <TableRow>
                              <TableCell
                                colSpan="7"
                                className="text-right font-semibold"
                              >
                                {sale.loyaltyDiscount
                                  ? `Remise fidélité (${sale.loyaltyDiscount}%):`
                                  : 'Remise:'}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                -
                                {sale.loyaltyDiscountAmount?.toFixed(2) ||
                                  '0.00'}{' '}
                                TND
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          )}
                          <TableRow className="border-t-2">
                            <TableCell
                              colSpan="7"
                              className="text-right text-base font-bold"
                            >
                              Total TTC:
                            </TableCell>
                            <TableCell className="text-right text-base font-bold">
                              {sale.totalInclTax?.toFixed(2) || '0.00'} TND
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun article
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timestamps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Informations système
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Créée le
                      </div>
                      <div>
                        {sale.createdAt
                          ? new Date(sale.createdAt).toLocaleString('fr-FR')
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Modifiée le
                      </div>
                      <div>
                        {sale.updatedAt
                          ? new Date(sale.updatedAt).toLocaleString('fr-FR')
                          : '-'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
