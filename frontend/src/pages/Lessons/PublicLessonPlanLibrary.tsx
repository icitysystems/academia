import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Rating,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
  Slider,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  ContentCopy as CopyIcon,
  Star as StarIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Close as CloseIcon,
  TrendingUp as TrendingIcon,
  Schedule as RecentIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, gql } from '@apollo/client';

const SEARCH_PUBLIC_LESSON_PLANS = gql`
  query SearchPublicLessonPlans($input: LessonPlanSearchInput!) {
    searchPublicLessonPlans(input: $input) {
      results {
        id
        title
        description
        thumbnailUrl
        author {
          id
          name
          avatarUrl
          school
        }
        subject
        gradeLevel
        duration
        rating
        reviewCount
        downloadCount
        viewCount
        tags
        createdAt
        updatedAt
        saved
      }
      total
      page
      pageSize
      facets {
        subjects {
          value
          count
        }
        gradeLevels {
          value
          count
        }
        tags {
          value
          count
        }
      }
    }
  }
`;

const SAVE_LESSON_PLAN = gql`
  mutation SavePublicLessonPlan($lessonPlanId: ID!) {
    savePublicLessonPlan(lessonPlanId: $lessonPlanId) {
      id
      saved
    }
  }
`;

const COPY_LESSON_PLAN = gql`
  mutation CopyLessonPlan($lessonPlanId: ID!) {
    copyLessonPlanToMyLibrary(lessonPlanId: $lessonPlanId) {
      id
      title
    }
  }
`;

interface SearchInput {
  query: string;
  subjects: string[];
  gradeLevels: string[];
  tags: string[];
  minRating: number;
  sortBy: 'RELEVANCE' | 'RATING' | 'DOWNLOADS' | 'RECENT';
  page: number;
  pageSize: number;
}

