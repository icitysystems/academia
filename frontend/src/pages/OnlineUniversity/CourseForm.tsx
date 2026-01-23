import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  InputAdornment,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';

const GET_COURSE = gql`
  query GetCourse($id: ID!) {
    course(id: $id) {
      id
      code
      title
      description
      shortDescription
      thumbnailUrl
      bannerUrl
      level
      language
      duration
      price
      currency
      status
      maxEnrollments
      prerequisites
      learningOutcomes
      syllabus
      categoryId
    }
  }
`;

const GET_CATEGORIES = gql`
  query GetCategories {
    courseCategories {
      id
      name
    }
  }
`;

const CREATE_COURSE = gql`
  mutation CreateCourse($input: CreateCourseInput!) {
    createCourse(input: $input) {
      id
    }
  }
`;

const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: ID!, $input: UpdateCourseInput!) {
    updateCourse(id: $id, input: $input) {
      id
    }
  }
`;

const PUBLISH_COURSE = gql`
  mutation PublishCourse($id: ID!) {
    publishCourse(id: $id) {
      id
      status
    }
  }
`;

const CourseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    shortDescription: '',
    thumbnailUrl: '',
    bannerUrl: '',
    level: 'BEGINNER',
    language: 'en',
    duration: 0,
    price: 0,
    currency: 'XAF',
    maxEnrollments: null as number | null,
    categoryId: '',
    prerequisites: [] as string[],
    learningOutcomes: [] as string[],
    syllabus: '',
  });
  const [error, setError] = useState('');
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [newOutcome, setNewOutcome] = useState('');

  const { data: courseData, loading: courseLoading } = useQuery(GET_COURSE, {
    variables: { id },
    skip: !id,
    onCompleted: (data) => {
      if (data?.course) {
        setFormData({
          code: data.course.code || '',
          title: data.course.title || '',
          description: data.course.description || '',
          shortDescription: data.course.shortDescription || '',
          thumbnailUrl: data.course.thumbnailUrl || '',
          bannerUrl: data.course.bannerUrl || '',
          level: data.course.level || 'BEGINNER',
          language: data.course.language || 'en',
          duration: data.course.duration || 0,
          price: data.course.price || 0,
          currency: data.course.currency || 'XAF',
          maxEnrollments: data.course.maxEnrollments,
          categoryId: data.course.categoryId || '',
          prerequisites: data.course.prerequisites || [],
          learningOutcomes: data.course.learningOutcomes || [],
          syllabus: data.course.syllabus || '',
        });
      }
    },
  });

  const { data: categoriesData } = useQuery(GET_CATEGORIES);

  const [createCourse, { loading: creating }] = useMutation(CREATE_COURSE, {
    onCompleted: (data) => {
      navigate(`/university/instructor/courses/${data.createCourse.id}/edit`);
    },
    onError: (err) => setError(err.message),
  });

  const [updateCourse, { loading: updating }] = useMutation(UPDATE_COURSE, {
    onCompleted: () => {
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const [publishCourse, { loading: publishing }] = useMutation(PUBLISH_COURSE, {
    onCompleted: () => {
      navigate('/university/instructor');
    },
    onError: (err) => setError(err.message),
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleAddPrerequisite = () => {
    if (newPrerequisite.trim()) {
      setFormData({
        ...formData,
        prerequisites: [...formData.prerequisites, newPrerequisite.trim()],
      });
      setNewPrerequisite('');
    }
  };

  const handleRemovePrerequisite = (index: number) => {
    setFormData({
      ...formData,
      prerequisites: formData.prerequisites.filter((_, i) => i !== index),
    });
  };

  const handleAddOutcome = () => {
    if (newOutcome.trim()) {
      setFormData({
        ...formData,
        learningOutcomes: [...formData.learningOutcomes, newOutcome.trim()],
      });
      setNewOutcome('');
    }
  };

  const handleRemoveOutcome = (index: number) => {
    setFormData({
      ...formData,
      learningOutcomes: formData.learningOutcomes.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    const input = {
      ...formData,
      duration: Number(formData.duration) || undefined,
      price: Number(formData.price) || 0,
      maxEnrollments: formData.maxEnrollments ? Number(formData.maxEnrollments) : undefined,
      categoryId: formData.categoryId || undefined,
    };

    if (isEditing) {
      updateCourse({ variables: { id, input } });
    } else {
      createCourse({ variables: { input } });
    }
  };

  const handlePublish = () => {
    if (id) {
      publishCourse({ variables: { id } });
    }
  };

  const steps = ['Basic Info', 'Details', 'Content'];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isEditing ? 'Edit Course' : 'Create New Course'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Course Code"
                value={formData.code}
                onChange={handleChange('code')}
                fullWidth
                required
                placeholder="e.g., CS101"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.categoryId}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <MenuItem value="">Select Category</MenuItem>
                  {categoriesData?.courseCategories?.map((cat: any) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Course Title"
                value={formData.title}
                onChange={handleChange('title')}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Short Description"
                value={formData.shortDescription}
                onChange={handleChange('shortDescription')}
                fullWidth
                multiline
                rows={2}
                helperText="Brief description shown in course listings"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={formData.level}
                  label="Level"
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                >
                  <MenuItem value="BEGINNER">Beginner</MenuItem>
                  <MenuItem value="INTERMEDIATE">Intermediate</MenuItem>
                  <MenuItem value="ADVANCED">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={formData.language}
                  label="Language"
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Full Description"
                value={formData.description}
                onChange={handleChange('description')}
                fullWidth
                multiline
                rows={6}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Duration (hours)"
                type="number"
                value={formData.duration}
                onChange={handleChange('duration')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Price"
                type="number"
                value={formData.price}
                onChange={handleChange('price')}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Thumbnail URL"
                value={formData.thumbnailUrl}
                onChange={handleChange('thumbnailUrl')}
                fullWidth
                placeholder="https://..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Prerequisites
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  value={newPrerequisite}
                  onChange={(e) => setNewPrerequisite(e.target.value)}
                  placeholder="Add prerequisite"
                  fullWidth
                />
                <Button onClick={handleAddPrerequisite} variant="outlined">
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.prerequisites.map((prereq, index) => (
                  <Chip
                    key={index}
                    label={prereq}
                    onDelete={() => handleRemovePrerequisite(index)}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Learning Outcomes
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder="Add learning outcome"
                  fullWidth
                />
                <Button onClick={handleAddOutcome} variant="outlined">
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.learningOutcomes.map((outcome, index) => (
                  <Chip
                    key={index}
                    label={outcome}
                    onDelete={() => handleRemoveOutcome(index)}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Syllabus / Course Outline"
                value={formData.syllabus}
                onChange={handleChange('syllabus')}
                fullWidth
                multiline
                rows={10}
                placeholder="Describe the course outline and topics covered..."
              />
            </Grid>
            {isEditing && (
              <Grid item xs={12}>
                <Alert severity="info">
                  After saving, you can add modules and lessons from the course editor.
                </Alert>
              </Grid>
            )}
          </Grid>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => prev - 1)}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => setActiveStep((prev) => prev + 1)}
              >
                Next
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  onClick={handleSubmit}
                  disabled={creating || updating}
                  startIcon={<SaveIcon />}
                >
                  Save as Draft
                </Button>
                {isEditing && courseData?.course?.status !== 'PUBLISHED' && (
                  <Button
                    variant="contained"
                    onClick={handlePublish}
                    disabled={publishing}
                    startIcon={<PublishIcon />}
                  >
                    Publish Course
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CourseForm;
