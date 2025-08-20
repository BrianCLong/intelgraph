import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
  Button,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Eye,
  Bell,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  BarChart3,
  Clock,
  WifiOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface MonitoringPanelProps {
  operationId: string | null;
}

interface MonitoringMetric {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface HealthScore {
  overall: number;
  operational: number;
  technical: number;
  strategic: number;
  compliance: number;
  status: 'healthy' | 'warning' | 'critical' | 'down';
}

const MonitoringPanel: React.FC<MonitoringPanelProps> = ({ operationId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'health'>('overview');
  const [realTimeData, setRealTimeData] = useState<{
    metrics: MonitoringMetric[];
    alerts: Alert[];
    healthScore: HealthScore;
    isConnected: boolean;
  }>({
    metrics: [],
    alerts: [],
    healthScore: {
      overall: 0,
      operational: 0,
      technical: 0,
      strategic: 0,
      compliance: 0,
      status: 'healthy'
    },
    isConnected: false
  });

  // Simulate WebSocket connection for real-time data
  useEffect(() => {
    if (!operationId) return;

    // Simulate connection
    setRealTimeData(prev => ({ ...prev, isConnected: true }));

    const interval = setInterval(() => {
      // Generate mock real-time data
      const newMetrics: MonitoringMetric[] = [
        {
          id: 'effectiveness',
          type: 'Effectiveness',
          value: 75 + Math.random() * 20,
          unit: '%',
          timestamp: new Date(),
          trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
          status: 'healthy'
        },
        {
          id: 'engagement',
          type: 'Engagement',
          value: 60 + Math.random() * 30,
          unit: '%',
          timestamp: new Date(),
          trend: 'stable',
          status: 'healthy'
        },
        {
          id: 'attribution',
          type: 'Attribution Risk',
          value: Math.random() * 40,
          unit: '%',
          timestamp: new Date(),
          trend: 'decreasing',
          status: Math.random() > 0.3 ? 'healthy' : 'warning'
        },
        {
          id: 'compliance',
          type: 'Compliance Score',
          value: 85 + Math.random() * 15,
          unit: '%',
          timestamp: new Date(),
          trend: 'stable',
          status: 'healthy'
        }
      ];

      const alerts: Alert[] = [
        ...(Math.random() > 0.8 ? [{
          id: `alert_${Date.now()}`,
          severity: 'medium' as const,
          type: 'Performance',
          title: 'Engagement Rate Below Target',
          description: 'Current engagement rate is 5% below the target threshold',
          timestamp: new Date(),
          status: 'active' as const
        }] : []),
        ...(Math.random() > 0.9 ? [{
          id: `alert_${Date.now()}_2`,
          severity: 'high' as const,
          type: 'Security',
          title: 'Attribution Risk Elevated',
          description: 'Attribution score has increased beyond acceptable limits',
          timestamp: new Date(),
          status: 'active' as const
        }] : [])
      ];

      const healthScore: HealthScore = {
        overall: 85 + Math.random() * 10,
        operational: 90 + Math.random() * 10,
        technical: 95 + Math.random() * 5,
        strategic: 80 + Math.random() * 15,
        compliance: 92 + Math.random() * 8,
        status: 'healthy'
      };

      setRealTimeData(prev => ({
        metrics: newMetrics,
        alerts: [...prev.alerts.slice(-5), ...alerts], // Keep last 5 + new
        healthScore,
        isConnected: true
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [operationId]);

  // Generate chart data for metrics
  const chartData = React.useMemo(() => {
    const timePoints = Array.from({ length: 20 }, (_, i) => {
      const time = new Date();
      time.setMinutes(time.getMinutes() - (19 - i) * 5); // 5-minute intervals
      return {
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        effectiveness: 75 + Math.sin(i * 0.3) * 10 + Math.random() * 5,
        engagement: 60 + Math.cos(i * 0.4) * 15 + Math.random() * 5,
        attribution: 30 + Math.sin(i * 0.2) * 10 + Math.random() * 3,
        compliance: 90 + Math.sin(i * 0.1) * 5 + Math.random() * 2
      };
    });
    return timePoints;
  }, []);

  if (!operationId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select an operation to view monitoring data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return <div className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Real-Time Monitoring
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${realTimeData.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {realTimeData.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="alerts">
                Alerts
                {realTimeData.alerts.filter(a => a.status === 'active').length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {realTimeData.alerts.filter(a => a.status === 'active').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {realTimeData.metrics.map((metric) => (
                  <Card key={metric.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{metric.type}</span>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <div className="text-2xl font-bold">
                        {metric.value.toFixed(1)}{metric.unit}
                      </div>
                      <div className="mt-2">
                        <Progress 
                          value={metric.type === 'Attribution Risk' ? 100 - metric.value : metric.value} 
                          className="h-2" 
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Real-time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="effectiveness" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Effectiveness %"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="engagement" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Engagement %"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attribution" 
                        stroke="#ffc658" 
                        strokeWidth={2}
                        name="Attribution Risk %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {realTimeData.metrics.map((metric) => (
                  <Card key={metric.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{metric.type}</h3>
                          <p className="text-sm text-muted-foreground">
                            Last updated: {metric.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold flex items-center">
                            {metric.value.toFixed(1)}{metric.unit}
                            {getTrendIcon(metric.trend)}
                          </div>
                          <Badge 
                            variant={metric.status === 'healthy' ? 'default' : 'destructive'}
                            className="mt-1"
                          >
                            {metric.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Progress 
                          value={metric.type === 'Attribution Risk' ? 100 - metric.value : metric.value}
                          className="h-3"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0</span>
                          <span>Target: {metric.type === 'Attribution Risk' ? '<30' : '>80'}</span>
                          <span>100</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {realTimeData.alerts.length > 0 ? (
                <div className="space-y-3">
                  {realTimeData.alerts
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .map((alert) => (
                    <Alert key={alert.id} className={`border-l-4 ${
                      alert.severity === 'critical' ? 'border-l-red-500' :
                      alert.severity === 'high' ? 'border-l-orange-500' :
                      alert.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{alert.type}</Badge>
                            <Badge 
                              variant={alert.status === 'active' ? 'destructive' : 'secondary'}
                            >
                              {alert.status}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <AlertDescription className="mt-1">
                            {alert.description}
                          </AlertDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {alert.status === 'active' && (
                            <>
                              <Button variant="outline" size="sm">
                                Acknowledge
                              </Button>
                              <Button variant="default" size="sm">
                                Resolve
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No active alerts</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Health Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className={`text-6xl font-bold mb-2 ${getHealthColor(realTimeData.healthScore.overall)}`}>
                      {realTimeData.healthScore.overall.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">Overall Health Score</div>
                    <Badge 
                      variant={realTimeData.healthScore.status === 'healthy' ? 'default' : 'destructive'}
                      className="text-sm"
                    >
                      {realTimeData.healthScore.status.toUpperCase()}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Health Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Health Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'Operational', value: realTimeData.healthScore.operational },
                      { label: 'Technical', value: realTimeData.healthScore.technical },
                      { label: 'Strategic', value: realTimeData.healthScore.strategic },
                      { label: 'Compliance', value: realTimeData.healthScore.compliance }
                    ].map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className={`font-medium ${getHealthColor(item.value)}`}>
                            {item.value.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={item.value} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Health Trends Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Health Trends (24h)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="compliance" 
                          stackId="1"
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                          name="Compliance %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringPanel;