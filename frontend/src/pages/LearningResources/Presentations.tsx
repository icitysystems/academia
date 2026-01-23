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
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import DownloadIcon from '@mui/icons-material/Download';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const GET_PRESENTATIONS = gql`
  query GetPresentations {
    myPresentations {
      id
      title
      lessonId
      topicId
      presentationType
      templateUsed
      slideCount
      status
      createdAt
    }
  }
`;

const GENERATE_PRESENTATION = gql`
  mutation GeneratePresentation($input: GeneratePresentationInput!) {
    generatePresentation(input: $input) {
      id
      title
      slideCount
    }
  }
`;

const DELETE_PRESENTATION = gql`
  mutation DeletePresentation($id: ID!) {
    deletePresentation(id: $id)
  }
`;

const Presentations: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newPresentation, setNewPresentation] = useState({
    title: '',
    lessonId: '',
    topicId: '',
    presentationType: 'LECTURE',
    templateUsed: 'DEFAULT',
    targetSlideCount: 10,
    additionalInstructions: '',
  });

  const { data, loading, error, refetch } = useQuery(GET_PRESENTATIONS);

  const [generatePresentation] = useMutation(GENERATE_PRESENTATION, {
    onCompleted: () => {
      setCreateDialogOpen(false);
      setGenerating(false);
      setNewPresentation({
        title: '',
        lessonId: '',
        topicId: '',
        presentationType: 'LECTURE',
        templateUsed: 'DEFAULT',
        targetSlideCount: 10,
        additionalInstructions: '',
      });
      refetch();
    },
    onError: () => {
      setGenerating(false);
    },
  });

  const [deletePresentation] = useMutation(DELETE_PRESENTATION, {
    onCompleted: () => refetch(),
  });

  const presentations = data?.myPresentations || [];

  const handleGenerate = () => {
    setGenerating(true);
    generatePresentation({
      variables: {
        input: {
          ...newPresentation,
          targetSlideCount: Number(newPresentation.targetSlideCount),
        },
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'GENERATED':
        return 'info';
      case 'PUBLISHED':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPresentationTypeLabel = (type: string) => {
    switch (type) {
      case 'LECTURE':
        return 'Lecture';
      case 'WORKSHOP':
        return 'Workshop';
      case 'REVISION':
        return 'Revision';
      case 'SUMMARY':
        return 'Summary';
      default:
        return type;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Presentations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and manage teaching presentations powered by AI
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Generate Presentation
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : presentations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SlideshowIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No presentations yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Generate your first AI-powered presentation
          </Typography>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Generate Presentation
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {presentations.map((presentation: any) => (
            <Grid item xs={12} sm={6} md={4} key={presentation.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SlideshowIcon sx={{ fontSize: 48, color: 'white' }} />
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={presentation.status}
                      size="small"
                      color={getStatusColor(presentation.status) as any}
                    />
                    <Chip
                      label={getPresentationTypeLabel(presentation.presentationType)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom noWrap>
                    {presentation.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {presentation.slideCount} slides
                  </Typography>
                  <Typography variant="caption" color="text.disabled" display="block">
                    Created {new Date(presentation.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button size="small" startIcon={<SlideshowIcon />}>
                    Preview
                  </Button>
                  <Box>
                    <IconButton size="small" color="primary">
                      <DownloadIcon />
                    </IconButton>
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deletePresentation({ variables: { id: presentation.id } })}
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

      {/* Generate Dialog */}
      <Dialog open={createDialogOpen} onClose={() => !generating && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="primary" />
            Generate Presentation
          </Box>
        </DialogTitle>
        <DialogContent>
          {generating && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 1 }}>
                Generating your presentation with AI... This may take a moment.
              </Alert>
              <LinearProgress />
            </Box>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Presentation Title"
                value={newPresentation.title}
                onChange={(e) => setNewPresentation({ ...newPresentation, title: e.target.value })}
                fullWidth
                required
                disabled={generating}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={generating}>
                <InputLabel>Presentation Type</InputLabel>
                <Select
                  value={newPresentation.presentationType}
                  label="Presentation Type"
                  onChange={(e) => setNewPresentation({ ...newPresentation, presentationType: e.target.value })}
                >
                  <MenuItem value="LECTURE">Lecture</MenuItem>
                  <MenuItem value="WORKSHOP">Workshop</MenuItem>
                  <MenuItem value="REVISION">Revision</MenuItem>
                  <MenuItem value="SUMMARY">Summary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={generating}>
                <InputLabel>Template</InputLabel>
                <Select
                  value={newPresentation.templateUsed}
                  label="Template"
                  onChange={(e) => setNewPresentation({ ...newPresentation, templateUsed: e.target.value })}
                >
                  <MenuItem value="DEFAULT">Default</MenuItem>
                  <MenuItem value="MODERN">Modern</MenuItem>
                  <MenuItem value="ACADEMIC">Academic</MenuItem>
                  <MenuItem value="MINIMAL">Minimal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Target Slide Count"
                type="number"
                value={newPresentation.targetSlideCount}
                onChange={(e) => setNewPresentation({ ...newPresentation, targetSlideCount: Number(e.target.value) })}
                fullWidth
                disabled={generating}
                helperText="Approximate number of slides to generate"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Additional Instructions (Optional)"
                value={newPresentation.additionalInstructions}
                onChange={(e) => setNewPresentation({ ...newPresentation, additionalInstructions: e.target.value })}
                fullWidth
                multiline
                rows={3}
                disabled={generating}
                placeholder="E.g., Focus on practical examples, include diagrams..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || !newPresentation.title}
            startIcon={<AutoAwesomeIcon />}
          >
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Presentations;
