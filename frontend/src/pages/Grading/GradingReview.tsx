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
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Stack,
  Slider,
  TextField,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import PublishIcon from '@mui/icons-material/Publish';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

const GET_GRADING_SESSION = gql`
  query GetGradingSession($sessionId: ID!) {
    gradingSession(id: $sessionId) {
      id
      examTitle
      courseName
      totalScripts
      gradedCount
      approvedCount
      rejectedCount
      status
      confidenceThreshold
      scripts {
        id
        studentName
        studentId
        submittedAt
        autoGradedScore
        reviewedScore
        status
        confidenceLevel
        flagged
        reviewNotes
        answers {
          questionId
          questionText
          studentAnswer
          modelAnswer
          autoScore
          maxScore
          confidence
          aiReasoning
          manualScore
        }
      }
    }
  }
`;

const APPROVE_GRADING = gql`
  mutation ApproveGrading($scriptId: ID!, $adjustedScores: [ScoreInput!]) {
    approveGrading(scriptId: $scriptId, adjustedScores: $adjustedScores) {
      id
      status
      reviewedScore
    }
  }
`;

const REJECT_GRADING = gql`
  mutation RejectGrading($scriptId: ID!, $reason: String!) {
    rejectGrading(scriptId: $scriptId, reason: $reason) {
      id
      status
    }
  }
`;

