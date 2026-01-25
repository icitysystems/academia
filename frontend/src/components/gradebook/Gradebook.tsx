import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Assessment as AssessmentIcon,
  EmojiEvents as AwardIcon,
  School as SchoolIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_STUDENT_GRADEBOOK,
  GET_INSTRUCTOR_GRADEBOOK,
  UPDATE_GRADE,
  EXPORT_GRADEBOOK,
} from '../../graphql/operations';

interface GradeItem {
  id: string;
  title: string;
  type: 'ASSIGNMENT' | 'QUIZ' | 'EXAM' | 'PROJECT' | 'PARTICIPATION';
  dueDate: string;
  maxPoints: number;
  earnedPoints: number | null;
  weight: number;
  status: 'GRADED' | 'PENDING' | 'LATE' | 'MISSING';
  feedback?: string;
}

interface CourseGrade {
  courseId: string;
  courseName: string;
  instructor: string;
  currentGrade: number;
  letterGrade: string;
  gradeItems: GradeItem[];
}

interface StudentGrade {
  studentId: string;
  studentName: string;
  email: string;
  currentGrade: number;
  letterGrade: string;
  gradeItems: GradeItem[];
}

const getGradeColor = (grade: number): string => {
  if (grade >= 90) return 'success';
  if (grade >= 80) return 'info';
  if (grade >= 70) return 'warning';
  return 'error';
};

const getLetterGrade = (percentage: number): string => {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
};

