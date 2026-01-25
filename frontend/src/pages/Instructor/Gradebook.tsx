import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
  Avatar,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as FlatIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { gql } from '@apollo/client';

// GraphQL queries
const GET_GRADEBOOK = gql`
  query GetGradebook($courseId: ID!) {
    gradebook(courseId: $courseId) {
      students {
        id
        name
        email
        enrollmentStatus
        overallGrade
        overallPercentage
        trend
        assignments {
          assignmentId
          assignmentTitle
          score
          maxScore
          percentage
          submittedAt
          isLate
          status
        }
        quizzes {
          quizId
          quizTitle
          score
          maxScore
          percentage
          passed
          submittedAt
        }
      }
      assignments {
        id
        title
        dueDate
        totalMarks
        avgScore
        submissionRate
      }
      quizzes {
        id
        title
        totalMarks
        passingMarks
        avgScore
        passRate
      }
      courseStats {
        avgGrade
        highestGrade
        lowestGrade
        passRate
        totalStudents
      }
    }
  }
`;

const UPDATE_GRADE = gql`
  mutation UpdateGrade($input: UpdateGradeInput!) {
    updateGrade(input: $input) {
      id
      score
      feedback
    }
  }
`;

interface Student {
  id: string;
  name: string;
  email: string;
  enrollmentStatus: string;
  overallGrade: string;
  overallPercentage: number;
  trend: 'up' | 'down' | 'flat';
  assignments: Array<{
    assignmentId: string;
    assignmentTitle: string;
    score: number | null;
    maxScore: number;
    percentage: number | null;
    submittedAt: string | null;
    isLate: boolean;
    status: string;
  }>;
  quizzes: Array<{
    quizId: string;
    quizTitle: string;
    score: number | null;
    maxScore: number;
    percentage: number | null;
    passed: boolean;
    submittedAt: string | null;
  }>;
}

type SortField = 'name' | 'overallPercentage' | 'trend';
type SortDirection = 'asc' | 'desc';

const getGradeColor = (percentage: number | null): string => {
  if (percentage === null) return 'default';
  if (percentage >= 90) return 'success';
  if (percentage >= 70) return 'primary';
  if (percentage >= 50) return 'warning';
  return 'error';
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <TrendingUpIcon color="success" fontSize="small" />;
    case 'down':
      return <TrendingDownIcon color="error" fontSize="small" />;
    default:
      return <FlatIcon color="action" fontSize="small" />;
  }
};

