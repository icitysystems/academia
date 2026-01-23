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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Skeleton,
  Tabs,
  Tab,
  LinearProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QuizIcon from '@mui/icons-material/Quiz';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BarChartIcon from '@mui/icons-material/BarChart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';

const GET_QUIZZES = gql`
  query GetQuizzes($filter: QuizFilterInput) {
    quizzes(filter: $filter) {
      quizzes {
        id
        title
        description
        subject
        topic
        difficulty
        duration
        passingScore
        status
        isPublic
        questionCount
        attemptCount
        createdAt
      }
      total
    }
  }
`;

const CREATE_QUIZ = gql`
  mutation CreateQuiz($input: CreateQuizInput!) {
    createQuiz(input: $input) {
      id
      title
    }
  }
`;

const PUBLISH_QUIZ = gql`
  mutation PublishQuiz($id: ID!) {
    publishQuiz(id: $id) {
      id
      status
    }
  }
`;

const DELETE_QUIZ = gql`
  mutation DeleteQuiz($id: ID!) {
    deleteQuiz(id: $id)
  }
`;

const OnlineQuizzes: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    subject: '',
    topic: '',
    difficulty: 'MEDIUM',
    duration: 30,
    passingScore: 60,
    isPublic: false,
    shuffleQuestions: true,
    showResults: true,
    allowRetake: false,
  });

  const statusFilter = tabValue === 0 ? undefined : tabValue === 1 ? 'DRAFT' : 'PUBLISHED';

  const { data, loading, error, refetch } = useQuery(GET_QUIZZES, {
    variables: {
      filter: { status: statusFilter, page: 1, pageSize: 20 },
    },
  });

  const [createQuiz, { loading: creating }] = useMutation(CREATE_QUIZ, {
    onCompleted: () => {
      setCreateDialogOpen(false);
      setNewQuiz({
        title: '',
        description: '',
        subject: '',
        topic: '',
        difficulty: 'MEDIUM',
        duration: 30,
        passingScore: 60,
        isPublic: false,
        shuffleQuestions: true,
        showResults: true,
        allowRetake: false,
      });
      refetch();
    },
  });

  const [publishQuiz] = useMutation(PUBLISH_QUIZ, {
    onCompleted: () => refetch(),
  });

  const [deleteQuiz] = useMutation(DELETE_QUIZ, {
    onCompleted: () => refetch(),
  });

  const quizzes = data?.quizzes?.quizzes || [];

  const handleCreate = () => {
    createQuiz({
      variables: {
        input: {
          ...newQuiz,
          duration: Number(newQuiz.duration),
          passingScore: Number(newQuiz.passingScore),
        },
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'PUBLISHED':
        return 'success';
      case 'ARCHIVED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HARD':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleCopyLink = (quizId: string) => {
    const link = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Online Quizzes
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create interactive quizzes with automatic grading
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Quiz
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="All Quizzes" />
        <Tab label="Drafts" />
        <Tab label="Published" />
      </Tabs>

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={250} />
            </Grid>
          ))}
        </Grid>
      ) : quizzes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <QuizIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No quizzes found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Create your first quiz to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Quiz
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {quizzes.map((quiz: any) => (
            <Grid item xs={12} sm={6} md={4} key={quiz.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={quiz.status}
                      size="small"
                      color={getStatusColor(quiz.status) as any}
                    />
                    <Chip
                      label={quiz.difficulty}
                      size="small"
                      color={getDifficultyColor(quiz.difficulty) as any}
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom noWrap>
                    {quiz.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {quiz.subject} {quiz.topic && `• ${quiz.topic}`}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      mb: 2,
                    }}
                  >
                    {quiz.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      {quiz.questionCount || 0} questions
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {quiz.duration} mins
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pass: {quiz.passingScore}%
                    </Typography>
                  </Box>
                  {quiz.attemptCount > 0 && (
                    <Typography variant="caption" color="primary" display="block" sx={{ mt: 1 }}>
                      {quiz.attemptCount} attempts
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Box>
                    {quiz.status === 'DRAFT' && (
                      <Button
                        size="small"
                        onClick={() => publishQuiz({ variables: { id: quiz.id } })}
                      >
                        Publish
                      </Button>
                    )}
                    {quiz.status === 'PUBLISHED' && (
                      <Button size="small" startIcon={<PlayArrowIcon />}>
                        Preview
                      </Button>
                    )}
                  </Box>
                  <Box>
                    {quiz.status === 'PUBLISHED' && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleCopyLink(quiz.id)}
                        title="Copy link"
                      >
                        <LinkIcon />
                      </IconButton>
                    )}
                    <IconButton size="small" color="primary" title="View results">
                      <BarChartIcon />
                    </IconButton>
                    <IconButton size="small" color="primary" title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteQuiz({ variables: { id: quiz.id } })}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Quiz</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Quiz Title"
                value={newQuiz.title}
                onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={newQuiz.description}
                onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Subject"
                value={newQuiz.subject}
                onChange={(e) => setNewQuiz({ ...newQuiz, subject: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Topic"
                value={newQuiz.topic}
                onChange={(e) => setNewQuiz({ ...newQuiz, topic: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={newQuiz.difficulty}
                  label="Difficulty"
                  onChange={(e) => setNewQuiz({ ...newQuiz, difficulty: e.target.value })}
                >
                  <MenuItem value="EASY">Easy</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HARD">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                label="Duration (mins)"
                type="number"
                value={newQuiz.duration}
                onChange={(e) => setNewQuiz({ ...newQuiz, duration: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                label="Pass Score (%)"
                type="number"
                value={newQuiz.passingScore}
                onChange={(e) => setNewQuiz({ ...newQuiz, passingScore: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newQuiz.isPublic}
                      onChange={(e) => setNewQuiz({ ...newQuiz, isPublic: e.target.checked })}
                    />
                  }
                  label="Public Quiz"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newQuiz.shuffleQuestions}
                      onChange={(e) => setNewQuiz({ ...newQuiz, shuffleQuestions: e.target.checked })}
                    />
                  }
                  label="Shuffle Questions"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newQuiz.showResults}
                      onChange={(e) => setNewQuiz({ ...newQuiz, showResults: e.target.checked })}
                    />
                  }
                  label="Show Results"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newQuiz.allowRetake}
                      onChange={(e) => setNewQuiz({ ...newQuiz, allowRetake: e.target.checked })}
                    />
                  }
                  label="Allow Retake"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newQuiz.title || !newQuiz.subject}
          >
            Create Quiz
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OnlineQuizzes;
