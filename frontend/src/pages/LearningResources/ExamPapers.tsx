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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Skeleton,
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import PrintIcon from '@mui/icons-material/Print';

const GET_EXAM_PAPERS = gql`
  query GetExamPapers {
    myExamPapers {
      id
      title
      subject
      examType
      duration
      totalMarks
      status
      createdAt
      sections {
        id
        title
      }
    }
  }
`;

const CREATE_EXAM_PAPER = gql`
  mutation CreateExamPaper($input: CreateExamPaperInput!) {
    createExamPaper(input: $input) {
      id
      title
    }
  }
`;

const DELETE_EXAM_PAPER = gql`
  mutation DeleteExamPaper($id: ID!) {
    deleteExamPaper(id: $id)
  }
`;

const ExamPapers: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPaper, setNewPaper] = useState({
    title: '',
    subject: '',
    examType: 'MID_TERM',
    duration: 120,
    totalMarks: 100,
    instructions: '',
  });

  const { data, loading, error, refetch } = useQuery(GET_EXAM_PAPERS);

  const [createExamPaper, { loading: creating }] = useMutation(CREATE_EXAM_PAPER, {
    onCompleted: () => {
      setCreateDialogOpen(false);
      setNewPaper({
        title: '',
        subject: '',
        examType: 'MID_TERM',
        duration: 120,
        totalMarks: 100,
        instructions: '',
      });
      refetch();
    },
  });

  const [deleteExamPaper] = useMutation(DELETE_EXAM_PAPER, {
    onCompleted: () => refetch(),
  });

  const examPapers = data?.myExamPapers || [];
  const filteredPapers = tabValue === 0 
    ? examPapers 
    : tabValue === 1 
    ? examPapers.filter((p: any) => p.status === 'DRAFT')
    : examPapers.filter((p: any) => p.status === 'PUBLISHED');

  const handleCreate = () => {
    createExamPaper({
      variables: {
        input: {
          ...newPaper,
          duration: Number(newPaper.duration),
          totalMarks: Number(newPaper.totalMarks),
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

  const getExamTypeLabel = (type: string) => {
    switch (type) {
      case 'MID_TERM':
        return 'Mid-Term';
      case 'FINAL':
        return 'Final Exam';
      case 'QUIZ':
        return 'Quiz';
      case 'ASSIGNMENT':
        return 'Assignment';
      default:
        return type;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Exam Papers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage examination papers with sections and questions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Exam Paper
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="All Papers" />
        <Tab label="Drafts" />
        <Tab label="Published" />
      </Tabs>

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : filteredPapers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No exam papers found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Create your first exam paper to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Exam Paper
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredPapers.map((paper: any) => (
            <Grid item xs={12} sm={6} md={4} key={paper.id}>
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
                      label={paper.status}
                      size="small"
                      color={getStatusColor(paper.status) as any}
                    />
                    <Chip
                      label={getExamTypeLabel(paper.examType)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom noWrap>
                    {paper.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {paper.subject}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Duration: {paper.duration} mins • Total: {paper.totalMarks} marks
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" display="block">
                    {paper.sections?.length || 0} sections
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button size="small" startIcon={<EditIcon />}>
                    Edit
                  </Button>
                  <Box>
                    <IconButton size="small" color="primary">
                      <PrintIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteExamPaper({ variables: { id: paper.id } })}
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
        <DialogTitle>Create New Exam Paper</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                value={newPaper.title}
                onChange={(e) => setNewPaper({ ...newPaper, title: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Subject"
                value={newPaper.subject}
                onChange={(e) => setNewPaper({ ...newPaper, subject: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Exam Type</InputLabel>
                <Select
                  value={newPaper.examType}
                  label="Exam Type"
                  onChange={(e) => setNewPaper({ ...newPaper, examType: e.target.value })}
                >
                  <MenuItem value="MID_TERM">Mid-Term</MenuItem>
                  <MenuItem value="FINAL">Final Exam</MenuItem>
                  <MenuItem value="QUIZ">Quiz</MenuItem>
                  <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="Duration (mins)"
                type="number"
                value={newPaper.duration}
                onChange={(e) => setNewPaper({ ...newPaper, duration: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="Total Marks"
                type="number"
                value={newPaper.totalMarks}
                onChange={(e) => setNewPaper({ ...newPaper, totalMarks: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Instructions"
                value={newPaper.instructions}
                onChange={(e) => setNewPaper({ ...newPaper, instructions: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newPaper.title || !newPaper.subject}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExamPapers;
