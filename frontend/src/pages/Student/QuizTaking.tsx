import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Timer as TimerIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Flag as FlagIcon,
  Send as SubmitIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { gql } from '@apollo/client';

// GraphQL queries and mutations
const GET_QUIZ_FOR_ATTEMPT = gql`
  query GetQuizForAttempt($quizId: ID!) {
    quiz(id: $quizId) {
      id
      title
      description
      timeLimit
      totalMarks
      passingMarks
      shuffleQuestions
      showResults
      questions {
        id
        questionText
        questionType
        marks
        options {
          id
          text
          orderIndex
        }
      }
    }
  }
`;

const START_QUIZ_ATTEMPT = gql`
  mutation StartQuizAttempt($quizId: ID!) {
    startQuizAttempt(quizId: $quizId) {
      id
      startedAt
      status
    }
  }
`;

const SUBMIT_QUIZ_ATTEMPT = gql`
  mutation SubmitQuizAttempt($attemptId: ID!, $answers: [QuizAnswerInput!]!) {
    submitQuizAttempt(attemptId: $attemptId, answers: $answers) {
      id
      totalScore
      maxScore
      percentage
      passed
      status
    }
  }
`;

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'MULTI_SELECT';
  marks: number;
  options: Array<{
    id: string;
    text: string;
    orderIndex: number;
  }>;
}

interface Answer {
  questionId: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
}

const QuizTakingInterface: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  // State
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Queries and mutations
  const { data: quizData, loading: quizLoading, error: quizError } = useQuery(GET_QUIZ_FOR_ATTEMPT, {
    variables: { quizId },
    skip: !quizId,
  });

  const [startAttempt, { loading: startingAttempt }] = useMutation(START_QUIZ_ATTEMPT);
  const [submitAttempt, { loading: submittingAttempt }] = useMutation(SUBMIT_QUIZ_ATTEMPT);

  const quiz = quizData?.quiz;
  const questions: QuizQuestion[] = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    if (!quizStarted || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        
        // Show warning at 5 minutes remaining
        if (prev === 300) {
          setShowTimeWarning(true);
        }
        
        // Auto-submit when time runs out
        if (prev === 1) {
          handleSubmitQuiz();
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start the quiz
  const handleStartQuiz = async () => {
    try {
      const { data } = await startAttempt({
        variables: { quizId },
      });
      
      setAttemptId(data.startQuizAttempt.id);
      setQuizStarted(true);
      
      if (quiz.timeLimit) {
        setTimeRemaining(quiz.timeLimit * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Failed to start quiz:', error);
    }
  };

  // Handle answer changes
  const handleAnswerChange = useCallback((questionId: string, value: any, type: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const currentAnswer = newAnswers.get(questionId) || { questionId };

      switch (type) {
        case 'MULTIPLE_CHOICE':
        case 'TRUE_FALSE':
          currentAnswer.selectedOptionId = value;
          break;
        case 'MULTI_SELECT':
          currentAnswer.selectedOptionIds = value;
          break;
        case 'SHORT_ANSWER':
        case 'ESSAY':
          currentAnswer.textAnswer = value;
          break;
      }

      newAnswers.set(questionId, currentAnswer);
      return newAnswers;
    });
  }, []);

  // Toggle flag on question
  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newFlags = new Set(prev);
      if (newFlags.has(questionId)) {
        newFlags.delete(questionId);
      } else {
        newFlags.add(questionId);
      }
      return newFlags;
    });
  };

  // Navigation
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!attemptId) return;

    try {
      const answersArray = Array.from(answers.values()).map((answer) => ({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        selectedOptionIds: answer.selectedOptionIds,
        textAnswer: answer.textAnswer,
      }));

      const { data } = await submitAttempt({
        variables: {
          attemptId,
          answers: answersArray,
        },
      });

      setResult(data.submitQuizAttempt);
      setSubmitted(true);
      setShowSubmitDialog(false);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  // Calculate progress
  const answeredCount = answers.size;
  const progress = (answeredCount / questions.length) * 100;

  // Loading state
  if (quizLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading quiz...</Typography>
      </Container>
    );
  }

  // Error state
  if (quizError || !quiz) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load quiz. Please try again later.
        </Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  // Results screen
  if (submitted && result) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Quiz Completed!
          </Typography>
          
          {quiz.showResults && (
            <>
              <Box sx={{ my: 4 }}>
                <Typography variant="h2" color={result.passed ? 'success.main' : 'error.main'}>
                  {result.percentage?.toFixed(1)}%
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {result.totalScore} / {result.maxScore} points
                </Typography>
              </Box>

              <Chip
                label={result.passed ? 'PASSED' : 'FAILED'}
                color={result.passed ? 'success' : 'error'}
                sx={{ fontSize: '1.2rem', py: 3, px: 4 }}
              />

              <Typography sx={{ mt: 3 }} color="text.secondary">
                Passing score: {quiz.passingMarks} / {quiz.totalMarks}
              </Typography>
            </>
          )}

          {!quiz.showResults && (
            <Typography sx={{ my: 4 }} color="text.secondary">
              Your answers have been submitted. Results will be available after review.
            </Typography>
          )}

          <Button
            variant="contained"
            onClick={() => navigate('/student/quizzes')}
            sx={{ mt: 4 }}
          >
            Back to Quizzes
          </Button>
        </Paper>
      </Container>
    );
  }

  // Pre-quiz instructions screen
  if (!quizStarted) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            {quiz.title}
          </Typography>
          
          {quiz.description && (
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {quiz.description}
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Quiz Information</Typography>
            <Typography>• Total Questions: {questions.length}</Typography>
            <Typography>• Total Marks: {quiz.totalMarks}</Typography>
            <Typography>• Passing Score: {quiz.passingMarks}</Typography>
            {quiz.timeLimit && (
              <Typography>• Time Limit: {quiz.timeLimit} minutes</Typography>
            )}
            {quiz.shuffleQuestions && (
              <Typography>• Questions will be shuffled</Typography>
            )}
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Once you start the quiz, you must complete it in one session. 
            {quiz.timeLimit && ` You will have ${quiz.timeLimit} minutes to complete it.`}
          </Alert>

          <Button
            variant="contained"
            size="large"
            onClick={handleStartQuiz}
            disabled={startingAttempt}
          >
            {startingAttempt ? 'Starting...' : 'Start Quiz'}
          </Button>
        </Paper>
      </Container>
    );
  }

  // Main quiz interface
  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{quiz.title}</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {timeRemaining !== null && (
            <Chip
              icon={<TimerIcon />}
              label={formatTime(timeRemaining)}
              color={timeRemaining < 300 ? 'error' : 'default'}
              sx={{ fontSize: '1rem' }}
            />
          )}
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SubmitIcon />}
            onClick={() => setShowSubmitDialog(true)}
          >
            Submit Quiz
          </Button>
        </Box>
      </Paper>

      {/* Progress bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Typography>
          <Typography variant="body2">
            {answeredCount} of {questions.length} answered
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} />
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Question panel */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6">
                  Question {currentQuestionIndex + 1}
                </Typography>
                <Box>
                  <Chip label={`${currentQuestion.marks} marks`} size="small" sx={{ mr: 1 }} />
                  <IconButton
                    onClick={() => toggleFlagQuestion(currentQuestion.id)}
                    color={flaggedQuestions.has(currentQuestion.id) ? 'warning' : 'default'}
                    size="small"
                  >
                    <FlagIcon />
                  </IconButton>
                </Box>
              </Box>

              <Typography sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                {currentQuestion.questionText}
              </Typography>

              {/* Answer input based on question type */}
              {(currentQuestion.questionType === 'MULTIPLE_CHOICE' || 
                currentQuestion.questionType === 'TRUE_FALSE') && (
                <RadioGroup
                  value={answers.get(currentQuestion.id)?.selectedOptionId || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, currentQuestion.questionType)}
                >
                  {currentQuestion.options
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((option) => (
                      <FormControlLabel
                        key={option.id}
                        value={option.id}
                        control={<Radio />}
                        label={option.text}
                        sx={{ mb: 1 }}
                      />
                    ))}
                </RadioGroup>
              )}

              {currentQuestion.questionType === 'MULTI_SELECT' && (
                <Box>
                  {currentQuestion.options
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((option) => {
                      const selectedIds = answers.get(currentQuestion.id)?.selectedOptionIds || [];
                      return (
                        <FormControlLabel
                          key={option.id}
                          control={
                            <Checkbox
                              checked={selectedIds.includes(option.id)}
                              onChange={(e) => {
                                const newSelected = e.target.checked
                                  ? [...selectedIds, option.id]
                                  : selectedIds.filter((id) => id !== option.id);
                                handleAnswerChange(currentQuestion.id, newSelected, 'MULTI_SELECT');
                              }}
                            />
                          }
                          label={option.text}
                          sx={{ display: 'block', mb: 1 }}
                        />
                      );
                    })}
                </Box>
              )}

              {currentQuestion.questionType === 'SHORT_ANSWER' && (
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type your answer here..."
                  value={answers.get(currentQuestion.id)?.textAnswer || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, 'SHORT_ANSWER')}
                />
              )}

              {currentQuestion.questionType === 'ESSAY' && (
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  placeholder="Type your essay answer here..."
                  value={answers.get(currentQuestion.id)?.textAnswer || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, 'ESSAY')}
                />
              )}

              {/* Navigation buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  startIcon={<PrevIcon />}
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  endIcon={<NextIcon />}
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === questions.length - 1}
                  variant="contained"
                >
                  Next
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Question navigator */}
        <Paper sx={{ width: 200, p: 2, alignSelf: 'flex-start' }}>
          <Typography variant="subtitle2" gutterBottom>
            Question Navigator
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {questions.map((q, index) => {
              const isAnswered = answers.has(q.id);
              const isFlagged = flaggedQuestions.has(q.id);
              const isCurrent = index === currentQuestionIndex;

              return (
                <Button
                  key={q.id}
                  variant={isCurrent ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => goToQuestion(index)}
                  sx={{
                    minWidth: 36,
                    bgcolor: isCurrent
                      ? 'primary.main'
                      : isAnswered
                      ? 'success.light'
                      : 'transparent',
                    borderColor: isFlagged ? 'warning.main' : undefined,
                    borderWidth: isFlagged ? 2 : 1,
                  }}
                >
                  {index + 1}
                </Button>
              );
            })}
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" display="block">
              <Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: 'success.light', mr: 1 }} />
              Answered
            </Typography>
            <Typography variant="caption" display="block">
              <Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, border: '2px solid', borderColor: 'warning.main', mr: 1 }} />
              Flagged
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Submit confirmation dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle>Submit Quiz?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {answeredCount < questions.length ? (
              <>
                <WarningIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
                You have answered {answeredCount} of {questions.length} questions.
                {questions.length - answeredCount} questions remain unanswered.
              </>
            ) : (
              'Are you sure you want to submit your quiz? This action cannot be undone.'
            )}
          </DialogContentText>
          {flaggedQuestions.size > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You have {flaggedQuestions.size} flagged question(s) for review.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)}>
            Continue Quiz
          </Button>
          <Button
            onClick={handleSubmitQuiz}
            variant="contained"
            color="primary"
            disabled={submittingAttempt}
          >
            {submittingAttempt ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Time warning dialog */}
      <Dialog open={showTimeWarning} onClose={() => setShowTimeWarning(false)}>
        <DialogTitle>
          <WarningIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          5 Minutes Remaining
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have 5 minutes left to complete the quiz. Please review your answers and submit before time runs out.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTimeWarning(false)} autoFocus>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizTakingInterface;
