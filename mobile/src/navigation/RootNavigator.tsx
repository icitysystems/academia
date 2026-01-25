import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main App Navigator
import MainTabNavigator from './MainTabNavigator';

// Course Screens
import CourseDetailScreen from '../screens/courses/CourseDetailScreen';
import LessonScreen from '../screens/courses/LessonScreen';
import AssignmentScreen from '../screens/courses/AssignmentScreen';
import QuizScreen from '../screens/courses/QuizScreen';
import DiscussionScreen from '../screens/courses/DiscussionScreen';
import LiveSessionScreen from '../screens/courses/LiveSessionScreen';

// Profile Screens
import ProfileEditScreen from '../screens/profile/ProfileEditScreen';
import CertificatesScreen from '../screens/profile/CertificatesScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main
  Main: undefined;
  
  // Course
  CourseDetail: { courseId: string };
  Lesson: { courseId: string; lessonId: string };
  Assignment: { courseId: string; assignmentId: string };
  Quiz: { courseId: string; quizId: string };
  Discussion: { courseId: string; threadId?: string };
  LiveSession: { sessionId: string };
  
  // Profile
  ProfileEdit: undefined;
  Certificates: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Return splash/loading screen
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          
          {/* Course Screens */}
          <Stack.Screen
            name="CourseDetail"
            component={CourseDetailScreen}
            options={{ headerShown: true, title: 'Course' }}
          />
          <Stack.Screen
            name="Lesson"
            component={LessonScreen}
            options={{ headerShown: true, title: 'Lesson' }}
          />
          <Stack.Screen
            name="Assignment"
            component={AssignmentScreen}
            options={{ headerShown: true, title: 'Assignment' }}
          />
          <Stack.Screen
            name="Quiz"
            component={QuizScreen}
            options={{ headerShown: true, title: 'Quiz' }}
          />
          <Stack.Screen
            name="Discussion"
            component={DiscussionScreen}
            options={{ headerShown: true, title: 'Discussion' }}
          />
          <Stack.Screen
            name="LiveSession"
            component={LiveSessionScreen}
            options={{ headerShown: false }}
          />
          
          {/* Profile Screens */}
          <Stack.Screen
            name="ProfileEdit"
            component={ProfileEditScreen}
            options={{ headerShown: true, title: 'Edit Profile' }}
          />
          <Stack.Screen
            name="Certificates"
            component={CertificatesScreen}
            options={{ headerShown: true, title: 'My Certificates' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: true, title: 'Settings' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
