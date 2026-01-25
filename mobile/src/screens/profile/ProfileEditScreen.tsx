import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Avatar, useTheme, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

const ProfileEditScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ name });
      setMessage('Profile updated successfully');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarSection}>
        <Avatar.Text
          size={100}
          label={name?.charAt(0) || 'U'}
          style={{ backgroundColor: theme.colors.primary }}
        />
        <Button mode="text" style={styles.changePhotoButton}>
          Change Photo
        </Button>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Full Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Email"
          value={email}
          mode="outlined"
          disabled
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      </View>

      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage('')}
        duration={2000}
      >
        {message}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  avatarSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  changePhotoButton: {
    marginTop: 12,
  },
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default ProfileEditScreen;
