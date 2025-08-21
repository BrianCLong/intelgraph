import React, { useState, useEffect } from 'react'
import { KPIStrip } from '@/components/panels/KPIStrip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import mockData from '@/mock/data.json'
import type { KPIMetric } from '@/types'

export default function CommandCenterDashboard() {
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setKpiMetrics(mockData.kpiMetrics as KPIMetric[])
      setLoading(false)
    }
    loadData()
  }, [])

  const commandCenterMetrics = [
    ...kpiMetrics,
    {
      id: 'live_threats',
      title: 'Live Threats',
      value: 7,
      format: 'number' as const,
      status: 'warning' as const,
      change: { value: 25, direction: 'up' as const, period: 'last hour' }
    },
    {
      id: 'response_rate',
      title: 'Response Rate',
      value: 94,
      format: 'percentage' as const,
      status: 'success' as const,
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Command Center</h1>
          <p className="text-muted-foreground">Real-time intelligence operations dashboard</p>
        </div>
        <Badge variant="success" className="animate-pulse">
          🟢 LIVE
        </Badge>
      </div>

      <KPIStrip
        data={commandCenterMetrics}
        loading={loading}
        columns={6}
        className="cyber-glow"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="intel-gradient text-white">
          <CardHeader>
            <CardTitle className="text-white">🚨 Threat Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Critical Alerts</span>
                <Badge variant="destructive">2</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>High Priority</span>
                <Badge variant="warning">5</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Monitoring</span>
                <Badge variant="secondary">12</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Analysis Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Processing Queue</span>
                <span className="font-bold">3</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Today</span>
                <span className="font-bold">127</span>
              </div>
              <div className="flex justify-between">
                <span>AI Confidence</span>
                <span className="font-bold">87%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🌐 Network Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Data Sources</span>
                <Badge variant="success">12/12</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>API Health</span>
                <Badge variant="success">Operational</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Last Sync</span>
                <span className="text-sm text-muted-foreground">2 min ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}