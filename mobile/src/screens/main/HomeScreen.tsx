import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Surface,
  useTheme,
  ProgressBar,
} from 'react-native-paper';
import { useQuery, gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

const GET_DASHBOARD = gql`
  query GetDashboard {
    myEnrollments {
      id
      course {
        id
        title
        thumbnail
        instructor {
          name
        }
      }
      progress
      enrolledAt
    }
    upcomingDeadlines {
      id
      title
      type
      dueDate
      course {
        id
        title
      }
    }
    recentActivity {
      id
      type
      description
      createdAt
    }
  }
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const { data, loading, refetch } = useQuery(GET_DASHBOARD);

  const enrollments = data?.myEnrollments || [];
  const deadlines = data?.upcomingDeadlines || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
    >
      {/* Welcome Card */}
      <Surface style={styles.welcomeCard} elevation={2}>
        <View style={styles.welcomeContent}>
          <Avatar.Text
            size={56}
            label={user?.name?.charAt(0) || 'U'}
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={styles.welcomeText}>
            <Text variant="titleLarge">Welcome back,</Text>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
              {user?.name || 'Student'}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Continue Learning Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Continue Learning
        </Text>
        {enrollments.length > 0 ? (
          enrollments.slice(0, 3).map((enrollment: any) => (
            <Card
              key={enrollment.id}
              style={styles.courseCard}
              onPress={() =>
                navigation.navigate('CourseDetail', {
                  courseId: enrollment.course.id,
                })
              }
            >
              <Card.Content style={styles.courseContent}>
                <View style={styles.courseInfo}>
                  <Text variant="titleMedium" numberOfLines={1}>
                    {enrollment.course.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.instructorText}>
                    {enrollment.course.instructor.name}
                  </Text>
                  <View style={styles.progressContainer}>
                    <ProgressBar
                      progress={enrollment.progress / 100}
                      color={theme.colors.primary}
                      style={styles.progressBar}
                    />
                    <Text variant="bodySmall" style={styles.progressText}>
                      {enrollment.progress}% complete
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                You haven't enrolled in any courses yet.
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Main')}
                style={styles.browseButton}
              >
                Browse Courses
              </Button>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Upcoming Deadlines Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Upcoming Deadlines
        </Text>
        {deadlines.length > 0 ? (
          deadlines.slice(0, 5).map((deadline: any) => (
            <Card
              key={deadline.id}
              style={styles.deadlineCard}
              onPress={() => {
                if (deadline.type === 'ASSIGNMENT') {
                  navigation.navigate('Assignment', {
                    courseId: deadline.course.id,
                    assignmentId: deadline.id,
                  });
                } else if (deadline.type === 'QUIZ') {
                  navigation.navigate('Quiz', {
                    courseId: deadline.course.id,
                    quizId: deadline.id,
                  });
                }
              }}
            >
              <Card.Content style={styles.deadlineContent}>
                <View style={styles.deadlineInfo}>
                  <Text variant="titleSmall">{deadline.title}</Text>
                  <Text variant="bodySmall" style={styles.courseText}>
                    {deadline.course.title}
                  </Text>
                </View>
                <View style={styles.deadlineDate}>
                  <Text variant="labelSmall" style={styles.deadlineType}>
                    {deadline.type}
                  </Text>
                  <Text variant="bodySmall" style={styles.dueDate}>
                    Due: {new Date(deadline.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                No upcoming deadlines 🎉
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quick Actions
        </Text>
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            icon="certificate"
            onPress={() => navigation.navigate('Certificates')}
            style={styles.actionButton}
          >
            Certificates
          </Button>
          <Button
            mode="outlined"
            icon="chart-line"
            onPress={() => {}}
            style={styles.actionButton}
          >
            Analytics
          </Button>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  welcomeCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    marginLeft: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  courseCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  courseContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  instructorText: {
    color: '#666',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    marginTop: 4,
    color: '#666',
  },
  emptyCard: {
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  browseButton: {
    marginTop: 16,
  },
  deadlineCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  deadlineContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineInfo: {
    flex: 1,
  },
  courseText: {
    color: '#666',
    marginTop: 2,
  },
  deadlineDate: {
    alignItems: 'flex-end',
  },
  deadlineType: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dueDate: {
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  bottomPadding: {
    height: 24,
  },
});

export default HomeScreen;
