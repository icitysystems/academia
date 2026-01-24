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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Stack,
  Slider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

// Icons
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const GET_QUESTION_BANK = gql`
  query GetQuestionBank($subject: String, $type: String) {
    questionBank(subject: $subject, type: $type) {
      id
      text
      type
      subject
      difficulty
      marks
      markingGuide
      usageCount
    }
  }
`;

const SAVE_EXAM_PAPER = gql`
  mutation SaveExamPaper($input: ExamPaperInput!) {
    saveExamPaper(input: $input) {
      id
      title
      status
    }
  }
`;

const GENERATE_MARKING_GUIDE = gql`
  mutation GenerateMarkingGuide($examPaperId: ID!) {
    generateMarkingGuide(examPaperId: $examPaperId) {
      id
      sections {
        questionId
        markingCriteria
        sampleAnswers
      }
    }
  }
`;

interface Question {
  id: string;
  type: 'MCQ' | 'SHORT_ANSWER' | 'ESSAY' | 'PROBLEM_SOLVING' | 'FILL_BLANK';
  text: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
  markingGuide?: string;
  rubric?: {
    criteria: string;
    marks: number;
  }[];
}

interface ExamSection {
  id: string;
  title: string;
  instructions: string;
  questions: Question[];
}

const ExamPaperBuilder: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { examId } = useParams();
  
  const [activeStep, setActiveStep] = useState(0);
  const [examTitle, setExamTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState(120);
  const [totalMarks, setTotalMarks] = useState(100);
  const [sections, setSections] = useState<ExamSection[]>([
    { id: '1', title: 'Section A', instructions: 'Answer ALL questions', questions: [] }
  ]);
  const [selectedSection, setSelectedSection] = useState(0);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [markingGuideGenerated, setMarkingGuideGenerated] = useState(false);

  const [saveExamPaper] = useMutation(SAVE_EXAM_PAPER);
  const [generateMarkingGuide] = useMutation(GENERATE_MARKING_GUIDE);

  const { data: questionBankData } = useQuery(GET_QUESTION_BANK, {
    variables: { subject },
    skip: !questionBankOpen || !subject,
  });

  const steps = [
    { label: 'Basic Information', description: 'Set exam title, subject, and duration' },
    { label: 'Add Questions', description: 'Create or import questions' },
    { label: 'Marking Guide', description: 'Define marking criteria and rubrics' },
    { label: 'Review & Publish', description: 'Review and publish the exam' },
  ];

  const questionTypes = [
    { value: 'MCQ', label: 'Multiple Choice', icon: '◯' },
    { value: 'SHORT_ANSWER', label: 'Short Answer', icon: '✏️' },
    { value: 'ESSAY', label: 'Essay', icon: '📝' },
    { value: 'PROBLEM_SOLVING', label: 'Problem Solving', icon: '🧮' },
    { value: 'FILL_BLANK', label: 'Fill in the Blank', icon: '___' },
  ];

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: String(sections.length + 1),
        title: `Section ${String.fromCharCode(65 + sections.length)}`,
        instructions: '',
        questions: [],
      },
    ]);
  };

  const addQuestion = (type: string) => {
    setCurrentQuestion({
      id: `q-${Date.now()}`,
      type: type as Question['type'],
      text: '',
      marks: 5,
      options: type === 'MCQ' ? ['', '', '', ''] : undefined,
      markingGuide: '',
      rubric: [],
    });
    setQuestionDialogOpen(true);
  };

  const saveQuestion = () => {
    if (!currentQuestion) return;

    const updatedSections = [...sections];
    const existingIndex = updatedSections[selectedSection].questions.findIndex(
      q => q.id === currentQuestion.id
    );

    if (existingIndex >= 0) {
      updatedSections[selectedSection].questions[existingIndex] = currentQuestion;
    } else {
      updatedSections[selectedSection].questions.push(currentQuestion);
    }

    setSections(updatedSections);
    setQuestionDialogOpen(false);
    setCurrentQuestion(null);
  };

  const deleteQuestion = (sectionIndex: number, questionIndex: number) => {
    const updatedSections = [...sections];
    updatedSections[sectionIndex].questions.splice(questionIndex, 1);
    setSections(updatedSections);
  };

  const calculateTotalMarks = () => {
    return sections.reduce((total, section) => 
      total + section.questions.reduce((sum, q) => sum + q.marks, 0), 0
    );
  };

  const handleGenerateMarkingGuide = async () => {
    // This would call the ML service to generate marking guides
    setMarkingGuideGenerated(true);
  };

  const handleSave = async (publish: boolean = false) => {
    try {
      await saveExamPaper({
        variables: {
          input: {
            id: examId,
            title: examTitle,
            subject,
            duration,
            totalMarks,
            sections: sections.map(s => ({
              title: s.title,
              instructions: s.instructions,
              questions: s.questions.map(q => ({
                type: q.type,
                text: q.text,
                marks: q.marks,
                options: q.options,
                correctAnswer: q.correctAnswer,
                markingGuide: q.markingGuide,
                rubric: q.rubric,
              })),
            })),
            status: publish ? 'PUBLISHED' : 'DRAFT',
          },
        },
      });
      navigate('/grading');
    } catch (error) {
      console.error('Error saving exam:', error);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', pb: 4 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', py: 3 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate(-1)}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Exam Paper Builder
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create and configure exam papers with ML-assisted marking guides
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
              >
                Preview
              </Button>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => handleSave(false)}
              >
                Save Draft
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleSave(true)}
                disabled={calculateTotalMarks() === 0}
              >
                Publish
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {/* Stepper */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel 
                      onClick={() => setActiveStep(index)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <Typography fontWeight={activeStep === index ? 'bold' : 'normal'}>
                        {step.label}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              <Divider sx={{ my: 3 }} />

              {/* Summary */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Exam Summary
              </Typography>
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                <Typography variant="body2">
                  Sections: <strong>{sections.length}</strong>
                </Typography>
                <Typography variant="body2">
                  Questions: <strong>{sections.reduce((t, s) => t + s.questions.length, 0)}</strong>
                </Typography>
                <Typography variant="body2">
                  Total Marks: <strong>{calculateTotalMarks()}</strong>
                </Typography>
                <Typography variant="body2">
                  Duration: <strong>{duration} min</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            {/* Step 0: Basic Information */}
            {activeStep === 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Basic Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Exam Title"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="e.g., Midterm Examination - Introduction to Computer Science"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Subject</InputLabel>
                      <Select
                        value={subject}
                        label="Subject"
                        onChange={(e) => setSubject(e.target.value)}
                      >
                        <MenuItem value="mathematics">Mathematics</MenuItem>
                        <MenuItem value="science">Science</MenuItem>
                        <MenuItem value="english">English</MenuItem>
                        <MenuItem value="computer_science">Computer Science</MenuItem>
                        <MenuItem value="history">History</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Duration (minutes)"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography gutterBottom>Total Marks: {totalMarks}</Typography>
                    <Slider
                      value={totalMarks}
                      onChange={(_, v) => setTotalMarks(v as number)}
                      min={10}
                      max={200}
                      step={5}
                      marks={[
                        { value: 50, label: '50' },
                        { value: 100, label: '100' },
                        { value: 150, label: '150' },
                        { value: 200, label: '200' },
                      ]}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    onClick={() => setActiveStep(1)}
                    disabled={!examTitle || !subject}
                  >
                    Next: Add Questions
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Step 1: Add Questions */}
            {activeStep === 1 && (
              <>
                {/* Section Tabs */}
                <Paper sx={{ mb: 3 }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {sections.map((section, index) => (
                        <Chip
                          key={section.id}
                          label={section.title}
                          onClick={() => setSelectedSection(index)}
                          color={selectedSection === index ? 'primary' : 'default'}
                          variant={selectedSection === index ? 'filled' : 'outlined'}
                          sx={{ my: 1 }}
                        />
                      ))}
                      <IconButton size="small" onClick={addSection}>
                        <AddIcon />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Box sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Section Title"
                          value={sections[selectedSection]?.title || ''}
                          onChange={(e) => {
                            const updated = [...sections];
                            updated[selectedSection].title = e.target.value;
                            setSections(updated);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Instructions"
                          value={sections[selectedSection]?.instructions || ''}
                          onChange={(e) => {
                            const updated = [...sections];
                            updated[selectedSection].instructions = e.target.value;
                            setSections(updated);
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                {/* Add Question Buttons */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Add Question
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {questionTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant="outlined"
                        size="small"
                        onClick={() => addQuestion(type.value)}
                        startIcon={<span>{type.icon}</span>}
                      >
                        {type.label}
                      </Button>
                    ))}
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LibraryBooksIcon />}
                      onClick={() => setQuestionBankOpen(true)}
                    >
                      From Question Bank
                    </Button>
                  </Stack>
                </Paper>

                {/* Questions List */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Questions ({sections[selectedSection]?.questions.length || 0})
                  </Typography>

                  {sections[selectedSection]?.questions.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography color="text.secondary">
                        No questions yet. Click the buttons above to add questions.
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {sections[selectedSection].questions.map((question, index) => (
                        <ListItem 
                          key={question.id}
                          sx={{ 
                            bgcolor: 'grey.50', 
                            mb: 1, 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          <DragIndicatorIcon sx={{ mr: 2, color: 'text.disabled', cursor: 'grab' }} />
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography fontWeight="medium">
                                  Q{index + 1}. {question.text.substring(0, 80)}
                                  {question.text.length > 80 && '...'}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                <Chip label={question.type} size="small" />
                                <Chip 
                                  label={`${question.marks} marks`} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                />
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setCurrentQuestion(question);
                                setQuestionDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteQuestion(selectedSection, index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setActiveStep(0)}>Back</Button>
                  <Button 
                    variant="contained" 
                    onClick={() => setActiveStep(2)}
                    disabled={calculateTotalMarks() === 0}
                  >
                    Next: Marking Guide
                  </Button>
                </Box>
              </>
            )}

            {/* Step 2: Marking Guide */}
            {activeStep === 2 && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Marking Guide & Rubrics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Define marking criteria for each question or let AI generate suggestions
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerateMarkingGuide}
                    disabled={markingGuideGenerated}
                  >
                    {markingGuideGenerated ? 'Guide Generated' : 'Generate with AI'}
                  </Button>
                </Box>

                {markingGuideGenerated && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    ML-assisted marking guide has been generated. Review and adjust as needed.
                  </Alert>
                )}

                {sections.map((section, sectionIndex) => (
                  <Box key={section.id} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {section.title}
                    </Typography>
                    
                    {section.questions.map((question, qIndex) => (
                      <Card key={question.id} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight="medium">
                            Q{qIndex + 1}. {question.text} ({question.marks} marks)
                          </Typography>
                          
                          <Box sx={{ mt: 2 }}>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="Marking Guide / Model Answer"
                              value={question.markingGuide || ''}
                              onChange={(e) => {
                                const updated = [...sections];
                                updated[sectionIndex].questions[qIndex].markingGuide = e.target.value;
                                setSections(updated);
                              }}
                              placeholder="Enter the expected answer or marking criteria..."
                            />
                          </Box>

                          {question.type === 'ESSAY' && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Rubric Criteria
                              </Typography>
                              <Grid container spacing={1}>
                                {['Content', 'Organization', 'Language', 'Grammar'].map((criterion) => (
                                  <Grid item xs={6} sm={3} key={criterion}>
                                    <TextField
                                      size="small"
                                      label={criterion}
                                      type="number"
                                      fullWidth
                                      InputProps={{ inputProps: { min: 0, max: question.marks } }}
                                    />
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ))}

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setActiveStep(1)}>Back</Button>
                  <Button variant="contained" onClick={() => setActiveStep(3)}>
                    Next: Review
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Step 3: Review & Publish */}
            {activeStep === 3 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Review Exam Paper
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                  Review all details before publishing. Once published, students can take this exam.
                </Alert>

                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Title</Typography>
                        <Typography fontWeight="medium">{examTitle || 'Untitled'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Subject</Typography>
                        <Typography fontWeight="medium">{subject || 'Not set'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Duration</Typography>
                        <Typography fontWeight="medium">{duration} minutes</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Total Marks</Typography>
                        <Typography fontWeight="medium">{calculateTotalMarks()} marks</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Questions Overview
                </Typography>

                {sections.map((section) => (
                  <Box key={section.id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {section.title} ({section.questions.length} questions, {
                        section.questions.reduce((s, q) => s + q.marks, 0)
                      } marks)
                    </Typography>
                    <Box sx={{ ml: 2, mt: 1 }}>
                      {section.questions.map((q, i) => (
                        <Box key={q.id} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                          <Chip label={q.type} size="small" variant="outlined" />
                          <Typography variant="body2">
                            Q{i + 1}: {q.text.substring(0, 50)}{q.text.length > 50 && '...'} ({q.marks} marks)
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setActiveStep(2)}>Back</Button>
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" onClick={() => handleSave(false)}>
                      Save as Draft
                    </Button>
                    <Button variant="contained" onClick={() => handleSave(true)}>
                      Publish Exam
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Question Dialog */}
      <Dialog 
        open={questionDialogOpen} 
        onClose={() => setQuestionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentQuestion?.id.startsWith('q-') ? 'Add Question' : 'Edit Question'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Question Text"
              multiline
              rows={3}
              value={currentQuestion?.text || ''}
              onChange={(e) => setCurrentQuestion(curr => curr ? { ...curr, text: e.target.value } : null)}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={currentQuestion?.type || 'MCQ'}
                  label="Type"
                  onChange={(e) => setCurrentQuestion(curr => curr ? { 
                    ...curr, 
                    type: e.target.value as Question['type'],
                    options: e.target.value === 'MCQ' ? ['', '', '', ''] : undefined
                  } : null)}
                >
                  {questionTypes.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Marks"
                type="number"
                value={currentQuestion?.marks || 0}
                onChange={(e) => setCurrentQuestion(curr => curr ? { ...curr, marks: Number(e.target.value) } : null)}
                sx={{ width: 100 }}
              />
            </Box>

            {currentQuestion?.type === 'MCQ' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Options</Typography>
                <RadioGroup
                  value={currentQuestion.correctAnswer || ''}
                  onChange={(e) => setCurrentQuestion(curr => curr ? { ...curr, correctAnswer: e.target.value } : null)}
                >
                  {currentQuestion.options?.map((option, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <FormControlLabel
                        value={String.fromCharCode(65 + index)}
                        control={<Radio />}
                        label=""
                        sx={{ mr: 1 }}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        label={`Option ${String.fromCharCode(65 + index)}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(currentQuestion.options || [])];
                          newOptions[index] = e.target.value;
                          setCurrentQuestion(curr => curr ? { ...curr, options: newOptions } : null);
                        }}
                      />
                    </Box>
                  ))}
                </RadioGroup>
              </Box>
            )}

            {currentQuestion?.type !== 'MCQ' && (
              <TextField
                fullWidth
                label="Model Answer / Marking Guide"
                multiline
                rows={4}
                value={currentQuestion?.markingGuide || ''}
                onChange={(e) => setCurrentQuestion(curr => curr ? { ...curr, markingGuide: e.target.value } : null)}
                placeholder="Enter the expected answer or key points for marking..."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveQuestion}>Save Question</Button>
        </DialogActions>
      </Dialog>

      {/* Question Bank Dialog */}
      <Dialog
        open={questionBankOpen}
        onClose={() => setQuestionBankOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Question Bank</DialogTitle>
        <DialogContent>
          {questionBankData?.questionBank?.length > 0 ? (
            <List>
              {questionBankData.questionBank.map((q: any) => (
                <ListItem key={q.id} button>
                  <ListItemText
                    primary={q.text}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={q.type} size="small" />
                        <Chip label={`${q.marks} marks`} size="small" />
                        <Chip label={q.difficulty} size="small" variant="outlined" />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton>
                      <ContentCopyIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LibraryBooksIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                No questions in the bank for this subject
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionBankOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamPaperBuilder;
