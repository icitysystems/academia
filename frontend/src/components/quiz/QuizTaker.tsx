import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Card,
  CardContent,
  Stepper,
  Step,
  StepButton,
  Tooltip,
  Badge,
  Divider,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Flag as FlagIcon,
  FlagOutlined as FlagOutlinedIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Send as SubmitIcon,
  CheckCircle as AnsweredIcon,
  RadioButtonUnchecked as UnansweredIcon,
  Warning as WarningIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkOutlinedIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_QUIZ_FOR_TAKING,
  START_QUIZ_ATTEMPT,
  SAVE_QUIZ_RESPONSE,
  SUBMIT_QUIZ_ATTEMPT,
} from '../../graphql/operations';

interface QuizTakerProps {
  quizId?: string;
  onComplete?: (result: any) => void;
  onExit?: () => void;
}

interface Question {
  id: string;
  type: string;
  questionText: string;
  questionMedia?: string;
  options?: string;
  marks: number;
  negativeMarks: number;
  isRequired: boolean;
  orderIndex: number;
}

interface Response {
  questionId: string;
  response: string | string[];
  flagged: boolean;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const QuizTaker: React.FC<QuizTakerProps> = ({ quizId: propQuizId, onComplete, onExit }) => {
  const params = useParams<{ quizId: string }>();
  const quizId = propQuizId || params.quizId || '';
  
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, Response>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmitDialog, setConfirmSubmitDialog] = useState(false);
  const [timeWarningShown, setTimeWarningShown] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  const { data: quizData, loading: quizLoading } = useQuery(GET_QUIZ_FOR_TAKING, {
    variables: { quizId },
    skip: !quizId,
  });

  const [startAttempt] = useMutation(START_QUIZ_ATTEMPT, {
    onCompleted: (data) => {
      setAttemptId(data.startQuizAttempt.id);
      if (data.startQuizAttempt.quiz.duration) {
        setTimeRemaining(data.startQuizAttempt.quiz.duration * 60);
      }
    },
  });

  const [saveResponse] = useMutation(SAVE_QUIZ_RESPONSE);

  const [submitAttempt] = useMutation(SUBMIT_QUIZ_ATTEMPT, {
    onCompleted: (data) => {
      setIsSubmitting(false);
      onComplete?.(data.submitQuizAttempt);
    },
  });

  const quiz = quizData?.quizForTaking;
  const questions: Question[] = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Start attempt on mount
  useEffect(() => {
    if (quiz && !attemptId) {
      startAttempt({ variables: { quizId } });
    }
  }, [quiz, attemptId, startAttempt, quizId]);

  // Timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        // Show warning at 5 minutes
        if (prev === 300 && !timeWarningShown) {
          setTimeWarningShown(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining, timeWarningShown]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      autoSaveResponses();
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [responses]);

  const autoSaveResponses = useCallback(async () => {
    if (!attemptId || responses.size === 0) return;

    setAutoSaveStatus('saving');
    try {
      const responsesArray = Array.from(responses.values());
      for (const response of responsesArray) {
        await saveResponse({
          variables: {
            input: {
              attemptId,
              questionId: response.questionId,
              response: JSON.stringify(response.response),
              flagged: response.flagged,
            },
          },
        });
      }
      setAutoSaveStatus('saved');
    } catch (err) {
      setAutoSaveStatus('error');
    }
  }, [attemptId, responses, saveResponse]);

  const handleResponseChange = (questionId: string, value: string | string[]) => {
    setResponses((prev) => {
      const newResponses = new Map(prev);
      const existing = newResponses.get(questionId);
      newResponses.set(questionId, {
        questionId,
        response: value,
        flagged: existing?.flagged || false,
      });
      return newResponses;
    });
  };

  const toggleFlag = (questionId: string) => {
    setResponses((prev) => {
      const newResponses = new Map(prev);
      const existing = newResponses.get(questionId);
      newResponses.set(questionId, {
        questionId,
        response: existing?.response || '',
        flagged: !existing?.flagged,
      });
      return newResponses;
    });
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    
    setConfirmSubmitDialog(false);
    setIsSubmitting(true);

    // Save all responses first
    await autoSaveResponses();

    // Submit the attempt
    submitAttempt({ variables: { attemptId } });
  };

  const getQuestionStatus = (questionId: string): 'answered' | 'unanswered' | 'flagged' => {
    const response = responses.get(questionId);
    if (response?.flagged) return 'flagged';
    if (response?.response && 
        (Array.isArray(response.response) ? response.response.length > 0 : response.response)) {
      return 'answered';
    }
    return 'unanswered';
  };

  const answeredCount = Array.from(responses.values()).filter(
    (r) => r.response && (Array.isArray(r.response) ? r.response.length > 0 : r.response)
  ).length;

  const flaggedCount = Array.from(responses.values()).filter((r) => r.flagged).length;

  const renderQuestion = (question: Question) => {
    const response = responses.get(question.id);
    const options = question.options ? JSON.parse(question.options) : [];

    switch (question.type) {
      case 'MCQ':
        return (
          <RadioGroup
            value={response?.response || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          >
            {options.map((option: { id: string; text: string }, index: number) => (
              <FormControlLabel
                key={option.id || index}
                value={option.id || option.text}
                control={<Radio />}
                label={option.text}
                sx={{
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'grey.50' },
                  ...(response?.response === (option.id || option.text) && {
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                  }),
                }}
              />
            ))}
          </RadioGroup>
        );

      case 'TRUE_FALSE':
        return (
          <RadioGroup
            value={response?.response || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          >
            <FormControlLabel value="true" control={<Radio />} label="True" />
            <FormControlLabel value="false" control={<Radio />} label="False" />
          </RadioGroup>
        );

      case 'MULTI_SELECT':
        const selectedOptions = Array.isArray(response?.response) ? response!.response : [];
        return (
          <Box>
            {options.map((option: { id: string; text: string }, index: number) => (
              <FormControlLabel
                key={option.id || index}
                control={
                  <Checkbox
                    checked={selectedOptions.includes(option.id || option.text)}
                    onChange={(e) => {
                      const value = option.id || option.text;
                      if (e.target.checked) {
                        handleResponseChange(question.id, [...selectedOptions, value]);
                      } else {
                        handleResponseChange(question.id, selectedOptions.filter((v) => v !== value));
                      }
                    }}
                  />
                }
                label={option.text}
                sx={{ display: 'block', mb: 1 }}
              />
            ))}
          </Box>
        );

      case 'SHORT_ANSWER':
        return (
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter your answer..."
            value={response?.response || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
        );

      case 'ESSAY':
        return (
          <TextField
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            placeholder="Write your answer..."
            value={response?.response || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          />
        );

      case 'FILL_BLANK':
        return (
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Fill in the blank..."
            value={response?.response || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter your answer..."
            value={response?.response || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          />
        );
    }
  };

  if (quizLoading || !quiz) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading quiz...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', pb: 4 }}>
      {/* Header */}
      <Paper
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        elevation={2}
      >
        <Box>
          <Typography variant="h6">{quiz.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {answeredCount}/{questions.length} answered
            {flaggedCount > 0 && ` • ${flaggedCount} flagged`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Auto-save status */}
          <Typography variant="caption" color="text.secondary">
            {autoSaveStatus === 'saving' && 'Saving...'}
            {autoSaveStatus === 'saved' && 'Auto-saved'}
            {autoSaveStatus === 'error' && 'Save failed'}
          </Typography>

          {/* Timer */}
          {timeRemaining !== null && (
            <Chip
              icon={<TimerIcon />}
              label={formatTime(timeRemaining)}
              color={timeRemaining < 300 ? 'error' : 'default'}
              sx={{ fontWeight: 'bold', fontSize: '1rem' }}
            />
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<SubmitIcon />}
            onClick={() => setConfirmSubmitDialog(true)}
            disabled={isSubmitting}
          >
            Submit Quiz
          </Button>
        </Box>
      </Paper>

      {/* Time Warning */}
      {timeWarningShown && timeRemaining !== null && timeRemaining <= 300 && (
        <Alert severity="warning" sx={{ m: 2 }}>
          <WarningIcon sx={{ mr: 1 }} />
          Less than 5 minutes remaining!
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3, p: 3, maxWidth: 1400, mx: 'auto' }}>
        {/* Question Navigator */}
        <Paper sx={{ width: 200, p: 2, height: 'fit-content', position: 'sticky', top: 100 }}>
          <Typography variant="subtitle2" gutterBottom>
            Questions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {questions.map((q, index) => {
              const status = getQuestionStatus(q.id);
              return (
                <Tooltip key={q.id} title={`Question ${index + 1}`}>
                  <IconButton
                    size="small"
                    onClick={() => setCurrentQuestionIndex(index)}
                    sx={{
                      width: 36,
                      height: 36,
                      border: '2px solid',
                      borderColor:
                        index === currentQuestionIndex
                          ? 'primary.main'
                          : status === 'answered'
                          ? 'success.main'
                          : status === 'flagged'
                          ? 'warning.main'
                          : 'grey.300',
                      bgcolor:
                        status === 'answered'
                          ? 'success.light'
                          : status === 'flagged'
                          ? 'warning.light'
                          : 'transparent',
                    }}
                  >
                    {status === 'flagged' ? (
                      <FlagIcon fontSize="small" color="warning" />
                    ) : (
                      <Typography variant="caption">{index + 1}</Typography>
                    )}
                  </IconButton>
                </Tooltip>
              );
            })}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', borderRadius: 1 }} />
              <Typography variant="caption">Answered ({answeredCount})</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: 'warning.light', borderRadius: 1 }} />
              <Typography variant="caption">Flagged ({flaggedCount})</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: 'grey.200', borderRadius: 1, border: '1px solid grey' }} />
              <Typography variant="caption">Unanswered ({questions.length - answeredCount})</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Question Content */}
        <Paper sx={{ flex: 1, p: 3 }}>
          {currentQuestion && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </Typography>
                  <Chip
                    label={`${currentQuestion.marks} marks`}
                    size="small"
                    color="primary"
                    sx={{ mt: 1 }}
                  />
                  {currentQuestion.negativeMarks > 0 && (
                    <Chip
                      label={`-${currentQuestion.negativeMarks} for wrong`}
                      size="small"
                      color="error"
                      sx={{ mt: 1, ml: 1 }}
                    />
                  )}
                </Box>
                <Tooltip title={responses.get(currentQuestion.id)?.flagged ? 'Unflag' : 'Flag for review'}>
                  <IconButton onClick={() => toggleFlag(currentQuestion.id)}>
                    {responses.get(currentQuestion.id)?.flagged ? (
                      <FlagIcon color="warning" />
                    ) : (
                      <FlagOutlinedIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
                {currentQuestion.questionText}
              </Typography>

              {currentQuestion.questionMedia && (
                <Box sx={{ my: 2 }}>
                  <img
                    src={currentQuestion.questionMedia}
                    alt="Question media"
                    style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
                  />
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                {renderQuestion(currentQuestion)}
              </Box>

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  variant="outlined"
                  startIcon={<PrevIcon />}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="contained"
                  endIcon={<NextIcon />}
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                  }
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Submit Confirmation Dialog */}
      <Dialog open={confirmSubmitDialog} onClose={() => setConfirmSubmitDialog(false)}>
        <DialogTitle>Submit Quiz?</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to submit your quiz?
          </Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Answered:</strong> {answeredCount} / {questions.length}
            </Typography>
            {questions.length - answeredCount > 0 && (
              <Typography variant="body2" color="error">
                <strong>Unanswered:</strong> {questions.length - answeredCount}
              </Typography>
            )}
            {flaggedCount > 0 && (
              <Typography variant="body2" color="warning.main">
                <strong>Flagged for review:</strong> {flaggedCount}
              </Typography>
            )}
          </Box>
          {questions.length - answeredCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You have unanswered questions. Are you sure you want to submit?
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmitDialog(false)}>Review Answers</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizTaker;
