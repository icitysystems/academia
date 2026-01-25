import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as IncompleteIcon,
  PlayCircle as InProgressIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  School as CourseIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  DateRange as DateIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_LESSON_PROGRESS,
  UPDATE_LESSON_PROGRESS,
  GET_COURSE_PROGRESS_REPORT,
} from '../../graphql/operations';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

interface LessonProgress {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleName: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progress: number;
  timeSpent: number; // in minutes
  lastAccessed?: string;
  completedAt?: string;
  quizScore?: number;
}

interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  lessons: LessonProgress[];
  completedLessons: number;
  totalLessons: number;
  overallProgress: number;
}

interface CourseProgressReport {
  studentId: string;
  studentName: string;
  enrolledAt: string;
  overallProgress: number;
  timeSpent: number;
  completedLessons: number;
  totalLessons: number;
  quizAverage: number;
  lastActivity: string;
  modulesCompleted?: number;
  lessonsCompleted?: number;
  assignmentsSubmitted?: number;
  totalAssignments?: number;
  quizzesPassed?: number;
  totalQuizzes?: number;
}

const COLORS = ['#4caf50', '#ff9800', '#f44336'];

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

// Student Progress View
interface StudentLessonProgressProps {
  courseId?: string;
  studentId?: string;
}

export const StudentLessonProgress: React.FC<StudentLessonProgressProps> = ({
  courseId: propCourseId,
  studentId,
}) => {
  const params = useParams<{ courseId: string }>();
  const courseId = propCourseId || params.courseId || '';
  
  const [expandedModule, setExpandedModule] = useState<string | false>(false);

  const { data, loading, error } = useQuery(GET_LESSON_PROGRESS, {
    variables: { courseId, studentId },
    skip: !courseId,
  });

  const [updateProgress] = useMutation(UPDATE_LESSON_PROGRESS);

  const modules: ModuleProgress[] = data?.lessonProgress?.modules || [];
  const courseProgress = data?.lessonProgress?.courseProgress || {
    overallProgress: 0,
    completedLessons: 0,
    totalLessons: 0,
    totalTimeSpent: 0,
  };

  const progressData = [
    { name: 'Completed', value: courseProgress.completedLessons },
    { name: 'In Progress', value: modules.reduce((sum, m) => 
      sum + m.lessons.filter(l => l.status === 'IN_PROGRESS').length, 0) },
    { name: 'Not Started', value: courseProgress.totalLessons - courseProgress.completedLessons - 
      modules.reduce((sum, m) => sum + m.lessons.filter(l => l.status === 'IN_PROGRESS').length, 0) },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load progress. Please try again.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Lesson Progress
      </Typography>

      {/* Progress Summary */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Overall Course Progress</Typography>
              <Typography variant="h4" color="primary">
                {courseProgress.overallProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={courseProgress.overallProgress}
              sx={{ height: 12, borderRadius: 6, mb: 2 }}
            />
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="success.main">
                    {courseProgress.completedLessons}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lessons Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5">
                    {courseProgress.totalLessons}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Lessons
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="info.main">
                    {formatTime(courseProgress.totalTimeSpent)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time Spent
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Progress Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={progressData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                >
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Module Accordions */}
      {modules.map((module, moduleIndex) => (
        <Accordion
          key={module.moduleId}
          expanded={expandedModule === module.moduleId}
          onChange={(_, isExpanded) =>
            setExpandedModule(isExpanded ? module.moduleId : false)
          }
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">
                  Module {moduleIndex + 1}: {module.moduleName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {module.completedLessons} of {module.totalLessons} lessons completed
                </Typography>
              </Box>
              <Box sx={{ width: 200, mr: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={module.overallProgress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Chip
                label={`${module.overallProgress}%`}
                color={
                  module.overallProgress === 100
                    ? 'success'
                    : module.overallProgress > 0
                    ? 'primary'
                    : 'default'
                }
                size="small"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List disablePadding>
              {module.lessons.map((lesson, lessonIndex) => (
                <React.Fragment key={lesson.lessonId}>
                  {lessonIndex > 0 && <Divider />}
                  <ListItem
                    sx={{
                      bgcolor:
                        lesson.status === 'COMPLETED'
                          ? 'success.light'
                          : lesson.status === 'IN_PROGRESS'
                          ? 'warning.light'
                          : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon>
                      {lesson.status === 'COMPLETED' ? (
                        <CompleteIcon color="success" />
                      ) : lesson.status === 'IN_PROGRESS' ? (
                        <InProgressIcon color="warning" />
                      ) : (
                        <IncompleteIcon color="action" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={lesson.lessonTitle}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            <TimerIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                            {formatTime(lesson.timeSpent)}
                          </Typography>
                          {lesson.quizScore !== undefined && (
                            <Typography variant="caption" color="text.secondary">
                              <AssessmentIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                              Quiz: {lesson.quizScore}%
                            </Typography>
                          )}
                          {lesson.lastAccessed && (
                            <Typography variant="caption" color="text.secondary">
                              Last accessed: {new Date(lesson.lastAccessed).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {lesson.status !== 'COMPLETED' && (
                        <Box sx={{ width: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={lesson.progress}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" align="center" display="block">
                            {lesson.progress}%
                          </Typography>
                        </Box>
                      )}
                      <Chip
                        label={lesson.status.replace('_', ' ')}
                        size="small"
                        color={
                          lesson.status === 'COMPLETED'
                            ? 'success'
                            : lesson.status === 'IN_PROGRESS'
                            ? 'warning'
                            : 'default'
                        }
                      />
                    </Box>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

// Instructor Progress Report View
interface InstructorProgressReportProps {
  courseId?: string;
}

export const InstructorProgressReport: React.FC<InstructorProgressReportProps> = ({
  courseId: propCourseId,
}) => {
  const params = useParams<{ courseId: string }>();
  const courseId = propCourseId || params.courseId || '';
  
  const [sortBy, setSortBy] = useState<string>('progress');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data, loading, error } = useQuery(GET_COURSE_PROGRESS_REPORT, {
    variables: { courseId },
    skip: !courseId,
  });

  const reports: CourseProgressReport[] = data?.courseProgressReport?.students || [];
  const courseStats = data?.courseProgressReport?.stats || {
    avgProgress: 0,
    avgTimeSpent: 0,
    completionRate: 0,
    totalStudents: 0,
  };

  const filteredReports = reports.filter((report) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return report.overallProgress === 100;
    if (filterStatus === 'inProgress')
      return report.overallProgress > 0 && report.overallProgress < 100;
    if (filterStatus === 'notStarted') return report.overallProgress === 0;
    return true;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    switch (sortBy) {
      case 'progress':
        return b.overallProgress - a.overallProgress;
      case 'time':
        return b.timeSpent - a.timeSpent;
      case 'name':
        return a.studentName.localeCompare(b.studentName);
      case 'quiz':
        return b.quizAverage - a.quizAverage;
      default:
        return 0;
    }
  });

  const progressDistribution = [
    { range: '0-25%', count: reports.filter((r) => r.overallProgress <= 25).length },
    { range: '26-50%', count: reports.filter((r) => r.overallProgress > 25 && r.overallProgress <= 50).length },
    { range: '51-75%', count: reports.filter((r) => r.overallProgress > 50 && r.overallProgress <= 75).length },
    { range: '76-100%', count: reports.filter((r) => r.overallProgress > 75).length },
  ];

  const handleExport = () => {
    // Export progress report as CSV
    const csvContent = [
      ['Student', 'Overall Progress', 'Time Spent', 'Completed Lessons', 'Quiz Average'],
      ...reports.map(report => [
        report.studentName || 'Unknown',
        `${report.overallProgress}%`,
        formatTime(report.timeSpent),
        `${report.completedLessons}/${report.totalLessons}`,
        `${report.quizAverage?.toFixed(1) || 'N/A'}%`
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load progress report.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Student Progress Report</Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
          Export Report
        </Button>
      </Box>

      {/* Course Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{courseStats.totalStudents}</Typography>
              <Typography color="text.secondary">Total Students</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{courseStats.avgProgress}%</Typography>
              <Typography color="text.secondary">Avg Progress</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CourseIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{courseStats.completionRate}%</Typography>
              <Typography color="text.secondary">Completion Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TimerIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{formatTime(courseStats.avgTimeSpent)}</Typography>
              <Typography color="text.secondary">Avg Time Spent</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Progress Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={progressDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="progress">Progress</MenuItem>
                    <MenuItem value="time">Time Spent</MenuItem>
                    <MenuItem value="name">Name</MenuItem>
                    <MenuItem value="quiz">Quiz Average</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Filter"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Students</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="inProgress">In Progress</MenuItem>
                    <MenuItem value="notStarted">Not Started</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Student Table */}
          <Paper>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell align="center">Progress</TableCell>
                    <TableCell align="center">Lessons</TableCell>
                    <TableCell align="center">Time</TableCell>
                    <TableCell align="center">Quiz Avg</TableCell>
                    <TableCell>Last Activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedReports.map((report) => (
                    <TableRow key={report.studentId} hover>
                      <TableCell>
                        <Typography variant="body2">{report.studentName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Enrolled: {new Date(report.enrolledAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={report.overallProgress}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                            color={
                              report.overallProgress === 100
                                ? 'success'
                                : report.overallProgress > 50
                                ? 'primary'
                                : 'warning'
                            }
                          />
                          <Typography variant="body2">{report.overallProgress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {report.completedLessons}/{report.totalLessons}
                      </TableCell>
                      <TableCell align="center">{formatTime(report.timeSpent)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${report.quizAverage}%`}
                          size="small"
                          color={
                            report.quizAverage >= 80
                              ? 'success'
                              : report.quizAverage >= 60
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(report.lastActivity).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentLessonProgress;
