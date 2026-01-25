import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, gql } from '@apollo/client';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';

const GET_ASSIGNMENT = gql`
  query GetAssignment($id: ID!) {
    assignment(id: $id) {
      id
      title
      description
      dueDate
      maxScore
      allowedFileTypes
      maxFileSize
      mySubmission {
        id
        status
        score
        feedback
        submittedAt
        files {
          name
          url
        }
      }
    }
  }
`;

const SUBMIT_ASSIGNMENT = gql`
  mutation SubmitAssignment($input: SubmitAssignmentInput!) {
    submitAssignment(input: $input) {
      id
      status
      submittedAt
    }
  }
`;

type RouteProps = RouteProp<RootStackParamList, 'Assignment'>;

const AssignmentScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { courseId, assignmentId } = route.params;

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [notes, setNotes] = useState('');

  const { data, loading, refetch } = useQuery(GET_ASSIGNMENT, {
    variables: { id: assignmentId },
  });

  const [submitAssignment, { loading: submitting }] = useMutation(SUBMIT_ASSIGNMENT);

  const assignment = data?.assignment;
  const submission = assignment?.mySubmission;

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: assignment?.allowedFileTypes || '*/*',
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    try {
      // In a real app, you'd upload the file first, then submit
      await submitAssignment({
        variables: {
          input: {
            assignmentId,
            notes,
            // fileUrl would come from file upload
          },
        },
      });
      refetch();
      setSelectedFile(null);
      setNotes('');
    } catch (error) {
      console.error('Error submitting assignment:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isLate = new Date(assignment?.dueDate) < new Date();
  const isSubmitted = !!submission;

  return (
    <ScrollView style={styles.container}>
      {/* Assignment Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {assignment?.title}
          </Text>
          
          <View style={styles.metaRow}>
            <Chip icon="calendar" compact>
              Due: {new Date(assignment?.dueDate).toLocaleDateString()}
            </Chip>
            <Chip icon="star" compact>
              {assignment?.maxScore} points
            </Chip>
          </View>

          {isLate && !isSubmitted && (
            <Chip icon="alert" mode="flat" style={styles.lateChip} textStyle={{ color: '#d32f2f' }}>
              Past Due
            </Chip>
          )}

          <Text variant="bodyMedium" style={styles.description}>
            {assignment?.description}
          </Text>
        </Card.Content>
      </Card>

      {/* Submission Status */}
      {submission && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Your Submission
            </Text>
            
            <View style={styles.submissionInfo}>
              <Chip
                icon={submission.status === 'GRADED' ? 'check-circle' : 'clock'}
                mode="flat"
              >
                {submission.status}
              </Chip>
              <Text variant="bodySmall">
                Submitted: {new Date(submission.submittedAt).toLocaleString()}
              </Text>
            </View>

            {submission.score !== null && (
              <View style={styles.gradeBox}>
                <Text variant="headlineMedium" style={styles.score}>
                  {submission.score}/{assignment.maxScore}
                </Text>
                <Text variant="bodySmall">Score</Text>
              </View>
            )}

            {submission.feedback && (
              <View style={styles.feedbackBox}>
                <Text variant="titleSmall">Instructor Feedback</Text>
                <Text variant="bodyMedium">{submission.feedback}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Upload Section */}
      {(!submission || submission.status === 'DRAFT') && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {submission ? 'Resubmit' : 'Submit Assignment'}
            </Text>

            <Button
              mode="outlined"
              icon="file-upload"
              onPress={handlePickFile}
              style={styles.uploadButton}
            >
              {selectedFile ? selectedFile.name : 'Choose File'}
            </Button>

            <TextInput
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!selectedFile || submitting}
              style={styles.submitButton}
            >
              Submit Assignment
            </Button>
          </Card.Content>
        </Card>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  lateChip: {
    backgroundColor: '#ffebee',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  description: {
    color: '#666',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  submissionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeBox: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  score: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  feedbackBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  uploadButton: {
    marginBottom: 16,
  },
  notesInput: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  bottomPadding: {
    height: 32,
  },
});

export default AssignmentScreen;
