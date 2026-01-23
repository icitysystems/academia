import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  Skeleton,
  Divider,
  Tabs,
  Tab,
  Stack,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaymentIcon from '@mui/icons-material/Payment';
import MessageIcon from '@mui/icons-material/Message';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ReceiptIcon from '@mui/icons-material/Receipt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const GET_PARENT_DASHBOARD = gql`
  query GetParentDashboard {
    me {
      id
      name
      email
    }
    myChildren {
      id
      name
      email
      enrolledCourses {
        id
        title
        progress
        currentGrade
        instructor
        status
      }
      recentGrades {
        id
        courseName
        assignmentTitle
        score
        maxScore
        gradedAt
      }
      upcomingDeadlines {
        id
        title
        courseName
        dueDate
        type
      }
      attendanceRate
      overallGPA
    }
    paymentHistory {
      id
      description
      amount
      status
      paidAt
      dueDate
    }
    upcomingPayments {
      id
      description
      amount
      dueDate
    }
    parentAnnouncements {
      id
      title
      message
      createdAt
      priority
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

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_PARENT_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const children = data?.myChildren || [];
  const paymentHistory = data?.paymentHistory || [];
  const upcomingPayments = data?.upcomingPayments || [];
  const announcements = data?.parentAnnouncements || [];

  // Default to first child
  React.useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  const currentChild = children.find((c: any) => c.id === selectedChild) || children[0];

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    subtitle,
    icon, 
    color,
    trend,
    trendValue 
  }: { 
    title: string; 
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode; 
    color: string;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => (
    <Card>
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
            {trend && trendValue && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend === 'up' ? (
                  <TrendingUpIcon fontSize="small" color="success" />
                ) : (
                  <TrendingDownIcon fontSize="small" color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={trend === 'up' ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'success';
    if (grade >= 70) return 'warning';
    return 'error';
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
                Parent Dashboard
              </Typography>
              <Typography color="text.secondary">
                Welcome, {user?.name}. Monitor your child's academic progress.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<MessageIcon />}
              >
                Contact Teachers
              </Button>
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
              >
                Make Payment
              </Button>
            </Stack>
          </Box>

          {/* Child Selector */}
          {children.length > 1 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select Child:
              </Typography>
              <Stack direction="row" spacing={1}>
                {children.map((child: any) => (
                  <Chip
                    key={child.id}
                    label={child.name}
                    onClick={() => setSelectedChild(child.id)}
                    color={selectedChild === child.id ? 'primary' : 'default'}
                    variant={selectedChild === child.id ? 'filled' : 'outlined'}
                    avatar={<Avatar>{child.name.charAt(0)}</Avatar>}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Payment Alerts */}
        {upcomingPayments.length > 0 && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            icon={<WarningIcon />}
            action={
              <Button color="inherit" size="small" onClick={() => setTabValue(2)}>
                View Payments
              </Button>
            }
          >
            You have {upcomingPayments.length} upcoming payment(s) due.
          </Alert>
        )}

        {/* Stats Cards */}
        {currentChild && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Overall GPA"
                value={currentChild.overallGPA?.toFixed(2) || 'N/A'}
                subtitle="Current semester"
                icon={<EmojiEventsIcon />}
                color={theme.palette.primary.main}
                trend="up"
                trendValue="+0.2"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Enrolled Courses"
                value={currentChild.enrolledCourses?.length || 0}
                subtitle="Active courses"
                icon={<SchoolIcon />}
                color={theme.palette.success.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Attendance Rate"
                value={`${currentChild.attendanceRate || 0}%`}
                subtitle="This semester"
                icon={<CalendarTodayIcon />}
                color={theme.palette.info.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Upcoming Deadlines"
                value={currentChild.upcomingDeadlines?.length || 0}
                subtitle="This week"
                icon={<EventIcon />}
                color={theme.palette.warning.main}
              />
            </Grid>
          </Grid>
        )}

        {/* Tabs Navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<DashboardIcon />} label="Overview" iconPosition="start" />
            <Tab icon={<AssessmentIcon />} label="Academic Progress" iconPosition="start" />
            <Tab icon={<PaymentIcon />} label="Payments" iconPosition="start" />
            <Tab icon={<NotificationsIcon />} label="Announcements" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab: Overview */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Current Courses */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {currentChild?.name}'s Current Courses
                </Typography>

                {(!currentChild?.enrolledCourses || currentChild.enrolledCourses.length === 0) ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">
                      No enrolled courses
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {currentChild.enrolledCourses.map((course: any) => (
                      <Card key={course.id} variant="outlined">
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {course.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Instructor: {course.instructor}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Progress
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={course.progress || 0}
                                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="body2" fontWeight="bold">
                                  {course.progress || 0}%
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3} sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Current Grade
                              </Typography>
                              <Chip
                                label={`${course.currentGrade || 'N/A'}%`}
                                color={getGradeColor(course.currentGrade || 0) as any}
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Upcoming Deadlines */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Upcoming Deadlines
                </Typography>
                {(!currentChild?.upcomingDeadlines || currentChild.upcomingDeadlines.length === 0) ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No upcoming deadlines
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {currentChild.upcomingDeadlines.slice(0, 5).map((deadline: any) => (
                      <ListItem key={deadline.id} disableGutters sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.light', width: 40, height: 40 }}>
                            <EventIcon fontSize="small" color="warning" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={deadline.title}
                          secondary={
                            <>
                              {deadline.courseName}
                              <br />
                              Due: {new Date(deadline.dueDate).toLocaleDateString()}
                            </>
                          }
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>

              {/* Recent Announcements */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Announcements
                </Typography>
                {announcements.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No new announcements
                  </Typography>
                ) : (
                  <List disablePadding>
                    {announcements.slice(0, 3).map((announcement: any) => (
                      <ListItem key={announcement.id} disableGutters sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              bgcolor: announcement.priority === 'HIGH' ? 'error.light' : 'info.light',
                              width: 40, 
                              height: 40 
                            }}
                          >
                            <NotificationsIcon 
                              fontSize="small" 
                              color={announcement.priority === 'HIGH' ? 'error' : 'info'}
                            />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={announcement.title}
                          secondary={new Date(announcement.createdAt).toLocaleDateString()}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Button fullWidth sx={{ mt: 2 }} onClick={() => setTabValue(3)}>
                  View All
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Academic Progress */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Recent Grades & Assessments
            </Typography>

            {(!currentChild?.recentGrades || currentChild.recentGrades.length === 0) ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <AssessmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No graded assessments yet
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Course</TableCell>
                      <TableCell>Assignment</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Percentage</TableCell>
                      <TableCell>Graded On</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentChild.recentGrades.map((grade: any) => {
                      const percentage = Math.round((grade.score / grade.maxScore) * 100);
                      return (
                        <TableRow key={grade.id}>
                          <TableCell>{grade.courseName}</TableCell>
                          <TableCell>{grade.assignmentTitle}</TableCell>
                          <TableCell>{grade.score} / {grade.maxScore}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${percentage}%`}
                              size="small"
                              color={getGradeColor(percentage) as any}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(grade.gradedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </TabPanel>

        {/* Tab: Payments */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {/* Upcoming Payments */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Upcoming Payments
                </Typography>

                {upcomingPayments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography color="text.secondary">
                      No upcoming payments
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {upcomingPayments.map((payment: any, index: number) => (
                      <React.Fragment key={payment.id}>
                        {index > 0 && <Divider />}
                        <ListItem sx={{ py: 2 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.light' }}>
                              <ReceiptIcon color="warning" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={payment.description}
                            secondary={`Due: ${new Date(payment.dueDate).toLocaleDateString()}`}
                          />
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" fontWeight="bold">
                              ${payment.amount.toFixed(2)}
                            </Typography>
                            <Button size="small" variant="contained">
                              Pay Now
                            </Button>
                          </Box>
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Payment History */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Payment History
                </Typography>

                {paymentHistory.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No payment history
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {paymentHistory.map((payment: any, index: number) => (
                      <React.Fragment key={payment.id}>
                        {index > 0 && <Divider />}
                        <ListItem sx={{ py: 2 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: payment.status === 'PAID' ? 'success.light' : 'error.light' }}>
                              {payment.status === 'PAID' ? (
                                <CheckCircleIcon color="success" />
                              ) : (
                                <WarningIcon color="error" />
                              )}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={payment.description}
                            secondary={payment.paidAt 
                              ? `Paid: ${new Date(payment.paidAt).toLocaleDateString()}`
                              : `Due: ${new Date(payment.dueDate).toLocaleDateString()}`
                            }
                          />
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body1" fontWeight="bold">
                              ${payment.amount.toFixed(2)}
                            </Typography>
                            <Chip
                              label={payment.status}
                              size="small"
                              color={payment.status === 'PAID' ? 'success' : 'error'}
                            />
                          </Box>
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Announcements */}
        <TabPanel value={tabValue} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              All Announcements
            </Typography>

            {announcements.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <NotificationsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No announcements
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {announcements.map((announcement: any, index: number) => (
                  <React.Fragment key={announcement.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 2 }}>
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: announcement.priority === 'HIGH' ? 'error.light' : 'info.light'
                          }}
                        >
                          <NotificationsIcon 
                            color={announcement.priority === 'HIGH' ? 'error' : 'info'}
                          />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="medium">{announcement.title}</Typography>
                            {announcement.priority === 'HIGH' && (
                              <Chip label="Important" size="small" color="error" />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            {announcement.message}
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </Typography>
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
    </Box>
  );
};

export default ParentDashboard;
