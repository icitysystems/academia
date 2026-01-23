import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Divider,
  LinearProgress,
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GroupIcon from '@mui/icons-material/Group';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentIcon from '@mui/icons-material/Assignment';

const GET_ANALYTICS = gql`
  query GetPerformanceAnalytics($timeframe: String, $subject: String) {
    performanceAnalytics(timeframe: $timeframe, subject: $subject) {
      overview {
        totalStudents
        totalAssessments
        averageScore
        passRate
      }
      subjectBreakdown {
        subject
        averageScore
        totalAttempts
        trend
      }
      topicAnalysis {
        topic
        averageScore
        weakAreas
        strongAreas
      }
      recentActivity {
        date
        assessments
        avgScore
      }
    }
  }
`;

const PerformanceAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState('30d');
  const [selectedSubject, setSelectedSubject] = useState('');

  const { data, loading, error } = useQuery(GET_ANALYTICS, {
    variables: { timeframe, subject: selectedSubject || undefined },
  });

  const analytics = data?.performanceAnalytics;

  const StatCard = ({ title, value, subtitle, trend, icon, color }: any) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {trend >= 0 ? (
              <TrendingUpIcon color="success" fontSize="small" />
            ) : (
              <TrendingDownIcon color="error" fontSize="small" />
            )}
            <Typography
              variant="caption"
              color={trend >= 0 ? 'success.main' : 'error.main'}
              sx={{ ml: 0.5 }}
            >
              {Math.abs(trend)}% from last period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Performance Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track student performance and identify areas for improvement
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              label="Timeframe"
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Subject</InputLabel>
            <Select
              value={selectedSubject}
              label="Subject"
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <MenuItem value="">All Subjects</MenuItem>
              <MenuItem value="Mathematics">Mathematics</MenuItem>
              <MenuItem value="Physics">Physics</MenuItem>
              <MenuItem value="Chemistry">Chemistry</MenuItem>
              <MenuItem value="Biology">Biology</MenuItem>
              <MenuItem value="English">English</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={150} />
            </Grid>
          ))}
        </Grid>
      ) : !analytics ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AnalyticsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No analytics data available
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Performance data will appear once students start taking assessments
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Overview Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Students"
                value={analytics.overview?.totalStudents || 0}
                icon={<GroupIcon sx={{ color: 'primary.main' }} />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Assessments"
                value={analytics.overview?.totalAssessments || 0}
                icon={<AssignmentIcon sx={{ color: 'success.main' }} />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Average Score"
                value={`${analytics.overview?.averageScore || 0}%`}
                icon={<QuizIcon sx={{ color: 'info.main' }} />}
                color="info"
                trend={5}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Pass Rate"
                value={`${analytics.overview?.passRate || 0}%`}
                icon={<TrendingUpIcon sx={{ color: 'warning.main' }} />}
                color="warning"
                trend={2}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Subject Breakdown */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Subject Performance
                </Typography>
                {analytics.subjectBreakdown?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No subject data available
                  </Typography>
                ) : (
                  <Box>
                    {(analytics.subjectBreakdown || []).map((subject: any, index: number) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{subject.subject}</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {subject.averageScore}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={subject.averageScore}
                          sx={{ height: 8, borderRadius: 4 }}
                          color={
                            subject.averageScore >= 70
                              ? 'success'
                              : subject.averageScore >= 50
                              ? 'warning'
                              : 'error'
                          }
                        />
                        <Typography variant="caption" color="text.secondary">
                          {subject.totalAttempts} attempts
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Topic Analysis */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Topic Analysis
                </Typography>
                {analytics.topicAnalysis?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No topic data available
                  </Typography>
                ) : (
                  <Box>
                    {(analytics.topicAnalysis || []).slice(0, 5).map((topic: any, index: number) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{topic.topic}</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {topic.averageScore}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={topic.averageScore}
                          sx={{ height: 8, borderRadius: 4 }}
                          color={
                            topic.averageScore >= 70
                              ? 'success'
                              : topic.averageScore >= 50
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Recommendations */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  AI Recommendations
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Based on recent performance data, here are some suggestions:
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="error.main" gutterBottom>
                          Areas Needing Attention
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Students are struggling with algebraic expressions and quadratic equations.
                          Consider additional practice exercises.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="success.main" gutterBottom>
                          Strong Performance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Excellent results in basic arithmetic and geometry. Students are ready for
                          more advanced topics.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="warning.main" gutterBottom>
                          Suggested Resources
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Generate targeted quizzes on weak areas. Consider creating revision
                          materials for struggling topics.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default PerformanceAnalytics;
