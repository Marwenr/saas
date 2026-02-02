'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../lib/useAuth';
import {
  fetchSalesSummaryReport,
  fetchStockAlertsReport,
  fetchTopProductsReport,
} from '../../lib/reports';
import KPICard from '../../components/charts/KPICard';
import {
  LayoutGrid,
  Filter,
  Share2,
  DollarSign,
  BarChart3,
  Package,
  AlertTriangle,
  CheckCircle,
  Trophy,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

function DashboardPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [salesSummary, setSalesSummary] = useState(null);
  const [stockAlerts, setStockAlerts] = useState(null);
  const [topProducts, setTopProducts] = useState(null);

  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [topProductsLimit, setTopProductsLimit] = useState(10);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, period, from, to, topProductsLimit]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { period };

      if (period === 'range') {
        if (!from || !to) {
          setError(
            'Veuillez sélectionner les dates de début et de fin pour la plage personnalisée'
          );
          setLoading(false);
          return;
        }
        params.from = from;
        params.to = to;
      }

      const [summaryData, alertsData, topProductsData] = await Promise.all([
        fetchSalesSummaryReport(params),
        fetchStockAlertsReport({ limit: 50 }),
        fetchTopProductsReport({
          ...params,
          limit: topProductsLimit,
          sortBy: 'qty',
        }),
      ]);

      setSalesSummary(summaryData);
      setStockAlerts(alertsData);
      setTopProducts(topProductsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(
        err.message || 'Échec du chargement des données du tableau de bord'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = value => {
    return `${(value || 0).toFixed(3)} TND`;
  };

  const formatNumber = value => {
    return (value || 0).toLocaleString();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    );
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'day':
        return "Aujourd'hui";
      case 'week':
        return 'Cette semaine';
      case 'month':
        return 'Ce mois';
      case 'year':
        return 'Cette année';
      case 'range':
        return 'Plage personnalisée';
      default:
        return 'Cette période';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de vos ventes, alertes de stock et produits les plus
            vendus
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Personnaliser le widget
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtrer
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Partager
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Period Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>
            Sélectionnez la période et les options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Période</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period">
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="range">Plage personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === 'range' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="from">Date de début</Label>
                  <Input
                    id="from"
                    type="date"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">Date de fin</Label>
                  <Input
                    id="to"
                    type="date"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="limit">Limite produits top</Label>
              <Input
                id="limit"
                type="number"
                value={topProductsLimit}
                onChange={e =>
                  setTopProductsLimit(
                    Math.min(parseInt(e.target.value) || 10, 100)
                  )
                }
                min="1"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {salesSummary?.summary && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Vue d'ensemble des ventes
              </h2>
              <p className="text-muted-foreground mt-1">
                Indicateurs clés de performance pour votre entreprise
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Ventes totales (TND)"
              currentValue={salesSummary.summary.totalRevenueIncl || 0}
              previousValue={
                salesSummary.previousSummary?.totalRevenueIncl ||
                salesSummary.previousPeriod?.summary?.totalRevenueIncl ||
                null
              }
              formatter={formatCurrency}
              icon={<DollarSign className="w-6 h-6" />}
              period={getPeriodLabel()}
            />
            <KPICard
              title="Nombre de ventes"
              currentValue={
                salesSummary.summary.totalOrders ||
                salesSummary.summary.totalSales ||
                0
              }
              previousValue={
                salesSummary.previousSummary?.totalOrders ||
                salesSummary.previousSummary?.totalSales ||
                salesSummary.previousPeriod?.summary?.totalOrders ||
                salesSummary.previousPeriod?.summary?.totalSales ||
                null
              }
              formatter={formatNumber}
              icon={<BarChart3 className="w-6 h-6" />}
              period={getPeriodLabel()}
            />
            <KPICard
              title="Quantité totale vendue"
              currentValue={
                salesSummary.summary.totalQty ||
                salesSummary.summary.totalItems ||
                0
              }
              previousValue={
                salesSummary.previousSummary?.totalQty ||
                salesSummary.previousSummary?.totalItems ||
                salesSummary.previousPeriod?.summary?.totalQty ||
                salesSummary.previousPeriod?.summary?.totalItems ||
                null
              }
              formatter={formatNumber}
              icon={<Package className="w-6 h-6" />}
              period={getPeriodLabel()}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <CardTitle>Alertes de stock</CardTitle>
                  <CardDescription>
                    Produits en dessous du seuil de stock minimum
                    {stockAlerts?.totalAlerts !== undefined && (
                      <Badge variant="outline" className="ml-2">
                        {stockAlerts.totalAlerts}{' '}
                        {stockAlerts.totalAlerts === 1 ? 'alerte' : 'alertes'}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stockAlerts?.items && stockAlerts.items.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stockAlerts.items.map(item => {
                  const progress =
                    item.minStockQty > 0
                      ? Math.min((item.stockQty / item.minStockQty) * 100, 100)
                      : 0;
                  const isCritical = item.difference < 0;

                  return (
                    <Card key={item.productId} className="border shadow-sm">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Réf. fabricant: {item.manufacturerRef}
                              {item.brand &&
                                ` • ${item.brand?.name || item.brand}`}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div
                              className={cn(
                                'text-xl font-bold',
                                isCritical
                                  ? 'text-destructive'
                                  : 'text-orange-600 dark:text-orange-400'
                              )}
                            >
                              {item.stockQty}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              / {item.minStockQty} min
                            </div>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                isCritical
                                  ? 'bg-destructive'
                                  : 'bg-orange-500 dark:bg-orange-600'
                              )}
                              style={{ width: `${Math.max(progress, 5)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Différence : {item.difference > 0 ? '+' : ''}
                          {item.difference} unités
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <div>
                  Aucune alerte de stock. Tous les produits sont bien
                  approvisionnés !
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <CardTitle>Produits les plus vendus</CardTitle>
                  <CardDescription>
                    Produits les plus vendus par quantité
                    {topProducts?.dateRange && (
                      <span className="ml-2">
                        (
                        {new Date(
                          topProducts.dateRange.from
                        ).toLocaleDateString()}{' '}
                        -{' '}
                        {new Date(
                          topProducts.dateRange.to
                        ).toLocaleDateString()}
                        )
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topProducts?.products && topProducts.products.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {topProducts.products.map((product, index) => {
                  const maxQty = Math.max(
                    ...topProducts.products.map(p => p.totalQty)
                  );
                  const progress =
                    maxQty > 0 ? (product.totalQty / maxQty) * 100 : 0;

                  return (
                    <Card key={product.productId} className="border shadow-sm">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {product.name}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Réf. fabricant: {product.manufacturerRef}
                                {product.brand &&
                                  ` • ${product.brand?.name || product.brand}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xl font-bold">
                              {formatNumber(product.totalQty)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              unités vendues
                            </div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                              {formatCurrency(product.totalRevenue)}
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <div>
                  Aucune donnée de vente trouvée pour la période sélectionnée
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Date Range Info */}
      {salesSummary?.dateRange && (
        <div className="text-sm text-muted-foreground text-center">
          Période : {new Date(salesSummary.dateRange.from).toLocaleDateString()}{' '}
          - {new Date(salesSummary.dateRange.to).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}
