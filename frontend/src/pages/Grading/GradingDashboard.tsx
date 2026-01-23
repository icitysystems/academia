import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Tooltip,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import SettingsIcon from '@mui/icons-material/Settings';

const GET_GRADING_OVERVIEW = gql`
  query GetGradingOverview {
    templates {
      id
      name
      description
      status
      totalSheets
      gradedSheets
      activeModel {
        id
        accuracy
        lastTrainedAt
      }
    }
    recentGradingJobs {
      id
      templateId
      status
      totalSheets
      processedSheets
      createdAt
      completedAt
      template {
        name
      }
    }
    gradingStats {
      totalTemplates
      totalGradedSheets
      averageAccuracy
      pendingReviews
    }
  }
`;

const START_BATCH_GRADING = gql`
  mutation StartBatchGrading($templateId: ID!, $sheetIds: [ID!]!) {
    startBatchGrading(templateId: $templateId, sheetIds: $sheetIds) {
      id
      status
    }
  }
`;

const GradingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_GRADING_OVERVIEW, {
    pollInterval: 10000, // Poll every 10 seconds for job status updates
  });

  const [startBatchGrading] = useMutation(START_BATCH_GRADING, {
    onCompleted: () => {
      setGradeDialogOpen(false);
      refetch();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon color="success" />;
      case 'RUNNING':
        return <PendingIcon color="info" />;
      case 'FAILED':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'RUNNING':
        return 'info';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const stats = data?.gradingStats || {};
  const templates = data?.templates || [];
  const recentJobs = data?.recentGradingJobs || [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            ML Grading System
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Automated grading powered by machine learning
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            component={RouterLink}
            to="/templates"
          >
            Manage Templates
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Total Templates
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {loading ? <Skeleton width={60} /> : stats.totalTemplates || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Sheets Graded
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {loading ? <Skeleton width={60} /> : stats.totalGradedSheets || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Average Accuracy
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {loading ? <Skeleton width={60} /> : `${stats.averageAccuracy || 0}%`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Pending Reviews
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {loading ? <Skeleton width={60} /> : stats.pendingReviews || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Templates" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="Grading Jobs" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Model Settings" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Templates Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))
          ) : templates.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No templates found
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                  Create a template to start grading
                </Typography>
                <Button variant="contained" component={RouterLink} to="/templates">
                  Create Template
                </Button>
              </Paper>
            </Grid>
          ) : (
            templates.map((template: any) => (
              <Grid item xs={12} md={4} key={template.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" noWrap>
                        {template.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={template.status}
                        color={template.status === 'ACTIVE' ? 'success' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description || 'No description'}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Grading Progress
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={
                            template.totalSheets > 0
                              ? (template.gradedSheets / template.totalSheets) * 100
                              : 0
                          }
                          sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="caption">
                          {template.gradedSheets || 0}/{template.totalSheets || 0}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {template.activeModel && (
                      <Box>
                        <Chip
                          size="small"
                          icon={<AutoAwesomeIcon />}
                          label={`${template.activeModel.accuracy}% accuracy`}
                          color="info"
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate(`/templates/${template.id}`)}
                    >
                      View
                    </Button>
                    <Box>
                      <Tooltip title="Upload Sheets">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/templates/${template.id}/upload`)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Start Grading">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!template.activeModel}
                          onClick={() => {
                            setSelectedTemplate(template.id);
                            setGradeDialogOpen(true);
                          }}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Grading Jobs Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : recentJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No grading jobs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recentJobs.map((job: any) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Typography variant="body2">{job.template?.name || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={getStatusIcon(job.status)}
                        label={job.status}
                        color={getStatusColor(job.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={
                            job.totalSheets > 0
                              ? (job.processedSheets / job.totalSheets) * 100
                              : 0
                          }
                          sx={{ width: 100 }}
                        />
                        <Typography variant="caption">
                          {job.processedSheets}/{job.totalSheets}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/templates/${job.templateId}/review`)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Model Settings Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            ML Model Configuration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Training Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Configure how models are trained for each template. Adjust parameters
                    like minimum training samples, confidence thresholds, and batch sizes.
                  </Typography>
                  <Button variant="outlined">Configure Training</Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Review Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Set thresholds for automatic approval vs. manual review. Define
                    confidence levels that trigger human verification.
                  </Typography>
                  <Button variant="outlined">Configure Reviews</Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Model settings are configured per template. Select a template from the
                Templates tab to modify its specific ML configuration.
              </Alert>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Grade Dialog */}
      <Dialog open={gradeDialogOpen} onClose={() => setGradeDialogOpen(false)}>
        <DialogTitle>Start Batch Grading</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            This will start grading all ungraded sheets for the selected template using
            the active ML model.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Make sure you have reviewed the model accuracy before proceeding.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGradeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => {
              if (selectedTemplate) {
                startBatchGrading({
                  variables: {
                    templateId: selectedTemplate,
                    sheetIds: [], // Backend will fetch ungraded sheets
                  },
                });
              }
            }}
          >
            Start Grading
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GradingDashboard;
