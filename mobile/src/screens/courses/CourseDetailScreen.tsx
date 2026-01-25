import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, useTheme, ProgressBar, FAB, List, Divider } from 'react-native-paper';
import { useQuery, gql } from '@apollo/client';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

const GET_COURSE_DETAIL = gql`
  query GetCourseDetail($id: ID!) {
    course(id: $id) {
      id
      title
      description
      thumbnail
      category
      level
      instructor {
        id
        name
        avatar
      }
      modules {
        id
        title
        order
        lessons {
          id
          title
          duration
          type
          completed
        }
      }
      assignments {
        id
        title
        dueDate
        maxScore
      }
      quizzes {
        id
        title
        duration
        questionCount
      }
    }
    enrollment(courseId: $id) {
      progress
      enrolledAt
    }
  }
`;

type RouteProps = RouteProp<RootStackParamList, 'CourseDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CourseDetailScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { courseId } = route.params;

  const { data, loading } = useQuery(GET_COURSE_DETAIL, {
    variables: { id: courseId },
  });

  const course = data?.course;
  const enrollment = data?.enrollment;

  if (loading || !course) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Course Header */}
        <Card style={styles.headerCard}>
          <Card.Cover
            source={{ uri: course.thumbnail || 'https://via.placeholder.com/400x200' }}
            style={styles.thumbnail}
          />
          <Card.Content style={styles.headerContent}>
            <View style={styles.tagsRow}>
              <Chip mode="flat" compact>{course.category}</Chip>
              <Chip mode="outlined" compact>{course.level}</Chip>
            </View>
            <Text variant="headlineSmall" style={styles.title}>{course.title}</Text>
            <Text variant="bodyMedium" style={styles.instructor}>
              by {course.instructor.name}
            </Text>
            
            {enrollment && (
              <View style={styles.progressSection}>
                <ProgressBar
                  progress={enrollment.progress / 100}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
                <Text variant="labelSmall">{enrollment.progress}% complete</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Description */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>About this course</Text>
            <Text variant="bodyMedium">{course.description}</Text>
          </Card.Content>
        </Card>

        {/* Modules & Lessons */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Course Content</Text>
          </Card.Content>
          {course.modules?.map((module: any) => (
            <List.Accordion
              key={module.id}
              title={module.title}
              description={`${module.lessons.length} lessons`}
            >
              {module.lessons.map((lesson: any) => (
                <List.Item
                  key={lesson.id}
                  title={lesson.title}
                  description={`${lesson.duration} min`}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon={lesson.completed ? 'check-circle' : 'play-circle-outline'}
                      color={lesson.completed ? '#4caf50' : '#666'}
                    />
                  )}
                  onPress={() => navigation.navigate('Lesson', {
                    courseId,
                    lessonId: lesson.id,
                  })}
                />
              ))}
            </List.Accordion>
          ))}
        </Card>

        {/* Assignments */}
        {course.assignments?.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Assignments</Text>
            </Card.Content>
            {course.assignments.map((assignment: any) => (
              <React.Fragment key={assignment.id}>
                <List.Item
                  title={assignment.title}
                  description={`Due: ${new Date(assignment.dueDate).toLocaleDateString()}`}
                  left={props => <List.Icon {...props} icon="file-document" />}
                  onPress={() => navigation.navigate('Assignment', {
                    courseId,
                    assignmentId: assignment.id,
                  })}
                />
                <Divider />
              </React.Fragment>
            ))}
          </Card>
        )}

        {/* Quizzes */}
        {course.quizzes?.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Quizzes</Text>
            </Card.Content>
            {course.quizzes.map((quiz: any) => (
              <React.Fragment key={quiz.id}>
                <List.Item
                  title={quiz.title}
                  description={`${quiz.questionCount} questions • ${quiz.duration} min`}
                  left={props => <List.Icon {...props} icon="help-circle" />}
                  onPress={() => navigation.navigate('Quiz', {
                    courseId,
                    quizId: quiz.id,
                  })}
                />
                <Divider />
              </React.Fragment>
            ))}
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Discussion FAB */}
      <FAB
        icon="forum"
        style={styles.fab}
        onPress={() => navigation.navigate('Discussion', { courseId })}
        label="Discussion"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 180,
  },
  headerContent: {
    paddingTop: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  instructor: {
    color: '#666',
  },
  progressSection: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  bottomPadding: {
    height: 80,
  },
});

export default CourseDetailScreen;
