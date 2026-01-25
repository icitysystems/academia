import React from 'react';
import { useQuery } from '@apollo/client';
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
  Chip,
  LinearProgress,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import QuizIcon from '@mui/icons-material/Quiz';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import { GET_LEARNING_RESOURCE_STATS, GET_RECENT_ACTIVITY } from '../../graphql/queries';

const modules = [
  {
    title: 'Syllabus Management',
    description: 'Import, digitize, and manage official syllabi with topics, sub-topics, and time allocation.',
    icon: <MenuBookIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
    link: '/resources/syllabus',
    status: 'Available',
    color: 'success',
  },
  {
    title: 'Schemes of Work',
    description: 'Automatically distribute syllabus topics across academic calendar terms and weeks.',
    icon: <CalendarMonthIcon sx={{ fontSize: 48, color: 'secondary.main' }} />,
    link: '/resources/schemes',
    status: 'Available',
    color: 'success',
  },
  {
    title: 'Lesson Plan Generator',
    description: 'AI-powered lesson creation with objectives, competencies, and classroom activities.',
    icon: <AssignmentIcon sx={{ fontSize: 48, color: 'info.main' }} />,
    link: '/resources/lesson-plans',
    status: 'Available',
    color: 'success',
  },
  {
    title: 'Teaching Resources',
    description: 'Generate PowerPoint presentations, handouts, and visual teaching materials.',
    icon: <SlideshowIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
    link: '/resources/teaching',
    status: 'Available',
    color: 'success',
  },
  {
    title: 'Exam Paper Generator',
    description: 'Create examination papers with question banks, marking schemes, and export to PDF/Word.',
    icon: <DescriptionIcon sx={{ fontSize: 48, color: 'error.main' }} />,
    link: '/resources/exams',
    status: 'Available',
    color: 'success',
  },
  {
    title: 'Question Bank',
    description: 'Manage a repository of questions categorized by subject, topic, difficulty, and Bloom\'s taxonomy.',
    icon: <LibraryBooksIcon sx={{ fontSize: 48, color: 'primary.dark' }} />,
    link: '/resources/questions',
    status: 'Available',
    color: 'success',
  },
  {
    title: 'Online Quizzes',
    description: 'Create and deploy interactive quizzes with automatic grading and learner access control.',
    icon: <QuizIcon sx={{ fontSize: 48, color: 'success.main' }} />,
    link: '/resources/quizzes',
    status: 'Available',
    color: 'success',
  },
  {
    title: 'Performance Analytics',
    description: 'Automatic performance reports, grade analysis, and AI-powered recommendations.',
    icon: <AnalyticsIcon sx={{ fontSize: 48, color: 'info.dark' }} />,
    link: '/resources/analytics',
    status: 'Available',
    color: 'success',
  },
];

// Helper to format relative time
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const LearningResourcesDashboard: React.FC = () => {
  // Fetch real stats from the backend
  const { data: statsData, loading: statsLoading } = useQuery(GET_LEARNING_RESOURCE_STATS);
  const { data: activityData, loading: activityLoading } = useQuery(GET_RECENT_ACTIVITY, {
    variables: { limit: 5 },
  });

  const stats = statsData?.learningResourceStats || {
    lessonPlanCount: 0,
    questionCount: 0,
    activeQuizCount: 0,
    examPaperCount: 0,
  };

  const recentActivity = activityData?.recentActivity || [];
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          📚 Pedagogic Resource Generator
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create syllabi, lesson plans, teaching resources, examination papers, and online quizzes with AI assistance.
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
            {statsLoading ? (
              <Skeleton variant="text" width={60} height={60} sx={{ mx: 'auto' }} />
            ) : (
              <Typography variant="h3">{stats.lessonPlanCount}</Typography>
            )}
            <Typography>Lesson Plans</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.light', color: 'white' }}>
            {statsLoading ? (
              <Skeleton variant="text" width={60} height={60} sx={{ mx: 'auto' }} />
            ) : (
              <Typography variant="h3">{stats.questionCount}</Typography>
            )}
            <Typography>Questions in Bank</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
            {statsLoading ? (
              <Skeleton variant="text" width={60} height={60} sx={{ mx: 'auto' }} />
            ) : (
              <Typography variant="h3">{stats.activeQuizCount}</Typography>
            )}
            <Typography>Active Quizzes</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
            {statsLoading ? (
              <Skeleton variant="text" width={60} height={60} sx={{ mx: 'auto' }} />
            ) : (
              <Typography variant="h3">{stats.examPaperCount}</Typography>
            )}
            <Typography>Exam Papers</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Module Cards */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Resource Modules
      </Typography>
      <Grid container spacing={3} mb={4}>
        {modules.map((module, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  {module.icon}
                  <Chip 
                    label={module.status} 
                    size="small" 
                    color={module.color as any}
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  {module.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {module.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  component={RouterLink} 
                  to={module.link}
                  variant="contained"
                  fullWidth
                >
                  Open
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            {activityLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : recentActivity.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No recent activity. Start by creating a lesson plan or quiz!
              </Typography>
            ) : (
              recentActivity.map((item: any, index: number) => (
                <Box 
                  key={item.id || index} 
                  sx={{ 
                    py: 2, 
                    borderBottom: index < recentActivity.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Chip label={item.entityType || item.type} size="small" sx={{ mr: 1 }} />
                    <Typography component="span" fontWeight="medium">
                      {item.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatRelativeTime(item.createdAt)}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button 
                variant="contained" 
                startIcon={<AssignmentIcon />}
                component={RouterLink}
                to="/resources/lesson-plans/new"
                fullWidth
              >
                Create Lesson Plan
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<QuizIcon />}
                component={RouterLink}
                to="/resources/quizzes/new"
                fullWidth
              >
                Create Quiz
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<DescriptionIcon />}
                component={RouterLink}
                to="/resources/exams/new"
                fullWidth
              >
                Generate Exam Paper
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<SlideshowIcon />}
                component={RouterLink}
                to="/resources/teaching/new"
                fullWidth
              >
                Create Presentation
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LearningResourcesDashboard;
