import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Avatar,
  Surface,
  List,
  Divider,
  useTheme,
  Button,
} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Surface style={styles.headerCard} elevation={2}>
        <Avatar.Text
          size={80}
          label={user?.name?.charAt(0) || 'U'}
          style={{ backgroundColor: theme.colors.primary }}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.name || 'Student'}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email}
        </Text>
        <View style={styles.roleBadge}>
          <Text variant="labelMedium" style={styles.roleText}>
            {user?.role || 'STUDENT'}
          </Text>
        </View>
        <Button
          mode="outlined"
          icon="pencil"
          onPress={() => navigation.navigate('ProfileEdit')}
          style={styles.editButton}
        >
          Edit Profile
        </Button>
      </Surface>

      {/* Quick Stats */}
      <Surface style={styles.statsCard} elevation={1}>
        <View style={styles.statItem}>
          <Text variant="headlineMedium" style={styles.statNumber}>
            12
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Courses
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineMedium" style={styles.statNumber}>
            8
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Certificates
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineMedium" style={styles.statNumber}>
            156h
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Learning
          </Text>
        </View>
      </Surface>

      {/* Menu Items */}
      <Surface style={styles.menuCard} elevation={1}>
        <List.Item
          title="My Certificates"
          description="View and share your achievements"
          left={(props) => (
            <List.Icon {...props} icon="certificate" color={theme.colors.primary} />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Certificates')}
        />
        <Divider />
        <List.Item
          title="Learning Analytics"
          description="Track your progress and performance"
          left={(props) => (
            <List.Icon {...props} icon="chart-line" color={theme.colors.secondary} />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Downloaded Content"
          description="View offline content"
          left={(props) => (
            <List.Icon {...props} icon="download" color="#4caf50" />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </Surface>

      <Surface style={styles.menuCard} elevation={1}>
        <List.Item
          title="Settings"
          description="App preferences and account settings"
          left={(props) => (
            <List.Icon {...props} icon="cog" color="#757575" />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Settings')}
        />
        <Divider />
        <List.Item
          title="Help & Support"
          description="FAQs and contact support"
          left={(props) => (
            <List.Icon {...props} icon="help-circle" color="#2196f3" />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="About"
          description="App version and terms"
          left={(props) => (
            <List.Icon {...props} icon="information" color="#9c27b0" />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </Surface>

      {/* Logout Button */}
      <Button
        mode="outlined"
        icon="logout"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#f44336"
      >
        Sign Out
      </Button>

      <Text variant="labelSmall" style={styles.version}>
        Academia Mobile v1.0.0
      </Text>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  headerCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  email: {
    color: '#666',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  editButton: {
    marginTop: 16,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    borderColor: '#f44336',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    marginTop: 24,
  },
  bottomPadding: {
    height: 40,
  },
});

export default ProfileScreen;
