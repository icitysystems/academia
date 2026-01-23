import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  Skeleton,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

const GET_QUESTION_BANK = gql`
  query GetQuestionBank($filter: QuestionBankFilterInput) {
    questionBank(filter: $filter) {
      items {
        id
        questionText
        questionType
        subject
        topic
        difficulty
        bloomsLevel
        marks
        createdAt
      }
      total
      page
      pageSize
    }
  }
`;

const CREATE_QUESTION = gql`
  mutation CreateQuestionBankItem($input: CreateQuestionBankInput!) {
    createQuestionBankItem(input: $input) {
      id
    }
  }
`;

const DELETE_QUESTION = gql`
  mutation DeleteQuestionBankItem($id: ID!) {
    deleteQuestionBankItem(id: $id)
  }
`;

const QuestionBank: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    questionType: 'MULTIPLE_CHOICE',
    subject: '',
    topic: '',
    difficulty: 'MEDIUM',
    bloomsLevel: 'KNOWLEDGE',
    marks: 1,
    options: [] as string[],
    correctAnswer: '',
    explanation: '',
  });
  const [newOption, setNewOption] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_QUESTION_BANK, {
    variables: {
      filter: {
        search: searchQuery || undefined,
        subject: selectedSubject || undefined,
        difficulty: selectedDifficulty || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      },
    },
  });

  const [createQuestion, { loading: creating }] = useMutation(CREATE_QUESTION, {
    onCompleted: () => {
      setCreateDialogOpen(false);
      resetNewQuestion();
      refetch();
    },
  });

  const [deleteQuestion] = useMutation(DELETE_QUESTION, {
    onCompleted: () => refetch(),
  });

  const resetNewQuestion = () => {
    setNewQuestion({
      questionText: '',
      questionType: 'MULTIPLE_CHOICE',
      subject: '',
      topic: '',
      difficulty: 'MEDIUM',
      bloomsLevel: 'KNOWLEDGE',
      marks: 1,
      options: [],
      correctAnswer: '',
      explanation: '',
    });
    setNewOption('');
  };

  const questions = data?.questionBank?.items || [];
  const total = data?.questionBank?.total || 0;

  const handleAddOption = () => {
    if (newOption.trim()) {
      setNewQuestion({
        ...newQuestion,
        options: [...newQuestion.options, newOption.trim()],
      });
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setNewQuestion({
      ...newQuestion,
      options: newQuestion.options.filter((_, i) => i !== index),
    });
  };

  const handleCreate = () => {
    createQuestion({
      variables: {
        input: {
          ...newQuestion,
          marks: Number(newQuestion.marks),
          options: newQuestion.options.length > 0 ? newQuestion.options : undefined,
        },
      },
    });
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

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'MCQ';
      case 'TRUE_FALSE':
        return 'T/F';
      case 'SHORT_ANSWER':
        return 'Short';
      case 'ESSAY':
        return 'Essay';
      case 'FILL_BLANK':
        return 'Fill';
      default:
        return type;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Question Bank
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your repository of questions for exams and quizzes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Question
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                label="Subject"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <MenuItem value="">All Subjects</MenuItem>
                <MenuItem value="Mathematics">Mathematics</MenuItem>
                <MenuItem value="Physics">Physics</MenuItem>
                <MenuItem value="Chemistry">Chemistry</MenuItem>
                <MenuItem value="Biology">Biology</MenuItem>
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="Computer Science">Computer Science</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={selectedDifficulty}
                label="Difficulty"
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="EASY">Easy</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HARD">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Typography variant="body2" color="text.secondary">
              {total} questions found
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {loading ? (
        <Skeleton variant="rectangular" height={400} />
      ) : questions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LibraryBooksIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No questions found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Add questions to build your question bank
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add First Question
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Topic</TableCell>
                <TableCell>Difficulty</TableCell>
                <TableCell>Bloom's</TableCell>
                <TableCell>Marks</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questions.map((question: any) => (
                <TableRow key={question.id} hover>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography noWrap>{question.questionText}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getQuestionTypeLabel(question.questionType)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{question.subject}</TableCell>
                  <TableCell>{question.topic}</TableCell>
                  <TableCell>
                    <Chip
                      label={question.difficulty}
                      size="small"
                      color={getDifficultyColor(question.difficulty) as any}
                    />
                  </TableCell>
                  <TableCell>{question.bloomsLevel}</TableCell>
                  <TableCell>{question.marks}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteQuestion({ variables: { id: question.id } })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Question</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Question Text"
                value={newQuestion.questionText}
                onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                fullWidth
                multiline
                rows={3}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Question Type</InputLabel>
                <Select
                  value={newQuestion.questionType}
                  label="Question Type"
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                >
                  <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                  <MenuItem value="TRUE_FALSE">True/False</MenuItem>
                  <MenuItem value="SHORT_ANSWER">Short Answer</MenuItem>
                  <MenuItem value="ESSAY">Essay</MenuItem>
                  <MenuItem value="FILL_BLANK">Fill in the Blank</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={newQuestion.difficulty}
                  label="Difficulty"
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                >
                  <MenuItem value="EASY">Easy</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HARD">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Subject"
                value={newQuestion.subject}
                onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Topic"
                value={newQuestion.topic}
                onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Bloom's Taxonomy Level</InputLabel>
                <Select
                  value={newQuestion.bloomsLevel}
                  label="Bloom's Taxonomy Level"
                  onChange={(e) => setNewQuestion({ ...newQuestion, bloomsLevel: e.target.value })}
                >
                  <MenuItem value="KNOWLEDGE">Knowledge</MenuItem>
                  <MenuItem value="COMPREHENSION">Comprehension</MenuItem>
                  <MenuItem value="APPLICATION">Application</MenuItem>
                  <MenuItem value="ANALYSIS">Analysis</MenuItem>
                  <MenuItem value="SYNTHESIS">Synthesis</MenuItem>
                  <MenuItem value="EVALUATION">Evaluation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Marks"
                type="number"
                value={newQuestion.marks}
                onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                fullWidth
              />
            </Grid>

            {newQuestion.questionType === 'MULTIPLE_CHOICE' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Options
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add option"
                      fullWidth
                    />
                    <Button onClick={handleAddOption} variant="outlined">
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {newQuestion.options.map((option, index) => (
                      <Chip
                        key={index}
                        label={`${String.fromCharCode(65 + index)}. ${option}`}
                        onDelete={() => handleRemoveOption(index)}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Correct Answer</InputLabel>
                    <Select
                      value={newQuestion.correctAnswer}
                      label="Correct Answer"
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    >
                      {newQuestion.options.map((option, index) => (
                        <MenuItem key={index} value={option}>
                          {String.fromCharCode(65 + index)}. {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                label="Explanation / Answer Guide"
                value={newQuestion.explanation}
                onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newQuestion.questionText || !newQuestion.subject}
          >
            Add Question
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuestionBank;
