import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Switch, Divider, Button, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen: React.FC = () => {
  const theme = useTheme();

  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoPlayVideos, setAutoPlayVideos] = useState(true);
  const [downloadOverWifi, setDownloadOverWifi] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Clear cache logic
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Delete account logic
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Notifications */}
      <List.Section>
        <List.Subheader>Notifications</List.Subheader>
        <List.Item
          title="Push Notifications"
          description="Receive notifications on this device"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch value={notifications} onValueChange={setNotifications} />
          )}
        />
        <Divider />
        <List.Item
          title="Email Notifications"
          description="Receive updates via email"
          left={(props) => <List.Icon {...props} icon="email" />}
          right={() => (
            <Switch value={emailNotifications} onValueChange={setEmailNotifications} />
          )}
        />
      </List.Section>

      {/* Playback */}
      <List.Section>
        <List.Subheader>Playback & Downloads</List.Subheader>
        <List.Item
          title="Auto-play Videos"
          description="Automatically play next lesson"
          left={(props) => <List.Icon {...props} icon="play" />}
          right={() => (
            <Switch value={autoPlayVideos} onValueChange={setAutoPlayVideos} />
          )}
        />
        <Divider />
        <List.Item
          title="Download over Wi-Fi Only"
          description="Save mobile data"
          left={(props) => <List.Icon {...props} icon="wifi" />}
          right={() => (
            <Switch value={downloadOverWifi} onValueChange={setDownloadOverWifi} />
          )}
        />
      </List.Section>

      {/* Appearance */}
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Dark Mode"
          description="Use dark theme"
          left={(props) => <List.Icon {...props} icon="brightness-4" />}
          right={() => (
            <Switch value={darkMode} onValueChange={setDarkMode} />
          )}
        />
      </List.Section>

      {/* Storage */}
      <List.Section>
        <List.Subheader>Storage</List.Subheader>
        <List.Item
          title="Clear Cache"
          description="Free up storage space"
          left={(props) => <List.Icon {...props} icon="delete-sweep" />}
          onPress={handleClearCache}
        />
        <Divider />
        <List.Item
          title="Downloaded Content"
          description="Manage offline content"
          left={(props) => <List.Icon {...props} icon="download" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </List.Section>

      {/* Account */}
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Change Password"
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Terms of Service"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </List.Section>

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <Button
          mode="outlined"
          textColor="#f44336"
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          Delete Account
        </Button>
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
  dangerZone: {
    padding: 16,
    marginTop: 24,
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  bottomPadding: {
    height: 40,
  },
});

export default SettingsScreen;