const PUBLISH_RESULTS = gql`
  mutation PublishResults($sessionId: ID!) {
    publishResults(sessionId: $sessionId) {
      id
      status
    }
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const GradingReview: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { sessionId } = useParams();
  
  const [selectedScript, setSelectedScript] = useState<number>(0);
  const [tabValue, setTabValue] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'low-confidence'>('all');
  const [adjustedScores, setAdjustedScores] = useState<Record<string, number>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);

  const { data, loading, error, refetch } = useQuery(GET_GRADING_SESSION, {
    variables: { sessionId },
  });

  const [approveGrading] = useMutation(APPROVE_GRADING, {
    onCompleted: () => {
      refetch();
      // Move to next script
      const scripts = getFilteredScripts();
      if (selectedScript < scripts.length - 1) {
        setSelectedScript(selectedScript + 1);
        setAdjustedScores({});
      }
    },
  });

  const [rejectGrading] = useMutation(REJECT_GRADING, {
    onCompleted: () => refetch(),
  });

  const [publishResults] = useMutation(PUBLISH_RESULTS, {
    onCompleted: () => {
      setPublishDialogOpen(false);
      navigate('/grading');
    },
  });

  const session = data?.gradingSession;
  const scripts = session?.scripts || [];

  const getFilteredScripts = () => {
    switch (filterStatus) {
      case 'pending':
        return scripts.filter((s: any) => s.status === 'PENDING_REVIEW');
      case 'low-confidence':
        return scripts.filter((s: any) => s.confidenceLevel < (session?.confidenceThreshold || 80));
      default:
        return scripts;
    }
  };

  const filteredScripts = getFilteredScripts();
  const currentScript = filteredScripts[selectedScript];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'success';
    if (confidence >= 80) return 'warning';
    return 'error';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon color="success" />;
      case 'REJECTED':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const handleApprove = () => {
    const scores = Object.keys(adjustedScores).length > 0 
      ? Object.entries(adjustedScores).map(([questionId, score]) => ({ questionId, score }))
      : undefined;
    
    approveGrading({
      variables: {
        scriptId: currentScript.id,
        adjustedScores: scores,
      },
    });
  };

  const handleReject = () => {
    rejectGrading({
      variables: {
        scriptId: currentScript.id,
        reason: reviewNotes || 'Manual review required',
      },
    });
  };

  const calculateAdjustedTotal = () => {
    if (!currentScript) return 0;
    return currentScript.answers.reduce((total: number, answer: any) => {
      const score = adjustedScores[answer.questionId] ?? answer.autoScore;
      return total + score;
    }, 0);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>Loading grading session...</Typography>
        </Box>
      </Container>
    );
  }

  if (error || !session) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load grading session</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', pb: 4 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', py: 2 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate('/grading')}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {session.examTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.courseName} • {session.totalScripts} scripts
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              {/* Progress Summary */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`${session.approvedCount} Approved`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<WarningIcon />}
                  label={`${session.totalScripts - session.approvedCount - session.rejectedCount} Pending`}
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  icon={<ErrorIcon />}
                  label={`${session.rejectedCount} Rejected`}
                  color="error"
                  variant="outlined"
                />
              </Box>

              <IconButton onClick={() => refetch()}>
                <RefreshIcon />
              </IconButton>

              <Button
                variant="contained"
                startIcon={<PublishIcon />}
                onClick={() => setPublishDialogOpen(true)}
                disabled={session.approvedCount < session.totalScripts * 0.8}
              >
                Publish Results
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          {/* Scripts List Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Scripts ({filteredScripts.length})
                </Typography>
                <IconButton size="small">
                  <FilterListIcon />
                </IconButton>
              </Box>

              {/* Filter Tabs */}
              <Tabs
                value={filterStatus}
                onChange={(_, v) => {
                  setFilterStatus(v);
                  setSelectedScript(0);
                }}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="All" value="all" />
                <Tab 
                  label={
                    <Badge 
                      badgeContent={scripts.filter((s: any) => s.status === 'PENDING_REVIEW').length} 
                      color="warning"
                    >
                      Pending
                    </Badge>
                  } 
                  value="pending" 
                />
                <Tab 
                  label={
                    <Badge 
                      badgeContent={scripts.filter((s: any) => s.confidenceLevel < 80).length} 
                      color="error"
                    >
                      Low
                    </Badge>
                  } 
                  value="low-confidence" 
                />
              </Tabs>

              {/* Scripts List */}
              <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                {filteredScripts.map((script: any, index: number) => (
                  <ListItem
                    key={script.id}
                    button
                    selected={selectedScript === index}
                    onClick={() => {
                      setSelectedScript(index);
                      setAdjustedScores({});
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      border: selectedScript === index ? '2px solid' : '1px solid',
                      borderColor: selectedScript === index ? 'primary.main' : 'divider',
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {script.studentName?.charAt(0) || 'S'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {script.studentName || script.studentId}
                          </Typography>
                          {getStatusIcon(script.status)}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption">
                            Score: {script.reviewedScore || script.autoGradedScore}
                          </Typography>
                          <Chip
                            label={`${script.confidenceLevel}%`}
                            size="small"
                            color={getConfidenceColor(script.confidenceLevel) as any}
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        </Box>
                      }
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  size="small"
                  startIcon={<NavigateBeforeIcon />}
                  disabled={selectedScript === 0}
                  onClick={() => setSelectedScript(selectedScript - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  endIcon={<NavigateNextIcon />}
                  disabled={selectedScript === filteredScripts.length - 1}
                  onClick={() => setSelectedScript(selectedScript + 1)}
                >
                  Next
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Main Review Area */}
          <Grid item xs={12} md={9}>
            {currentScript ? (
              <>
                {/* Script Header */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {currentScript.studentName || currentScript.studentId}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Submitted: {new Date(currentScript.submittedAt).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Card variant="outlined" sx={{ px: 2, py: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Auto Score
                          </Typography>
                          <Typography variant="h5" fontWeight="bold">
                            {currentScript.autoGradedScore}
                          </Typography>
                        </Card>
                        {Object.keys(adjustedScores).length > 0 && (
                          <Card variant="outlined" sx={{ px: 2, py: 1, borderColor: 'primary.main' }}>
                            <Typography variant="caption" color="primary">
                              Adjusted Score
                            </Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary">
                              {calculateAdjustedTotal()}
                            </Typography>
                          </Card>
                        )}
                        <Chip
                          icon={<PsychologyIcon />}
                          label={`${currentScript.confidenceLevel}% Confidence`}
                          color={getConfidenceColor(currentScript.confidenceLevel) as any}
                          sx={{ height: 40 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Answers Review */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Answer Review
                  </Typography>

                  <Stack spacing={3}>
                    {currentScript.answers.map((answer: any, index: number) => (
                      <Card 
                        key={answer.questionId} 
                        variant="outlined"
                        sx={{
                          borderColor: answer.confidence < 80 ? 'warning.main' : 'divider',
                          borderWidth: answer.confidence < 80 ? 2 : 1,
                        }}
                      >
                        <CardContent>
                          {/* Question Header */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Question {index + 1}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`${answer.autoScore}/${answer.maxScore}`}
                                size="small"
                                color={answer.autoScore === answer.maxScore ? 'success' : 
                                       answer.autoScore === 0 ? 'error' : 'warning'}
                              />
                              <Tooltip title="AI Confidence">
                                <Chip
                                  icon={<PsychologyIcon sx={{ fontSize: 14 }} />}
                                  label={`${answer.confidence}%`}
                                  size="small"
                                  variant="outlined"
                                  color={getConfidenceColor(answer.confidence) as any}
                                />
                              </Tooltip>
                            </Box>
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {answer.questionText}
                          </Typography>

                          <Divider sx={{ my: 2 }} />

                          {/* Student Answer vs Model Answer */}
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                Student's Answer
                              </Typography>
                              <Box 
                                sx={{ 
                                  bgcolor: 'grey.100', 
                                  p: 2, 
                                  borderRadius: 1,
                                  minHeight: 100,
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                <Typography variant="body2">
                                  {answer.studentAnswer || 'No answer provided'}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" color="success.main" gutterBottom>
                                Model Answer
                              </Typography>
                              <Box 
                                sx={{ 
                                  bgcolor: alpha(theme.palette.success.main, 0.1), 
                                  p: 2, 
                                  borderRadius: 1,
                                  minHeight: 100,
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                <Typography variant="body2">
                                  {answer.modelAnswer}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>

                          {/* AI Reasoning */}
                          {answer.aiReasoning && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                <PsychologyIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                AI Reasoning
                              </Typography>
                              <Box sx={{ bgcolor: 'info.50', p: 2, borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {answer.aiReasoning}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {/* Score Adjustment */}
                          <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Adjust Score
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Slider
                                value={adjustedScores[answer.questionId] ?? answer.autoScore}
                                onChange={(_, value) => setAdjustedScores({
                                  ...adjustedScores,
                                  [answer.questionId]: value as number
                                })}
                                min={0}
                                max={answer.maxScore}
                                step={0.5}
                                marks={[
                                  { value: 0, label: '0' },
                                  { value: answer.maxScore, label: String(answer.maxScore) },
                                ]}
                                valueLabelDisplay="auto"
                                sx={{ flexGrow: 1 }}
                              />
                              <TextField
                                size="small"
                                type="number"
                                value={adjustedScores[answer.questionId] ?? answer.autoScore}
                                onChange={(e) => setAdjustedScores({
                                  ...adjustedScores,
                                  [answer.questionId]: Number(e.target.value)
                                })}
                                inputProps={{ min: 0, max: answer.maxScore, step: 0.5 }}
                                sx={{ width: 80 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>

                  {/* Review Notes */}
                  <Box sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Review Notes (Optional)"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about this script..."
                    />
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<ThumbDownIcon />}
                      onClick={handleReject}
                    >
                      Reject & Flag for Manual Review
                    </Button>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        startIcon={<CompareArrowsIcon />}
                      >
                        Compare with Sample
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ThumbUpIcon />}
                        onClick={handleApprove}
                      >
                        Approve Grading
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              </>
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No scripts to review
                </Typography>
                <Typography color="text.secondary">
                  All scripts have been reviewed or no scripts match the current filter.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Publish Results Dialog */}
      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)}>
        <DialogTitle>Publish Results</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will make the grades visible to students.
          </Alert>
          <Typography gutterBottom>
            Summary:
          </Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            <Typography variant="body2">
              Total Scripts: {session?.totalScripts}
            </Typography>
            <Typography variant="body2">
              Approved: {session?.approvedCount}
            </Typography>
            <Typography variant="body2">
              Pending Review: {session?.totalScripts - session?.approvedCount - session?.rejectedCount}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => publishResults({ variables: { sessionId } })}
          >
            Publish Results
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GradingReview;
