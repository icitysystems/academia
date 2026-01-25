import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { ApolloProvider } from '@apollo/client';
import { useColorScheme } from 'react-native';

import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import RootNavigator from './src/navigation/RootNavigator';
import { apolloClient } from './src/services/apollo';

// Custom theme extending Material Design 3
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976d2',
    primaryContainer: '#e3f2fd',
    secondary: '#9c27b0',
    secondaryContainer: '#f3e5f5',
    surface: '#ffffff',
    background: '#fafafa',
    error: '#f44336',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90caf9',
    primaryContainer: '#1e3a5f',
    secondary: '#ce93d8',
    secondaryContainer: '#4a148c',
    surface: '#1e1e1e',
    background: '#121212',
    error: '#ef5350',
  },
};

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <NotificationProvider>
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <NavigationContainer>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <RootNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </PaperProvider>
        </NotificationProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
