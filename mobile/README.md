# Academia Mobile App

A React Native mobile application for the Academia learning management system, built with Expo.

## Features

### Authentication

- Login / Register
- Forgot Password
- Secure token storage with AsyncStorage

### Home Dashboard

- Welcome greeting with user avatar
- Continue Learning section with course progress
- Upcoming deadlines for assignments and quizzes
- Quick actions for certificates and analytics

### My Courses

- Course list with search and filters (All, In Progress, Completed)
- Course progress tracking
- Pull-to-refresh functionality

### Course Detail

- Course information with thumbnail
- Module/lesson listing with completion status
- Assignment list with due dates
- Quiz list with question count and duration
- Discussion forum access via FAB

### Assignments

- Assignment details with due date and max score
- File upload via document picker
- Submission status and feedback display
- Grade display when graded

### Quizzes

- Quiz info screen before starting
- Timer with countdown
- Multiple question types (MCQ, True/False, Multi-select, Short answer, Essay)
- Question navigation
- Auto-submit on time expiry
- Results display with pass/fail

### Discussions

- Thread list with search
- Thread creation
- Reply posting
- Pinned and locked thread support

### Live Sessions (WebRTC)

- Video/audio toggle
- Screen sharing toggle
- Hand raise feature
- Real-time chat
- Participant list
- Full-screen mode

### Notifications

- Push notification support via Expo
- In-app notification list
- Mark as read functionality
- Navigation to relevant content based on notification type
- Badge count on tab bar

### Profile

- User stats display
- Edit profile
- Certificates list with share/download
- Settings page

### Settings

- Push notifications toggle
- Email notifications toggle
- Auto-play videos toggle
- Wi-Fi only downloads
- Dark mode toggle
- Clear cache
- Account management

## Tech Stack

- **Framework:** React Native with Expo SDK 50
- **Navigation:** React Navigation 6
- **UI Components:** React Native Paper (Material Design 3)
- **State Management:** React Context
- **Data Fetching:** Apollo Client (GraphQL)
- **Push Notifications:** Expo Notifications
- **Storage:** AsyncStorage
- **File Picking:** Expo Document Picker
- **Video/Audio:** Expo AV (for WebRTC, use react-native-webrtc)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd mobile
npm install
```

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### Environment Configuration

Update `app.json` extra config for:

- `apiUrl`: Your GraphQL API endpoint
- `eas.projectId`: Your EAS project ID (for builds)

## Project Structure

```
mobile/
├── App.tsx                 # App entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── src/
    ├── contexts/
    │   ├── AuthContext.tsx       # Authentication state
    │   └── NotificationContext.tsx # Notifications state
    ├── navigation/
    │   ├── RootNavigator.tsx     # Root stack navigator
    │   └── MainTabNavigator.tsx  # Bottom tab navigator
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.tsx
    │   │   ├── RegisterScreen.tsx
    │   │   └── ForgotPasswordScreen.tsx
    │   ├── main/
    │   │   ├── HomeScreen.tsx
    │   │   ├── CoursesScreen.tsx
    │   │   ├── NotificationsScreen.tsx
    │   │   └── ProfileScreen.tsx
    │   ├── courses/
    │   │   ├── CourseDetailScreen.tsx
    │   │   ├── LessonScreen.tsx
    │   │   ├── AssignmentScreen.tsx
    │   │   ├── QuizScreen.tsx
    │   │   ├── DiscussionScreen.tsx
    │   │   └── LiveSessionScreen.tsx
    │   └── profile/
    │       ├── ProfileEditScreen.tsx
    │       ├── CertificatesScreen.tsx
    │       └── SettingsScreen.tsx
    └── services/
        └── apollo.ts            # Apollo Client setup
```

## Building for Production

### Using EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Standalone APK/IPA

See [Expo Build Documentation](https://docs.expo.dev/build/introduction/) for detailed instructions.

## Testing

```bash
npm test
```

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Submit PRs against the `develop` branch

## License

MIT License - See LICENSE file for details.
