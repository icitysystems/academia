import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, gql } from '@apollo/client';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

const GET_CHILD_PROGRESS = gql`
  query GetChildProgress($childId: ID!) {
    childProgress(childId: $childId) {
      child {
        id
        name
        avatarUrl
        grade
        school
      }
      academicSummary {
        currentGPA
        gpaChange
        classRank
        totalStudents
        creditsEarned
        creditsRequired
      }
      courseProgress {
        courseId
        courseName
        teacherName
        currentGrade
        letterGrade
        trend
        assignmentsCompleted
        totalAssignments
        lastActivity
      }
      attendanceRecord {
        totalDays
        present
        absent
        tardy
        excused
        percentage
        byMonth {
          month
          present
          absent
          tardy
        }
      }
      behaviorNotes {
        id
        date
        type
        note
        teacherName
      }
      learningGoals {
        id
        subject
        goal
        progress
        targetDate
        status
      }
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
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'UP') return <TrendingUpIcon color="success" />;
  if (trend === 'DOWN') return <TrendingDownIcon color="error" />;
  return <TrendingFlatIcon color="action" />;
};

const getGradeColor = (grade: number): string => {
  if (grade >= 90) return 'success.main';
  if (grade >= 80) return 'info.main';
  if (grade >= 70) return 'warning.main';
  return 'error.main';
};

export const ChildProgress: React.FC = () => {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const { data, loading, error } = useQuery(GET_CHILD_PROGRESS, {
    variables: { childId },
    skip: !childId,
  });

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load progress: {error.message}</Alert>
      </Container>
    );
  }

  const progress = data?.childProgress;
  const child = progress?.child;
  const academic = progress?.academicSummary;
  const courses = progress?.courseProgress || [];
  const attendance = progress?.attendanceRecord;
  const behavior = progress?.behaviorNotes || [];
  const goals = progress?.learningGoals || [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/parent" underline="hover" color="inherit">
          Parent Dashboard
        </Link>
        <Typography color="text.primary">{child?.name}'s Progress</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/parent')}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar src={child?.avatarUrl} sx={{ width: 56, height: 56 }}>
          {child?.name?.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="h5">{child?.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {child?.grade} • {child?.school}
          </Typography>
        </Box>
      </Box>

      {/* Academic Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Current GPA</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography variant="h4" color="primary">
                  {academic?.currentGPA?.toFixed(2) || 'N/A'}
                </Typography>
                {academic?.gpaChange !== 0 && (
                  <Chip
                    size="small"
                    icon={academic?.gpaChange > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    label={`${academic?.gpaChange > 0 ? '+' : ''}${academic?.gpaChange?.toFixed(2)}`}
                    color={academic?.gpaChange > 0 ? 'success' : 'error'}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Class Rank</Typography>
              <Typography variant="h4" color="secondary">
                {academic?.classRank || 'N/A'}/{academic?.totalStudents || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Attendance</Typography>
              <Typography variant="h4" color={attendance?.percentage >= 90 ? 'success.main' : 'warning.main'}>
                {attendance?.percentage?.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Credits</Typography>
              <Typography variant="h4">
                {academic?.creditsEarned}/{academic?.creditsRequired}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Tabs */}
      <Paper>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Course Grades" />
          <Tab label="Attendance" />
          <Tab label="Behavior" />
          <Tab label="Learning Goals" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Course Grades Tab */}
          <TabPanel value={activeTab} index={0}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Course</TableCell>
                    <TableCell>Teacher</TableCell>
                    <TableCell align="center">Grade</TableCell>
                    <TableCell align="center">Letter</TableCell>
                    <TableCell align="center">Trend</TableCell>
                    <TableCell align="center">Assignments</TableCell>
                    <TableCell>Last Activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courses.map((course: any) => (
                    <TableRow key={course.courseId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {course.courseName}
                        </Typography>
                      </TableCell>
                      <TableCell>{course.teacherName}</TableCell>
                      <TableCell align="center">
                        <Typography color={getGradeColor(course.currentGrade)}>
                          {course.currentGrade?.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={course.letterGrade}
                          size="small"
                          color={course.letterGrade.startsWith('A') ? 'success' : course.letterGrade.startsWith('B') ? 'info' : course.letterGrade.startsWith('C') ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TrendIcon trend={course.trend} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={`${course.assignmentsCompleted} of ${course.totalAssignments} completed`}>
                          <Box>
                            <Typography variant="body2">
                              {course.assignmentsCompleted}/{course.totalAssignments}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(course.assignmentsCompleted / course.totalAssignments) * 100}
                              sx={{ mt: 0.5, width: 60 }}
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {course.lastActivity ? new Date(course.lastActivity).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Attendance Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Attendance Summary</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Total Days:</Typography>
                        <Typography fontWeight="medium">{attendance?.totalDays}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="success.main">Present:</Typography>
                        <Typography fontWeight="medium">{attendance?.present}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="error.main">Absent:</Typography>
                        <Typography fontWeight="medium">{attendance?.absent}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="warning.main">Tardy:</Typography>
                        <Typography fontWeight="medium">{attendance?.tardy}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="info.main">Excused:</Typography>
                        <Typography fontWeight="medium">{attendance?.excused}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Monthly Breakdown</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Month</TableCell>
                            <TableCell align="center">Present</TableCell>
                            <TableCell align="center">Absent</TableCell>
                            <TableCell align="center">Tardy</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {attendance?.byMonth?.map((month: any) => (
                            <TableRow key={month.month}>
                              <TableCell>{month.month}</TableCell>
                              <TableCell align="center">
                                <Chip label={month.present} size="small" color="success" />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={month.absent} size="small" color="error" variant={month.absent > 0 ? 'filled' : 'outlined'} />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={month.tardy} size="small" color="warning" variant={month.tardy > 0 ? 'filled' : 'outlined'} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Behavior Tab */}
          <TabPanel value={activeTab} index={2}>
            {behavior.length === 0 ? (
              <Alert severity="info">No behavior notes recorded.</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Note</TableCell>
                      <TableCell>Teacher</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {behavior.map((note: any) => (
                      <TableRow key={note.id}>
                        <TableCell>{new Date(note.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={note.type}
                            size="small"
                            color={note.type === 'POSITIVE' ? 'success' : note.type === 'CONCERN' ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{note.note}</TableCell>
                        <TableCell>{note.teacherName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Learning Goals Tab */}
          <TabPanel value={activeTab} index={3}>
            {goals.length === 0 ? (
              <Alert severity="info">No learning goals set yet.</Alert>
            ) : (
              <Grid container spacing={2}>
                {goals.map((goal: any) => (
                  <Grid item xs={12} md={6} key={goal.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Chip label={goal.subject} size="small" />
                          <Chip
                            icon={goal.status === 'COMPLETED' ? <CheckCircleIcon /> : goal.status === 'IN_PROGRESS' ? <ScheduleIcon /> : <CancelIcon />}
                            label={goal.status.replace('_', ' ')}
                            size="small"
                            color={goal.status === 'COMPLETED' ? 'success' : goal.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                          />
                        </Box>
                        <Typography variant="body1" gutterBottom>{goal.goal}</Typography>
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Progress</Typography>
                            <Typography variant="body2">{goal.progress}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={goal.progress} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChildProgress;
