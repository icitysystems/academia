import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Button,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Chip,
  Skeleton,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Badge,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import SchoolIcon from '@mui/icons-material/School';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import GradingIcon from '@mui/icons-material/Grading';
import QuizIcon from '@mui/icons-material/Quiz';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CampaignIcon from '@mui/icons-material/Campaign';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DescriptionIcon from '@mui/icons-material/Description';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WarningIcon from '@mui/icons-material/Warning';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ArticleIcon from '@mui/icons-material/Article';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import MessageIcon from '@mui/icons-material/Message';

const GET_INSTRUCTOR_DASHBOARD = gql`
  query GetInstructorDashboard {
    me {
      id
      name
      email
    }
    myCourses {
      id
      title
      status
      enrollmentCount
      thumbnailUrl
      completionRate
      rating
      createdAt
    }
    pendingSubmissions {
      id
      studentName
      studentEmail
      courseName
      assignmentTitle
      submittedAt
      type
    }
    pendingGrading {
      id
      examTitle
      courseName
      totalScripts
      gradedCount
      status
      confidenceLevel
    }
    courseAnalytics {
      totalStudents
      averageCompletion
      totalRevenue
      activeStudents
    }
    recentAnnouncements {
      id
      title
      courseName
      createdAt
    }
    upcomingExams {
      id
      title
      courseName
      scheduledDate
      enrolledCount
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
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const InstructorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [courseMenuAnchor, setCourseMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_INSTRUCTOR_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const courses = data?.myCourses || [];
  const submissions = data?.pendingSubmissions || [];
  const pendingGrading = data?.pendingGrading || [];
  const analytics = data?.courseAnalytics || {};
  const announcements = data?.recentAnnouncements || [];
  const upcomingExams = data?.upcomingExams || [];

  // Calculate totals
  const totalScriptsToGrade = pendingGrading.reduce(
    (acc: number, g: any) => acc + (g.totalScripts - g.gradedCount), 0
  );

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    subtitle,
    icon, 
    color,
    onClick,
    badge
  }: { 
    title: string; 
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode; 
    color: string;
    onClick?: () => void;
    badge?: number;
  }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? { transform: 'translateY(-4px)', boxShadow: 4 } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Badge badgeContent={badge} color="error">
            <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 56, height: 56 }}>
              {icon}
            </Avatar>
          </Badge>
        </Box>
      </CardContent>
    </Card>
  );

  const handleCourseMenu = (event: React.MouseEvent<HTMLElement>, courseId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setCourseMenuAnchor(event.currentTarget);
    setSelectedCourseId(courseId);
  };

  if (loading && !data) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Error loading dashboard. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', pb: 4 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', py: 3 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Instructor Dashboard
              </Typography>
              <Typography color="text.secondary">
                Welcome back, {user?.name}. Manage your courses and students.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<CampaignIcon />}
                component={RouterLink}
                to="/university/instructor/announcements/new"
              >
                New Announcement
              </Button>
              <Button
                component={RouterLink}
                to="/university/instructor/courses/new"
                variant="contained"
                startIcon={<AddIcon />}
              >
                Create Course
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Alerts for pending items */}
        {totalScriptsToGrade > 0 && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            icon={<PsychologyIcon />}
            action={
              <Button color="inherit" size="small" onClick={() => setTabValue(2)}>
                Review
              </Button>
            }
          >
            You have {totalScriptsToGrade} scripts awaiting ML grading review.
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="My Courses"
              value={courses.length}
              subtitle="Active courses"
              icon={<SchoolIcon />}
              color={theme.palette.primary.main}
              onClick={() => setTabValue(0)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Students"
              value={analytics.totalStudents || 0}
              subtitle={`${analytics.activeStudents || 0} active this week`}
              icon={<GroupIcon />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Reviews"
              value={submissions.length}
              subtitle="Assignments to grade"
              icon={<AssignmentIcon />}
              color={theme.palette.warning.main}
              badge={submissions.length > 0 ? submissions.length : undefined}
              onClick={() => setTabValue(1)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="ML Grading Queue"
              value={totalScriptsToGrade}
              subtitle="Scripts to review"
              icon={<PsychologyIcon />}
              color={theme.palette.info.main}
              badge={totalScriptsToGrade > 0 ? totalScriptsToGrade : undefined}
              onClick={() => setTabValue(2)}
            />
          </Grid>
        </Grid>

        {/* Tabs Navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<SchoolIcon />} label="My Courses" iconPosition="start" />
            <Tab 
              icon={<AssignmentIcon />} 
              label={
                <Badge badgeContent={submissions.length} color="error" sx={{ pr: 1 }}>
                  Grading Center
                </Badge>
              }
              iconPosition="start" 
            />
            <Tab 
              icon={<PsychologyIcon />} 
              label={
                <Badge badgeContent={totalScriptsToGrade} color="info" sx={{ pr: 1 }}>
                  ML Grading
                </Badge>
              }
              iconPosition="start" 
            />
            <Tab icon={<QuizIcon />} label="Exam Papers" iconPosition="start" />
            <Tab icon={<AnalyticsIcon />} label="Analytics" iconPosition="start" />
            <Tab icon={<CampaignIcon />} label="Announcements" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab: My Courses */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Course Management</Typography>
                </Box>

                {courses.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No courses yet
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                      Create your first course to start teaching.
                    </Typography>
                    <Button
                      component={RouterLink}
                      to="/university/instructor/courses/new"
                      variant="contained"
                      startIcon={<AddIcon />}
                    >
                      Create Course
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {courses.map((course: any) => (
                      <Card key={course.id} variant="outlined">
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={2}>
                              {course.thumbnailUrl ? (
                                <Box
                                  component="img"
                                  src={course.thumbnailUrl}
                                  alt={course.title}
                                  sx={{ 
                                    width: '100%', 
                                    height: 80, 
                                    borderRadius: 1, 
                                    objectFit: 'cover' 
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: 80,
                                    borderRadius: 1,
                                    bgcolor: 'primary.light',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <SchoolIcon sx={{ fontSize: 40, color: 'white' }} />
                                </Box>
                              )}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {course.title}
                                </Typography>
                                <Chip 
                                  label={course.status} 
                                  size="small" 
                                  color={course.status === 'PUBLISHED' ? 'success' : 'default'}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', gap: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PeopleIcon fontSize="small" color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    {course.enrollmentCount || 0} students
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <TrendingUpIcon fontSize="small" color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    {course.completionRate || 0}% completion
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  startIcon={<EditIcon />}
                                  component={RouterLink}
                                  to={`/university/instructor/courses/${course.id}/edit`}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AnalyticsIcon />}
                                  component={RouterLink}
                                  to={`/university/instructor/courses/${course.id}/analytics`}
                                >
                                  Analytics
                                </Button>
                                <IconButton 
                                  size="small"
                                  onClick={(e) => handleCourseMenu(e, course.id)}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </Stack>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Upcoming Exams */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Upcoming Exams
                </Typography>
                {upcomingExams.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No upcoming exams scheduled.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {upcomingExams.slice(0, 3).map((exam: any) => (
                      <ListItem key={exam.id} disableGutters sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.light', width: 40, height: 40 }}>
                            <EventIcon fontSize="small" color="warning" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={exam.title}
                          secondary={
                            <>
                              {exam.courseName}
                              <br />
                              {new Date(exam.scheduledDate).toLocaleDateString()}
                            </>
                          }
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Button 
                  fullWidth 
                  sx={{ mt: 2 }}
                  onClick={() => setTabValue(3)}
                >
                  Manage Exams
                </Button>
              </Paper>

              {/* Quick Actions */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Actions
                </Typography>
                <Stack spacing={1}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<QuizIcon />}
                    component={RouterLink}
                    to="/university/instructor/exams/new"
                  >
                    Create Exam Paper
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<ArticleIcon />}
                    component={RouterLink}
                    to="/resources/lesson-plans"
                  >
                    Generate Lesson Plan
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<MessageIcon />}
                    component={RouterLink}
                    to="/messages"
                  >
                    Message Students
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Grading Center */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Submissions to Grade
            </Typography>

            {submissions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  All caught up! No pending submissions.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {submissions.map((submission: any, index: number) => (
                  <React.Fragment key={submission.id}>
                    {index > 0 && <Divider />}
                    <ListItem 
                      sx={{ py: 2 }}
                      secondaryAction={
                        <Button 
                          variant="contained" 
                          size="small"
                          component={RouterLink}
                          to={`/university/instructor/submissions/${submission.id}`}
                        >
                          Grade
                        </Button>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: submission.type === 'EXAM' ? 'error.light' : 'warning.light' }}>
                          {submission.type === 'EXAM' ? <QuizIcon /> : <AssignmentIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="medium">{submission.studentName}</Typography>
                            <Chip 
                              label={submission.type} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            {submission.assignmentTitle} • {submission.courseName}
                            <br />
                            Submitted: {new Date(submission.submittedAt).toLocaleString()}
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </TabPanel>

        {/* Tab: ML Grading */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    ML Grading Queue
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    component={RouterLink}
                    to="/grading"
                  >
                    Open ML Grading System
                  </Button>
                </Box>

                {pendingGrading.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <PsychologyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No scripts in grading queue
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                      Upload exam scripts to start automatic grading.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      component={RouterLink}
                      to="/templates"
                    >
                      Upload Scripts
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {pendingGrading.map((grading: any) => {
                      const progress = Math.round((grading.gradedCount / grading.totalScripts) * 100);
                      return (
                        <Card key={grading.id} variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {grading.examTitle}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {grading.courseName}
                                </Typography>
                              </Box>
                              <Chip
                                icon={
                                  grading.status === 'COMPLETED' ? <CheckCircleIcon /> :
                                  grading.status === 'PROCESSING' ? <PendingIcon /> :
                                  <WarningIcon />
                                }
                                label={grading.status}
                                size="small"
                                color={
                                  grading.status === 'COMPLETED' ? 'success' :
                                  grading.status === 'PROCESSING' ? 'info' : 'warning'
                                }
                              />
                            </Box>
                            
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Grading Progress
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {grading.gradedCount} / {grading.totalScripts}
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={progress}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Confidence Level:
                                </Typography>
                                <Chip
                                  label={`${grading.confidenceLevel}%`}
                                  size="small"
                                  color={
                                    grading.confidenceLevel >= 95 ? 'success' :
                                    grading.confidenceLevel >= 80 ? 'warning' : 'error'
                                  }
                                />
                              </Box>
                              <Button
                                variant="outlined"
                                size="small"
                                component={RouterLink}
                                to={`/grading/review/${grading.id}`}
                              >
                                Review & Approve
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* ML Grading Info Sidebar */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  ML Grading Workflow
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>1</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Set Exam Paper" 
                      secondary="Create questions & marking guide"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>2</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Mark Sample Scripts" 
                      secondary="Grade 10-20 scripts manually"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>3</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Train Model" 
                      secondary="AI learns your grading style"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>4</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Auto-Grade" 
                      secondary="ML grades remaining scripts"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>5</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Review & Approve" 
                      secondary="Verify low-confidence grades"
                    />
                  </ListItem>
                </List>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Grading Tools
                </Typography>
                <Stack spacing={1}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<DescriptionIcon />}
                    component={RouterLink}
                    to="/templates"
                  >
                    Manage Templates
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<BarChartIcon />}
                    component={RouterLink}
                    to="/reports"
                  >
                    View Reports
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Exam Papers */}
        <TabPanel value={tabValue} index={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Exam Paper Setting
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                component={RouterLink}
                to="/university/instructor/exams/new"
              >
                Create Exam Paper
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', py: 6 }}>
              <QuizIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Exam Paper Builder
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Create exam questions with MCQs, short-answer, essays, and problem-solving.
                Define marking guides and scoring rubrics.
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  component={RouterLink}
                  to="/university/instructor/exams/new"
                >
                  Create New Exam
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  component={RouterLink}
                  to="/resources/questions"
                >
                  Question Bank
                </Button>
              </Stack>
            </Box>
          </Paper>
        </TabPanel>

        {/* Tab: Analytics */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {analytics.totalStudents || 0}
                </Typography>
                <Typography color="text.secondary">Total Students</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {analytics.averageCompletion || 0}%
                </Typography>
                <Typography color="text.secondary">Avg. Completion Rate</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color="secondary.main">
                  ${(analytics.totalRevenue || 0).toFixed(2)}
                </Typography>
                <Typography color="text.secondary">Total Revenue</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Performance Analytics
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Grade Distribution</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'end', height: 120, gap: 1 }}>
                        {['A', 'B', 'C', 'D', 'F'].map((grade, index) => (
                          <Box key={grade} sx={{ flex: 1, textAlign: 'center' }}>
                            <Box 
                              sx={{ 
                                bgcolor: index === 0 ? 'success.main' : index === 1 ? 'success.light' : index === 2 ? 'warning.main' : index === 3 ? 'warning.light' : 'error.main',
                                height: [80, 60, 40, 20, 10][index],
                                borderRadius: 1,
                                mb: 0.5
                              }}
                            />
                            <Typography variant="caption">{grade}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Course Engagement</Typography>
                      <List dense disablePadding>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText primary="Active Students" />
                          <Typography color="success.main" fontWeight="bold">{Math.round((analytics.totalStudents || 0) * 0.8)}</Typography>
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText primary="Assignments Submitted" />
                          <Typography color="primary.main" fontWeight="bold">{Math.round((analytics.totalStudents || 0) * 3.5)}</Typography>
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText primary="Discussion Posts" />
                          <Typography color="secondary.main" fontWeight="bold">{Math.round((analytics.totalStudents || 0) * 2.2)}</Typography>
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText primary="Avg. Session Duration" />
                          <Typography color="info.main" fontWeight="bold">45 min</Typography>
                        </ListItem>
                      </List>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Announcements */}
        <TabPanel value={tabValue} index={5}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Course Announcements
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                component={RouterLink}
                to="/university/instructor/announcements/new"
              >
                New Announcement
              </Button>
            </Box>

            {announcements.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CampaignIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No announcements yet. Keep your students informed!
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {announcements.map((announcement: any, index: number) => (
                  <React.Fragment key={announcement.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 2 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'info.light' }}>
                          <CampaignIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={announcement.title}
                        secondary={
                          <>
                            {announcement.courseName}
                            <br />
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </TabPanel>
      </Container>

      {/* Course Menu */}
      <Menu
        anchorEl={courseMenuAnchor}
        open={Boolean(courseMenuAnchor)}
        onClose={() => setCourseMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setCourseMenuAnchor(null);
          navigate(`/university/courses/${selectedCourseId}`);
        }}>
          View Course
        </MenuItem>
        <MenuItem onClick={() => {
          setCourseMenuAnchor(null);
          navigate(`/university/instructor/courses/${selectedCourseId}/students`);
        }}>
          Manage Students
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setCourseMenuAnchor(null)} sx={{ color: 'error.main' }}>
          Unpublish Course
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default InstructorDashboard;