export const PublicLessonPlanLibrary: React.FC = () => {
  const [searchInput, setSearchInput] = useState<SearchInput>({
    query: '',
    subjects: [],
    gradeLevels: [],
    tags: [],
    minRating: 0,
    sortBy: 'RELEVANCE',
    page: 1,
    pageSize: 12,
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(SEARCH_PUBLIC_LESSON_PLANS, {
    variables: { input: searchInput },
    fetchPolicy: 'cache-and-network',
  });

  const [saveLessonPlan] = useMutation(SAVE_LESSON_PLAN, {
    onCompleted: () => refetch(),
  });

  const [copyLessonPlan, { loading: copying }] = useMutation(COPY_LESSON_PLAN, {
    onCompleted: (data) => {
      setCopiedId(data.copyLessonPlanToMyLibrary.id);
      setTimeout(() => setCopiedId(null), 2000);
    },
  });

  const results = data?.searchPublicLessonPlans?.results || [];
  const total = data?.searchPublicLessonPlans?.total || 0;
  const facets = data?.searchPublicLessonPlans?.facets;
  const totalPages = Math.ceil(total / searchInput.pageSize);

  const handleSearch = (query: string) => {
    setSearchInput((prev) => ({ ...prev, query, page: 1 }));
  };

  const handleToggleSubject = (subject: string) => {
    setSearchInput((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
      page: 1,
    }));
  };

  const handleToggleGradeLevel = (grade: string) => {
    setSearchInput((prev) => ({
      ...prev,
      gradeLevels: prev.gradeLevels.includes(grade)
        ? prev.gradeLevels.filter((g) => g !== grade)
        : [...prev.gradeLevels, grade],
      page: 1,
    }));
  };

  const handleSave = async (lessonPlanId: string) => {
    await saveLessonPlan({ variables: { lessonPlanId } });
  };

  const handleCopy = async (lessonPlanId: string) => {
    await copyLessonPlan({ variables: { lessonPlanId } });
  };

  const clearFilters = () => {
    setSearchInput({
      query: searchInput.query,
      subjects: [],
      gradeLevels: [],
      tags: [],
      minRating: 0,
      sortBy: 'RELEVANCE',
      page: 1,
      pageSize: 12,
    });
  };

  const activeFilterCount = 
    searchInput.subjects.length + 
    searchInput.gradeLevels.length + 
    searchInput.tags.length + 
    (searchInput.minRating > 0 ? 1 : 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Lesson Plan Library</Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and share lesson plans from educators around the world
        </Typography>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Search lesson plans..."
            value={searchInput.query}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Badge badgeContent={activeFilterCount} color="primary">
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setFilterDrawerOpen(true)}
            >
              Filters
            </Button>
          </Badge>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={searchInput.sortBy}
              label="Sort By"
              onChange={(e) => setSearchInput((prev) => ({ ...prev, sortBy: e.target.value as any, page: 1 }))}
            >
              <MenuItem value="RELEVANCE">Relevance</MenuItem>
              <MenuItem value="RATING">Highest Rated</MenuItem>
              <MenuItem value="DOWNLOADS">Most Downloaded</MenuItem>
              <MenuItem value="RECENT">Most Recent</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Active filters:</Typography>
            {searchInput.subjects.map((subject) => (
              <Chip
                key={subject}
                label={subject}
                onDelete={() => handleToggleSubject(subject)}
                size="small"
              />
            ))}
            {searchInput.gradeLevels.map((grade) => (
              <Chip
                key={grade}
                label={grade}
                onDelete={() => handleToggleGradeLevel(grade)}
                size="small"
              />
            ))}
            {searchInput.minRating > 0 && (
              <Chip
                label={`${searchInput.minRating}+ stars`}
                onDelete={() => setSearchInput((prev) => ({ ...prev, minRating: 0 }))}
                size="small"
              />
            )}
            <Button size="small" onClick={clearFilters}>Clear all</Button>
          </Box>
        )}
      </Paper>

      {/* Results */}
      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load lesson plans: {error.message}</Alert>
      ) : results.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">No lesson plans found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filters
          </Typography>
        </Paper>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {total} lesson plan{total !== 1 ? 's' : ''} found
          </Typography>
          
          <Grid container spacing={3}>
            {results.map((lessonPlan: any) => (
              <Grid item xs={12} sm={6} md={4} key={lessonPlan.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {lessonPlan.thumbnailUrl && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={lessonPlan.thumbnailUrl}
                      alt={lessonPlan.title}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom noWrap>
                      {lessonPlan.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar src={lessonPlan.author.avatarUrl} sx={{ width: 24, height: 24 }}>
                        {lessonPlan.author.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {lessonPlan.author.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      mb: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {lessonPlan.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      <Chip label={lessonPlan.subject} size="small" color="primary" variant="outlined" />
                      <Chip label={lessonPlan.gradeLevel} size="small" variant="outlined" />
                      <Chip label={lessonPlan.duration} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Rating value={lessonPlan.rating} readOnly size="small" precision={0.5} />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({lessonPlan.reviewCount})
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        <DownloadIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                        {lessonPlan.downloadCount}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between' }}>
                    <Box>
                      <Tooltip title={lessonPlan.saved ? 'Saved' : 'Save to library'}>
                        <IconButton size="small" onClick={() => handleSave(lessonPlan.id)}>
                          {lessonPlan.saved ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copy to my lesson plans">
                        <IconButton size="small" onClick={() => handleCopy(lessonPlan.id)} disabled={copying}>
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Button size="small">View Details</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={searchInput.page}
                onChange={(_, page) => setSearchInput((prev) => ({ ...prev, page }))}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Subjects Filter */}
          <Typography variant="subtitle2" gutterBottom>Subject</Typography>
          <List dense>
            {facets?.subjects?.slice(0, 10).map((subject: any) => (
              <ListItem key={subject.value} disablePadding>
                <ListItemButton onClick={() => handleToggleSubject(subject.value)} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={searchInput.subjects.includes(subject.value)}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText primary={subject.value} />
                  <Typography variant="caption" color="text.secondary">
                    ({subject.count})
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {/* Grade Level Filter */}
          <Typography variant="subtitle2" gutterBottom>Grade Level</Typography>
          <List dense>
            {facets?.gradeLevels?.map((grade: any) => (
              <ListItem key={grade.value} disablePadding>
                <ListItemButton onClick={() => handleToggleGradeLevel(grade.value)} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={searchInput.gradeLevels.includes(grade.value)}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText primary={grade.value} />
                  <Typography variant="caption" color="text.secondary">
                    ({grade.count})
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {/* Rating Filter */}
          <Typography variant="subtitle2" gutterBottom>Minimum Rating</Typography>
          <Box sx={{ px: 2 }}>
            <Slider
              value={searchInput.minRating}
              onChange={(_, value) => setSearchInput((prev) => ({ ...prev, minRating: value as number }))}
              min={0}
              max={5}
              step={0.5}
              marks={[
                { value: 0, label: 'Any' },
                { value: 3, label: '3+' },
                { value: 4, label: '4+' },
                { value: 5, label: '5' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={clearFilters} fullWidth>
              Clear All
            </Button>
            <Button variant="contained" onClick={() => setFilterDrawerOpen(false)} fullWidth>
              Apply
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Copy Success Snackbar */}
      {copiedId && (
        <Alert 
          severity="success" 
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
        >
          Lesson plan copied to your library!
        </Alert>
      )}
    </Container>
  );
};

export default PublicLessonPlanLibrary;
