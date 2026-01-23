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
  LinearProgress,
  Chip,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Divider,
  Skeleton,
  Tabs,
  Tab,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Alert,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradeIcon from '@mui/icons-material/Grade';
import PaymentIcon from '@mui/icons-material/Payment';
import DescriptionIcon from '@mui/icons-material/Description';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import QuizIcon from '@mui/icons-material/Quiz';
import MessageIcon from '@mui/icons-material/Message';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';

const GET_STUDENT_DASHBOARD = gql`
  query GetStudentDashboard {
    me {
      id
      name
      email
      role
    }
    myEnrollments(status: "ACTIVE") {
      id
      progress
      enrolledAt
      course {
        id
        title
        thumbnailUrl
        instructor {
          name
        }
        modules {
          id
          lessons {
            id
          }
        }
      }
    }
    myCertificates {
      id
      course {
        id
        title
      }
      issuedAt
      certificateUrl
    }
    upcomingDeadlines {
      id
      title
      dueDate
      type
      course {
        id
        title
      }
    }
    myGrades {
      id
      courseId
      courseName
      grade
      gpa
      completedAt
    }
    myPayments {
      id
      amount
      type
      status
      dueDate
      paidAt
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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  
  const { data, loading, error } = useQuery(GET_STUDENT_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const enrollments = data?.myEnrollments || [];
  const certificates = data?.myCertificates || [];
  const deadlines = data?.upcomingDeadlines || [];
  const grades = data?.myGrades || [];
  const payments = data?.myPayments || [];

  // Calculate overall progress
  const totalProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc: number, e: any) => acc + (e.progress || 0), 0) / enrollments.length)
    : 0;

  // Calculate GPA (mock)
  const calculateGPA = () => {
    if (grades.length === 0) return 0;
    return (grades.reduce((acc: number, g: any) => acc + (g.gpa || 0), 0) / grades.length).toFixed(2);
  };

  // Pending payments
  const pendingPayments = payments.filter((p: any) => p.status === 'PENDING');

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    subtitle,
    icon, 
    color,
    onClick 
  }: { 
    title: string; 
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode; 
    color: string;
    onClick?: () => void;
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
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

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
                Welcome back, {user?.name || 'Student'}! 👋
              </Typography>
              <Typography color="text.secondary">
                Here's your learning progress and upcoming tasks.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={(e) => setNotificationAnchor(e.currentTarget)}>
                <Badge badgeContent={deadlines.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <Menu
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={() => setNotificationAnchor(null)}
                PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
              >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography fontWeight="bold">Notifications</Typography>
                </Box>
                {deadlines.length === 0 ? (
                  <MenuItem disabled>No new notifications</MenuItem>
                ) : (
                  deadlines.slice(0, 5).map((d: any) => (
                    <MenuItem key={d.id} onClick={() => setNotificationAnchor(null)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'warning.light', width: 32, height: 32 }}>
                          <WarningIcon fontSize="small" color="warning" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={d.title}
                        secondary={`Due: ${new Date(d.dueDate).toLocaleDateString()}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </MenuItem>
                  ))
                )}
              </Menu>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Payment Alert */}
        {pendingPayments.length > 0 && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => setTabValue(3)}>
                View
              </Button>
            }
          >
            You have {pendingPayments.length} pending payment(s). Total due: $
            {pendingPayments.reduce((acc: number, p: any) => acc + p.amount, 0).toFixed(2)}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Enrolled Courses"
              value={enrollments.length}
              subtitle="Active enrollments"
              icon={<SchoolIcon />}
              color={theme.palette.primary.main}
              onClick={() => navigate('/university/my-courses')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Overall Progress"
              value={`${totalProgress}%`}
              subtitle="Across all courses"
              icon={<TrendingUpIcon />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Certificates"
              value={certificates.length}
              subtitle="Achievements earned"
              icon={<EmojiEventsIcon />}
              color={theme.palette.warning.main}
              onClick={() => setTabValue(2)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Current GPA"
              value={calculateGPA()}
              subtitle="Cumulative average"
              icon={<GradeIcon />}
              color={theme.palette.secondary.main}
              onClick={() => setTabValue(1)}
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
            <Tab icon={<GradeIcon />} label="Grades & Transcript" iconPosition="start" />
            <Tab icon={<EmojiEventsIcon />} label="Certificates" iconPosition="start" />
            <Tab icon={<PaymentIcon />} label="Payments" iconPosition="start" />
            <Tab icon={<CalendarTodayIcon />} label="Schedule" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab: My Courses */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Continue Learning</Typography>
                  <Button 
                    component={RouterLink} 
                    to="/university" 
                    variant="outlined"
                    size="small"
                  >
                    Browse More Courses
                  </Button>
                </Box>

                {enrollments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No courses yet
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                      Start your learning journey by enrolling in a course.
                    </Typography>
                    <Button
                      component={RouterLink}
                      to="/university"
                      variant="contained"
                      startIcon={<SchoolIcon />}
                    >
                      Explore Courses
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {enrollments.map((enrollment: any) => {
                      const totalLessons = enrollment.course.modules?.reduce(
                        (acc: number, m: any) => acc + (m.lessons?.length || 0),
                        0
                      ) || 1;
                      const progressPercent = Math.round((enrollment.progress / totalLessons) * 100);

                      return (
                        <Card key={enrollment.id} variant="outlined">
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={2}>
                                {enrollment.course.thumbnailUrl ? (
                                  <Box
                                    component="img"
                                    src={enrollment.course.thumbnailUrl}
                                    alt={enrollment.course.title}
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
                              <Grid item xs={12} sm={7}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {enrollment.course.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {enrollment.course.instructor?.name || 'Instructor'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={progressPercent}
                                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                  />
                                  <Typography variant="body2" fontWeight="bold" color="primary">
                                    {progressPercent}%
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={12} sm={3} sx={{ textAlign: 'right' }}>
                                <Button
                                  component={RouterLink}
                                  to={`/university/learn/${enrollment.course.id}`}
                                  variant="contained"
                                  startIcon={<PlayArrowIcon />}
                                  fullWidth
                                >
                                  Continue
                                </Button>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Upcoming Deadlines */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Upcoming Deadlines
                </Typography>
                {deadlines.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No upcoming deadlines. 🎉
                  </Typography>
                ) : (
                  <List disablePadding>
                    {deadlines.slice(0, 5).map((deadline: any, index: number) => (
                      <React.Fragment key={deadline.id}>
                        {index > 0 && <Divider />}
                        <ListItem disableGutters sx={{ py: 1.5 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              bgcolor: deadline.type === 'EXAM' ? 'error.light' : 'warning.light',
                              width: 40, 
                              height: 40 
                            }}>
                              {deadline.type === 'EXAM' ? (
                                <QuizIcon fontSize="small" />
                              ) : (
                                <AssignmentIcon fontSize="small" />
                              )}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={deadline.title}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {deadline.course.title}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  <AccessTimeIcon sx={{ fontSize: 14 }} />
                                  <Typography variant="caption" color="error">
                                    Due: {new Date(deadline.dueDate).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
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
                    startIcon={<DescriptionIcon />}
                    onClick={() => setTabValue(1)}
                  >
                    View Transcript
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<PaymentIcon />}
                    onClick={() => setTabValue(3)}
                  >
                    Make Payment
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<MessageIcon />}
                    component={RouterLink}
                    to="/messages"
                  >
                    Message Instructor
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Grades & Transcript */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Academic Record</Typography>
                  <Button variant="outlined" startIcon={<DescriptionIcon />}>
                    Request Official Transcript
                  </Button>
                </Box>

                {grades.length === 0 && enrollments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <GradeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">
                      No grades recorded yet. Complete courses to see your grades here.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {/* Current Courses */}
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      CURRENT SEMESTER
                    </Typography>
                    <List disablePadding>
                      {enrollments.map((enrollment: any) => (
                        <ListItem 
                          key={enrollment.id}
                          divider
                          secondaryAction={
                            <Chip 
                              label="In Progress" 
                              size="small" 
                              color="info" 
                              variant="outlined"
                            />
                          }
                        >
                          <ListItemText
                            primary={enrollment.course.title}
                            secondary={enrollment.course.instructor?.name}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* Completed Courses */}
                    {grades.length > 0 && (
                      <>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3 }} gutterBottom>
                          COMPLETED COURSES
                        </Typography>
                        <List disablePadding>
                          {grades.map((grade: any) => (
                            <ListItem 
                              key={grade.id}
                              divider
                              secondaryAction={
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="h6" fontWeight="bold" color="primary">
                                    {grade.grade}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    GPA: {grade.gpa}
                                  </Typography>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={grade.courseName}
                                secondary={`Completed: ${new Date(grade.completedAt).toLocaleDateString()}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  GPA Summary
                </Typography>
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h2" fontWeight="bold" color="primary">
                    {calculateGPA()}
                  </Typography>
                  <Typography color="text.secondary">
                    Cumulative GPA
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemText primary="Courses Completed" />
                    <Typography fontWeight="bold">{grades.length}</Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Credits Earned" />
                    <Typography fontWeight="bold">{grades.length * 3}</Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="In Progress" />
                    <Typography fontWeight="bold">{enrollments.length}</Typography>
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Certificates */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              My Certificates
            </Typography>

            {certificates.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <EmojiEventsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No certificates yet
                </Typography>
                <Typography color="text.secondary">
                  Complete courses to earn verified certificates.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {certificates.map((cert: any) => (
                  <Grid item xs={12} sm={6} md={4} key={cert.id}>
                    <Card variant="outlined">
                      <Box sx={{ 
                        bgcolor: 'warning.light', 
                        p: 3, 
                        textAlign: 'center' 
                      }}>
                        <EmojiEventsIcon sx={{ fontSize: 48, color: 'warning.dark' }} />
                      </Box>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {cert.course.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small" fullWidth variant="outlined">
                          View Certificate
                        </Button>
                        <Button size="small" fullWidth>
                          Download PDF
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </TabPanel>

        {/* Tab: Payments */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Payment History
                </Typography>

                {payments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <PaymentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">
                      No payment records found.
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {payments.map((payment: any) => (
                      <ListItem 
                        key={payment.id}
                        divider
                        secondaryAction={
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight="bold">
                              ${payment.amount.toFixed(2)}
                            </Typography>
                            <Chip 
                              label={payment.status} 
                              size="small"
                              color={
                                payment.status === 'COMPLETED' ? 'success' :
                                payment.status === 'PENDING' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>
                            <ReceiptIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={payment.type}
                          secondary={
                            payment.paidAt 
                              ? `Paid: ${new Date(payment.paidAt).toLocaleDateString()}`
                              : `Due: ${new Date(payment.dueDate).toLocaleDateString()}`
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Outstanding Balance
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="error.main" gutterBottom>
                  ${pendingPayments.reduce((acc: number, p: any) => acc + p.amount, 0).toFixed(2)}
                </Typography>
                {pendingPayments.length > 0 && (
                  <Button variant="contained" fullWidth size="large">
                    Make Payment
                  </Button>
                )}
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Payment Methods
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add a payment method to make payments easier.
                </Typography>
                <Button variant="outlined" fullWidth>
                  Add Payment Method
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Schedule */}
        <TabPanel value={tabValue} index={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Academic Calendar
            </Typography>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CalendarTodayIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                Calendar view coming soon. Check deadlines in the sidebar.
              </Typography>
            </Box>
          </Paper>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default StudentDashboard;
