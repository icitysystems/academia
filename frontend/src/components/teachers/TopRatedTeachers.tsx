import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  Avatar,
  Chip,
  Grid,
  Button,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useQuery, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const GET_TOP_RATED_TEACHERS = gql`
  query GetTopRatedTeachers($limit: Int) {
    topRatedTeachers(limit: $limit) {
      id
      name
      avatarUrl
      department
      subjects
      rating
      totalReviews
      badge
      verified
    }
  }
`;

interface Teacher {
  id: string;
  name: string;
  avatarUrl?: string;
  department: string;
  subjects: string[];
  rating: number;
  totalReviews: number;
  badge?: 'TOP_RATED' | 'RISING_STAR' | 'EXPERT';
  verified: boolean;
}

interface TeacherRatingCardProps {
  teacher: Teacher;
  rank: number;
  onClick?: () => void;
}

const TeacherRatingCard: React.FC<TeacherRatingCardProps> = ({ teacher, rank, onClick }) => {
  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case 'TOP_RATED':
        return <TrophyIcon sx={{ color: 'gold' }} />;
      case 'RISING_STAR':
        return <TrendingIcon sx={{ color: '#ff6b6b' }} />;
      case 'EXPERT':
        return <SchoolIcon sx={{ color: '#4dabf7' }} />;
      default:
        return null;
    }
  };

  const getBadgeLabel = (badge?: string) => {
    switch (badge) {
      case 'TOP_RATED':
        return 'Top Rated';
      case 'RISING_STAR':
        return 'Rising Star';
      case 'EXPERT':
        return 'Expert';
      default:
        return null;
    }
  };

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
        position: 'relative',
        overflow: 'visible',
      }}
      onClick={onClick}
    >
      {/* Rank Badge */}
      {rank <= 3 && (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            left: -10,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: rank === 1 ? 'gold' : rank === 2 ? 'silver' : '#cd7f32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: rank === 1 ? 'black' : 'white',
            boxShadow: 2,
            zIndex: 1,
          }}
        >
          {rank}
        </Box>
      )}

      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar
            src={teacher.avatarUrl}
            sx={{ width: 56, height: 56 }}
          >
            {teacher.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {teacher.name}
              </Typography>
              {teacher.verified && (
                <Tooltip title="Verified Teacher">
                  <VerifiedIcon color="primary" sx={{ fontSize: 18 }} />
                </Tooltip>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {teacher.department}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Rating value={teacher.rating} readOnly precision={0.1} size="small" />
              <Typography variant="body2" fontWeight="medium">
                {teacher.rating.toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({teacher.totalReviews} reviews)
              </Typography>
            </Box>
          </Box>
          {teacher.badge && (
            <Tooltip title={getBadgeLabel(teacher.badge)}>
              <Box>{getBadgeIcon(teacher.badge)}</Box>
            </Tooltip>
          )}
        </Box>

        {teacher.subjects.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {teacher.subjects.slice(0, 3).map((subject) => (
              <Chip
                key={subject}
                label={subject}
                size="small"
                variant="outlined"
              />
            ))}
            {teacher.subjects.length > 3 && (
              <Chip
                label={`+${teacher.subjects.length - 3}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

interface TopRatedTeachersProps {
  limit?: number;
  title?: string;
  showViewAll?: boolean;
}

export const TopRatedTeachers: React.FC<TopRatedTeachersProps> = ({
  limit = 6,
  title = 'Top Rated Teachers',
  showViewAll = true,
}) => {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_TOP_RATED_TEACHERS, {
    variables: { limit },
  });

  if (error) {
    return null; // Silently fail if ratings aren't available
  }

  const teachers = data?.topRatedTeachers || [];

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarIcon color="primary" />
          {title}
        </Typography>
        {showViewAll && (
          <Button onClick={() => navigate('/teachers')} variant="text">
            View All
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: limit }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Skeleton variant="circular" width={56} height={56} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="80%" />
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="50%" />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          : teachers.map((teacher: Teacher, index: number) => (
              <Grid item xs={12} sm={6} md={4} key={teacher.id}>
                <TeacherRatingCard
                  teacher={teacher}
                  rank={index + 1}
                  onClick={() => navigate(`/teachers/${teacher.id}`)}
                />
              </Grid>
            ))}
      </Grid>
    </Box>
  );
};

export default TopRatedTeachers;
