import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, RadioButton, Checkbox, TextInput, Chip, useTheme, ProgressBar, Dialog, Portal } from 'react-native-paper';
import { useQuery, useMutation, gql } from '@apollo/client';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';

const GET_QUIZ = gql`
  query GetQuiz($id: ID!) {
    quiz(id: $id) {
      id
      title
      description
      duration
      passingScore
      allowReview
      questions {
        id
        text
        type
        options {
          id
          text
        }
        points
      }
    }
  }
`;

const START_QUIZ = gql`
  mutation StartQuiz($quizId: ID!) {
    startQuizAttempt(quizId: $quizId) {
      id
      startedAt
      expiresAt
    }
  }
`;

const SUBMIT_QUIZ = gql`
  mutation SubmitQuiz($attemptId: ID!, $answers: [QuizAnswerInput!]!) {
    submitQuizAttempt(attemptId: $attemptId, answers: $answers) {
      id
      score
      passed
      completedAt
    }
  }
`;

type RouteProps = RouteProp<RootStackParamList, 'Quiz'>;

const QuizScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { courseId, quizId } = route.params;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data, loading } = useQuery(GET_QUIZ, {
    variables: { id: quizId },
  });

  const [startQuiz, { loading: starting }] = useMutation(START_QUIZ);
  const [submitQuiz, { loading: submitting }] = useMutation(SUBMIT_QUIZ);

  const quiz = data?.quiz;
  const questions = quiz?.questions || [];
  const question = questions[currentQuestion];

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      const { data } = await startQuiz({ variables: { quizId } });
      setAttemptId(data.startQuizAttempt.id);
      setTimeLeft(quiz.duration * 60);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!attemptId) return;

    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer: Array.isArray(answer) ? answer : [answer],
      }));

      const { data } = await submitQuiz({
        variables: {
          attemptId,
          answers: formattedAnswers,
        },
      });

      setResult(data.submitQuizAttempt);
      setShowResult(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const confirmSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    
    if (unanswered > 0) {
      Alert.alert(
        'Unanswered Questions',
        `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: handleSubmit },
        ]
      );
    } else {
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading quiz...</Text>
      </View>
    );
  }

  // Not started yet
  if (!attemptId) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {quiz?.title}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {quiz?.description}
            </Text>

            <View style={styles.infoRow}>
              <Chip icon="clock">{quiz?.duration} minutes</Chip>
              <Chip icon="help-circle">{questions.length} questions</Chip>
            </View>

            <Text variant="bodySmall" style={styles.passingScore}>
              Passing score: {quiz?.passingScore}%
            </Text>

            <Button
              mode="contained"
              onPress={handleStart}
              loading={starting}
              style={styles.startButton}
            >
              Start Quiz
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  // Result dialog
  if (showResult && result) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.resultContent}>
            <Text variant="headlineMedium" style={result.passed ? styles.passedText : styles.failedText}>
              {result.passed ? '🎉 Passed!' : 'Not Passed'}
            </Text>
            
            <Text variant="displaySmall" style={styles.scoreText}>
              {result.score}%
            </Text>
            
            <Text variant="bodyMedium">
              {result.passed
                ? 'Congratulations! You passed the quiz.'
                : `You need ${quiz?.passingScore}% to pass. Try again!`}
            </Text>

            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.doneButton}
            >
              Done
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  // Quiz in progress
  return (
    <View style={styles.container}>
      {/* Timer & Progress */}
      <View style={styles.header}>
        <Chip icon="clock" mode={timeLeft && timeLeft < 60 ? 'flat' : 'outlined'}>
          {timeLeft ? formatTime(timeLeft) : '--:--'}
        </Chip>
        <Text variant="labelLarge">
          {currentQuestion + 1} / {questions.length}
        </Text>
      </View>

      <ProgressBar
        progress={(currentQuestion + 1) / questions.length}
        style={styles.progressBar}
      />

      {/* Question */}
      <ScrollView style={styles.questionContainer}>
        <Card style={styles.questionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.questionText}>
              {question?.text}
            </Text>

            {question?.type === 'MCQ' || question?.type === 'TRUE_FALSE' ? (
              <RadioButton.Group
                value={answers[question.id] as string || ''}
                onValueChange={(value) => handleAnswer(question.id, value)}
              >
                {question.options?.map((option: any) => (
                  <RadioButton.Item
                    key={option.id}
                    label={option.text}
                    value={option.id}
                    style={styles.optionItem}
                  />
                ))}
              </RadioButton.Group>
            ) : question?.type === 'MULTI_SELECT' ? (
              <View>
                {question.options?.map((option: any) => {
                  const selected = ((answers[question.id] as string[]) || []).includes(option.id);
                  return (
                    <Checkbox.Item
                      key={option.id}
                      label={option.text}
                      status={selected ? 'checked' : 'unchecked'}
                      onPress={() => {
                        const current = (answers[question.id] as string[]) || [];
                        const newValue = selected
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id];
                        handleAnswer(question.id, newValue);
                      }}
                      style={styles.optionItem}
                    />
                  );
                })}
              </View>
            ) : (
              <TextInput
                mode="outlined"
                value={(answers[question.id] as string) || ''}
                onChangeText={(value) => handleAnswer(question.id, value)}
                multiline={question?.type === 'ESSAY'}
                numberOfLines={question?.type === 'ESSAY' ? 5 : 1}
                style={styles.textInput}
              />
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          mode="outlined"
          onPress={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        {currentQuestion < questions.length - 1 ? (
          <Button
            mode="contained"
            onPress={() => setCurrentQuestion((prev) => prev + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={confirmSubmit}
            loading={submitting}
          >
            Submit Quiz
          </Button>
        )}
      </View>
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
  card: {
    margin: 16,
    borderRadius: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#666',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  passingScore: {
    color: '#666',
    marginBottom: 24,
  },
  startButton: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  progressBar: {
    height: 4,
  },
  questionContainer: {
    flex: 1,
  },
  questionCard: {
    margin: 16,
    borderRadius: 12,
  },
  questionText: {
    marginBottom: 16,
    lineHeight: 24,
  },
  optionItem: {
    paddingVertical: 4,
  },
  textInput: {
    marginTop: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resultContent: {
    alignItems: 'center',
    padding: 24,
  },
  passedText: {
    color: '#4caf50',
    marginBottom: 16,
  },
  failedText: {
    color: '#f44336',
    marginBottom: 16,
  },
  scoreText: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  doneButton: {
    marginTop: 24,
  },
});

export default QuizScreen;
