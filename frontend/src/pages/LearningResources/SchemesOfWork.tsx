import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
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
  CircularProgress,
  Alert,
  Snackbar,
  Skeleton,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  GET_SCHEMES_OF_WORK,
  GET_SYLLABI,
  GENERATE_SCHEME_OF_WORK,
  DELETE_SCHEME_OF_WORK,
  APPROVE_SCHEME_OF_WORK,
} from '../../graphql/operations';

interface Week {
  weekNumber: number;
  topic: string;
  objectives: string;
  activities: string;
  resources: string;
  assessment: string;
}

interface SchemeOfWork {
  id: string;
  title: string;
  term: string;
  year: number;
  totalWeeks: number;
  weeklyHours: number;
  status: string;
  weeks: Week[];
  syllabus?: {
    id: string;
    name: string;
    classSubject?: {
      class?: { name: string };
      subject?: { name: string };
    };
  };
  generatedBy?: { id: string; name: string };
  createdAt: string;
}

const SchemesOfWork: React.FC = () => {
  const [formData, setFormData] = useState({
    subject: '',
    gradeLevel: '',
    term: '',
    syllabusId: '',
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [selectedScheme, setSelectedScheme] = useState<SchemeOfWork | null>(null);

  // GraphQL queries
  const { data: schemesData, loading: loadingSchemes, refetch: refetchSchemes } = useQuery(GET_SCHEMES_OF_WORK, {
    variables: { status: 'all' },
    fetchPolicy: 'cache-and-network',
  });

  const { data: syllabiData, loading: loadingSyllabi } = useQuery(GET_SYLLABI);

  // GraphQL mutations
  const [generateScheme, { loading: generating }] = useMutation(GENERATE_SCHEME_OF_WORK, {
    onCompleted: (data) => {
      setSelectedScheme(data.generateSchemeOfWork);
      refetchSchemes();
      setSnackbar({ open: true, message: 'Scheme of work generated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    },
  });

  const [deleteScheme] = useMutation(DELETE_SCHEME_OF_WORK, {
    onCompleted: () => {
      refetchSchemes();
      setSnackbar({ open: true, message: 'Scheme deleted', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    },
  });

  const [approveScheme] = useMutation(APPROVE_SCHEME_OF_WORK, {
    onCompleted: () => {
      refetchSchemes();
      setSnackbar({ open: true, message: 'Scheme approved', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    },
  });

  const handleGenerate = () => {
    if (!formData.syllabusId) {
      setSnackbar({ open: true, message: 'Please select a syllabus', severity: 'error' });
      return;
    }

    generateScheme({
      variables: {
        input: {
          syllabusId: formData.syllabusId,
          term: formData.term,
          year: new Date().getFullYear(),
          weeklyHours: 4,
        },
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this scheme?')) {
      deleteScheme({ variables: { id } });
    }
  };

  const handleApprove = (schemeId: string) => {
    approveScheme({ variables: { input: { schemeId } } });
  };

  const schemes = schemesData?.schemesOfWork?.schemes || [];
  const syllabi = syllabiData?.syllabi || [];

  // Calculate stats from selected scheme
  const stats = selectedScheme ? {
    totalWeeks: selectedScheme.totalWeeks || selectedScheme.weeks?.length || 0,
    topicsCovered: selectedScheme.weeks?.filter((w: Week) => w.topic && !w.topic.toLowerCase().includes('revision') && !w.topic.toLowerCase().includes('exam')).length || 0,
    totalHours: (selectedScheme.totalWeeks || 0) * (selectedScheme.weeklyHours || 4),
    assessments: selectedScheme.weeks?.filter((w: Week) => w.assessment && (w.assessment.toLowerCase().includes('test') || w.assessment.toLowerCase().includes('exam') || w.assessment.toLowerCase().includes('quiz'))).length || 0,
  } : { totalWeeks: 0, topicsCovered: 0, totalHours: 0, assessments: 0 };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton component={RouterLink} to="/resources" sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          📅 Schemes of Work
        </Typography>
      </Box>

      {/* Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate New Scheme of Work
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth disabled={loadingSyllabi}>
              <InputLabel>Select Syllabus</InputLabel>
              <Select
                value={formData.syllabusId}
                label="Select Syllabus"
                onChange={(e) => setFormData({ ...formData, syllabusId: e.target.value })}
              >
                {syllabi.map((syllabus: any) => (
                  <MenuItem key={syllabus.id} value={syllabus.id}>
                    {syllabus.name} - {syllabus.classSubject?.class?.name} {syllabus.classSubject?.subject?.name}
                  </MenuItem>
                ))}
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
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleGenerate}
              disabled={generating || !formData.syllabusId}
              fullWidth
            >
              {generating ? 'Generating...' : 'Generate Scheme'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Existing Schemes List */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Existing Schemes of Work
        </Typography>
        {loadingSchemes ? (
          <Box>
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </Box>
        ) : schemes.length === 0 ? (
          <Alert severity="info">No schemes of work found. Generate one to get started.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Subject/Class</TableCell>
                  <TableCell>Term</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schemes.map((scheme: SchemeOfWork) => (
                  <TableRow 
                    key={scheme.id} 
                    hover 
                    onClick={() => setSelectedScheme(scheme)}
                    sx={{ cursor: 'pointer', bgcolor: selectedScheme?.id === scheme.id ? 'action.selected' : 'inherit' }}
                  >
                    <TableCell>{scheme.title}</TableCell>
                    <TableCell>
                      {scheme.syllabus?.classSubject?.subject?.name} - {scheme.syllabus?.classSubject?.class?.name}
                    </TableCell>
                    <TableCell>{scheme.term}</TableCell>
                    <TableCell>
                      <Chip 
                        label={scheme.status} 
                        size="small" 
                        color={scheme.status === 'APPROVED' ? 'success' : scheme.status === 'DRAFT' ? 'warning' : 'default'} 
                      />
                    </TableCell>
                    <TableCell>{new Date(scheme.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(scheme.id); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      {scheme.status === 'DRAFT' && (
                        <Button size="small" onClick={(e) => { e.stopPropagation(); handleApprove(scheme.id); }}>
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Selected Scheme Detail */}
      {selectedScheme && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h5">{selectedScheme.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedScheme.totalWeeks} weeks • {selectedScheme.term} {selectedScheme.year}
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
                  <Typography variant="h4" color="primary">{stats.totalWeeks}</Typography>
                  <Typography variant="body2">Total Weeks</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="secondary">{stats.topicsCovered}</Typography>
                  <Typography variant="body2">Topics Covered</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">{stats.totalHours}</Typography>
                  <Typography variant="body2">Total Hours</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main">{stats.assessments}</Typography>
                  <Typography variant="body2">Assessments</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {selectedScheme.weeks && selectedScheme.weeks.length > 0 && (
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
                  {selectedScheme.weeks.map((row: Week) => (
                    <TableRow key={row.weekNumber} hover>
                      <TableCell>
                        <Chip label={`Week ${row.weekNumber}`} size="small" color="primary" />
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
                          color={row.assessment?.toLowerCase().includes('exam') || row.assessment?.toLowerCase().includes('test') ? 'error' : 'default'}
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
          )}

          <Box mt={2}>
            <Button startIcon={<AddIcon />}>Add Week</Button>
          </Box>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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

export default SchemesOfWork;
