import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
} from '@mui/material';
import { CheckCircle, Error, Warning, Info, Rocket, Build } from '@mui/icons-material';

interface ReleaseInfo {
  version: string;
  buildDate: string;
  commitHash: string;
  environment: string;
  features: string[];
  ready: boolean;
}

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

interface DeploymentStatus {
  validated: boolean;
  sbomGenerated: boolean;
  testsPass: boolean;
  ready: boolean;
  validations: ValidationResult[];
}

const GAReleaseStatus: React.FC = () => {
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReleaseData();
  }, []);

  const fetchReleaseData = async () => {
    try {
      setLoading(true);

      const [infoResponse, statusResponse] = await Promise.all([
        fetch('/api/ga-release/info'),
        fetch('/api/ga-release/status'),
      ]);

      if (!infoResponse.ok || !statusResponse.ok) {
        throw new Error('Failed to fetch release data');
      }

      const infoData = await infoResponse.json();
      const statusData = await statusResponse.json();

      setReleaseInfo(infoData.data);
      setDeploymentStatus(statusData.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const generateSBOM = async () => {
    try {
      const response = await fetch('/api/ga-release/generate-sbom', {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh status after SBOM generation
        fetchReleaseData();
      }
    } catch (err) {
      setError('Failed to generate SBOM');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle color="success" />;
      case 'fail':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">Error: {error}</Typography>
        <Button onClick={fetchReleaseData} variant="outlined" sx={{ mt: 1 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        <Rocket sx={{ mr: 1, verticalAlign: 'middle' }} />
        GA Release Status
      </Typography>

      <Grid container spacing={3}>
        {/* Release Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Release Information
              </Typography>
              {releaseInfo && (
                <Box>
                  <Typography>
                    <strong>Version:</strong> {releaseInfo.version}
                  </Typography>
                  <Typography>
                    <strong>Environment:</strong> {releaseInfo.environment}
                  </Typography>
                  <Typography>
                    <strong>Commit:</strong> {releaseInfo.commitHash.substring(0, 8)}
                  </Typography>
                  <Typography>
                    <strong>Build Date:</strong> {new Date(releaseInfo.buildDate).toLocaleString()}
                  </Typography>

                  <Box mt={2}>
                    <Chip
                      label={releaseInfo.ready ? 'Ready for Deployment' : 'Not Ready'}
                      color={releaseInfo.ready ? 'success' : 'warning'}
                      icon={releaseInfo.ready ? <CheckCircle /> : <Warning />}
                    />
                  </Box>

                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Features:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {releaseInfo.features.map((feature) => (
                        <Chip key={feature} label={feature} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Deployment Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deployment Validation
              </Typography>
              {deploymentStatus && (
                <Box>
                  <Box mb={2}>
                    <Chip
                      label={deploymentStatus.ready ? 'Validation Passed' : 'Validation Issues'}
                      color={deploymentStatus.ready ? 'success' : 'error'}
                    />
                  </Box>

                  <Grid container spacing={1} mb={2}>
                    <Grid item xs={6}>
                      <Chip
                        label={`Tests: ${deploymentStatus.testsPass ? 'Pass' : 'Fail'}`}
                        color={deploymentStatus.testsPass ? 'success' : 'error'}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Chip
                        label={`SBOM: ${deploymentStatus.sbomGenerated ? 'Generated' : 'Missing'}`}
                        color={deploymentStatus.sbomGenerated ? 'success' : 'warning'}
                        size="small"
                      />
                    </Grid>
                  </Grid>

                  {!deploymentStatus.sbomGenerated && (
                    <Button
                      onClick={generateSBOM}
                      variant="outlined"
                      size="small"
                      startIcon={<Build />}
                      sx={{ mb: 2 }}
                    >
                      Generate SBOM
                    </Button>
                  )}

                  <List dense>
                    {deploymentStatus.validations.map((validation, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>{getStatusIcon(validation.status)}</ListItemIcon>
                        <ListItemText
                          primary={validation.component}
                          secondary={validation.message}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GAReleaseStatus;
