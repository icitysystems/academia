import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Skeleton,
  Alert,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';

const GET_MY_ENROLLMENTS = gql`
  query GetMyEnrollments($status: String) {
    myEnrollments(status: $status) {
      id
      status
      progress
      enrolledAt
      completedAt
      course {
        id
        title
        shortDescription
        thumbnailUrl
        level
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
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const MyCourses: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const statusFilter = tabValue === 0 ? undefined : tabValue === 1 ? 'ACTIVE' : 'COMPLETED';

  const { data, loading, error } = useQuery(GET_MY_ENROLLMENTS, {
    variables: { status: statusFilter },
  });

  const enrollments = data?.myEnrollments || [];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'success';
      case 'INTERMEDIATE':
        return 'warning';
      case 'ADVANCED':
        return 'error';
      default:
        return 'default';
    }
  };

  const CourseCard = ({ enrollment }: { enrollment: any }) => {
    const { course, progress, status } = enrollment;
    const totalLessons = course.modules?.reduce(
      (acc: number, m: any) => acc + (m.lessons?.length || 0),
      0
    ) || 0;
    const progressPercent = totalLessons > 0 ? Math.round((progress / totalLessons) * 100) : 0;

    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        {course.thumbnailUrl && (
          <Box
            component="img"
            src={course.thumbnailUrl}
            alt={course.title}
            sx={{ width: '100%', height: 140, objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Chip
              label={course.level}
              size="small"
              color={getLevelColor(course.level) as any}
            />
            {status === 'COMPLETED' && (
              <Chip
                label="Completed"
                size="small"
                color="success"
                icon={<CheckCircleIcon />}
              />
            )}
          </Box>
          <Typography variant="h6" component="h3" gutterBottom noWrap>
            {course.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {course.instructor?.name}
          </Typography>

          {status !== 'COMPLETED' && (
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progressPercent}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </CardContent>
        <CardActions sx={{ p: 2 }}>
          <Button
            component={RouterLink}
            to={`/university/learn/${course.id}`}
            variant="contained"
            fullWidth
            startIcon={status === 'COMPLETED' ? <CheckCircleIcon /> : <PlayArrowIcon />}
          >
            {status === 'COMPLETED' ? 'Review Course' : 'Continue Learning'}
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Courses
      </Typography>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="All Courses" />
        <Tab label="In Progress" />
        <Tab label="Completed" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading courses: {error.message}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={140} />
                <CardContent>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : enrollments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No courses yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Start exploring our course catalog and enroll in courses that interest you.
          </Typography>
          <Button
            component={RouterLink}
            to="/university/catalog"
            variant="contained"
          >
            Browse Courses
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {enrollments.map((enrollment: any) => (
            <Grid item xs={12} sm={6} md={4} key={enrollment.id}>
              <CourseCard enrollment={enrollment} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default MyCourses;
