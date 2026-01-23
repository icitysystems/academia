import React from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  Box, 
  Card, 
  CardContent, 
  CardActions,
  Chip,
  Stack,
  useTheme,
  alpha,
  Avatar,
  Rating,
  Divider
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NewsletterForm from '../components/NewsletterForm';

// Icons
import SchoolIcon from '@mui/icons-material/School';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import QuizIcon from '@mui/icons-material/Quiz';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedIcon from '@mui/icons-material/Verified';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TimelineIcon from '@mui/icons-material/Timeline';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// Featured Courses Data
const featuredCourses = [
  {
    id: 1,
    title: 'Full Stack Web Development',
    instructor: 'Dr. Sarah Mitchell',
    rating: 4.8,
    students: 2340,
    duration: '40 hours',
    image: '🖥️',
    category: 'Technology',
    price: 'Free'
  },
  {
    id: 2,
    title: 'Data Science & Machine Learning',
    instructor: 'Prof. James Chen',
    rating: 4.9,
    students: 1856,
    duration: '52 hours',
    image: '📊',
    category: 'Data Science',
    price: '$49.99'
  },
  {
    id: 3,
    title: 'Business Analytics Fundamentals',
    instructor: 'Dr. Emily Roberts',
    rating: 4.7,
    students: 3120,
    duration: '28 hours',
    image: '📈',
    category: 'Business',
    price: '$29.99'
  },
  {
    id: 4,
    title: 'Educational Psychology',
    instructor: 'Prof. Michael Torres',
    rating: 4.6,
    students: 1420,
    duration: '24 hours',
    image: '🧠',
    category: 'Education',
    price: 'Free'
  }
];

