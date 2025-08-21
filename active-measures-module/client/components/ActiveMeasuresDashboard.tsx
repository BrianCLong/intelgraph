import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Progress,
  Separator
} from '@/components/ui';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';
import { GET_ACTIVE_MEASURES_PORTFOLIO, GET_OPERATIONS } from '../queries';
import OperationCard from './OperationCard';
import SimulationPanel from './SimulationPanel';
import ApprovalPanel from './ApprovalPanel';
import MonitoringPanel from './MonitoringPanel';
import PsyOpsPanel from './PsyOpsPanel';
import SecurityPanel from './SecurityPanel';

interface ActiveMeasuresDashboardProps {
  className?: string;
}

interface Operation {
  id: string;
  name: string;
  status: string;
  classification: string;
  effectiveness: number;
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioStats {
  totalOperations: number;
  activeOperations: number;
  successRate: number;
  averageEffectiveness: number;
  totalMeasures: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

const ActiveMeasuresDashboard: React.FC<ActiveMeasuresDashboardProps> = ({ className }) => {
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<'overview' | 'operations' | 'psyops' | 'security'>('overview');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // GraphQL queries
  const { data: portfolioData, loading: portfolioLoading, error: portfolioError } = useQuery(GET_ACTIVE_MEASURES_PORTFOLIO, {
    variables: {
      filters: {
        classification: classificationFilter !== 'all' ? [classificationFilter] : undefined,
        status: statusFilter !== 'all' ? [statusFilter] : undefined
      }
    },
    pollInterval: 30000 // Refresh every 30 seconds
  });

  const { data: operationsData, loading: operationsLoading } = useQuery(GET_OPERATIONS, {
    variables: {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      pagination: { limit: 50, offset: 0 }
    },
    pollInterval: 15000
  });

  // Calculate portfolio statistics
  const portfolioStats: PortfolioStats = React.useMemo(() => {
    if (!operationsData?.getOperations?.operations) {
      return {
        totalOperations: 0,
        activeOperations: 0,
        successRate: 0,
        averageEffectiveness: 0,
        totalMeasures: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
      };
    }

    const operations = operationsData.getOperations.operations;
    const activeOps = operations.filter((op: Operation) => op.status === 'EXECUTING' || op.status === 'ACTIVE');
    const completedOps = operations.filter((op: Operation) => op.status === 'COMPLETED');
    const successfulOps = completedOps.filter((op: Operation) => op.effectiveness > 70);

    // Risk distribution
    const riskDistribution = operations.reduce((acc: any, op: Operation) => {
      acc[op.riskLevel.toLowerCase()] = (acc[op.riskLevel.toLowerCase()] || 0) + 1;
      return acc;
    }, { low: 0, medium: 0, high: 0, critical: 0 });

    return {
      totalOperations: operations.length,
      activeOperations: activeOps.length,
      successRate: completedOps.length > 0 ? (successfulOps.length / completedOps.length) * 100 : 0,
      averageEffectiveness: operations.length > 0 ? 
        operations.reduce((sum: number, op: Operation) => sum + (op.effectiveness || 0), 0) / operations.length : 0,
      totalMeasures: portfolioData?.activeMeasuresPortfolio?.measures?.length || 0,
      riskDistribution
    };
  }, [operationsData, portfolioData]);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'EXECUTING': return 'bg-green-500';
      case 'PAUSED': return 'bg-yellow-500';
      case 'COMPLETED': return 'bg-blue-500';
      case 'FAILED':
      case 'ABORTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < -threshold) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (portfolioLoading || operationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (portfolioError) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading portfolio data: {portfolioError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Measures Command Center</h1>
          <p className="text-muted-foreground">
            Comprehensive operational management and monitoring dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={classificationFilter === 'SECRET' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setClassificationFilter(classificationFilter === 'SECRET' ? 'all' : 'SECRET')}
            className="text-xs"
          >
            <Shield className="h-3 w-3 mr-1" />
            {classificationFilter === 'SECRET' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioStats.totalOperations}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-1">
                {portfolioStats.activeOperations} active
              </Badge>
              {getTrendIcon(portfolioStats.activeOperations - 5)} {/* Mock trend */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioStats.successRate.toFixed(1)}%</div>
            <Progress value={portfolioStats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Effectiveness</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioStats.averageEffectiveness.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: 75%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              {Object.entries(portfolioStats.riskDistribution).map(([level, count]) => (
                <div key={level} className="flex flex-col items-center">
                  <div className={`h-8 w-6 rounded ${getRiskColor(level)}`} 
                       style={{ height: `${Math.max(8, (count as number) * 4)}px` }} />
                  <span className="text-xs mt-1 capitalize">{level}</span>
                  <span className="text-xs font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={dashboardView} onValueChange={(value: any) => setDashboardView(value)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="psyops">PsyOps</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Recent Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {operationsData?.getOperations?.operations?.slice(0, 8).map((operation: Operation) => (
                    <div
                      key={operation.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedOperation(operation.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-sm">{operation.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(operation.status)}`}
                          >
                            {operation.status}
                          </Badge>
                        </div>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          {operation.classification}
                          <Separator orientation="vertical" className="mx-2 h-3" />
                          Risk: {operation.riskLevel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{operation.effectiveness}%</div>
                        <div className="text-xs text-muted-foreground">effectiveness</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health and Monitoring */}
            <MonitoringPanel operationId={selectedOperation} />
          </div>

          {/* Portfolio Measures Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Available Measures Portfolio</CardTitle>
              <div className="flex items-center space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolioData?.activeMeasuresPortfolio?.measures?.map((measure: any) => (
                  <div
                    key={measure.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm">{measure.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {measure.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {measure.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        {(measure.unattributabilityScore * 100).toFixed(0)}% unattributable
                      </span>
                      <span className="flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        {(measure.effectivenessRating * 100).toFixed(0)}% effective
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Risk Level</span>
                        <span className="capitalize">{measure.riskLevel}</span>
                      </div>
                      <div className={`h-1 rounded-full ${getRiskColor(measure.riskLevel)}`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {operationsData?.getOperations?.operations?.map((operation: Operation) => (
              <OperationCard
                key={operation.id}
                operation={operation}
                selected={selectedOperation === operation.id}
                onSelect={() => setSelectedOperation(operation.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="psyops" className="space-y-4">
          <PsyOpsPanel operationId={selectedOperation} />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityPanel operationId={selectedOperation} />
        </TabsContent>
      </Tabs>

      {/* Simulation and Approval Panels */}
      {selectedOperation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimulationPanel operationId={selectedOperation} />
          <ApprovalPanel operationId={selectedOperation} />
        </div>
      )}
    </div>
  );
};

export default ActiveMeasuresDashboard;