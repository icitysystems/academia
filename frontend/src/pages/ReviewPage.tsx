import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Pagination,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  ArrowBack,
} from '@mui/icons-material';
import {
  GET_RESULTS_NEEDING_REVIEW,
  REVIEW_GRADING_RESULT,
  GET_GRADING_STATS,
} from '../graphql/queries';

const ReviewPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [newScore, setNewScore] = useState(0);
  const [newCorrectness, setNewCorrectness] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const { data, loading, refetch } = useQuery(GET_RESULTS_NEEDING_REVIEW, {
    variables: { templateId },
    skip: !templateId,
  });

  const { data: statsData } = useQuery(GET_GRADING_STATS, {
    variables: { templateId },
    skip: !templateId,
  });

  const [reviewResult, { loading: reviewing }] = useMutation(REVIEW_GRADING_RESULT, {
    onCompleted: () => {
      setReviewDialogOpen(false);
      setSelectedResult(null);
      refetch();
    },
  });

  const results = data?.resultsNeedingReview || [];
  const stats = statsData?.gradingStats;
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const paginatedResults = results.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleReview = (result: any) => {
    setSelectedResult(result);
    setNewScore(result.assignedScore);
    setNewCorrectness(result.predictedCorrectness);
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedResult) return;
    await reviewResult({
      variables: {
        input: {
          resultId: selectedResult.id,
          assignedScore: newScore,
          predictedCorrectness: newCorrectness,
        },
      },
    });
  };

  const handleQuickApprove = async (result: any) => {
    await reviewResult({
      variables: {
        input: {
          resultId: result.id,
          assignedScore: result.assignedScore,
          predictedCorrectness: result.predictedCorrectness,
        },
      },
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getCorrectnessIcon = (correctness: string) => {
    switch (correctness) {
      case 'CORRECT':
        return <CheckIcon color="success" />;
      case 'PARTIAL':
        return <WarningIcon color="warning" />;
      case 'INCORRECT':
        return <CloseIcon color="error" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/templates/${templateId}`)}
          >
            Back
          </Button>
          <Typography variant="h4">Review Grading Results</Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Chip
            label={`${results.length} items need review`}
            color="warning"
          />
          {stats && (
            <Chip
              label={`${stats.reviewed} reviewed`}
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {results.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            All caught up!
          </Typography>
          <Typography color="text.secondary">
            No grading results need review at this time.
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3}>
            {paginatedResults.map((result: any) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={result.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {result.sheet?.thumbnailUrl && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={result.sheet.thumbnailUrl}
                      alt="Answer sheet"
                      sx={{ objectFit: 'contain', bgcolor: 'grey.100' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {getCorrectnessIcon(result.predictedCorrectness)}
                      <Typography variant="h6">
                        {result.region?.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Student: {result.sheet?.studentName || 'Unknown'}
                    </Typography>
                    <Box display="flex" gap={1} mb={1}>
                      <Chip
                        size="small"
                        label={`Score: ${result.assignedScore}`}
                      />
                      <Chip
                        size="small"
                        label={`${(result.confidence * 100).toFixed(0)}%`}
                        color={getConfidenceColor(result.confidence)}
                      />
                    </Box>
                    {result.explanation && (
                      <Typography variant="caption" color="text.secondary">
                        {result.explanation}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => handleReview(result)}>
                      Review
                    </Button>
                    <Button
                      size="small"
                      color="success"
                      onClick={() => handleQuickApprove(result)}
                      disabled={reviewing}
                    >
                      Approve
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review Grading Result</DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Question: {selectedResult.region?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Student: {selectedResult.sheet?.studentName || 'Unknown'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                AI Prediction: {selectedResult.predictedCorrectness} (
                {(selectedResult.confidence * 100).toFixed(0)}% confidence)
              </Typography>
              {selectedResult.explanation && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {selectedResult.explanation}
                </Alert>
              )}

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Correctness</InputLabel>
                <Select
                  value={newCorrectness}
                  onChange={(e) => setNewCorrectness(e.target.value)}
                  label="Correctness"
                >
                  <MenuItem value="CORRECT">Correct</MenuItem>
                  <MenuItem value="PARTIAL">Partial</MenuItem>
                  <MenuItem value="INCORRECT">Incorrect</MenuItem>
                  <MenuItem value="SKIPPED">Skipped</MenuItem>
                </Select>
              </FormControl>

              <Typography gutterBottom>
                Score: {newScore}
              </Typography>
              <Slider
                value={newScore}
                onChange={(_, value) => setNewScore(value as number)}
                min={0}
                max={selectedResult.region?.points || 1}
                step={0.5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={reviewing}
          >
            {reviewing ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReviewPage;