// Testimonials Data
const testimonials = [
  {
    name: 'Jennifer Adams',
    role: 'High School Teacher',
    content: 'Academia has transformed how I create and deliver my courses. The ML grading system saves me hours every week!',
    avatar: 'JA',
    rating: 5
  },
  {
    name: 'Mark Thompson',
    role: 'University Professor',
    content: 'The integrated platform makes it easy to manage everything from course creation to certification in one place.',
    avatar: 'MT',
    rating: 5
  },
  {
    name: 'Lisa Chen',
    role: 'Online Student',
    content: 'I completed my certification entirely online. The learning experience was engaging and the support was excellent.',
    avatar: 'LC',
    rating: 5
  }
];

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const theme = useTheme();

  return (
    <Box sx={{ bgcolor: '#fafafa' }}>
      {/* Hero Section - Professional University Landing */}
      <Box 
        sx={{ 
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, #1a237e 50%, ${theme.palette.secondary.dark} 100%)`,
          color: 'white',
          py: { xs: 8, md: 14 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.5
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 3 }}>
                <Chip 
                  icon={<VerifiedIcon sx={{ color: 'white !important' }} />}
                  label="Accredited Online Learning Platform" 
                  sx={{ 
                    bgcolor: alpha('#fff', 0.15), 
                    color: 'white', 
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '& .MuiChip-icon': { color: 'white' }
                  }} 
                />
              </Box>
              
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 800, 
                  fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                  lineHeight: 1.1,
                  mb: 3,
                  textShadow: '0 2px 40px rgba(0,0,0,0.3)'
                }}
              >
                Your Gateway to
                <Box component="span" sx={{ color: '#90caf9', display: 'block' }}>
                  Quality Education
                </Box>
              </Typography>
              
              <Typography 
                variant="h5" 
                sx={{ 
                  opacity: 0.9, 
                  mb: 4, 
                  fontWeight: 400,
                  lineHeight: 1.6,
                  maxWidth: 560
                }}
              >
                Join thousands of students and educators on Academia — the complete 
                online university platform with AI-powered tools for teaching, learning, 
                and professional certification.
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  component={RouterLink}
                  to="/university"
                  startIcon={<PlayCircleOutlineIcon />}
                  sx={{ 
                    py: 2, 
                    px: 5, 
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    bgcolor: 'white',
                    color: 'primary.dark',
                    borderRadius: 3,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                    '&:hover': { 
                      bgcolor: '#f5f5f5',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Explore Courses
                </Button>
                {!isAuthenticated ? (
                  <Button
                    variant="outlined"
                    size="large"
                    component={RouterLink}
                    to="/register"
                    sx={{ 
                      py: 2, 
                      px: 5, 
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderColor: 'rgba(255,255,255,0.5)',
                      borderWidth: 2,
                      color: 'white',
                      borderRadius: 3,
                      '&:hover': { 
                        borderColor: 'white', 
                        bgcolor: alpha('#fff', 0.1),
                        borderWidth: 2
                      }
                    }}
                  >
                    Start Free Today
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="large"
                    component={RouterLink}
                    to="/university/instructor"
                    sx={{ 
                      py: 2, 
                      px: 5, 
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderColor: 'rgba(255,255,255,0.5)',
                      borderWidth: 2,
                      color: 'white',
                      borderRadius: 3,
                      '&:hover': { 
                        borderColor: 'white', 
                        bgcolor: alpha('#fff', 0.1),
                        borderWidth: 2
                      }
                    }}
                  >
                    Go to Dashboard
                  </Button>
                )}
              </Stack>

              {/* Trust Indicators */}
              <Stack direction="row" spacing={4} flexWrap="wrap" sx={{ opacity: 0.9 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon fontSize="small" />
                  <Typography variant="body2">Free courses available</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon fontSize="small" />
                  <Typography variant="body2">Verified certificates</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon fontSize="small" />
                  <Typography variant="body2">Learn at your pace</Typography>
                </Box>
              </Stack>
            </Grid>

            {/* Stats Card */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ 
                  bgcolor: alpha('#fff', 0.1), 
                  borderRadius: 4, 
                  p: 4,
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              >
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ opacity: 0.9 }}>
                  Join Our Growing Community
                </Typography>
                <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', my: 2 }} />
                
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 56, height: 56 }}>
                      <SchoolIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight="800">500+</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Professional Courses</Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 56, height: 56 }}>
                      <GroupsIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight="800">25K+</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Active Learners</Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 56, height: 56 }}>
                      <WorkspacePremiumIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight="800">8K+</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Certificates Issued</Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 56, height: 56 }}>
                      <EmojiEventsIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight="800">98%</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Satisfaction Rate</Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Featured Courses Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
          <Box>
            <Typography variant="overline" color="primary" fontWeight="bold" fontSize="0.9rem">
              LEARN FROM THE BEST
            </Typography>
            <Typography variant="h3" fontWeight="800">
              Featured Courses
            </Typography>
          </Box>
          <Button 
            component={RouterLink}
            to="/university"
            endIcon={<ArrowForwardIcon />}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            View All Courses
          </Button>
        </Box>
        
        <Grid container spacing={3}>
          {featuredCourses.map((course) => (
            <Grid item xs={12} sm={6} md={3} key={course.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box 
                  sx={{ 
                    bgcolor: 'primary.light', 
                    py: 4, 
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  <Typography sx={{ fontSize: '4rem' }}>{course.image}</Typography>
                  <Chip 
                    label={course.category} 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 12, 
                      left: 12,
                      bgcolor: 'white',
                      fontWeight: 600
                    }} 
                  />
                  {course.price === 'Free' && (
                    <Chip 
                      label="FREE" 
                      size="small" 
                      color="success"
                      sx={{ 
                        position: 'absolute', 
                        top: 12, 
                        right: 12,
                        fontWeight: 700
                      }} 
                    />
                  )}
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.3 }}>
                    {course.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {course.instructor}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                    <Rating value={course.rating} precision={0.1} size="small" readOnly />
                    <Typography variant="body2" fontWeight="bold">{course.rating}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({course.students.toLocaleString()})
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {course.duration}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button 
                    variant="contained" 
                    fullWidth
                    component={RouterLink}
                    to={`/university/courses/${course.id}`}
                    sx={{ borderRadius: 2 }}
                  >
                    {course.price === 'Free' ? 'Enroll Free' : `Enroll - ${course.price}`}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        <Box textAlign="center" mt={4} sx={{ display: { xs: 'block', sm: 'none' } }}>
          <Button 
            component={RouterLink}
            to="/university"
            endIcon={<ArrowForwardIcon />}
          >
            View All Courses
          </Button>
        </Box>
      </Container>

      {/* Platform Features */}
      <Box sx={{ bgcolor: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="overline" color="primary" fontWeight="bold" fontSize="0.9rem">
              WHY CHOOSE ACADEMIA
            </Typography>
            <Typography variant="h3" fontWeight="800" gutterBottom>
              Everything You Need to Succeed
            </Typography>
            <Typography variant="h6" color="text.secondary" maxWidth={700} mx="auto">
              A comprehensive platform designed for modern education with powerful tools for 
              both educators and learners
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 4, 
                  height: '100%', 
                  textAlign: 'center', 
                  border: '2px solid',
                  borderColor: 'primary.light',
                  borderRadius: 4,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Avatar sx={{ bgcolor: 'primary.light', width: 72, height: 72, mx: 'auto', mb: 3 }}>
                  <OndemandVideoIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Rich Course Content
                </Typography>
                <Typography color="text.secondary">
                  Create engaging courses with video lectures, interactive readings, 
                  downloadable resources, and hands-on projects.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 4, 
                  height: '100%', 
                  textAlign: 'center', 
                  border: '2px solid',
                  borderColor: 'secondary.light',
                  borderRadius: 4,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'secondary.main',
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Avatar sx={{ bgcolor: 'secondary.light', width: 72, height: 72, mx: 'auto', mb: 3 }}>
                  <QuizIcon sx={{ fontSize: 36, color: 'secondary.main' }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Interactive Assessments
                </Typography>
                <Typography color="text.secondary">
                  Build quizzes, assignments, and exams with automatic grading. 
                  Track student progress with detailed analytics.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 4, 
                  height: '100%', 
                  textAlign: 'center', 
                  border: '2px solid',
                  borderColor: 'success.light',
                  borderRadius: 4,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'success.main',
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Avatar sx={{ bgcolor: 'success.light', width: 72, height: 72, mx: 'auto', mb: 3 }}>
                  <WorkspacePremiumIcon sx={{ fontSize: 36, color: 'success.main' }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Verified Certificates
                </Typography>
                <Typography color="text.secondary">
                  Issue professional certificates upon course completion. 
                  Verifiable credentials that showcase student achievements.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Auxiliary Products Section */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 10 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Chip 
              label="INTEGRATED TOOLS" 
              size="small"
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white', 
                fontWeight: 'bold',
                mb: 2
              }} 
            />
            <Typography variant="h3" fontWeight="800" gutterBottom>
              Powerful Teaching Tools
            </Typography>
            <Typography variant="h6" color="text.secondary" maxWidth={700} mx="auto">
              Enhance your teaching with our suite of AI-powered auxiliary products — 
              fully integrated with the Academia platform
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {/* ML Grading System */}
            <Grid item xs={12} lg={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 4,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 20px 60px rgba(25, 118, 210, 0.2)'
                  }
                }}
              >
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    p: 4, 
                    textAlign: 'center',
                    color: 'white'
                  }}
                >
                  <PsychologyIcon sx={{ fontSize: 64 }} />
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 2 }}>
                    ML Grading System
                  </Typography>
                  <Chip 
                    label="AI-Powered" 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha('#fff', 0.2), 
                      color: 'white',
                      mt: 1,
                      fontWeight: 600
                    }} 
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Typography color="text.secondary" paragraph>
                    Revolutionize your grading workflow with machine learning. Upload exams, 
                    set answer keys, and let AI grade student work with human-level accuracy.
                  </Typography>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                      <Typography variant="body2">Template-based answer sheet processing</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                      <Typography variant="body2">MCQ & essay auto-grading with confidence</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                      <Typography variant="body2">Teacher moderation & calibration tools</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                      <Typography variant="body2">Generate print-ready marked PDFs</Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button 
                    variant="contained"
                    fullWidth
                    size="large"
                    component={RouterLink} 
                    to={isAuthenticated ? "/grading" : "/login"}
                    endIcon={<KeyboardArrowRightIcon />}
                    sx={{ borderRadius: 2, py: 1.5 }}
                  >
                    {isAuthenticated ? "Open ML Grading" : "Get Started"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Lesson Tracking */}
            <Grid item xs={12} lg={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 4,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 20px 60px rgba(255, 152, 0, 0.2)'
                  }
                }}
              >
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                    p: 4, 
                    textAlign: 'center',
                    color: 'white'
                  }}
                >
                  <TimelineIcon sx={{ fontSize: 64 }} />
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 2 }}>
                    Lesson Tracking
                  </Typography>
                  <Chip 
                    label="For Schools" 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha('#fff', 0.2), 
                      color: 'white',
                      mt: 1,
                      fontWeight: 600
                    }} 
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Typography color="text.secondary" paragraph>
                    Comprehensive lesson management for schools. Track teaching progress, 
                    monitor syllabus coverage, and generate administrative reports.
                  </Typography>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="warning" fontSize="small" />
                      <Typography variant="body2">School and class management</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="warning" fontSize="small" />
                      <Typography variant="body2">Lesson logging with topics covered</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="warning" fontSize="small" />
                      <Typography variant="body2">Syllabus progress monitoring</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="warning" fontSize="small" />
                      <Typography variant="body2">Teaching activity reports</Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button 
                    variant="contained"
                    color="warning"
                    fullWidth
                    size="large"
                    component={RouterLink} 
                    to={isAuthenticated ? "/lessons" : "/login"}
                    endIcon={<KeyboardArrowRightIcon />}
                    sx={{ borderRadius: 2, py: 1.5 }}
                  >
                    {isAuthenticated ? "Open Lesson Tracking" : "Get Started"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Learning Resources */}
            <Grid item xs={12} lg={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 4,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 20px 60px rgba(76, 175, 80, 0.2)'
                  }
                }}
              >
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    p: 4, 
                    textAlign: 'center',
                    color: 'white'
                  }}
                >
                  <MenuBookIcon sx={{ fontSize: 64 }} />
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 2 }}>
                    Learning Resources
                  </Typography>
                  <Chip 
                    label="AI-Assisted" 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha('#fff', 0.2), 
                      color: 'white',
                      mt: 1,
                      fontWeight: 600
                    }} 
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Typography color="text.secondary" paragraph>
                    Generate professional pedagogical resources with AI. Create syllabi, 
                    lesson plans, exam papers, presentations, and online quizzes.
                  </Typography>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2">AI syllabus & lesson plan generator</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2">Exam paper builder with question bank</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2">Online quiz creation & management</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2">Presentation generator</Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button 
                    variant="contained"
                    color="success"
                    fullWidth
                    size="large"
                    component={RouterLink} 
                    to={isAuthenticated ? "/resources" : "/login"}
                    endIcon={<KeyboardArrowRightIcon />}
                    sx={{ borderRadius: 2, py: 1.5 }}
                  >
                    {isAuthenticated ? "Open Resources" : "Get Started"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box textAlign="center" mb={8}>
          <Typography variant="overline" color="primary" fontWeight="bold" fontSize="0.9rem">
            TESTIMONIALS
          </Typography>
          <Typography variant="h3" fontWeight="800" gutterBottom>
            What Our Users Say
          </Typography>
        </Box>
        
        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 4, 
                  height: '100%', 
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.light',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
                  }
                }}
              >
                <Rating value={testimonial.rating} readOnly sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, fontStyle: 'italic' }}>
                  "{testimonial.content}"
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 'bold' }}>
                    {testimonial.avatar}
                  </Avatar>
                  <Box>
                    <Typography fontWeight="bold">{testimonial.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {testimonial.role}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1a237e 50%, #9c27b0 100%)',
          color: 'white', 
          py: 10 
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="800" gutterBottom>
            Start Your Learning Journey Today
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 5, maxWidth: 600, mx: 'auto' }}>
            Join thousands of educators and students already transforming education with Academia
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to={isAuthenticated ? "/university" : "/register"}
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: 3,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
            >
              {isAuthenticated ? "Browse Courses" : "Create Free Account"}
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={RouterLink}
              to="/pricing"
              sx={{ 
                borderColor: 'white', 
                color: 'white',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 3,
                borderWidth: 2,
                '&:hover': { borderColor: 'white', bgcolor: alpha('#fff', 0.1), borderWidth: 2 }
              }}
            >
              View Pricing Plans
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Newsletter Section */}
      <Box sx={{ bgcolor: 'white', py: 10 }}>
        <Container maxWidth="md">
          <Paper 
            elevation={0}
            sx={{ 
              p: 6, 
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'grey.200',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" fontWeight="800" gutterBottom>
              Stay Updated
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Subscribe to our newsletter for the latest courses, teaching tips, 
              and educational resources delivered to your inbox.
            </Typography>
            <Box maxWidth={500} mx="auto">
              <NewsletterForm source="homepage" />
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Footer Info */}
      <Box sx={{ bgcolor: '#1a237e', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Academia
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                The complete online university platform with AI-powered tools 
                for modern education.
              </Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Platform
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" component={RouterLink} to="/university" sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}>
                  Courses
                </Typography>
                <Typography variant="body2" component={RouterLink} to="/pricing" sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}>
                  Pricing
                </Typography>
                <Typography variant="body2" component={RouterLink} to="/register" sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}>
                  Sign Up
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Tools
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" component={RouterLink} to="/grading" sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}>
                  ML Grading
                </Typography>
                <Typography variant="body2" component={RouterLink} to="/lessons" sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}>
                  Lesson Tracking
                </Typography>
                <Typography variant="body2" component={RouterLink} to="/resources" sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}>
                  Learning Resources
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Support Academia
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                Help us continue building the future of education.
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                component={RouterLink}
                to="/donate"
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.5)', 
                  color: 'white',
                  '&:hover': { borderColor: 'white' }
                }}
              >
                Make a Donation
              </Button>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Typography variant="body2" sx={{ opacity: 0.6, textAlign: 'center' }}>
            © {new Date().getFullYear()} Academia. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
