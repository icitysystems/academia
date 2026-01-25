import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateDetailPage from './pages/TemplateDetailPage';
import ReportsPage from './pages/ReportsPage';
import UploadPage from './pages/UploadPage';
import AnnotatePage from './pages/AnnotatePage';
import ReviewPage from './pages/ReviewPage';
import DonatePage from './pages/DonatePage';
import PricingPage from './pages/PricingPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';
import SubscriptionPlansAdmin from './pages/admin/SubscriptionPlansAdmin';
import AdminDashboard from './pages/admin/AdminDashboard';
import SupportDashboard from './pages/admin/SupportDashboard';

// Lesson Tracking Pages
import Dashboard from './pages/LessonTracking/Dashboard';
import SchoolsList from './pages/LessonTracking/Schools/SchoolsList';
import SchoolForm from './pages/LessonTracking/Schools/SchoolForm';
import SchoolDetails from './pages/LessonTracking/Schools/SchoolDetails';
import ClassesList from './pages/LessonTracking/Classes/ClassesList';
import ClassForm from './pages/LessonTracking/Classes/ClassForm';
import ClassDetails from './pages/LessonTracking/Classes/ClassDetails';
import LessonsList from './pages/LessonTracking/Lessons/LessonsList';
import LessonForm from './pages/LessonTracking/Lessons/LessonForm';
import LessonDetails from './pages/LessonTracking/Lessons/LessonDetails';
import LessonReportsPage from './pages/LessonTracking/Reports/ReportsPage';
import SubjectsManagement from './pages/LessonTracking/Subjects/SubjectsManagement';
import SubjectForm from './pages/LessonTracking/Subjects/SubjectForm';
import SyllabusList from './pages/LessonTracking/Syllabus/SyllabusList';
import SyllabusDetails from './pages/LessonTracking/Syllabus/SyllabusDetails';
import SyllabusForm from './pages/LessonTracking/Syllabus/SyllabusForm';

// Online University Pages
import {
  CourseCatalog,
  CourseDetails,
  MyCourses,
  StudentDashboard,
  InstructorDashboard,
  CourseForm,
  ParentDashboard,
  AlumniPortal,
} from './pages/OnlineUniversity';

// Learning Resources Pages
import {
  LearningResourcesDashboard,
  SyllabusGenerator,
  LessonPlanGenerator,
  SchemesOfWork,
  TeachingResources,
  ExamPapers,
  QuestionBank,
  OnlineQuizzes,
  Presentations,
  PerformanceAnalytics,
} from './pages/LearningResources';

// Grading Pages
import { GradingDashboard, ExamPaperBuilder, GradingReview } from './pages/Grading';

// New Feature Components
import AssignmentUpload from './components/assignments/AssignmentUpload';
import DiscussionBoard from './components/discussions/DiscussionBoard';
import QuizTaker from './components/quiz/QuizTaker';
import NotificationCenter from './components/notifications/NotificationCenter';
import CertificateViewer from './components/certificates/CertificateViewer';
import { StudentGradebook, InstructorGradebook } from './components/gradebook/Gradebook';
import LiveSession from './components/livesession/LiveSession';
import { StudentAnalytics, CourseAnalytics } from './components/analytics/LearningAnalytics';
import UserManagement from './components/users/UserManagement';
import { StudentLessonProgress, InstructorProgressReport } from './components/progress/LessonProgress';

// Monitoring
import { MonitoringProvider, MonitoredErrorBoundary } from './monitoring/MonitoringProvider';

