import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import {
  GET_SYLLABI,
  CREATE_SYLLABUS,
  IMPORT_SYLLABUS,
} from '../../graphql/operations';

const steps = ['Basic Information', 'Topics & Units', 'Time Allocation', 'Review & Generate'];

interface Topic {
  id: string;
  title: string;
  description: string;
  hours: number;
  subtopics: string[];
}

interface Syllabus {
  id: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  term: string;
  board: string;
  topics: Topic[];
  status: string;
  createdAt: string;
}

const SyllabusGenerator: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    subject: '',
    gradeLevel: '',
    academicYear: '',
    term: '',
    board: '',
  });
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: '1',
      title: 'Introduction to the Subject',
      description: 'Overview and foundational concepts',
      hours: 4,
      subtopics: ['Course overview', 'Learning objectives', 'Assessment criteria'],
    },
  ]);
  const [newTopic, setNewTopic] = useState({ title: '', description: '', hours: 2 });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // GraphQL queries and mutations
  const { data: syllabiData, loading: syllabiLoading, refetch } = useQuery(GET_SYLLABI);
  
  const [createSyllabus, { loading: creating }] = useMutation(CREATE_SYLLABUS, {
    onCompleted: () => {
      setSnackbar({ open: true, message: 'Syllabus created successfully!', severity: 'success' });
      refetch();
      // Reset form
      setActiveStep(0);
      setFormData({ subject: '', gradeLevel: '', academicYear: '', term: '', board: '' });
      setTopics([{
        id: '1',
        title: 'Introduction to the Subject',
        description: 'Overview and foundational concepts',
        hours: 4,
        subtopics: ['Course overview', 'Learning objectives', 'Assessment criteria'],
      }]);
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    },
  });

  const [importSyllabus, { loading: importing }] = useMutation(IMPORT_SYLLABUS, {
    onCompleted: (data) => {
      setSnackbar({ open: true, message: 'Syllabus imported successfully!', severity: 'success' });
      // Populate form with imported data
      if (data?.importSyllabus) {
        const imported = data.importSyllabus;
        setFormData({
          subject: imported.subject || '',
          gradeLevel: imported.gradeLevel || '',
          academicYear: imported.academicYear || '',
          term: imported.term || '',
          board: imported.board || '',
        });
        if (imported.topics) {
          setTopics(imported.topics);
        }
      }
      refetch();
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Import error: ${error.message}`, severity: 'error' });
    },
  });

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleAddTopic = () => {
    if (newTopic.title) {
      setTopics([
        ...topics,
        {
          id: Date.now().toString(),
          ...newTopic,
          subtopics: [],
        },
      ]);
      setNewTopic({ title: '', description: '', hours: 2 });
    }
  };

  const handleDeleteTopic = (id: string) => {
    setTopics(topics.filter((t) => t.id !== id));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setSnackbar({ open: true, message: 'Please select a file to import', severity: 'error' });
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await importSyllabus({
        variables: {
          input: {
            file: base64.split(',')[1], // Remove data:application/... prefix
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
          },
        },
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleGenerateSyllabus = async () => {
    if (!formData.subject || !formData.gradeLevel) {
      setSnackbar({ open: true, message: 'Please fill in required fields', severity: 'error' });
      return;
    }

    await createSyllabus({
      variables: {
        input: {
          subject: formData.subject,
          gradeLevel: formData.gradeLevel,
          academicYear: formData.academicYear,
          term: formData.term,
          board: formData.board,
          topics: topics.map(t => ({
            title: t.title,
            description: t.description,
            hours: t.hours,
            subtopics: t.subtopics,
          })),
        },
      },
    });
  };

  const totalHours = topics.reduce((sum, t) => sum + t.hours, 0);

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Subject Name"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Mathematics, Physics, English"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Grade Level</InputLabel>
                <Select
                  value={formData.gradeLevel}
                  label="Grade Level"
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                >
                  <MenuItem value="Form 1">Form 1</MenuItem>
                  <MenuItem value="Form 2">Form 2</MenuItem>
                  <MenuItem value="Form 3">Form 3</MenuItem>
                  <MenuItem value="Form 4">Form 4</MenuItem>
                  <MenuItem value="Form 5">Form 5</MenuItem>
                  <MenuItem value="Lower Sixth">Lower Sixth</MenuItem>
                  <MenuItem value="Upper Sixth">Upper Sixth</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Academic Year"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="e.g., 2025-2026"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Term</InputLabel>
                <Select
                  value={formData.term}
                  label="Term"
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                >
                  <MenuItem value="First Term">First Term</MenuItem>
                  <MenuItem value="Second Term">Second Term</MenuItem>
                  <MenuItem value="Third Term">Third Term</MenuItem>
                  <MenuItem value="Full Year">Full Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Examination Board / Curriculum</InputLabel>
                <Select
                  value={formData.board}
                  label="Examination Board / Curriculum"
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                >
                  <MenuItem value="GCE">GCE (Cambridge)</MenuItem>
                  <MenuItem value="WAEC">WAEC</MenuItem>
                  <MenuItem value="National">National Curriculum</MenuItem>
                  <MenuItem value="IB">International Baccalaureate</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                You can also import an existing syllabus document (PDF, DOCX, or Excel) to auto-populate topics.
              </Alert>
              <Box mt={2} display="flex" gap={2} alignItems="center">
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.doc,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="syllabus-import-input"
                />
                <label htmlFor="syllabus-import-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                  >
                    Select File
                  </Button>
                </label>
                {selectedFile && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {selectedFile.name}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleImport}
                      disabled={importing}
                      startIcon={importing ? <CircularProgress size={16} /> : null}
                    >
                      {importing ? 'Importing...' : 'Import'}
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Topics & Units
            </Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Topic Title"
                    value={newTopic.title}
                    onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={newTopic.description}
                    onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Hours"
                    type="number"
                    value={newTopic.hours}
                    onChange={(e) => setNewTopic({ ...newTopic, hours: parseInt(e.target.value) || 0 })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddTopic}
                    fullWidth
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <List>
              {topics.map((topic, index) => (
                <React.Fragment key={topic.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label={`Unit ${index + 1}`} size="small" color="primary" />
                          <Typography fontWeight="medium">{topic.title}</Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {topic.description}
                          </Typography>
                          <Chip label={`${topic.hours} hours`} size="small" sx={{ mt: 1 }} />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDeleteTopic(topic.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < topics.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2">
                <strong>Total Topics:</strong> {topics.length} | <strong>Total Hours:</strong> {totalHours}
              </Typography>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Time Allocation
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Distribute the {totalHours} hours across weeks. The system will automatically suggest a distribution based on topic complexity.
            </Alert>
            <Grid container spacing={2}>
              {topics.map((topic, index) => (
                <Grid item xs={12} key={topic.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium">
                            Week {index + 1}-{index + Math.ceil(topic.hours / 2)}: {topic.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {topic.hours} hours allocated
                          </Typography>
                        </Box>
                        <TextField
                          label="Adjust Hours"
                          type="number"
                          value={topic.hours}
                          size="small"
                          sx={{ width: 100 }}
                          onChange={(e) => {
                            const newHours = parseInt(e.target.value) || 0;
                            setTopics(topics.map(t => 
                              t.id === topic.id ? { ...t, hours: newHours } : t
                            ));
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Generate
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Syllabus Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Subject</Typography>
                    <Typography fontWeight="medium">{formData.subject || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Grade Level</Typography>
                    <Typography fontWeight="medium">{formData.gradeLevel || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Academic Year</Typography>
                    <Typography fontWeight="medium">{formData.academicYear || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                    <Typography fontWeight="medium">{totalHours} hours</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Topics ({topics.length})</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {topics.map((topic) => (
                    <Chip key={topic.id} label={topic.title} size="small" />
                  ))}
                </Box>
              </CardContent>
            </Card>

            <Typography variant="subtitle1" gutterBottom>
              Export Options
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button variant="contained" startIcon={<DownloadIcon />}>
                Download as PDF
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Download as Word
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Download as Excel
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  const existingSyllabi: Syllabus[] = syllabiData?.syllabi || [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton component={RouterLink} to="/resources" sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          📋 Syllabus Generator
        </Typography>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Create New" />
        <Tab label={`My Syllabi (${existingSyllabi.length})`} />
      </Tabs>

      {tabValue === 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleGenerateSyllabus : handleNext}
              disabled={creating}
              startIcon={creating ? <CircularProgress size={16} /> : null}
            >
              {activeStep === steps.length - 1 ? (creating ? 'Creating...' : 'Generate Syllabus') : 'Next'}
            </Button>
          </Box>
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Saved Syllabi
          </Typography>
          {syllabiLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : existingSyllabi.length === 0 ? (
            <Alert severity="info">
              No syllabi created yet. Create your first syllabus using the wizard.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {existingSyllabi.map((syllabus) => (
                <Grid item xs={12} md={6} key={syllabus.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6">{syllabus.subject}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {syllabus.gradeLevel} • {syllabus.academicYear}
                          </Typography>
                        </Box>
                        <Chip
                          label={syllabus.status}
                          color={syllabus.status === 'APPROVED' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Box mt={2}>
                        <Typography variant="body2">
                          <strong>{syllabus.topics?.length || 0}</strong> topics • 
                          <strong> {syllabus.topics?.reduce((sum, t) => sum + t.hours, 0) || 0}</strong> hours
                        </Typography>
                      </Box>
                      <Box mt={2} display="flex" gap={1}>
                        <Button size="small" variant="outlined">View</Button>
                        <Button size="small" startIcon={<DownloadIcon />}>Export</Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SyllabusGenerator;
