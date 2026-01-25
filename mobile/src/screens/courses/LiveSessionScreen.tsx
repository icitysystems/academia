import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, FlatList, TextInput as RNTextInput } from 'react-native';
import { Text, IconButton, Avatar, Surface, useTheme, Badge, TextInput } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../contexts/AuthContext';

// Note: In a real app, you would use react-native-webrtc
// This is a simplified placeholder implementation

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  handRaised: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
}

type RouteProps = RouteProp<RootStackParamList, 'LiveSession'>;

const { width, height } = Dimensions.get('window');

const LiveSessionScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { sessionId } = route.params;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Mock participants for demo
  const [participants] = useState<Participant[]>([
    { id: '1', name: 'Dr. Smith (Host)', isHost: true, isMuted: false, isVideoOn: true, handRaised: false },
    { id: '2', name: 'John Doe', isHost: false, isMuted: true, isVideoOn: true, handRaised: false },
    { id: '3', name: 'Jane Smith', isHost: false, isMuted: false, isVideoOn: false, handRaised: true },
  ]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: user?.name || 'You',
        message: chatMessage,
        timestamp: new Date(),
      },
    ]);
    setChatMessage('');
  };

  const handleLeave = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Main Video Area */}
      <View style={styles.videoArea}>
        <View style={styles.mainVideo}>
          {/* Placeholder for main video */}
          <View style={styles.videoPlaceholder}>
            <Avatar.Text size={80} label="DS" />
            <Text variant="titleMedium" style={styles.speakerName}>
              Dr. Smith
            </Text>
          </View>
        </View>

        {/* Self Video Thumbnail */}
        <Surface style={styles.selfVideo} elevation={4}>
          <View style={styles.selfVideoContent}>
            {isVideoOn ? (
              <Avatar.Text size={40} label={user?.name?.charAt(0) || 'U'} />
            ) : (
              <IconButton icon="video-off" iconColor="#fff" />
            )}
          </View>
          {isMuted && (
            <Badge style={styles.muteBadge}>
              <Text style={styles.muteBadgeText}>🔇</Text>
            </Badge>
          )}
        </Surface>
      </View>

      {/* Control Bar */}
      <Surface style={styles.controlBar} elevation={4}>
        <IconButton
          icon={isMuted ? 'microphone-off' : 'microphone'}
          mode="contained"
          containerColor={isMuted ? '#f44336' : theme.colors.surfaceVariant}
          iconColor={isMuted ? '#fff' : theme.colors.onSurfaceVariant}
          onPress={() => setIsMuted(!isMuted)}
        />
        
        <IconButton
          icon={isVideoOn ? 'video' : 'video-off'}
          mode="contained"
          containerColor={isVideoOn ? theme.colors.surfaceVariant : '#f44336'}
          iconColor={isVideoOn ? theme.colors.onSurfaceVariant : '#fff'}
          onPress={() => setIsVideoOn(!isVideoOn)}
        />
        
        <IconButton
          icon="monitor-share"
          mode="contained"
          containerColor={isScreenSharing ? theme.colors.primary : theme.colors.surfaceVariant}
          iconColor={isScreenSharing ? '#fff' : theme.colors.onSurfaceVariant}
          onPress={() => setIsScreenSharing(!isScreenSharing)}
        />
        
        <IconButton
          icon={handRaised ? 'hand-back-left' : 'hand-back-left-outline'}
          mode="contained"
          containerColor={handRaised ? '#ff9800' : theme.colors.surfaceVariant}
          iconColor={handRaised ? '#fff' : theme.colors.onSurfaceVariant}
          onPress={() => setHandRaised(!handRaised)}
        />
        
        <IconButton
          icon="chat"
          mode="contained"
          containerColor={showChat ? theme.colors.primary : theme.colors.surfaceVariant}
          iconColor={showChat ? '#fff' : theme.colors.onSurfaceVariant}
          onPress={() => { setShowChat(!showChat); setShowParticipants(false); }}
        />
        
        <IconButton
          icon="account-group"
          mode="contained"
          containerColor={showParticipants ? theme.colors.primary : theme.colors.surfaceVariant}
          iconColor={showParticipants ? '#fff' : theme.colors.onSurfaceVariant}
          onPress={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
        />
        
        <IconButton
          icon="phone-hangup"
          mode="contained"
          containerColor="#f44336"
          iconColor="#fff"
          onPress={handleLeave}
        />
      </Surface>

      {/* Chat Panel */}
      {showChat && (
        <Surface style={styles.sidePanel} elevation={4}>
          <View style={styles.panelHeader}>
            <Text variant="titleMedium">Chat</Text>
            <IconButton icon="close" size={20} onPress={() => setShowChat(false)} />
          </View>
          
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            renderItem={({ item }) => (
              <View style={styles.chatMessage}>
                <Text variant="labelSmall" style={styles.chatSender}>
                  {item.sender}
                </Text>
                <Text variant="bodySmall">{item.message}</Text>
              </View>
            )}
          />
          
          <View style={styles.chatInput}>
            <TextInput
              placeholder="Type a message..."
              value={chatMessage}
              onChangeText={setChatMessage}
              mode="outlined"
              dense
              style={styles.chatTextInput}
              right={
                <TextInput.Icon icon="send" onPress={handleSendMessage} />
              }
            />
          </View>
        </Surface>
      )}

      {/* Participants Panel */}
      {showParticipants && (
        <Surface style={styles.sidePanel} elevation={4}>
          <View style={styles.panelHeader}>
            <Text variant="titleMedium">Participants ({participants.length})</Text>
            <IconButton icon="close" size={20} onPress={() => setShowParticipants(false)} />
          </View>
          
          <FlatList
            data={participants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.participantItem}>
                <Avatar.Text size={36} label={item.name.charAt(0)} />
                <View style={styles.participantInfo}>
                  <Text variant="bodyMedium">{item.name}</Text>
                  <View style={styles.participantStatus}>
                    {item.isHost && <Text variant="labelSmall" style={styles.hostBadge}>Host</Text>}
                    {item.isMuted && <Text>🔇</Text>}
                    {!item.isVideoOn && <Text>📷</Text>}
                    {item.handRaised && <Text>✋</Text>}
                  </View>
                </View>
              </View>
            )}
          />
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  videoArea: {
    flex: 1,
    position: 'relative',
  },
  mainVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  speakerName: {
    color: '#fff',
    marginTop: 16,
  },
  selfVideo: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  selfVideoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#f44336',
  },
  muteBadgeText: {
    fontSize: 10,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
    backgroundColor: '#2a2a2a',
  },
  sidePanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 80,
    width: width * 0.8,
    maxWidth: 320,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatList: {
    flex: 1,
    padding: 12,
  },
  chatMessage: {
    marginBottom: 12,
  },
  chatSender: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 2,
  },
  chatInput: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  chatTextInput: {
    backgroundColor: '#fff',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  participantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  hostBadge: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default LiveSessionScreen;
