import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  TextField,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Skeleton,
  Alert,
  Pagination,
  Rating,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';

const GET_COURSES = gql`
  query GetCourses($filter: CoursesFilterInput) {
    courses(filter: $filter) {
      courses {
        id
        code
        title
        shortDescription
        thumbnailUrl
        level
        duration
        price
        currency
        status
        enrollmentCount
        instructor {
          id
          name
        }
        category {
          id
          name
        }
      }
      total
      page
      pageSize
    }
  }
`;

const GET_CATEGORIES = gql`
  query GetCategories {
    courseCategories {
      id
      name
      slug
    }
  }
`;

const CourseCatalog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, loading, error } = useQuery(GET_COURSES, {
    variables: {
      filter: {
        search: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        level: selectedLevel || undefined,
        status: 'PUBLISHED',
        page,
        pageSize,
      },
    },
  });

  const { data: categoriesData } = useQuery(GET_CATEGORIES);

  const courses = data?.courses?.courses || [];
  const totalPages = Math.ceil((data?.courses?.total || 0) / pageSize);

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'XAF',
    }).format(price);
  };

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

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Course Catalog
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Explore our wide range of courses and start learning today
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categoriesData?.courseCategories?.map((cat: any) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={selectedLevel}
            label="Level"
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <MenuItem value="">All Levels</MenuItem>
            <MenuItem value="BEGINNER">Beginner</MenuItem>
            <MenuItem value="INTERMEDIATE">Intermediate</MenuItem>
            <MenuItem value="ADVANCED">Advanced</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading courses: {error.message}
        </Alert>
      )}

      {/* Course Grid */}
      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: 8 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <Skeleton variant="rectangular" height={140} />
                  <CardContent>
                    <Skeleton variant="text" height={32} />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : courses.map((course: any) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={course.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image={course.thumbnailUrl || '/placeholder-course.jpg'}
                    alt={course.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip
                        label={course.level}
                        size="small"
                        color={getLevelColor(course.level) as any}
                      />
                      {course.category && (
                        <Chip
                          label={course.category.name}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography gutterBottom variant="h6" component="h2" noWrap>
                      {course.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        mb: 1,
                      }}
                    >
                      {course.shortDescription}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mt: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption">
                          {course.instructor?.name || 'Unknown'}
                        </Typography>
                      </Box>
                      {course.duration && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="caption">
                            {course.duration}h
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <SchoolIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="caption">
                        {course.enrollmentCount || 0} enrolled
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Typography variant="h6" color="primary">
                      {formatPrice(course.price, course.currency)}
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={`/university/courses/${course.id}`}
                      variant="contained"
                      size="small"
                    >
                      View Course
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* Empty State */}
      {!loading && courses.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No courses found
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Try adjusting your search or filters
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Container>
  );
};

export default CourseCatalog;
