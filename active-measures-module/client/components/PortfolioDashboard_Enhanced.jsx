import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Psychology as PsychologyIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { formatDistance, format } from 'date-fns';
import CytoscapeComponent from 'react-cytoscapejs';
import {
  GET_ACTIVE_MEASURES_PORTFOLIO,
  GET_OPERATIONS,
  CREATE_OPERATION,
  COMBINE_MEASURES,
  RUN_SIMULATION,
  OPERATION_UPDATES,
} from '../queries';

// Risk level color mapping
const RISK_COLORS = {
  MINIMAL: '#4caf50',
  LOW: '#8bc34a',
  MODERATE: '#ff9800',
  HIGH: '#f44336',
  CRITICAL: '#d32f2f',
};

// Operation status color mapping
const STATUS_COLORS = {
  DRAFT: '#9e9e9e',
  PENDING_APPROVAL: '#ff9800',
  APPROVED: '#2196f3',
  READY_FOR_EXECUTION: '#4caf50',
  EXECUTING: '#3f51b5',
  PAUSED: '#ff5722',
  COMPLETED: '#4caf50',
  ABORTED: '#f44336',
  FAILED: '#d32f2f',
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`portfolio-tabpanel-${index}`}
      aria-labelledby={`portfolio-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PortfolioDashboard = ({ tuners: initialTuners }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedMeasures, setSelectedMeasures] = useState([]);
  const [tuners, setTuners] = useState(initialTuners || {
    proportionality: 0.5,
    riskTolerance: 0.3,
    ethicalIndex: 0.8,
    unattributabilityRequirement: 0.7,
  });
  const [portfolioFilters, setPortfolioFilters] = useState({
    categories: [],
    riskLevels: [],
    effectivenessThreshold: 0,
  });
  const [operationsFilters, setOperationsFilters] = useState({
    status: '',
    timeRange: null,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);
  const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
  const [tunersDialogOpen, setTunersDialogOpen] = useState(false);
  const [newOperation, setNewOperation] = useState({
    name: '',
    description: '',
    objectives: [],
    classification: 'CONFIDENTIAL',
  });

  // GraphQL queries and mutations
  const {
    data: portfolioData,
    loading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolio,
  } = useQuery(GET_ACTIVE_MEASURES_PORTFOLIO, {
    variables: {
      filters: portfolioFilters,
      tuners,
    },
    pollInterval: 30000, // Refresh every 30 seconds
  });

  const {
    data: operationsData,
    loading: operationsLoading,
    error: operationsError,
    refetch: refetchOperations,
  } = useQuery(GET_OPERATIONS, {
    variables: {
      status: operationsFilters.status || undefined,
      timeRange: operationsFilters.timeRange,
      pagination: { offset: 0, limit: 50 },
    },
    pollInterval: 10000, // Refresh every 10 seconds
  });

  const [createOperation, { loading: creatingOperation }] = useMutation(CREATE_OPERATION);
  const [combineMeasures, { loading: combiningMeasures }] = useMutation(COMBINE_MEASURES);
  const [runSimulation, { loading: runningSimulation }] = useMutation(RUN_SIMULATION);

  // Real-time operation updates
  const { data: operationUpdate } = useSubscription(OPERATION_UPDATES, {
    variables: { operationId: 'all' },
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data) {
        refetchOperations();
      }
    },
  });

  // Computed values
  const portfolio = portfolioData?.activeMeasuresPortfolio;
  const operations = operationsData?.getOperations?.operations || [];
  const totalMeasures = portfolio?.totalCount || 0;
  const activeMeasures = portfolio?.measures || [];

  const portfolioStats = useMemo(() => {
    if (!portfolio) return {};
    
    const categories = {};
    const riskLevels = {};
    let totalEffectiveness = 0;
    let unattributableCount = 0;

    activeMeasures.forEach((measure) => {
      categories[measure.category] = (categories[measure.category] || 0) + 1;
      riskLevels[measure.riskLevel] = (riskLevels[measure.riskLevel] || 0) + 1;
      totalEffectiveness += measure.effectivenessRating || 0;
      if (measure.unattributabilityScore > 0.8) unattributableCount++;
    });

    return {
      categories,
      riskLevels,
      averageEffectiveness: activeMeasures.length > 0 ? totalEffectiveness / activeMeasures.length : 0,
      unattributablePercentage: activeMeasures.length > 0 ? (unattributableCount / activeMeasures.length) * 100 : 0,
    };
  }, [activeMeasures]);

  // Generate Cytoscape elements for network visualization
  const cytoscapeElements = useMemo(() => {
    const nodes = activeMeasures.map((measure) => ({
      data: {
        id: measure.id,
        label: measure.name,
        category: measure.category,
        riskLevel: measure.riskLevel,
        effectiveness: measure.effectivenessRating,
        unattributability: measure.unattributabilityScore,
        selected: selectedMeasures.includes(measure.id),
      },
    }));

    const edges = [];
    // Add compatibility edges between measures
    for (let i = 0; i < activeMeasures.length; i++) {
      for (let j = i + 1; j < activeMeasures.length; j++) {
        const measure1 = activeMeasures[i];
        const measure2 = activeMeasures[j];
        
        // Simple compatibility scoring based on category and risk level
        const categoryCompatibility = measure1.category === measure2.category ? 0.8 : 0.3;
        const riskCompatibility = Math.abs(
          (RISK_COLORS[measure1.riskLevel] ? 1 : 0) - 
          (RISK_COLORS[measure2.riskLevel] ? 1 : 0)
        ) < 2 ? 0.7 : 0.2;
        
        const compatibilityScore = (categoryCompatibility + riskCompatibility) / 2;
        
        if (compatibilityScore > 0.5) {
          edges.push({
            data: {
              id: `${measure1.id}-${measure2.id}`,
              source: measure1.id,
              target: measure2.id,
              compatibility: compatibilityScore,
            },
          });
        }
      }
    }

    return [...nodes, ...edges];
  }, [activeMeasures, selectedMeasures]);

  const cytoscapeStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(selected) ? "#2196f3" : "#9e9e9e"',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '10px',
        'width': 'mapData(effectiveness, 0, 1, 20, 60)',
        'height': 'mapData(effectiveness, 0, 1, 20, 60)',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 'mapData(compatibility, 0, 1, 1, 5)',
        'line-color': '#ccc',
        'opacity': 0.7,
      },
    },
  ];

  // Event handlers
  const handleMeasureSelect = (measureId) => {
    setSelectedMeasures(prev => 
      prev.includes(measureId)
        ? prev.filter(id => id !== measureId)
        : [...prev, measureId]
    );
  };

  const handleCombineMeasures = async () => {
    if (selectedMeasures.length < 2) {
      alert('Please select at least 2 measures to combine');
      return;
    }

    try {
      const result = await combineMeasures({
        variables: {
          ids: selectedMeasures,
          tuners,
          context: {
            timeframe: 'MEDIUM_TERM',
            geographicalScope: 'REGIONAL',
            resourceAvailability: 'MODERATE',
          },
        },
      });

      if (result.data?.combineMeasures?.success) {
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to combine measures:', error);
      alert('Failed to combine measures. Please try again.');
    }
  };

  const getRiskChip = (riskLevel) => (
    <Chip
      label={riskLevel}
      size="small"
      sx={{
        backgroundColor: RISK_COLORS[riskLevel],
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  );

  const getStatusChip = (status) => (
    <Chip
      label={status.replace('_', ' ')}
      size="small"
      sx={{
        backgroundColor: STATUS_COLORS[status],
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  );

  if (portfolioError || operationsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading data: {portfolioError?.message || operationsError?.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Active Measures Portfolio
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Military-grade intelligence operations management and simulation platform
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setTunersDialogOpen(true)}
        >
          Tune Parameters
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab
            label={
              <Badge badgeContent={totalMeasures} color="primary">
                Portfolio
              </Badge>
            }
            icon={<SecurityIcon />}
          />
          <Tab
            label={
              <Badge badgeContent={operations.length} color="error">
                Operations
              </Badge>
            }
            icon={<PsychologyIcon />}
          />
          <Tab label="Network View" icon={<TimelineIcon />} />
          <Tab label="Analytics" icon={<AssessmentIcon />} />
        </Tabs>
      </Box>

      {/* Portfolio Tab */}
      <TabPanel value={activeTab} index={0}>
        {/* Portfolio Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Measures
                </Typography>
                <Typography variant="h4">{totalMeasures}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Effectiveness
                </Typography>
                <Typography variant="h4">
                  {(portfolioStats.averageEffectiveness * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unattributable
                </Typography>
                <Typography variant="h4">
                  {portfolioStats.unattributablePercentage?.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Selected
                </Typography>
                <Typography variant="h4">{selectedMeasures.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refetchPortfolio}
            disabled={portfolioLoading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleCombineMeasures}
            disabled={selectedMeasures.length < 2 || combiningMeasures}
          >
            Combine Selected ({selectedMeasures.length})
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setOperationDialogOpen(true)}
            disabled={selectedMeasures.length === 0}
          >
            Create Operation
          </Button>
        </Box>

        {/* Measures Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Effectiveness</TableCell>
                <TableCell>Unattributability</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {portfolioLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : (
                activeMeasures.map((measure) => (
                  <TableRow
                    key={measure.id}
                    selected={selectedMeasures.includes(measure.id)}
                    hover
                    onClick={() => handleMeasureSelect(measure.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedMeasures.includes(measure.id)}
                        onChange={() => handleMeasureSelect(measure.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {measure.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {measure.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{measure.category}</TableCell>
                    <TableCell>{getRiskChip(measure.riskLevel)}</TableCell>
                    <TableCell>
                      <LinearProgress
                        variant="determinate"
                        value={measure.effectivenessRating * 100}
                        sx={{ width: 100, mr: 1 }}
                      />
                      {(measure.effectivenessRating * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {(measure.unattributabilityScore * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Operations Tab */}
      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Operations Management
        </Typography>
        <Typography color="text.secondary">
          Operational planning and execution interface will be displayed here.
        </Typography>
      </TabPanel>

      {/* Network View Tab */}
      <TabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Measures Compatibility Network
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Node size indicates effectiveness rating. Blue nodes are selected measures.
            Edges show compatibility between measures.
          </Typography>
        </Box>
        <Box sx={{ height: 600, border: '1px solid #ccc' }}>
          <CytoscapeComponent
            elements={cytoscapeElements}
            style={{ width: '100%', height: '100%' }}
            stylesheet={cytoscapeStylesheet}
            layout={{ name: 'cose', animate: true }}
            cy={(cy) => {
              cy.on('tap', 'node', (evt) => {
                const nodeId = evt.target.id();
                handleMeasureSelect(nodeId);
              });
            }}
          />
        </Box>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={activeTab} index={3}>
        <Typography variant="h6" gutterBottom>
          Operational Analytics Dashboard
        </Typography>
        <Typography color="text.secondary">
          Advanced analytics and reporting features will be displayed here.
        </Typography>
      </TabPanel>

      {/* Tuners Dialog */}
      <Dialog
        open={tunersDialogOpen}
        onClose={() => setTunersDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Portfolio Tuning Parameters</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Box>
              <Typography gutterBottom>Proportionality: {tuners.proportionality.toFixed(2)}</Typography>
              <Slider
                value={tuners.proportionality}
                onChange={(e, value) => setTuners({ ...tuners, proportionality: value })}
                min={0}
                max={1}
                step={0.01}
                marks={[
                  { value: 0, label: 'Low' },
                  { value: 0.5, label: 'Moderate' },
                  { value: 1, label: 'High' },
                ]}
              />
            </Box>
            <Box>
              <Typography gutterBottom>Risk Tolerance: {tuners.riskTolerance.toFixed(2)}</Typography>
              <Slider
                value={tuners.riskTolerance}
                onChange={(e, value) => setTuners({ ...tuners, riskTolerance: value })}
                min={0}
                max={1}
                step={0.01}
                marks={[
                  { value: 0, label: 'Conservative' },
                  { value: 0.5, label: 'Balanced' },
                  { value: 1, label: 'Aggressive' },
                ]}
              />
            </Box>
            <Box>
              <Typography gutterBottom>Ethical Index: {tuners.ethicalIndex.toFixed(2)}</Typography>
              <Slider
                value={tuners.ethicalIndex}
                onChange={(e, value) => setTuners({ ...tuners, ethicalIndex: value })}
                min={0}
                max={1}
                step={0.01}
                marks={[
                  { value: 0, label: 'Permissive' },
                  { value: 0.8, label: 'Standard' },
                  { value: 1, label: 'Strict' },
                ]}
              />
            </Box>
            <Box>
              <Typography gutterBottom>Unattributability Requirement: {tuners.unattributabilityRequirement.toFixed(2)}</Typography>
              <Slider
                value={tuners.unattributabilityRequirement}
                onChange={(e, value) => setTuners({ ...tuners, unattributabilityRequirement: value })}
                min={0}
                max={1}
                step={0.01}
                marks={[
                  { value: 0, label: 'None' },
                  { value: 0.7, label: 'High' },
                  { value: 1, label: 'Maximum' },
                ]}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTunersDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setTunersDialogOpen(false);
              refetchPortfolio();
            }}
            variant="contained"
          >
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Operation Dialog */}
      <Dialog
        open={operationDialogOpen}
        onClose={() => setOperationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Operation</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Operation Name"
              value={newOperation.name}
              onChange={(e) => setNewOperation({ ...newOperation, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newOperation.description}
              onChange={(e) => setNewOperation({ ...newOperation, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Classification Level</InputLabel>
              <Select
                value={newOperation.classification}
                onChange={(e) => setNewOperation({ ...newOperation, classification: e.target.value })}
                label="Classification Level"
              >
                <MenuItem value="UNCLASSIFIED">Unclassified</MenuItem>
                <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                <MenuItem value="SECRET">Secret</MenuItem>
                <MenuItem value="TOP_SECRET">Top Secret</MenuItem>
                <MenuItem value="SCI">SCI</MenuItem>
              </Select>
            </FormControl>
            {selectedMeasures.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Measures ({selectedMeasures.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedMeasures.map((measureId) => {
                    const measure = activeMeasures.find(m => m.id === measureId);
                    return measure ? (
                      <Chip
                        key={measureId}
                        label={measure.name}
                        onDelete={() => handleMeasureSelect(measureId)}
                        size="small"
                      />
                    ) : null;
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOperationDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setOperationDialogOpen(false);
              // Here you would call createOperation mutation
              console.log('Creating operation:', newOperation, 'with measures:', selectedMeasures);
            }}
            variant="contained"
            disabled={!newOperation.name || !newOperation.description || selectedMeasures.length === 0}
          >
            Create Operation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PortfolioDashboard;