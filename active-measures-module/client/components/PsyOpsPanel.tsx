import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Separator
} from '@/components/ui';
import {
  Brain,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  Settings,
  BarChart3,
  Zap,
  Shield,
  Clock
} from 'lucide-react';

interface PsyOpsPanelProps {
  operationId: string | null;
}

interface AudienceSegment {
  id: string;
  name: string;
  size: number;
  vulnerabilityScore: number;
  oceanTraits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  communicationChannels: string[];
  susceptibilityRating: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PsyOpsFramework {
  strategic: {
    objectives: string[];
    timeHorizon: string;
    targetAudience: string;
    narrativeThemes: string[];
  };
  operational: {
    campaigns: Array<{
      name: string;
      phase: string;
      duration: number;
      targetSegments: string[];
      methods: string[];
    }>;
    timingConsiderations: string[];
  };
  tactical: {
    techniques: Array<{
      name: string;
      category: string;
      effectiveness: number;
      attribution: number;
      requirements: string[];
    }>;
    deliveryMechanisms: string[];
    measurableOutcomes: string[];
  };
  decisionMatrix: Array<{
    method: string;
    whenToUse: string;
    howToImplement: string;
    riskLevel: number;
    effectivenessScore: number;
  }>;
}

interface VulnerabilityHeatmap {
  segments: Array<{
    segmentId: string;
    segmentName: string;
    vulnerabilities: Array<{
      type: string;
      severity: number;
      exploitability: number;
      combinedScore: number;
    }>;
  }>;
  vulnerabilityTypes: string[];
  maxSeverity: number;
}

const PsyOpsPanel: React.FC<PsyOpsPanelProps> = ({ operationId }) => {
  const [activeView, setActiveView] = useState<'framework' | 'segmentation' | 'analysis' | 'execution'>('framework');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [psyOpsData, setPsyOpsData] = useState<{
    framework: PsyOpsFramework | null;
    segments: AudienceSegment[];
    heatmap: VulnerabilityHeatmap | null;
  }>({
    framework: null,
    segments: [],
    heatmap: null
  });

  // Mock data for demonstration
  useEffect(() => {
    if (operationId) {
      // Simulate API call
      setTimeout(() => {
        setPsyOpsData({
          framework: {
            strategic: {
              objectives: [
                'Shape perception of key narratives',
                'Counter adversary messaging',
                'Build cognitive resilience',
                'Maintain operational security'
              ],
              timeHorizon: 'Medium-term (1-6 months)',
              targetAudience: 'Multi-demographic with psychographic segmentation',
              narrativeThemes: [
                'Democratic values and transparency',
                'Economic stability and prosperity',
                'Security and national defense'
              ]
            },
            operational: {
              campaigns: [
                {
                  name: 'Awareness Building',
                  phase: 'Initial',
                  duration: 30,
                  targetSegments: ['General population', 'Key influencers'],
                  methods: ['Organic content', 'Educational materials']
                },
                {
                  name: 'Narrative Reinforcement',
                  phase: 'Development',
                  duration: 60,
                  targetSegments: ['Target demographics', 'Opinion leaders'],
                  methods: ['Multi-platform messaging', 'Influencer engagement']
                }
              ],
              timingConsiderations: [
                'News cycle synchronization',
                'Cultural event alignment',
                'Target audience availability patterns'
              ]
            },
            tactical: {
              techniques: [
                {
                  name: 'Narrative Seeding',
                  category: 'Content Creation',
                  effectiveness: 0.7,
                  attribution: 0.2,
                  requirements: ['Content creators', 'Distribution channels']
                },
                {
                  name: 'Influencer Engagement',
                  category: 'Social Amplification',
                  effectiveness: 0.8,
                  attribution: 0.3,
                  requirements: ['Influencer network', 'Relationship management']
                },
                {
                  name: 'Sentiment Monitoring',
                  category: 'Intelligence Gathering',
                  effectiveness: 0.9,
                  attribution: 0.1,
                  requirements: ['Analytics tools', 'Data processing']
                }
              ],
              deliveryMechanisms: [
                'Social media platforms',
                'Traditional media channels',
                'Digital advertising networks',
                'Influencer networks'
              ],
              measurableOutcomes: [
                'Sentiment shift measurement',
                'Engagement rate analysis',
                'Narrative penetration metrics'
              ]
            },
            decisionMatrix: [
              {
                method: 'Organic Content Creation',
                whenToUse: 'Long-term narrative building',
                howToImplement: 'Create authentic, engaging content aligned with target values',
                riskLevel: 0.2,
                effectivenessScore: 0.7
              },
              {
                method: 'Influencer Partnerships',
                whenToUse: 'Rapid reach to specific demographics',
                howToImplement: 'Identify and engage authentic influencers with target audience overlap',
                riskLevel: 0.3,
                effectivenessScore: 0.8
              }
            ]
          },
          segments: [
            {
              id: 'high_susceptibility',
              name: 'High Susceptibility Audience',
              size: 2500000,
              vulnerabilityScore: 0.9,
              oceanTraits: {
                openness: 0.3,
                conscientiousness: 0.4,
                extraversion: 0.6,
                agreeableness: 0.5,
                neuroticism: 0.8
              },
              communicationChannels: ['Facebook', 'Twitter', 'Local news', 'WhatsApp'],
              susceptibilityRating: 'HIGH'
            },
            {
              id: 'moderate_susceptibility',
              name: 'Moderate Susceptibility Audience',
              size: 5000000,
              vulnerabilityScore: 0.5,
              oceanTraits: {
                openness: 0.6,
                conscientiousness: 0.7,
                extraversion: 0.5,
                agreeableness: 0.6,
                neuroticism: 0.4
              },
              communicationChannels: ['LinkedIn', 'Email newsletters', 'Podcasts', 'YouTube'],
              susceptibilityRating: 'MEDIUM'
            },
            {
              id: 'low_susceptibility',
              name: 'Low Susceptibility Audience',
              size: 1000000,
              vulnerabilityScore: 0.2,
              oceanTraits: {
                openness: 0.9,
                conscientiousness: 0.8,
                extraversion: 0.4,
                agreeableness: 0.5,
                neuroticism: 0.2
              },
              communicationChannels: ['Academic journals', 'Professional conferences', 'Expert forums'],
              susceptibilityRating: 'LOW'
            }
          ],
          heatmap: {
            segments: [
              {
                segmentId: 'high_susceptibility',
                segmentName: 'High Susceptibility',
                vulnerabilities: [
                  { type: 'emotional_trigger', severity: 0.9, exploitability: 0.8, combinedScore: 0.72 },
                  { type: 'cognitive_bias', severity: 0.8, exploitability: 0.7, combinedScore: 0.56 },
                  { type: 'social_pressure', severity: 0.6, exploitability: 0.9, combinedScore: 0.54 }
                ]
              }
            ],
            vulnerabilityTypes: ['emotional_trigger', 'cognitive_bias', 'social_pressure', 'information_gap'],
            maxSeverity: 0.9
          }
        });
      }, 1000);
    }
  }, [operationId]);

  if (!operationId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select an operation to view PsyOps analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSusceptibilityColor = (rating: string) => {
    switch (rating) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk > 0.7) return 'bg-red-500';
    if (risk > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const renderOceanTraits = (traits: AudienceSegment['oceanTraits']) => {
    const traitNames = {
      openness: 'Openness',
      conscientiousness: 'Conscientiousness',
      extraversion: 'Extraversion',
      agreeableness: 'Agreeableness',
      neuroticism: 'Neuroticism'
    };

    return (
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(traits).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs font-medium">
              {traitNames[key as keyof typeof traitNames]}
            </span>
            <div className="flex items-center space-x-2">
              <Progress value={value * 100} className="w-16 h-2" />
              <span className="text-xs w-8 text-right">{(value * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Psychological Operations Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="framework">Framework</TabsTrigger>
              <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
            </TabsList>

            <TabsContent value="framework" className="space-y-4">
              {psyOpsData.framework ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Strategic Level */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Strategic Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Objectives</h4>
                        <ul className="text-sm space-y-1">
                          {psyOpsData.framework.strategic.objectives.map((objective, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                              {objective}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium mb-2">Narrative Themes</h4>
                        <div className="flex flex-wrap gap-2">
                          {psyOpsData.framework.strategic.narrativeThemes.map((theme, index) => (
                            <Badge key={index} variant="outline">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Time Horizon</h4>
                        <p className="text-sm text-muted-foreground">
                          {psyOpsData.framework.strategic.timeHorizon}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tactical Level */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Tactical Techniques
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {psyOpsData.framework.tactical.techniques.map((technique, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-sm">{technique.name}</h5>
                              <Badge variant="outline" className="text-xs">
                                {technique.category}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="font-medium">Effectiveness:</span>
                                <Progress value={technique.effectiveness * 100} className="mt-1 h-2" />
                              </div>
                              <div>
                                <span className="font-medium">Attribution:</span>
                                <Progress 
                                  value={technique.attribution * 100} 
                                  className="mt-1 h-2"
                                  // Lower attribution is better, so invert color logic
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Operational Campaigns */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Operational Campaigns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {psyOpsData.framework.operational.campaigns.map((campaign, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{campaign.name}</h5>
                              <Badge variant="outline">{campaign.phase}</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Duration: {campaign.duration} days
                              </div>
                              <div>
                                <span className="font-medium">Methods:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {campaign.methods.map((method, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {method}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="segmentation" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {psyOpsData.segments.map((segment) => (
                  <Card
                    key={segment.id}
                    className={`cursor-pointer transition-all ${
                      selectedSegment === segment.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedSegment(segment.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{segment.name}</span>
                        <Badge className={getSusceptibilityColor(segment.susceptibilityRating)}>
                          {segment.susceptibilityRating}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {(segment.size / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs text-muted-foreground">Estimated reach</div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">Vulnerability Score</h4>
                        <div className="flex items-center space-x-2">
                          <Progress value={segment.vulnerabilityScore * 100} className="flex-1" />
                          <span className="text-sm font-medium">
                            {(segment.vulnerabilityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">OCEAN Traits</h4>
                        {renderOceanTraits(segment.oceanTraits)}
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">Communication Channels</h4>
                        <div className="flex flex-wrap gap-1">
                          {segment.communicationChannels.slice(0, 3).map((channel, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                          {segment.communicationChannels.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{segment.communicationChannels.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vulnerability Heatmap */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Vulnerability Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {psyOpsData.heatmap && (
                      <div className="space-y-4">
                        {psyOpsData.heatmap.segments.map((segment) => (
                          <div key={segment.segmentId} className="p-3 border rounded-lg">
                            <h5 className="font-medium mb-2">{segment.segmentName}</h5>
                            <div className="space-y-2">
                              {segment.vulnerabilities.map((vuln, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span className="capitalize">
                                    {vuln.type.replace('_', ' ')}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                                      <div
                                        className={`h-2 rounded-full ${
                                          vuln.combinedScore > 0.6 ? 'bg-red-500' :
                                          vuln.combinedScore > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                        style={{ width: `${vuln.combinedScore * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium w-8 text-right">
                                      {(vuln.combinedScore * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Decision Matrix */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Decision Matrix
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {psyOpsData.framework && (
                      <div className="space-y-3">
                        {psyOpsData.framework.decisionMatrix.map((decision, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <h5 className="font-medium text-sm mb-1">{decision.method}</h5>
                            <p className="text-xs text-muted-foreground mb-2">
                              {decision.whenToUse}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-medium">Risk Level:</span>
                                <div className="flex items-center mt-1">
                                  <div className={`w-2 h-2 rounded-full mr-1 ${getRiskColor(decision.riskLevel)}`} />
                                  <span>{(decision.riskLevel * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Effectiveness:</span>
                                <div className="flex items-center mt-1">
                                  <div className={`w-2 h-2 rounded-full mr-1 ${getRiskColor(1 - decision.effectivenessScore)}`} />
                                  <span>{(decision.effectivenessScore * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="execution" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  PsyOps execution requires proper authorization and compliance with ethical guidelines.
                  All operations must be approved through the established chain of command.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Execution Readiness</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Target Analysis Complete</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ethical Review Approved</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Legal Compliance Verified</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Resource Allocation</span>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monitoring & Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">85%</div>
                        <div className="text-xs text-muted-foreground">Readiness Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">12</div>
                        <div className="text-xs text-muted-foreground">Active Metrics</div>
                      </div>
                    </div>
                    <Button className="w-full" disabled>
                      <Eye className="h-4 w-4 mr-2" />
                      Launch Operation Dashboard
                    </Button>
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

export default PsyOpsPanel;