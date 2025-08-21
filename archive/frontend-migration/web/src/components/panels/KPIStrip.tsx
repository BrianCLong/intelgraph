import * as React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Shield, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import type { KPIMetric, PanelProps } from '@/types'

interface KPIStripProps extends PanelProps<KPIMetric[]> {
  columns?: number
}

export function KPIStrip({
  data: metrics,
  loading = false,
  error,
  onSelect,
  columns = 4,
  className,
}: KPIStripProps) {
  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'threats': return AlertTriangle
      case 'activity': return Activity
      case 'security': return Shield
      case 'targets': return Target
      default: return Activity
    }
  }

  const formatValue = (value: number | string, format: string) => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'number':
        return value.toLocaleString()
      case 'percentage':
        return `${value}%`
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value)
      case 'duration':
        if (value < 60) return `${value}s`
        if (value < 3600) return `${Math.floor(value / 60)}m`
        return `${Math.floor(value / 3600)}h`
      default:
        return value.toString()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'error': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getChangeColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <div className={cn('grid gap-4', `grid-cols-${columns}`, className)}>
        {[...Array(columns)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load KPI metrics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('grid gap-4', `grid-cols-${columns}`, className)}>
      {metrics.map((metric) => {
        const Icon = getMetricIcon(metric.id)
        
        return (
          <Card
            key={metric.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-l-4',
              getStatusColor(metric.status)
            )}
            onClick={() => onSelect?.(metric)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatValue(metric.value, metric.format)}
                  </p>
                </div>
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center',
                  metric.status === 'success' && 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
                  metric.status === 'warning' && 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
                  metric.status === 'error' && 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
                  metric.status === 'neutral' && 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              
              {metric.change && (
                <div className="mt-4 flex items-center text-xs">
                  {metric.change.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  <span className={getChangeColor(metric.change.direction)}>
                    {Math.abs(metric.change.value)}%
                  </span>
                  <span className="text-muted-foreground ml-1">
                    from {metric.change.period}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

