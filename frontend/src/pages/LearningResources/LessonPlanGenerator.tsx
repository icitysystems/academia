import React, { useState } from 'react';
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
  Card,
  CardContent,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const LessonPlanGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    gradeLevel: '',
    duration: '45',
    classSize: '30',
    teachingMethod: '',
  });

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
    }, 2000);
  };

  const generatedPlan = {
    objectives: [
      { type: 'Knowledge', text: 'Define and explain the concept of quadratic equations' },
      { type: 'Skills', text: 'Solve quadratic equations using factorization and the quadratic formula' },
      { type: 'Attitudes', text: 'Appreciate the application of quadratic equations in real-world problems' },
    ],
    competencies: [
      'Mathematical reasoning and problem-solving',
      'Analytical thinking and logical deduction',
      'Application of mathematical concepts',
    ],
    phases: [
      {
        name: 'Introduction',
        duration: '5 min',
        activities: [
          'Greet students and take attendance',
          'Review previous lesson on linear equations',
          'Present a real-world problem involving quadratic relationships',
        ],
      },
      {
        name: 'Development',
        duration: '25 min',
        activities: [
          'Introduce the standard form of quadratic equations: ax² + bx + c = 0',
          'Demonstrate factorization method with examples',
          'Introduce the quadratic formula and when to use it',
          'Worked examples on the board with student participation',
        ],
      },
      {
        name: 'Practice',
        duration: '10 min',
        activities: [
          'Individual practice: Solve 3 quadratic equations',
          'Pair work: Compare solutions and methods',
          'Teacher circulates to provide guidance',
        ],
      },
      {
        name: 'Assessment',
        duration: '3 min',
        activities: [
          'Exit ticket: Solve one quadratic equation',
          'Quick verbal check for understanding',
        ],
      },
      {
        name: 'Closure',
        duration: '2 min',
        activities: [
          'Summarize key points',
          'Assign homework: Exercises 4.1-4.5',
          'Preview next lesson on graphing quadratics',
        ],
      },
    ],
    resources: [
      'Textbook Chapter 4',
      'Whiteboard and markers',
      'Calculator (optional)',
      'Worksheet with practice problems',
    ],
    differentiation: [
      'Extended problems for advanced learners',
      'Visual aids and step-by-step guides for struggling students',
      'Peer tutoring opportunities',
    ],
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton component={RouterLink} to="/resources" sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          📝 Lesson Plan Generator
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Input Form */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Lesson Details
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={formData.subject}
                  label="Subject"
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  <MenuItem value="mathematics">Mathematics</MenuItem>
                  <MenuItem value="physics">Physics</MenuItem>
                  <MenuItem value="chemistry">Chemistry</MenuItem>
                  <MenuItem value="biology">Biology</MenuItem>
                  <MenuItem value="english">English</MenuItem>
                  <MenuItem value="history">History</MenuItem>
                  <MenuItem value="geography">Geography</MenuItem>
                  <MenuItem value="computer">Computer Science</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g., Solving Quadratic Equations"
              />

              <FormControl fullWidth>
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

              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />

              <TextField
                fullWidth
                label="Class Size"
                type="number"
                value={formData.classSize}
                onChange={(e) => setFormData({ ...formData, classSize: e.target.value })}
              />

              <FormControl fullWidth>
                <InputLabel>Primary Teaching Method</InputLabel>
                <Select
                  value={formData.teachingMethod}
                  label="Primary Teaching Method"
                  onChange={(e) => setFormData({ ...formData, teachingMethod: e.target.value })}
                >
                  <MenuItem value="lecture">Lecture</MenuItem>
                  <MenuItem value="discussion">Discussion</MenuItem>
                  <MenuItem value="demonstration">Demonstration</MenuItem>
                  <MenuItem value="group_work">Group Work</MenuItem>
                  <MenuItem value="lab">Laboratory</MenuItem>
                  <MenuItem value="project">Project-Based</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                onClick={handleGenerate}
                disabled={loading || !formData.subject || !formData.topic}
                fullWidth
              >
                {loading ? 'Generating...' : 'Generate Lesson Plan'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Generated Plan */}
        <Grid item xs={12} md={8}>
          {!generated ? (
            <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box>
                <AutoAwesomeIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Fill in the lesson details and click "Generate" to create an AI-powered lesson plan
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                  {formData.topic || 'Lesson Plan'}
                </Typography>
                <Box display="flex" gap={1}>
                  <Button startIcon={<EditIcon />} size="small">Edit</Button>
                  <Button startIcon={<SaveIcon />} size="small">Save</Button>
                  <Button variant="contained" startIcon={<DownloadIcon />} size="small">Export</Button>
                </Box>
              </Box>

              <Box display="flex" gap={1} mb={3}>
                <Chip label={formData.subject} color="primary" />
                <Chip label={formData.gradeLevel} />
                <Chip label={`${formData.duration} min`} />
                <Chip label={`${formData.classSize} students`} />
              </Box>

              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                <Tab label="Full Plan" />
                <Tab label="Objectives" />
                <Tab label="Activities" />
                <Tab label="Resources" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {/* Learning Objectives */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">🎯 Learning Objectives (CBA)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {generatedPlan.objectives.map((obj, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={obj.text}
                            secondary={<Chip label={obj.type} size="small" sx={{ mt: 0.5 }} />}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>

                {/* Lesson Phases */}
                {generatedPlan.phases.map((phase, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip label={phase.duration} size="small" color="primary" />
                        <Typography fontWeight="bold">{phase.name}</Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {phase.activities.map((activity, i) => (
                          <ListItem key={i}>
                            <ListItemIcon>
                              <CheckCircleIcon color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={activity} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}

                {/* Resources */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">📚 Teaching Resources</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {generatedPlan.resources.map((res, i) => (
                        <Chip key={i} label={res} variant="outlined" />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Differentiation */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">🎨 Differentiation Strategies</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {generatedPlan.differentiation.map((item, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <CheckCircleIcon color="secondary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Learning Objectives (Bloom's Taxonomy)</Typography>
                    {generatedPlan.objectives.map((obj, i) => (
                      <Box key={i} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                        <Chip label={obj.type} size="small" color="primary" sx={{ mb: 1 }} />
                        <Typography>{obj.text}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Activities are organized according to the lesson phases with recommended time allocations.
                </Alert>
                {generatedPlan.phases.map((phase, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">{phase.name}</Typography>
                        <Chip label={phase.duration} color="primary" />
                      </Box>
                      <List dense>
                        {phase.activities.map((activity, i) => (
                          <ListItem key={i}>
                            <ListItemText primary={`${i + 1}. ${activity}`} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                ))}
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Teaching Materials</Typography>
                        <List dense>
                          {generatedPlan.resources.map((res, i) => (
                            <ListItem key={i}>
                              <ListItemText primary={res} />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Differentiation</Typography>
                        <List dense>
                          {generatedPlan.differentiation.map((item, i) => (
                            <ListItem key={i}>
                              <ListItemText primary={item} />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default LessonPlanGenerator;
