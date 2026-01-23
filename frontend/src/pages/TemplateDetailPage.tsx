import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Upload as UploadIcon,
  PlayArrow as TrainIcon,
  Assessment as GradeIcon,
} from '@mui/icons-material';
import {
  GET_TEMPLATE,
  GET_SHEETS,
  GET_TRAINING_STATS,
  GET_GRADING_STATS,
  START_TRAINING,
  START_GRADING,
} from '../graphql/queries';

const TemplateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);

  const { data: templateData, loading } = useQuery(GET_TEMPLATE, {
    variables: { id },
    skip: !id,
  });

  const { data: sheetsData } = useQuery(GET_SHEETS, {
    variables: { templateId: id },
    skip: !id,
  });

  const { data: trainingStats } = useQuery(GET_TRAINING_STATS, {
    variables: { templateId: id },
    skip: !id,
  });

  const { data: gradingStats } = useQuery(GET_GRADING_STATS, {
    variables: { templateId: id },
    skip: !id,
  });

  const [startTraining, { loading: trainingLoading }] = useMutation(START_TRAINING);
  const [startGrading, { loading: gradingLoading }] = useMutation(START_GRADING);

  const template = templateData?.template;
  const sheets = sheetsData?.sheets || [];
  const stats = trainingStats?.trainingStats;
  const grading = gradingStats?.gradingStats;

  const handleTrain = () => {
    startTraining({
      variables: {
        input: { templateId: id },
      },
    });
  };

  const handleGrade = () => {
    const processedSheets = sheets
      .filter((s: any) => s.status === 'PROCESSED' || s.status === 'ANNOTATED')
      .map((s: any) => s.id);
    
    if (processedSheets.length > 0) {
      startGrading({
        variables: {
          input: {
            templateId: id,
            sheetIds: processedSheets,
          },
        },
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!template) {
    return (
      <Container>
        <Typography>Template not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">{template.name}</Typography>
          <Typography color="text.secondary">{template.description}</Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => navigate(`/templates/${id}/upload`)}
          >
            Upload Sheets
          </Button>
          <Button
            variant="outlined"
            startIcon={<TrainIcon />}
            onClick={handleTrain}
            disabled={trainingLoading || (stats?.trainingAnnotations || 0) < 5}
          >
            {trainingLoading ? 'Training...' : 'Train Model'}
          </Button>
          <Button
            variant="contained"
            startIcon={<GradeIcon />}
            onClick={handleGrade}
            disabled={gradingLoading || !stats?.activeModel}
          >
            {gradingLoading ? 'Grading...' : 'Grade Sheets'}
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3">{template._count?.sheets || 0}</Typography>
            <Typography color="text.secondary">Total Sheets</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3">{stats?.trainingAnnotations || 0}</Typography>
            <Typography color="text.secondary">Training Samples</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3">
              {stats?.activeModel ? `v${stats.activeModel.version}` : 'None'}
            </Typography>
            <Typography color="text.secondary">Active Model</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3">
              {stats?.activeModel?.accuracy 
                ? `${(stats.activeModel.accuracy * 100).toFixed(0)}%` 
                : 'N/A'}
            </Typography>
            <Typography color="text.secondary">Model Accuracy</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Questions (${template.regions?.length || 0})`} />
          <Tab label={`Sheets (${sheets.length})`} />
          <Tab label="Training" />
          <Tab label="Grading" />
        </Tabs>

        <Box p={3}>
          {/* Questions Tab */}
          {tab === 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {template.regions?.map((region: any, index: number) => (
                  <TableRow key={region.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{region.label}</TableCell>
                    <TableCell>
                      <Chip size="small" label={region.questionType} />
                    </TableCell>
                    <TableCell>{region.points}</TableCell>
                  </TableRow>
                ))}
                {(!template.regions || template.regions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">
                        No questions defined. Add questions to define answer regions.
                      </Typography>
                      <Button sx={{ mt: 1 }}>Add Questions</Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* Sheets Tab */}
          {tab === 1 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sheets.map((sheet: any) => (
                  <TableRow key={sheet.id}>
                    <TableCell>{sheet.studentName || sheet.studentId || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={sheet.status}
                        color={
                          sheet.status === 'GRADED' ? 'success' :
                          sheet.status === 'PROCESSED' ? 'info' :
                          sheet.status === 'ERROR' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(sheet.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => navigate(`/sheets/${sheet.id}`)}>
                        View
                      </Button>
                      <Button size="small" onClick={() => navigate(`/sheets/${sheet.id}/annotate`)}>
                        Annotate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Training Tab */}
          {tab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Training Status</Typography>
              <Box mb={2}>
                <Typography>
                  Training Annotations: {stats?.trainingAnnotations || 0}
                  {(stats?.trainingAnnotations || 0) < 5 && (
                    <Chip 
                      size="small" 
                      label="Need at least 5" 
                      color="warning" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
                <Typography>
                  Completed Sessions: {stats?.completedSessions || 0}
                </Typography>
              </Box>
              {stats?.activeModel && (
                <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                  <Typography variant="subtitle1">Active Model</Typography>
                  <Typography>Version: {stats.activeModel.version}</Typography>
                  <Typography>
                    Accuracy: {(stats.activeModel.accuracy * 100).toFixed(1)}%
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Grading Tab */}
          {tab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Grading Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="h4">{grading?.totalResults || 0}</Typography>
                  <Typography color="text.secondary">Total Graded</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="h4">{grading?.needsReview || 0}</Typography>
                  <Typography color="text.secondary">Needs Review</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="h4">{grading?.reviewed || 0}</Typography>
                  <Typography color="text.secondary">Reviewed</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="h4">
                    {grading?.averageConfidence 
                      ? `${(grading.averageConfidence * 100).toFixed(0)}%` 
                      : 'N/A'}
                  </Typography>
                  <Typography color="text.secondary">Avg Confidence</Typography>
                </Grid>
              </Grid>
              {(grading?.needsReview || 0) > 0 && (
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/templates/${id}/review`)}
                >
                  Review {grading?.needsReview} Items
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default TemplateDetailPage;
