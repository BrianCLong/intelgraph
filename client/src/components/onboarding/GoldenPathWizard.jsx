/**
 * Golden Path Wizard for IntelGraph
 * 
 * A guided tour that takes new users through the complete workflow:
 * 1. Create Investigation
 * 2. Add entities/links
 * 3. Import CSV or STIX/TAXII data
 * 4. Start Copilot analysis
 * 5. View results and annotations
 * 
 * Features:
 * - Step-by-step guidance
 * - Skip ahead option for experienced users
 * - Real-time validation
 * - Progress tracking
 * - Demo data option
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Grid,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  PlayArrow as PlayIcon,
  Visibility as ViewIcon,
  Help as HelpIcon,
  SkipNext as SkipIcon,
  Refresh as RefreshIcon,
  DataUsage as DataIcon,
  Timeline as TimelineIcon,
  AutoAwesome as AutoAwesomeIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import EcsIngestPanel from '../connectors/EcsIngestPanel';

// GraphQL operations (would be imported from actual files)
const CREATE_INVESTIGATION = `
  mutation CreateInvestigation($input: CreateInvestigationInput!) {
    createInvestigation(input: $input) {
      id
      name
      description
      status
    }
  }
`;

const CREATE_ENTITY = `
  mutation CreateEntity($input: CreateEntityInput!) {
    createEntity(input: $input) {
      id
      type
      name
      canonicalId
      properties
    }
  }
`;

const CREATE_RELATIONSHIP = `
  mutation CreateRelationship($input: CreateRelationshipInput!) {
    createRelationship(input: $input) {
      id
      type
      fromEntityId
      toEntityId
    }
  }
`;

const START_COPILOT_RUN = `
  mutation StartCopilotRun($goalText: String!, $investigationId: ID!) {
    startCopilotRun(goalText: $goalText, investigationId: $investigationId) {
      id
      goalText
      status
    }
  }
`;

const steps = [
  {
    label: 'Create Investigation',
    description: 'Set up a new investigation to organize your analysis',
    icon: <AddIcon />,
    estimatedTime: '1 min'
  },
  {
    label: 'Add Entities & Links',
    description: 'Add some entities and relationships to build your graph',
    icon: <DataIcon />,
    estimatedTime: '2-3 min'
  },
  {
    label: 'Import Data',
    description: 'Upload CSV files or connect STIX/TAXII feeds',
    icon: <UploadIcon />,
    estimatedTime: '2-5 min'
  },
  {
    label: 'Run Copilot',
    description: 'Let AI analyze your data and generate insights',
    icon: <AutoAwesomeIcon />,
    estimatedTime: '1-3 min'
  },
  {
    label: 'View Results',
    description: 'Explore the analysis results and graph annotations',
    icon: <ViewIcon />,
    estimatedTime: '5+ min'
  }
];

const GoldenPathWizard = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState({});
  const [wizardData, setWizardData] = useState({
    investigation: null,
    entities: [],
    relationships: [],
    importJob: null,
    copilotRun: null
  });
  const [useDemo, setUseDemo] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const navigate = useNavigate();

  // GraphQL mutations
  const [createInvestigation] = useMutation(CREATE_INVESTIGATION);
  const [createEntity] = useMutation(CREATE_ENTITY);
  const [createRelationship] = useMutation(CREATE_RELATIONSHIP);
  const [startCopilotRun] = useMutation(START_COPILOT_RUN);

  const [formData, setFormData] = useState({
    investigationName: '',
    investigationDescription: '',
    entityName: '',
    entityType: 'PERSON',
    canonicalId: '',
    copilotGoal: 'Find connections and analyze relationships between entities'
  });

  useEffect(() => {
    if (useDemo) {
      setFormData({
        investigationName: 'Demo Investigation: Corporate Network Analysis',
        investigationDescription: 'Analysis of corporate entities and their relationships to identify potential conflicts of interest',
        entityName: 'John Smith',
        entityType: 'PERSON',
        canonicalId: '',
        copilotGoal: 'Analyze the network to identify key players and potential hidden connections'
      });
    }
  }, [useDemo]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleComplete = (step) => {
    setCompleted(prev => ({ ...prev, [step]: true }));
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete(wizardData);
    }
    onClose();
  };

  const isStepCompleted = (step) => completed[step];

  // Step 1: Create Investigation
  const handleCreateInvestigation = async () => {
    try {
      const { data } = await createInvestigation({
        variables: {
          input: {
            name: formData.investigationName,
            description: formData.investigationDescription,
            type: 'THREAT_ANALYSIS'
          }
        }
      });

      setWizardData(prev => ({ ...prev, investigation: data.createInvestigation }));
      handleComplete(0);
      handleNext();
    } catch (error) {
      console.error('Failed to create investigation:', error);
    }
  };

  // Step 2: Add Entities
  const handleAddEntity = async () => {
    if (!wizardData.investigation) return;

    try {
      const { data } = await createEntity({
        variables: {
          input: {
            investigationId: wizardData.investigation.id,
            type: formData.entityType,
            name: formData.entityName,
            canonicalId: formData.canonicalId || undefined,
            properties: {
              source: 'wizard',
              demo: useDemo
            }
          }
        }
      });

      const entity = data.createEntity;
      setWizardData(prev => ({
        ...prev,
        entities: [...prev.entities, entity]
      }));

      // If using demo, add more entities and relationships
      if (useDemo) {
        await createDemoData();
      }

      handleComplete(1);
      handleNext();
    } catch (error) {
      console.error('Failed to create entity:', error);
    }
  };

  const createDemoData = async () => {
    const demoEntities = [
      { name: 'ACME Corporation', type: 'ORGANIZATION' },
      { name: 'TechStart Inc', type: 'ORGANIZATION' },
      { name: 'Jane Doe', type: 'PERSON' }
    ];

    const createdEntities = [];

    for (const entityData of demoEntities) {
      try {
        const { data } = await createEntity({
          variables: {
            input: {
              investigationId: wizardData.investigation.id,
              type: entityData.type,
              name: entityData.name,
              properties: { source: 'demo' }
            }
          }
        });
        createdEntities.push(data.createEntity);
      } catch (error) {
        console.error('Failed to create demo entity:', error);
      }
    }

    // Create demo relationships
    if (createdEntities.length >= 2) {
      try {
        await createRelationship({
          variables: {
            input: {
              investigationId: wizardData.investigation.id,
              type: 'WORKS_FOR',
              fromEntityId: wizardData.entities[0]?.id,
              toEntityId: createdEntities[0]?.id,
              properties: { role: 'CEO', since: '2020' }
            }
          }
        });
      } catch (error) {
        console.error('Failed to create demo relationship:', error);
      }
    }
  };

  // Step 4: Start Copilot
  const handleStartCopilot = async () => {
    if (!wizardData.investigation) return;

    try {
      const { data } = await startCopilotRun({
        variables: {
          goalText: formData.copilotGoal,
          investigationId: wizardData.investigation.id
        }
      });

      setWizardData(prev => ({ ...prev, copilotRun: data.startCopilotRun }));
      handleComplete(3);
      handleNext();
    } catch (error) {
      console.error('Failed to start Copilot run:', error);
    }
  };

  const handleFinish = () => {
    if (wizardData.investigation) {
      navigate(`/investigations/${wizardData.investigation.id}`);
    }
    
    if (onComplete) {
      onComplete(wizardData);
    }
    onClose();
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Let's start by creating a new investigation. This will be the container for all your analysis work.
            </Typography>
            
            <TextField
              fullWidth
              label="Investigation Name"
              value={formData.investigationName}
              onChange={(e) => setFormData(prev => ({ ...prev, investigationName: e.target.value }))}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={formData.investigationDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, investigationDescription: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
            />
            
            <Box mt={2}>
              <Button
                variant="contained"
                onClick={handleCreateInvestigation}
                disabled={!formData.investigationName.trim()}
                startIcon={<AddIcon />}
              >
                Create Investigation
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Now let's add some entities to your graph. Entities represent people, organizations, locations, or any other objects of interest.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Entity Name"
                  value={formData.entityName}
                  onChange={(e) => setFormData(prev => ({ ...prev, entityName: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Entity Type</InputLabel>
                  <Select
                    value={formData.entityType}
                    onChange={(e) => setFormData(prev => ({ ...prev, entityType: e.target.value }))}
                  >
                    <MenuItem value="PERSON">Person</MenuItem>
                    <MenuItem value="ORGANIZATION">Organization</MenuItem>
                    <MenuItem value="LOCATION">Location</MenuItem>
                    <MenuItem value="EVENT">Event</MenuItem>
                    <MenuItem value="ASSET">Asset</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Link Existing Entity ID"
                  value={formData.canonicalId}
                  onChange={(e) => setFormData(prev => ({ ...prev, canonicalId: e.target.value }))}
                  placeholder="Optional"
                />
              </Grid>
            </Grid>
            
            <Box mt={2}>
              <Button
                variant="contained"
                onClick={handleAddEntity}
                disabled={!formData.entityName.trim()}
                startIcon={<DataIcon />}
              >
                Add Entity
              </Button>
            </Box>

            {wizardData.entities.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Added Entities:
                </Typography>
                <List dense>
                  {wizardData.entities.map((entity) => (
                    <ListItem key={entity.id}>
                      <ListItemIcon>
                        {entity.canonicalId && entity.canonicalId !== entity.id ? (
                          <LinkIcon color="primary" />
                        ) : (
                          <CheckIcon color="success" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={entity.name}
                        secondary={entity.type}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Import data to enrich your investigation. You can upload CSV files or connect to STIX/TAXII feeds.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              For this tutorial, we'll simulate a data import. In the full application, you would:
              <ul>
                <li>Upload CSV files with entities and relationships</li>
                <li>Connect to TAXII feeds for threat intelligence</li>
                <li>Import STIX bundles</li>
              </ul>
            </Alert>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => {
                  setWizardData(prev => ({ ...prev, importJob: { id: 'demo-import', status: 'completed' } }));
                  handleComplete(2);
                  handleNext();
                }}
              >
                Simulate CSV Import
              </Button>

              <Button
                variant="outlined"
                startIcon={<TimelineIcon />}
                onClick={() => {
                  setWizardData(prev => ({ ...prev, importJob: { id: 'demo-stix', status: 'completed' } }));
                  handleComplete(2);
                  handleNext();
                }}
              >
                Simulate STIX Import
              </Button>
            </Box>
            <Box mt={3}>
              <EcsIngestPanel />
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Now let's run the AI Copilot to analyze your data and generate insights.
            </Typography>
            
            <TextField
              fullWidth
              label="Analysis Goal"
              value={formData.copilotGoal}
              onChange={(e) => setFormData(prev => ({ ...prev, copilotGoal: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
              helperText="Describe what you want the AI to analyze or discover"
            />
            
            <Box mt={2}>
              <Button
                variant="contained"
                onClick={handleStartCopilot}
                disabled={!formData.copilotGoal.trim()}
                startIcon={<AutoAwesomeIcon />}
              >
                Start Copilot Analysis
              </Button>
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Great! Your investigation is set up and the Copilot is analyzing your data.
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                🎉 Congratulations! You've completed the golden path:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Created an investigation" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Added entities and relationships" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Imported data" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Started AI analysis" />
                </ListItem>
              </List>
            </Alert>
            
            <Typography variant="body2" paragraph>
              Click "Open Investigation" to view your investigation and monitor the Copilot analysis in real-time.
            </Typography>
            
            <Box mt={2}>
              <Button
                variant="contained"
                onClick={handleFinish}
                startIcon={<ViewIcon />}
                size="large"
              >
                Open Investigation
              </Button>
            </Box>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">IntelGraph Quick Start</Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Use demo data">
              <Button
                size="small"
                variant={useDemo ? "contained" : "outlined"}
                onClick={() => setUseDemo(!useDemo)}
              >
                Demo Mode
              </Button>
            </Tooltip>
            <Tooltip title="Skip tutorial">
              <IconButton onClick={handleSkip} size="small">
                <SkipIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={3}>
          <Typography variant="body2" color="textSecondary" paragraph>
            Welcome to IntelGraph! This 5-step wizard will guide you through creating your first investigation,
            adding data, and running AI analysis. Estimated time: 5-15 minutes.
          </Typography>
          
          <LinearProgress 
            variant="determinate" 
            value={(activeStep / (steps.length - 1)) * 100}
            sx={{ mb: 2 }}
          />
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  <Typography variant="caption">
                    {step.estimatedTime}
                  </Typography>
                }
                StepIconComponent={() => (
                  isStepCompleted(index) ? 
                    <CheckIcon color="success" /> : 
                    index === activeStep ? 
                      step.icon : 
                      <UncheckedIcon color="disabled" />
                )}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {step.description}
                </Typography>
                {getStepContent(index)}
                
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                  {activeStep < steps.length - 1 && (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={!isStepCompleted(activeStep)}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Help Section */}
        <Collapse in={showHelp}>
          <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              Need Help?
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Demo Mode:</strong> Automatically fills in sample data to speed up the tutorial
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Skip:</strong> Jump to the main application if you're already familiar with the workflow
            </Typography>
            <Typography variant="body2">
              • <strong>Questions?</strong> Check the documentation or contact support
            </Typography>
          </Paper>
        </Collapse>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setShowHelp(!showHelp)} startIcon={<HelpIcon />}>
          {showHelp ? 'Hide Help' : 'Show Help'}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoldenPathWizard;