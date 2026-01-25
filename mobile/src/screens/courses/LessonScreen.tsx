import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'Lesson'>;

const LessonScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const { courseId, lessonId } = route.params;

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Lesson Content</Text>
      <Text variant="bodyMedium">Course: {courseId}</Text>
      <Text variant="bodyMedium">Lesson: {lessonId}</Text>
      {/* Video player, content, etc. would go here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fafafa',
  },
});

export default LessonScreen;
