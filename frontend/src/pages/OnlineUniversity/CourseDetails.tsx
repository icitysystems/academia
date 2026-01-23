import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Skeleton,
  Tab,
  Tabs,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ArticleIcon from '@mui/icons-material/Article';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import LanguageIcon from '@mui/icons-material/Language';

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
      enrollmentCount
      prerequisites
      learningOutcomes
      syllabus
      instructor {
        id
        name
        email
      }
      category {
        id
        name
      }
      modules {
        id
        title
        description
        orderIndex
        lessons {
          id
          title
          contentType
          duration
          isPreview
        }
      }
    }
  }
`;

const ENROLL_IN_COURSE = gql`
  mutation EnrollInCourse($courseId: ID!) {
    enrollInCourse(courseId: $courseId) {
      id
      status
      enrolledAt
    }
  }
`;

const CHECK_ENROLLMENT = gql`
  query CheckEnrollment($courseId: ID!) {
    myEnrollment(courseId: $courseId) {
      id
      status
      progress
    }
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  const { data, loading, error } = useQuery(GET_COURSE, {
    variables: { id },
    skip: !id,
  });

  const { data: enrollmentData } = useQuery(CHECK_ENROLLMENT, {
    variables: { courseId: id },
    skip: !id,
  });

  const [enrollInCourse, { loading: enrolling }] = useMutation(ENROLL_IN_COURSE, {
    onCompleted: () => {
      setEnrollDialogOpen(false);
      navigate(`/university/learn/${id}`);
    },
  });

  const course = data?.course;
  const enrollment = enrollmentData?.myEnrollment;
  const isEnrolled = !!enrollment;

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'XAF',
    }).format(price);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'success';
      case 'INTERMEDIATE':
        return 'warning';
      case 'ADVANCED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'VIDEO':
        return <PlayCircleOutlineIcon />;
      case 'QUIZ':
        return <QuizIcon />;
      default:
        return <ArticleIcon />;
    }
  };

  const handleEnroll = () => {
    if (course?.price === 0) {
      enrollInCourse({ variables: { courseId: id } });
    } else {
      setEnrollDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={60} />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </Container>
    );
  }

  if (error || !course) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          {error?.message || 'Course not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Box>
      {/* Hero Banner */}
      <Box
        sx={{
          bgcolor: 'primary.dark',
          color: 'white',
          py: 6,
          backgroundImage: course.bannerUrl ? `url(${course.bannerUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          '&::before': course.bannerUrl ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.6)',
          } : undefined,
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={course.level}
                  color={getLevelColor(course.level) as any}
                  size="small"
                />
                {course.category && (
                  <Chip label={course.category.name} variant="outlined" size="small" sx={{ color: 'white', borderColor: 'white' }} />
                )}
              </Box>
              <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                {course.title}
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                {course.shortDescription}
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                    {course.instructor?.name?.[0]}
                  </Avatar>
                  <Typography>{course.instructor?.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SchoolIcon sx={{ mr: 0.5 }} fontSize="small" />
                  <Typography>{course.enrollmentCount || 0} students</Typography>
                </Box>
                {course.duration && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ mr: 0.5 }} fontSize="small" />
                    <Typography>{course.duration} hours</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LanguageIcon sx={{ mr: 0.5 }} fontSize="small" />
                  <Typography>{course.language?.toUpperCase() || 'EN'}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ position: { md: 'sticky' }, top: 100 }}>
                <CardContent>
                  {course.thumbnailUrl && (
                    <Box
                      component="img"
                      src={course.thumbnailUrl}
                      alt={course.title}
                      sx={{ width: '100%', borderRadius: 1, mb: 2 }}
                    />
                  )}
                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatPrice(course.price, course.currency)}
                  </Typography>
                  {isEnrolled ? (
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => navigate(`/university/learn/${id}`)}
                    >
                      Continue Learning
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {course.price === 0 ? 'Enroll for Free' : 'Enroll Now'}
                    </Button>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      This course includes:
                    </Typography>
                    <List dense>
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <PlayCircleOutlineIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={`${course.duration || 0} hours of video`} />
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <ArticleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Downloadable resources" />
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Certificate of completion" />
                      </ListItem>
                    </List>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Course Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Overview" />
          <Tab label="Curriculum" />
          <Tab label="Instructor" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                About this course
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 4 }}>
                {course.description}
              </Typography>

              {course.learningOutcomes && (
                <>
                  <Typography variant="h5" gutterBottom>
                    What you'll learn
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    {course.learningOutcomes.map((outcome: string, index: number) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <CheckCircleIcon color="success" sx={{ mr: 1, mt: 0.5 }} />
                          <Typography>{outcome}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {course.prerequisites && course.prerequisites.length > 0 && (
                <>
                  <Typography variant="h5" gutterBottom>
                    Prerequisites
                  </Typography>
                  <List>
                    {course.prerequisites.map((prereq: string, index: number) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon>
                          <CheckCircleIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={prereq} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" gutterBottom>
            Course Content
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {course.modules?.length || 0} modules • {course.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0)} lessons
          </Typography>
          {course.modules?.map((module: any) => (
            <Accordion key={module.id} defaultExpanded={module.orderIndex === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                  <Typography fontWeight="medium">
                    Module {module.orderIndex + 1}: {module.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {module.lessons?.length || 0} lessons
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {module.lessons?.map((lesson: any) => (
                    <ListItem key={lesson.id}>
                      <ListItemIcon>
                        {getContentIcon(lesson.contentType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={lesson.title}
                        secondary={lesson.duration ? `${lesson.duration} min` : undefined}
                      />
                      {lesson.isPreview && (
                        <Chip label="Preview" size="small" color="info" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 80, height: 80 }}>
              {course.instructor?.name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h5">{course.instructor?.name}</Typography>
              <Typography color="text.secondary">{course.instructor?.email}</Typography>
            </Box>
          </Box>
        </TabPanel>
      </Container>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onClose={() => setEnrollDialogOpen(false)}>
        <DialogTitle>Enroll in Course</DialogTitle>
        <DialogContent>
          <Typography>
            You are about to enroll in <strong>{course.title}</strong> for{' '}
            <strong>{formatPrice(course.price, course.currency)}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => enrollInCourse({ variables: { courseId: id } })}
            disabled={enrolling}
          >
            Confirm Enrollment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseDetails;
