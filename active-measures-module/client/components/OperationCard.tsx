import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
  Button,
  Separator
} from '@/components/ui';
import {
  Play,
  Pause,
  Square,
  Clock,
  Users,
  Target,
  Shield,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  Activity
} from 'lucide-react';

interface OperationCardProps {
  operation: {
    id: string;
    name: string;
    description?: string;
    status: string;
    classification: string;
    effectiveness: number;
    riskLevel: string;
    createdAt: string;
    updatedAt: string;
    objectives?: Array<{
      type: string;
      description: string;
      priority: string;
    }>;
    team?: {
      lead: string;
      members: string[];
    };
    timeline?: {
      startDate: string;
      endDate: string;
      duration: number;
    };
    progress?: {
      completion: number;
      currentPhase: string;
    };
    metrics?: {
      reach: number;
      engagement: number;
      attribution: number;
      complianceScore: number;
    };
  };
  selected: boolean;
  onSelect: () => void;
}

const OperationCard: React.FC<OperationCardProps> = ({
  operation,
  selected,
  onSelect
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'EXECUTING': return 'bg-green-100 text-green-800 border-green-300';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FAILED':
      case 'ABORTED': return 'bg-red-100 text-red-800 border-red-300';
      case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'TOP_SECRET': return 'bg-red-500 text-white';
      case 'SECRET': return 'bg-orange-500 text-white';
      case 'CONFIDENTIAL': return 'bg-yellow-500 text-black';
      case 'UNCLASSIFIED': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'EXECUTING': return <Play className="h-4 w-4" />;
      case 'PAUSED': return <Pause className="h-4 w-4" />;
      case 'COMPLETED':
      case 'FAILED':
      case 'ABORTED': return <Square className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDaysRunning = () => {
    const start = new Date(operation.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        selected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center">
              {operation.name}
              <Badge className={`ml-2 ${getClassificationColor(operation.classification)}`}>
                <Shield className="h-3 w-3 mr-1" />
                {operation.classification}
              </Badge>
            </CardTitle>
            {operation.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {operation.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(operation.status)}>
              {getStatusIcon(operation.status)}
              <span className="ml-1">{operation.status.replace('_', ' ')}</span>
            </Badge>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-xs font-medium">Effectiveness</span>
            </div>
            <div className="text-xl font-bold text-blue-600">{operation.effectiveness}%</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <AlertTriangle className={`h-4 w-4 mr-1 ${getRiskColor(operation.riskLevel)}`} />
              <span className="text-xs font-medium">Risk</span>
            </div>
            <div className={`text-lg font-semibold ${getRiskColor(operation.riskLevel)}`}>
              {operation.riskLevel}
            </div>
          </div>

          {operation.metrics && (
            <>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 mr-1 text-green-500" />
                  <span className="text-xs font-medium">Reach</span>
                </div>
                <div className="text-lg font-semibold">{operation.metrics.reach.toLocaleString()}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Activity className="h-4 w-4 mr-1 text-purple-500" />
                  <span className="text-xs font-medium">Engagement</span>
                </div>
                <div className="text-lg font-semibold">{operation.metrics.engagement}%</div>
              </div>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {operation.progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {operation.progress.currentPhase} - {operation.progress.completion}%
              </span>
            </div>
            <Progress value={operation.progress.completion} className="h-2" />
          </div>
        )}

        {/* Objectives */}
        {operation.objectives && operation.objectives.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Objectives ({operation.objectives.length})
            </h4>
            <div className="space-y-1">
              {operation.objectives.slice(0, 3).map((objective, index) => (
                <div key={index} className="flex items-center text-xs">
                  <Badge 
                    variant="outline" 
                    className={`mr-2 ${
                      objective.priority === 'CRITICAL' ? 'border-red-300 text-red-700' :
                      objective.priority === 'HIGH' ? 'border-orange-300 text-orange-700' :
                      'border-gray-300 text-gray-700'
                    }`}
                  >
                    {objective.priority}
                  </Badge>
                  <span className="truncate">{objective.description}</span>
                </div>
              ))}
              {operation.objectives.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{operation.objectives.length - 3} more objectives
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline and Team Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {calculateDaysRunning()} days running
            </div>
            {operation.team && (
              <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {operation.team.members.length + 1} team members
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>Updated {formatDate(operation.updatedAt)}</span>
            {selected && (
              <Eye className="h-3 w-3 text-blue-500" />
            )}
          </div>
        </div>

        {/* Attribution and Compliance Indicators */}
        {operation.metrics && (
          <div className="flex items-center space-x-4 pt-2">
            <div className="flex items-center">
              <Shield className="h-3 w-3 mr-1 text-blue-500" />
              <span className="text-xs">Attribution: {operation.metrics.attribution}%</span>
              <div className="ml-2 h-2 w-16 bg-gray-200 rounded-full">
                <div 
                  className={`h-2 rounded-full ${
                    operation.metrics.attribution < 30 ? 'bg-green-500' :
                    operation.metrics.attribution < 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${operation.metrics.attribution}%` }}
                />
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-4" />
            
            <div className="flex items-center">
              <span className="text-xs">Compliance: {operation.metrics.complianceScore}%</span>
              <div className="ml-2 h-2 w-16 bg-gray-200 rounded-full">
                <div 
                  className={`h-2 rounded-full ${
                    operation.metrics.complianceScore >= 90 ? 'bg-green-500' :
                    operation.metrics.complianceScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${operation.metrics.complianceScore}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t">
          {operation.status === 'ACTIVE' && (
            <Button variant="outline" size="sm">
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
          )}
          {operation.status === 'PAUSED' && (
            <Button variant="outline" size="sm">
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Eye className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationCard;