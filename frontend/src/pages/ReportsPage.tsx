import React from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  GET_TEMPLATES,
  GET_CLASS_SUMMARY,
  GET_QUESTION_ANALYSIS,
  GET_SCORE_DISTRIBUTION,
} from '../graphql/queries';

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0'];

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('');

  const { data: templatesData } = useQuery(GET_TEMPLATES);

  const { data: summaryData, loading: summaryLoading } = useQuery(GET_CLASS_SUMMARY, {
    variables: { templateId: selectedTemplate },
    skip: !selectedTemplate,
  });

  const { data: analysisData } = useQuery(GET_QUESTION_ANALYSIS, {
    variables: { templateId: selectedTemplate },
    skip: !selectedTemplate,
  });

  const { data: distributionData } = useQuery(GET_SCORE_DISTRIBUTION, {
    variables: { templateId: selectedTemplate },
    skip: !selectedTemplate,
  });

  const summary = summaryData?.classSummary;
  const questions = analysisData?.questionAnalysis || [];
  const distribution = distributionData?.scoreDistribution || [];

  const gradeData = summary?.gradeDistribution
    ? Object.entries(summary.gradeDistribution).map(([grade, count]) => ({
        name: grade,
        value: count as number,
      }))
    : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Reports & Analytics</Typography>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Select Template</InputLabel>
          <Select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            label="Select Template"
          >
            {templatesData?.templates?.map((t: any) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!selectedTemplate ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Select a template to view reports
          </Typography>
        </Paper>
      ) : summaryLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Students
                  </Typography>
                  <Typography variant="h3">
                    {summary?.totalStudents || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Average Score
                  </Typography>
                  <Typography variant="h3">
                    {summary?.averageScore?.toFixed(1) || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Pass Rate
                  </Typography>
                  <Typography variant="h3" color="success.main">
                    {summary?.passRate?.toFixed(1) || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Score Range
                  </Typography>
                  <Typography variant="h5">
                    {summary?.lowestScore?.toFixed(0) || 0}% - {summary?.highestScore?.toFixed(0) || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Score Distribution */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Score Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Grade Distribution */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Grade Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gradeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Question Analysis */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Question Analysis (by Difficulty)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={questions.map((q: any) => ({
                      name: q.label,
                      correct: q.correctCount,
                      partial: q.partialCount,
                      incorrect: q.incorrectCount,
                      difficulty: (q.difficultyIndex * 100).toFixed(0),
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="correct" stackId="a" fill="#4caf50" name="Correct" />
                    <Bar dataKey="partial" stackId="a" fill="#ff9800" name="Partial" />
                    <Bar dataKey="incorrect" stackId="a" fill="#f44336" name="Incorrect" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default ReportsPage;
