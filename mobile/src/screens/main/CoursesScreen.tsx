import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  Chip,
  ProgressBar,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useQuery, gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

const GET_MY_COURSES = gql`
  query GetMyCourses {
    myEnrollments {
      id
      course {
        id
        title
        description
        thumbnail
        category
        level
        instructor {
          name
        }
      }
      progress
      enrolledAt
      completedAt
    }
  }
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Enrollment {
  id: string;
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    category: string;
    level: string;
    instructor: {
      name: string;
    };
  };
  progress: number;
  enrolledAt: string;
  completedAt?: string;
}

const CoursesScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  const { data, loading, refetch } = useQuery(GET_MY_COURSES);

  const enrollments: Enrollment[] = data?.myEnrollments || [];

  const filteredCourses = enrollments.filter((enrollment) => {
    // Search filter
    const matchesSearch =
      enrollment.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    let matchesFilter = true;
    if (filter === 'in-progress') {
      matchesFilter = enrollment.progress < 100 && !enrollment.completedAt;
    } else if (filter === 'completed') {
      matchesFilter = enrollment.progress === 100 || !!enrollment.completedAt;
    }

    return matchesSearch && matchesFilter;
  });

  const renderCourseCard = ({ item: enrollment }: { item: Enrollment }) => (
    <Card
      style={styles.courseCard}
      onPress={() =>
        navigation.navigate('CourseDetail', { courseId: enrollment.course.id })
      }
    >
      <Card.Cover
        source={{
          uri: enrollment.course.thumbnail || 'https://via.placeholder.com/300x150',
        }}
        style={styles.thumbnail}
      />
      <Card.Content style={styles.cardContent}>
        <View style={styles.categoryRow}>
          <Chip
            mode="flat"
            textStyle={styles.chipText}
            style={styles.categoryChip}
          >
            {enrollment.course.category}
          </Chip>
          <Chip
            mode="outlined"
            textStyle={styles.chipText}
            style={styles.levelChip}
          >
            {enrollment.course.level}
          </Chip>
        </View>

        <Text variant="titleMedium" style={styles.courseTitle} numberOfLines={2}>
          {enrollment.course.title}
        </Text>

        <Text variant="bodySmall" style={styles.instructor}>
          {enrollment.course.instructor.name}
        </Text>

        <View style={styles.progressSection}>
          <ProgressBar
            progress={enrollment.progress / 100}
            color={
              enrollment.progress === 100
                ? theme.colors.primary
                : theme.colors.secondary
            }
            style={styles.progressBar}
          />
          <Text variant="labelSmall" style={styles.progressText}>
            {enrollment.progress}% complete
          </Text>
        </View>

        {enrollment.completedAt && (
          <Text variant="labelSmall" style={styles.completedText}>
            ✓ Completed on{' '}
            {new Date(enrollment.completedAt).toLocaleDateString()}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search courses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
        >
          All
        </Chip>
        <Chip
          selected={filter === 'in-progress'}
          onPress={() => setFilter('in-progress')}
          style={styles.filterChip}
        >
          In Progress
        </Chip>
        <Chip
          selected={filter === 'completed'}
          onPress={() => setFilter('completed')}
          style={styles.filterChip}
        >
          Completed
        </Chip>
      </View>

      {loading && enrollments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          renderItem={renderCourseCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                {searchQuery || filter !== 'all'
                  ? 'No courses match your criteria'
                  : 'You haven\'t enrolled in any courses yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  courseCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 140,
  },
  cardContent: {
    paddingTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    height: 24,
  },
  levelChip: {
    height: 24,
  },
  chipText: {
    fontSize: 11,
  },
  courseTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  instructor: {
    color: '#666',
    marginBottom: 12,
  },
  progressSection: {
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    marginTop: 4,
    color: '#666',
  },
  completedText: {
    marginTop: 8,
    color: '#4caf50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default CoursesScreen;
