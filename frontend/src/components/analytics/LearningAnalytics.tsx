import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as TimeIcon,
  School as CourseIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as AchievementIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  DonutSmall as DonutIcon,
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import {
  GET_STUDENT_ANALYTICS,
  GET_COURSE_ANALYTICS,
  GET_LEARNING_PATH_PROGRESS,
} from '../../graphql/operations';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Student Analytics Dashboard
interface StudentAnalyticsProps {
  studentId?: string;
}

export const StudentAnalytics: React.FC<StudentAnalyticsProps> = ({ studentId }) => {
  const [tab, setTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');

  const { data, loading, error } = useQuery(GET_STUDENT_ANALYTICS, {
    variables: { studentId, timeRange },
  });

  const analytics = data?.studentAnalytics;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load analytics. Please try again.</Alert>;
  }

  // Sample data structure
  const progressData = analytics?.progressOverTime || [
    { date: '2024-01-01', progress: 20 },
    { date: '2024-01-08', progress: 35 },
    { date: '2024-01-15', progress: 45 },
    { date: '2024-01-22', progress: 52 },
    { date: '2024-01-29', progress: 68 },
    { date: '2024-02-05', progress: 75 },
    { date: '2024-02-12', progress: 82 },
  ];

  const timeSpentData = analytics?.timeSpent || [
    { week: 'Week 1', hours: 5 },
    { week: 'Week 2', hours: 7 },
    { week: 'Week 3', hours: 4 },
    { week: 'Week 4', hours: 8 },
    { week: 'Week 5', hours: 6 },
    { week: 'Week 6', hours: 9 },
  ];

  const performanceBySubject = analytics?.performanceBySubject || [
    { subject: 'Math', score: 85 },
    { subject: 'Science', score: 78 },
    { subject: 'History', score: 92 },
    { subject: 'English', score: 88 },
    { subject: 'Art', score: 95 },
  ];

  const activityDistribution = analytics?.activityDistribution || [
    { name: 'Videos', value: 35 },
    { name: 'Quizzes', value: 25 },
    { name: 'Assignments', value: 20 },
    { name: 'Reading', value: 15 },
    { name: 'Discussions', value: 5 },
  ];

  const skillsRadar = analytics?.skills || [
    { skill: 'Problem Solving', value: 80 },
    { skill: 'Critical Thinking', value: 75 },
    { skill: 'Communication', value: 85 },
    { skill: 'Collaboration', value: 70 },
    { skill: 'Creativity', value: 90 },
    { skill: 'Time Management', value: 65 },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Learning Analytics</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
            <MenuItem value="1y">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TimeIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Study Time
                </Typography>
              </Box>
              <Typography variant="h4">47h 23m</Typography>
              <Chip
                icon={<TrendingUpIcon />}
                label="+15% from last period"
                size="small"
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CourseIcon color="info" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Courses in Progress
                </Typography>
              </Box>
              <Typography variant="h4">4</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                2 nearing completion
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <QuizIcon color="warning" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Avg. Quiz Score
                </Typography>
              </Box>
              <Typography variant="h4">86%</Typography>
              <Chip
                icon={<TrendingUpIcon />}
                label="+5% improvement"
                size="small"
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AchievementIcon color="success" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Achievements
                </Typography>
              </Box>
              <Typography variant="h4">12</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                3 new this week
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<TimelineIcon />} label="Progress" />
          <Tab icon={<BarChartIcon />} label="Performance" />
          <Tab icon={<DonutIcon />} label="Activity" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Learning Progress Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="progress"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Weekly Study Hours
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeSpentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="hours" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Performance by Subject
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceBySubject} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="subject" type="category" width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="score" fill="#8884d8">
                      {performanceBySubject.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Skills Assessment
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={skillsRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Skills"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Activity Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Activity</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Time Spent</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Quiz: Chapter 5</TableCell>
                        <TableCell>Mathematics</TableCell>
                        <TableCell>25 min</TableCell>
                        <TableCell>Today</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Video: Intro to Calculus</TableCell>
                        <TableCell>Mathematics</TableCell>
                        <TableCell>45 min</TableCell>
                        <TableCell>Yesterday</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Assignment Submitted</TableCell>
                        <TableCell>History</TableCell>
                        <TableCell>2 hr</TableCell>
                        <TableCell>2 days ago</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </Paper>

      {/* Learning Goals */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Learning Goals Progress
        </Typography>
        <Grid container spacing={2}>
          {[
            { goal: 'Complete Mathematics Course', progress: 75, target: '100%', deadline: 'Mar 15' },
            { goal: 'Achieve Quiz Average > 85%', progress: 86, target: '85%', deadline: 'Ongoing' },
            { goal: 'Complete 10 Assignments', progress: 70, target: '10', deadline: 'Apr 1' },
            { goal: 'Study 20 hours this month', progress: 60, target: '20h', deadline: 'Feb 28' },
          ].map((item, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">{item.goal}</Typography>
                  <Chip
                    label={`Due: ${item.deadline}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={item.progress}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    color={item.progress >= 100 ? 'success' : 'primary'}
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {item.progress}%
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

// Course Analytics (for Instructors)
interface CourseAnalyticsProps {
  courseId?: string;
}

export const CourseAnalytics: React.FC<CourseAnalyticsProps> = ({ courseId: propCourseId }) => {
  const params = useParams<{ courseId: string }>();
  const courseId = propCourseId || params.courseId || '';
  
  const { data, loading, error } = useQuery(GET_COURSE_ANALYTICS, {
    variables: { courseId },
    skip: !courseId,
  });

  const analytics = data?.courseAnalytics;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load course analytics.</Alert>;
  }

  const enrollmentData = [
    { month: 'Sep', students: 45 },
    { month: 'Oct', students: 52 },
    { month: 'Nov', students: 58 },
    { month: 'Dec', students: 55 },
    { month: 'Jan', students: 62 },
    { month: 'Feb', students: 68 },
  ];

  const completionData = [
    { name: 'Completed', value: 35 },
    { name: 'In Progress', value: 45 },
    { name: 'Not Started', value: 20 },
  ];

  const engagementData = [
    { day: 'Mon', views: 120, interactions: 45 },
    { day: 'Tue', views: 150, interactions: 60 },
    { day: 'Wed', views: 180, interactions: 75 },
    { day: 'Thu', views: 140, interactions: 55 },
    { day: 'Fri', views: 160, interactions: 65 },
    { day: 'Sat', views: 80, interactions: 30 },
    { day: 'Sun', views: 70, interactions: 25 },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Course Analytics
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Total Enrolled
              </Typography>
              <Typography variant="h4">68</Typography>
              <Chip label="+10% this month" size="small" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Completion Rate
              </Typography>
              <Typography variant="h4">52%</Typography>
              <LinearProgress variant="determinate" value={52} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Avg. Quiz Score
              </Typography>
              <Typography variant="h4">78%</Typography>
              <Chip label="Good performance" size="small" color="info" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Engagement Score
              </Typography>
              <Typography variant="h4">8.5/10</Typography>
              <Chip label="High engagement" size="small" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Weekly Engagement
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#8884d8" name="Page Views" />
                <Line type="monotone" dataKey="interactions" stroke="#82ca9d" name="Interactions" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Student Progress
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Enrollment Trend
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentAnalytics;