const getTrendIcon = (trend: number) => {
  if (trend > 2) return <TrendingUpIcon color="success" />;
  if (trend < -2) return <TrendingDownIcon color="error" />;
  return <TrendingFlatIcon color="action" />;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

// Student Gradebook View
interface StudentGradebookProps {
  studentId?: string;
}

export const StudentGradebook: React.FC<StudentGradebookProps> = ({ studentId }) => {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GradeItem | null>(null);

  const { data, loading, error } = useQuery(GET_STUDENT_GRADEBOOK, {
    variables: { studentId },
  });

  const courses: CourseGrade[] = data?.studentGradebook || [];

  const filteredCourses = selectedCourse === 'all'
    ? courses
    : courses.filter((c) => c.courseId === selectedCourse);

  const overallGPA = courses.length > 0
    ? courses.reduce((sum, c) => sum + c.currentGrade, 0) / courses.length
    : 0;

  const handleViewDetails = (item: GradeItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load gradebook. Please try again.</Alert>;
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CalculateIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary.main">
                {overallGPA.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall Average
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SchoolIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {courses.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Courses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {courses.reduce((sum, c) =>
                  sum + c.gradeItems.filter((i) => i.status === 'GRADED').length, 0
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Graded Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AwardIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {getLetterGrade(overallGPA)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Letter Grade
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Course</InputLabel>
          <Select
            value={selectedCourse}
            label="Course"
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <MenuItem value="all">All Courses</MenuItem>
            {courses.map((course) => (
              <MenuItem key={course.courseId} value={course.courseId}>
                {course.courseName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Course Grades */}
      {filteredCourses.map((course) => (
        <Paper key={course.courseId} sx={{ mb: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.dark',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography variant="h6">{course.courseName}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Instructor: {course.instructor}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h4">
                {course.currentGrade.toFixed(1)}%
              </Typography>
              <Chip
                label={course.letterGrade}
                size="small"
                sx={{ bgcolor: 'white', fontWeight: 'bold' }}
              />
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Assignment</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell align="center">Weight</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {course.gradeItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>
                      <Chip label={item.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {new Date(item.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      {item.earnedPoints !== null ? (
                        <Box>
                          <Typography variant="body2">
                            {item.earnedPoints} / {item.maxPoints}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(item.earnedPoints / item.maxPoints) * 100}
                            color={getGradeColor((item.earnedPoints / item.maxPoints) * 100) as any}
                            sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="center">{item.weight}%</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        size="small"
                        color={
                          item.status === 'GRADED'
                            ? 'success'
                            : item.status === 'PENDING'
                            ? 'info'
                            : item.status === 'LATE'
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(item)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      {/* Grade Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Grade Details</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedItem.title}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Type</Typography>
                  <Typography>{selectedItem.type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Due Date</Typography>
                  <Typography>
                    {new Date(selectedItem.dueDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Score</Typography>
                  <Typography>
                    {selectedItem.earnedPoints !== null
                      ? `${selectedItem.earnedPoints} / ${selectedItem.maxPoints} (${(
                          (selectedItem.earnedPoints / selectedItem.maxPoints) *
                          100
                        ).toFixed(1)}%)`
                      : 'Not graded'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Weight</Typography>
                  <Typography>{selectedItem.weight}%</Typography>
                </Grid>
                {selectedItem.feedback && (
                  <Grid item xs={12}>
                    <Typography color="text.secondary">Feedback</Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                      <Typography>{selectedItem.feedback}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Instructor Gradebook View
interface InstructorGradebookProps {
  courseId?: string;
}

export const InstructorGradebook: React.FC<InstructorGradebookProps> = ({ courseId: propCourseId }) => {
  const params = useParams<{ courseId: string }>();
  const courseId = propCourseId || params.courseId || '';
  
  const [tab, setTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<{
    studentId: string;
    itemId: string;
    points: number;
    feedback: string;
  } | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_INSTRUCTOR_GRADEBOOK, {
    variables: { courseId },
    skip: !courseId,
  });

  const [updateGrade, { loading: updating }] = useMutation(UPDATE_GRADE, {
    onCompleted: () => {
      setEditDialogOpen(false);
      refetch();
    },
  });

  const [exportGradebook, { loading: exporting }] = useMutation(EXPORT_GRADEBOOK);

  const students: StudentGrade[] = data?.instructorGradebook?.students || [];
  const gradeItems: GradeItem[] = data?.instructorGradebook?.gradeItems || [];

  const handleEditGrade = (studentId: string, item: GradeItem) => {
    setEditingGrade({
      studentId,
      itemId: item.id,
      points: item.earnedPoints || 0,
      feedback: item.feedback || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveGrade = () => {
    if (editingGrade) {
      updateGrade({
        variables: {
          courseId,
          studentId: editingGrade.studentId,
          gradeItemId: editingGrade.itemId,
          points: editingGrade.points,
          feedback: editingGrade.feedback,
        },
      });
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const result = await exportGradebook({
      variables: { courseId, format },
    });
    if (result.data?.exportGradebook?.url) {
      window.open(result.data.exportGradebook.url, '_blank');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load gradebook. Please try again.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Course Gradebook</Typography>
        <Box>
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
            disabled={exporting}
            sx={{ mr: 1 }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Grade Matrix" />
          <Tab label="Statistics" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 3 }}>
                    Student
                  </TableCell>
                  {gradeItems.map((item) => (
                    <TableCell key={item.id} align="center" sx={{ minWidth: 100 }}>
                      <Tooltip title={item.title}>
                        <Box>
                          <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 80 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({item.maxPoints})
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ minWidth: 100 }}>Total</TableCell>
                  <TableCell align="center" sx={{ minWidth: 80 }}>Grade</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.studentId} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper' }}>
                      <Box>
                        <Typography variant="body2">{student.studentName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    {student.gradeItems.map((item) => (
                      <TableCell key={item.id} align="center">
                        <Box
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                            p: 0.5,
                            borderRadius: 1,
                          }}
                          onClick={() => handleEditGrade(student.studentId, item)}
                        >
                          {item.earnedPoints !== null ? (
                            <Chip
                              label={item.earnedPoints}
                              size="small"
                              color={getGradeColor((item.earnedPoints / item.maxPoints) * 100) as any}
                            />
                          ) : (
                            <Chip label="-" size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {student.currentGrade.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={student.letterGrade}
                        color={getGradeColor(student.currentGrade) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Class Statistics</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography color="text.secondary">Class Average</Typography>
                      <Typography variant="h4">
                        {students.length > 0
                          ? (students.reduce((s, st) => s + st.currentGrade, 0) / students.length).toFixed(1)
                          : 0}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="text.secondary">Students</Typography>
                      <Typography variant="h4">{students.length}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="text.secondary">Highest Grade</Typography>
                      <Typography variant="h4">
                        {students.length > 0
                          ? Math.max(...students.map((s) => s.currentGrade)).toFixed(1)
                          : 0}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="text.secondary">Lowest Grade</Typography>
                      <Typography variant="h4">
                        {students.length > 0
                          ? Math.min(...students.map((s) => s.currentGrade)).toFixed(1)
                          : 0}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Grade Distribution</Typography>
                  {['A', 'B', 'C', 'D', 'F'].map((grade) => {
                    const count = students.filter((s) => s.letterGrade.startsWith(grade)).length;
                    const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
                    return (
                      <Box key={grade} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{grade}</Typography>
                          <Typography variant="body2">{count} students ({percentage.toFixed(0)}%)</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Edit Grade Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Grade</DialogTitle>
        <DialogContent>
          {editingGrade && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Points"
                type="number"
                value={editingGrade.points}
                onChange={(e) =>
                  setEditingGrade({ ...editingGrade, points: Number(e.target.value) })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Feedback"
                multiline
                rows={3}
                value={editingGrade.feedback}
                onChange={(e) =>
                  setEditingGrade({ ...editingGrade, feedback: e.target.value })
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGrade} disabled={updating}>
            {updating ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentGradebook;