// Professional University Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// App Content with Routes
const AppContent: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Skip to main content link for keyboard users */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          zIndex: 9999,
          '&:focus': {
            position: 'fixed',
            top: 0,
            left: 0,
            width: 'auto',
            height: 'auto',
            padding: '16px 32px',
            backgroundColor: 'primary.main',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            borderRadius: '0 0 4px 0',
            boxShadow: 2,
          }
        }}
      >
        Skip to main content
      </Box>
      <Navbar />
      <Box 
        component="main" 
        id="main-content"
        tabIndex={-1}
        sx={{ flexGrow: 1, pb: 4, outline: 'none' }}
        role="main"
        aria-label="Main content"
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates/:id"
            element={
              <ProtectedRoute>
                <TemplateDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates/:templateId/upload"
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates/:templateId/review"
            element={
              <ProtectedRoute>
                <ReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sheets/:sheetId/annotate"
            element={
              <ProtectedRoute>
                <AnnotatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading"
            element={
              <ProtectedRoute>
                <GradingDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/exam/new"
            element={
              <ProtectedRoute>
                <ExamPaperBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/exam/:examId/edit"
            element={
              <ProtectedRoute>
                <ExamPaperBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/review/:sessionId"
            element={
              <ProtectedRoute>
                <GradingReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Lesson Tracking Routes */}
          <Route
            path="/lessons"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/new"
            element={
              <ProtectedRoute>
                <LessonForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/schools"
            element={
              <ProtectedRoute>
                <SchoolsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/schools/new"
            element={
              <ProtectedRoute>
                <SchoolForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/schools/:id"
            element={
              <ProtectedRoute>
                <SchoolDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/schools/:id/edit"
            element={
              <ProtectedRoute>
                <SchoolForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/classes"
            element={
              <ProtectedRoute>
                <ClassesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/classes/new"
            element={
              <ProtectedRoute>
                <ClassForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/classes/:id"
            element={
              <ProtectedRoute>
                <ClassDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/classes/:id/edit"
            element={
              <ProtectedRoute>
                <ClassForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/classes/:id/subjects"
            element={
              <ProtectedRoute>
                <SubjectsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/subjects/new"
            element={
              <ProtectedRoute>
                <SubjectForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/subjects/:id/edit"
            element={
              <ProtectedRoute>
                <SubjectForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/lessons"
            element={
              <ProtectedRoute>
                <LessonsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/all"
            element={
              <ProtectedRoute>
                <LessonsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/lessons/new"
            element={
              <ProtectedRoute>
                <LessonForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/lessons/:id"
            element={
              <ProtectedRoute>
                <LessonDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/lessons/:id/edit"
            element={
              <ProtectedRoute>
                <LessonForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/syllabus"
            element={
              <ProtectedRoute>
                <SyllabusList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/syllabus/new"
            element={
              <ProtectedRoute>
                <SyllabusForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/syllabus/:id"
            element={
              <ProtectedRoute>
                <SyllabusDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/syllabus/:id/edit"
            element={
              <ProtectedRoute>
                <SyllabusForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/reports"
            element={
              <ProtectedRoute>
                <LessonReportsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Online University Routes */}
          <Route path="/university" element={<CourseCatalog />} />
          <Route path="/university/courses" element={<CourseCatalog />} />
          <Route path="/university/courses/:id" element={<CourseDetails />} />
          <Route
            path="/university/my-courses"
            element={
              <ProtectedRoute>
                <MyCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/instructor"
            element={
              <ProtectedRoute>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/instructor/courses/new"
            element={
              <ProtectedRoute>
                <CourseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/instructor/courses/:id/edit"
            element={
              <ProtectedRoute>
                <CourseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/parent"
            element={
              <ProtectedRoute>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/alumni"
            element={
              <ProtectedRoute>
                <AlumniPortal />
              </ProtectedRoute>
            }
          />
          
          {/* Learning Resources Routes */}
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <LearningResourcesDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/syllabus"
            element={
              <ProtectedRoute>
                <SyllabusGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/lesson-plans"
            element={
              <ProtectedRoute>
                <LessonPlanGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/schemes"
            element={
              <ProtectedRoute>
                <SchemesOfWork />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/teaching"
            element={
              <ProtectedRoute>
                <TeachingResources />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/exams"
            element={
              <ProtectedRoute>
                <ExamPapers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/questions"
            element={
              <ProtectedRoute>
                <QuestionBank />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/quizzes"
            element={
              <ProtectedRoute>
                <OnlineQuizzes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/presentations"
            element={
              <ProtectedRoute>
                <Presentations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/analytics"
            element={
              <ProtectedRoute>
                <PerformanceAnalytics />
              </ProtectedRoute>
            }
          />
          
          {/* Public Pages */}
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/subscription-plans"
            element={
              <AdminRoute>
                <SubscriptionPlansAdmin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/support"
            element={
              <AdminRoute>
                <SupportDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <SupportDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Assignment Routes */}
          <Route
            path="/university/courses/:courseId/assignments/:assignmentId"
            element={
              <ProtectedRoute>
                <AssignmentUpload />
              </ProtectedRoute>
            }
          />
          
          {/* Discussion Routes */}
          <Route
            path="/university/courses/:courseId/discussions"
            element={
              <ProtectedRoute>
                <DiscussionBoard />
              </ProtectedRoute>
            }
          />
          
          {/* Quiz Routes */}
          <Route
            path="/university/courses/:courseId/quizzes/:quizId"
            element={
              <ProtectedRoute>
                <QuizTaker />
              </ProtectedRoute>
            }
          />
          
          {/* Certificate Routes */}
          <Route
            path="/university/certificates"
            element={
              <ProtectedRoute>
                <CertificateViewer />
              </ProtectedRoute>
            }
          />
          
          {/* Gradebook Routes */}
          <Route
            path="/university/gradebook"
            element={
              <ProtectedRoute>
                <StudentGradebook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/instructor/courses/:courseId/gradebook"
            element={
              <ProtectedRoute>
                <InstructorGradebook />
              </ProtectedRoute>
            }
          />
          
          {/* Live Session Routes */}
          <Route
            path="/university/sessions/:sessionId"
            element={
              <ProtectedRoute>
                <LiveSession />
              </ProtectedRoute>
            }
          />
          
          {/* Analytics Routes */}
          <Route
            path="/university/analytics"
            element={
              <ProtectedRoute>
                <StudentAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/instructor/courses/:courseId/analytics"
            element={
              <ProtectedRoute>
                <CourseAnalytics />
              </ProtectedRoute>
            }
          />
          
          {/* Progress Tracking Routes */}
          <Route
            path="/university/courses/:courseId/progress"
            element={
              <ProtectedRoute>
                <StudentLessonProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/university/instructor/courses/:courseId/progress"
            element={
              <ProtectedRoute>
                <InstructorProgressReport />
              </ProtectedRoute>
            }
          />
          
          {/* Admin User Management */}
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            }
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

// Main App Component
export default function App() {
  return (
    <MonitoringProvider
      config={{
        enabled: process.env.NODE_ENV === 'production',
        endpoint: process.env.REACT_APP_MONITORING_ENDPOINT || '/api/monitoring',
        sampleRate: 0.1,
        enableCoreWebVitals: true,
        enableErrorTracking: true,
        enableUserInteractions: true,
      }}
    >
      <MonitoredErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </MonitoredErrorBoundary>
    </MonitoringProvider>
  );
}