const InstructorGradebook: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editGradeDialog, setEditGradeDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState<{
    studentId: string;
    assignmentId: string;
    currentScore: number | null;
    maxScore: number;
    feedback: string;
  } | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Queries and mutations
  const { data, loading, error, refetch } = useQuery(GET_GRADEBOOK, {
    variables: { courseId },
    skip: !courseId,
  });

  const [updateGrade, { loading: updating }] = useMutation(UPDATE_GRADE, {
    onCompleted: () => {
      setEditGradeDialog(false);
      setEditingGrade(null);
      refetch();
    },
  });

  const gradebook = data?.gradebook;
  const students: Student[] = gradebook?.students || [];
  const assignments = gradebook?.assignments || [];
  const quizzes = gradebook?.quizzes || [];
  const stats = gradebook?.courseStats;

  // Sorting and filtering
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.enrollmentStatus === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'overallPercentage':
          comparison = (a.overallPercentage || 0) - (b.overallPercentage || 0);
          break;
        case 'trend':
          const trendOrder = { up: 3, flat: 2, down: 1 };
          comparison = trendOrder[a.trend] - trendOrder[b.trend];
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditGrade = (
    studentId: string,
    assignmentId: string,
    currentScore: number | null,
    maxScore: number
  ) => {
    setEditingGrade({
      studentId,
      assignmentId,
      currentScore,
      maxScore,
      feedback: '',
    });
    setEditGradeDialog(true);
  };

  const handleSaveGrade = async () => {
    if (!editingGrade) return;

    await updateGrade({
      variables: {
        input: {
          studentId: editingGrade.studentId,
          assignmentId: editingGrade.assignmentId,
          score: editingGrade.currentScore,
          feedback: editingGrade.feedback,
        },
      },
    });
  };

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Email', 'Overall Grade', 'Overall %', ...assignments.map((a: any) => a.title)];
    const rows = filteredStudents.map((student) => {
      const assignmentScores = assignments.map((a: any) => {
        const submission = student.assignments.find((s: any) => s.assignmentId === a.id);
        return submission?.score != null ? `${submission.score}/${a.totalMarks}` : 'N/A';
      });
      return [
        student.name,
        student.email,
        student.overallGrade,
        `${student.overallPercentage?.toFixed(1)}%`,
        ...assignmentScores,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook-${courseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading gradebook...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load gradebook. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">
            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gradebook
          </Typography>
          <Typography color="text.secondary">
            {students.length} students enrolled
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </Box>

      {/* Course Stats */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
            <Typography variant="overline" color="text.secondary">Class Average</Typography>
            <Typography variant="h4">{stats.avgGrade?.toFixed(1)}%</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
            <Typography variant="overline" color="text.secondary">Highest</Typography>
            <Typography variant="h4" color="success.main">{stats.highestGrade?.toFixed(1)}%</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
            <Typography variant="overline" color="text.secondary">Lowest</Typography>
            <Typography variant="h4" color="error.main">{stats.lowestGrade?.toFixed(1)}%</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
            <Typography variant="overline" color="text.secondary">Pass Rate</Typography>
            <Typography variant="h4">{stats.passRate?.toFixed(1)}%</Typography>
          </Paper>
        </Box>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Overview" />
          <Tab label="Assignments" />
          <Tab label="Quizzes" />
        </Tabs>
      </Paper>

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
        <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)}>
          <FilterIcon />
        </IconButton>
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
        >
          <MenuItem
            selected={statusFilter === 'all'}
            onClick={() => { setStatusFilter('all'); setFilterAnchorEl(null); }}
          >
            All Students
          </MenuItem>
          <MenuItem
            selected={statusFilter === 'ACTIVE'}
            onClick={() => { setStatusFilter('ACTIVE'); setFilterAnchorEl(null); }}
          >
            Active Only
          </MenuItem>
          <MenuItem
            selected={statusFilter === 'COMPLETED'}
            onClick={() => { setStatusFilter('COMPLETED'); setFilterAnchorEl(null); }}
          >
            Completed
          </MenuItem>
        </Menu>
      </Box>

      {/* Overview Table */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Student
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortField === 'overallPercentage'}
                    direction={sortField === 'overallPercentage' ? sortDirection : 'asc'}
                    onClick={() => handleSort('overallPercentage')}
                  >
                    Overall Grade
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Progress</TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortField === 'trend'}
                    direction={sortField === 'trend' ? sortDirection : 'asc'}
                    onClick={() => handleSort('trend')}
                  >
                    Trend
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow
                  key={student.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedStudent(student)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {student.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {student.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={student.enrollmentStatus}
                      size="small"
                      color={student.enrollmentStatus === 'ACTIVE' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={student.overallGrade || 'N/A'}
                      size="small"
                      color={getGradeColor(student.overallPercentage) as any}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {student.overallPercentage?.toFixed(1) || 'N/A'}%
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 150 }}>
                    <LinearProgress
                      variant="determinate"
                      value={student.overallPercentage || 0}
                      color={getGradeColor(student.overallPercentage) as any}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </TableCell>
                  <TableCell align="center">{getTrendIcon(student.trend)}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assignments Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                {assignments.map((assignment: any) => (
                  <TableCell key={assignment.id} align="center">
                    <Tooltip title={`Due: ${new Date(assignment.dueDate).toLocaleDateString()}`}>
                      <Box>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                          {assignment.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({assignment.totalMarks} pts)
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Typography variant="body2">{student.name}</Typography>
                  </TableCell>
                  {assignments.map((assignment: any) => {
                    const submission = student.assignments.find(
                      (a) => a.assignmentId === assignment.id
                    );
                    return (
                      <TableCell key={assignment.id} align="center">
                        {submission?.score !== null && submission?.score !== undefined ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${submission.score}/${assignment.totalMarks}`}
                              size="small"
                              color={getGradeColor(submission.percentage) as any}
                            />
                            {submission.isLate && (
                              <Chip label="Late" size="small" color="warning" variant="outlined" />
                            )}
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleEditGrade(
                                  student.id,
                                  assignment.id,
                                  submission.score,
                                  assignment.totalMarks
                                )
                              }
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : submission?.status === 'SUBMITTED' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              handleEditGrade(
                                student.id,
                                assignment.id,
                                null,
                                assignment.totalMarks
                              )
                            }
                          >
                            Grade
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            --
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Quizzes Tab */}
      {activeTab === 2 && (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                {quizzes.map((quiz: any) => (
                  <TableCell key={quiz.id} align="center">
                    <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                      {quiz.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({quiz.totalMarks} pts)
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Typography variant="body2">{student.name}</Typography>
                  </TableCell>
                  {quizzes.map((quiz: any) => {
                    const attempt = student.quizzes.find((q) => q.quizId === quiz.id);
                    return (
                      <TableCell key={quiz.id} align="center">
                        {attempt?.score !== null && attempt?.score !== undefined ? (
                          <Box>
                            <Chip
                              label={`${attempt.score}/${quiz.totalMarks}`}
                              size="small"
                              color={attempt.passed ? 'success' : 'error'}
                            />
                            <Typography variant="caption" display="block" color="text.secondary">
                              {attempt.percentage?.toFixed(1)}%
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            --
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Grade Dialog */}
      <Dialog open={editGradeDialog} onClose={() => setEditGradeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Grade</DialogTitle>
        <DialogContent>
          {editingGrade && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                type="number"
                label="Score"
                value={editingGrade.currentScore || ''}
                onChange={(e) =>
                  setEditingGrade({
                    ...editingGrade,
                    currentScore: parseFloat(e.target.value) || null,
                  })
                }
                inputProps={{ min: 0, max: editingGrade.maxScore }}
                helperText={`Maximum score: ${editingGrade.maxScore}`}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Feedback"
                value={editingGrade.feedback}
                onChange={(e) =>
                  setEditingGrade({ ...editingGrade, feedback: e.target.value })
                }
                placeholder="Add feedback for the student..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditGradeDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveGrade}
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Save Grade'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Detail Dialog */}
      <Dialog
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedStudent && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48 }}>
                  {selectedStudent.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedStudent.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedStudent.email}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Paper sx={{ p: 2, flex: 1 }}>
                  <Typography variant="overline" color="text.secondary">Overall Grade</Typography>
                  <Typography variant="h4">{selectedStudent.overallGrade}</Typography>
                  <Typography color="text.secondary">
                    {selectedStudent.overallPercentage?.toFixed(1)}%
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1 }}>
                  <Typography variant="overline" color="text.secondary">Assignments</Typography>
                  <Typography variant="h4">
                    {selectedStudent.assignments.filter((a) => a.score !== null).length}/
                    {selectedStudent.assignments.length}
                  </Typography>
                  <Typography color="text.secondary">Completed</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1 }}>
                  <Typography variant="overline" color="text.secondary">Quizzes</Typography>
                  <Typography variant="h4">
                    {selectedStudent.quizzes.filter((q) => q.passed).length}/
                    {selectedStudent.quizzes.length}
                  </Typography>
                  <Typography color="text.secondary">Passed</Typography>
                </Paper>
              </Box>

              <Typography variant="h6" gutterBottom>Assignment Scores</Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Assignment</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedStudent.assignments.map((assignment) => (
                      <TableRow key={assignment.assignmentId}>
                        <TableCell>{assignment.assignmentTitle}</TableCell>
                        <TableCell align="center">
                          {assignment.score !== null
                            ? `${assignment.score}/${assignment.maxScore}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={assignment.status}
                            size="small"
                            color={assignment.status === 'GRADED' ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="h6" gutterBottom>Quiz Scores</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Quiz</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedStudent.quizzes.map((quiz) => (
                      <TableRow key={quiz.quizId}>
                        <TableCell>{quiz.quizTitle}</TableCell>
                        <TableCell align="center">
                          {quiz.score !== null
                            ? `${quiz.score}/${quiz.maxScore}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="center">
                          {quiz.score !== null && (
                            <Chip
                              label={quiz.passed ? 'Passed' : 'Failed'}
                              size="small"
                              color={quiz.passed ? 'success' : 'error'}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedStudent(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default InstructorGradebook;
