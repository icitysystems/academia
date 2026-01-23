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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';

const mockScheme = [
  { week: 1, topic: 'Introduction to Algebra', objectives: 'Define algebraic expressions', activities: 'Lecture, Examples', resources: 'Textbook Ch.1', assessment: 'Class exercise' },
  { week: 2, topic: 'Linear Equations', objectives: 'Solve linear equations', activities: 'Demonstration, Practice', resources: 'Worksheet 1', assessment: 'Quiz' },
  { week: 3, topic: 'Inequalities', objectives: 'Solve and graph inequalities', activities: 'Group work', resources: 'Graph paper', assessment: 'Assignment' },
  { week: 4, topic: 'Simultaneous Equations', objectives: 'Solve systems of equations', activities: 'Pair work', resources: 'Textbook Ch.2', assessment: 'Test 1' },
  { week: 5, topic: 'Quadratic Equations', objectives: 'Factorize and solve', activities: 'Lecture, Lab', resources: 'Calculator', assessment: 'Class work' },
  { week: 6, topic: 'Quadratic Formula', objectives: 'Apply quadratic formula', activities: 'Practice problems', resources: 'Worksheet 2', assessment: 'Quiz' },
  { week: 7, topic: 'Revision Week', objectives: 'Review all topics', activities: 'Revision exercises', resources: 'Past papers', assessment: 'Mock test' },
  { week: 8, topic: 'Mid-Term Examinations', objectives: 'Assessment', activities: 'Examination', resources: 'Exam papers', assessment: 'Mid-term exam' },
];

const SchemesOfWork: React.FC = () => {
  const [formData, setFormData] = useState({
    subject: '',
    gradeLevel: '',
    term: '',
    syllabus: '',
  });
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerated(true);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton component={RouterLink} to="/resources" sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          📅 Schemes of Work Generator
        </Typography>
      </Box>

      {/* Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate Scheme of Work
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={2}>
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
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
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
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
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
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>From Syllabus</InputLabel>
              <Select
                value={formData.syllabus}
                label="From Syllabus"
                onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
              >
                <MenuItem value="math-form3">Mathematics Form 3 (2025)</MenuItem>
                <MenuItem value="physics-form4">Physics Form 4 (2025)</MenuItem>
                <MenuItem value="chemistry-form3">Chemistry Form 3 (2025)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleGenerate}
              fullWidth
            >
              Generate Scheme
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Generated Scheme */}
      {generated && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h5">Mathematics - Form 3 - First Term</Typography>
              <Typography variant="body2" color="text.secondary">
                12 weeks • January - April 2026
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button startIcon={<EditIcon />}>Edit</Button>
              <Button variant="contained" startIcon={<DownloadIcon />}>Export</Button>
            </Box>
          </Box>

          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">12</Typography>
                  <Typography variant="body2">Total Weeks</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="secondary">8</Typography>
                  <Typography variant="body2">Topics Covered</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">48</Typography>
                  <Typography variant="body2">Total Hours</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main">6</Typography>
                  <Typography variant="body2">Assessments</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Week</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Topic</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Learning Objectives</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Activities</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Resources</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Assessment</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockScheme.map((row) => (
                  <TableRow key={row.week} hover>
                    <TableCell>
                      <Chip label={`Week ${row.week}`} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">{row.topic}</Typography>
                    </TableCell>
                    <TableCell>{row.objectives}</TableCell>
                    <TableCell>{row.activities}</TableCell>
                    <TableCell>{row.resources}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.assessment} 
                        size="small" 
                        color={row.assessment.includes('exam') || row.assessment.includes('Test') ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={2}>
            <Button startIcon={<AddIcon />}>Add Week</Button>
          </Box>
        </>
      )}
    </Container>
  );
};

export default SchemesOfWork;
