import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  TextField,
  Chip,
  Slider,
} from '@mui/material';
import {
  Videocam as VideoIcon,
  VideocamOff as VideoOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  CallEnd as CallEndIcon,
  Chat as ChatIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeMuteIcon,
  PanTool as HandIcon,
  Send as SendIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  RecordVoiceOver as RecordIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  GET_SESSION,
  JOIN_SESSION,
  LEAVE_SESSION,
  END_SESSION,
} from '../../graphql/operations';

interface Participant {
  id: string;
  name: string;
  role: 'INSTRUCTOR' | 'STUDENT';
  isVideoOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  hasHandRaised: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

interface SessionData {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  instructor: {
    id: string;
    name: string;
  };
}

interface LiveSessionProps {
  sessionId?: string;
  userId?: string;
  userRole?: 'INSTRUCTOR' | 'STUDENT';
}

const LiveSession: React.FC<LiveSessionProps> = ({ 
  sessionId: propSessionId, 
  userId: propUserId, 
  userRole: propUserRole 
}) => {
  const params = useParams<{ sessionId: string }>();
  const sessionId = propSessionId || params.sessionId || '';
  // TODO: Get userId and userRole from auth context when not provided
  const userId = propUserId || '';
  const userRole = propUserRole || 'STUDENT';
  
  // State
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasHandRaised, setHasHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // GraphQL
  const { data: sessionData, loading } = useQuery(GET_SESSION, {
    variables: { sessionId },
  });

  const [joinSession] = useMutation(JOIN_SESSION);
  const [leaveSession] = useMutation(LEAVE_SESSION);
  const [endSession] = useMutation(END_SESSION);

  const session: SessionData | null = sessionData?.session || null;

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  }, []);

  // Join session on mount
  useEffect(() => {
    initializeMedia();
    joinSession({ variables: { sessionId } });

    return () => {
      // Cleanup streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      leaveSession({ variables: { sessionId } });
    };
  }, [sessionId, initializeMedia, joinSession, leaveSession]);

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = stream;
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle raise hand
  const toggleHandRaise = () => {
    setHasHandRaised(!hasHandRaised);
    // Would send this to the server in a real implementation
  };

  // Send chat message
  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: userId,
        senderName: 'You',
        message: chatMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage('');
      // Would send to server via WebSocket in real implementation
    }
  };

  // Handle leave session
  const handleLeave = async () => {
    await leaveSession({ variables: { sessionId } });
    setLeaveDialogOpen(false);
    window.location.href = '/dashboard';
  };

  // Handle end session (instructor only)
  const handleEndSession = async () => {
    await endSession({ variables: { sessionId } });
    setEndDialogOpen(false);
    window.location.href = '/dashboard';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return (
      <Alert severity="error">Session not found or unavailable.</Alert>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'grey.900',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'grey.800',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label="LIVE"
            color="error"
            size="small"
            icon={<RecordIcon />}
          />
          <Typography color="white" variant="subtitle1">
            {session.title}
          </Typography>
          <Typography color="grey.400" variant="body2">
            {session.courseName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<PeopleIcon />}
            label={participants.length + 1}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'grey.600' }}
          />
          <IconButton sx={{ color: 'white' }} onClick={toggleFullscreen}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video Grid */}
        <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
          {/* Main Video (Screen Share or Speaker) */}
          <Box
            sx={{
              flex: 1,
              bgcolor: 'black',
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
              mb: 2,
            }}
          >
            {isScreenSharing ? (
              <video
                ref={screenShareRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <Typography
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.5)',
                px: 1,
                borderRadius: 1,
              }}
            >
              {session.instructor.name}
            </Typography>
          </Box>

          {/* Local Video (Picture-in-Picture) */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 100,
              right: showChat || showParticipants ? 340 : 24,
              width: 200,
              height: 150,
              bgcolor: 'black',
              borderRadius: 2,
              overflow: 'hidden',
              border: '2px solid',
              borderColor: 'grey.700',
            }}
          >
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar sx={{ width: 60, height: 60 }}>You</Avatar>
              </Box>
            )}
            <Typography
              sx={{
                position: 'absolute',
                bottom: 4,
                left: 8,
                color: 'white',
                fontSize: 12,
              }}
            >
              You
            </Typography>
          </Box>
        </Box>

        {/* Side Panels */}
        {(showChat || showParticipants) && (
          <Box
            sx={{
              width: 320,
              bgcolor: 'grey.800',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {showParticipants && (
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" color="white" gutterBottom>
                    Participants ({participants.length + 1})
                  </Typography>
                </Box>
                <List>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>{session.instructor.name[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.instructor.name}
                      secondary="Instructor"
                      primaryTypographyProps={{ color: 'white' }}
                      secondaryTypographyProps={{ color: 'grey.400' }}
                    />
                    <Chip label="Host" size="small" color="primary" />
                  </ListItem>
                  <Divider sx={{ borderColor: 'grey.700' }} />
                  {participants.map((p) => (
                    <ListItem key={p.id}>
                      <ListItemAvatar>
                        <Badge
                          color={p.isAudioOn ? 'success' : 'error'}
                          variant="dot"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        >
                          <Avatar>{p.name[0]}</Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={p.name}
                        primaryTypographyProps={{ color: 'white' }}
                      />
                      {p.hasHandRaised && <HandIcon color="warning" />}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {showChat && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" color="white">
                    Chat
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
                  {chatMessages.map((msg) => (
                    <Box key={msg.id} sx={{ mb: 2 }}>
                      <Typography variant="caption" color="primary.light">
                        {msg.senderName}
                      </Typography>
                      <Paper sx={{ p: 1, bgcolor: 'grey.700' }}>
                        <Typography variant="body2" color="white">
                          {msg.message}
                        </Typography>
                      </Paper>
                      <Typography variant="caption" color="grey.500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'grey.700', color: 'white' },
                    }}
                  />
                  <IconButton color="primary" onClick={sendMessage}>
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Controls */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'grey.800',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeIcon sx={{ color: 'grey.400' }} />
          <Slider
            value={volume}
            onChange={(_, v) => setVolume(v as number)}
            sx={{ width: 100 }}
            size="small"
          />
        </Box>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.600', mx: 2 }} />

        <Tooltip title={isAudioOn ? 'Mute' : 'Unmute'}>
          <IconButton
            onClick={toggleAudio}
            sx={{
              bgcolor: isAudioOn ? 'grey.700' : 'error.main',
              color: 'white',
              '&:hover': { bgcolor: isAudioOn ? 'grey.600' : 'error.dark' },
            }}
          >
            {isAudioOn ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
          <IconButton
            onClick={toggleVideo}
            sx={{
              bgcolor: isVideoOn ? 'grey.700' : 'error.main',
              color: 'white',
              '&:hover': { bgcolor: isVideoOn ? 'grey.600' : 'error.dark' },
            }}
          >
            {isVideoOn ? <VideoIcon /> : <VideoOffIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
          <IconButton
            onClick={toggleScreenShare}
            sx={{
              bgcolor: isScreenSharing ? 'success.main' : 'grey.700',
              color: 'white',
              '&:hover': { bgcolor: isScreenSharing ? 'success.dark' : 'grey.600' },
            }}
          >
            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        </Tooltip>

        {userRole === 'STUDENT' && (
          <Tooltip title={hasHandRaised ? 'Lower hand' : 'Raise hand'}>
            <IconButton
              onClick={toggleHandRaise}
              sx={{
                bgcolor: hasHandRaised ? 'warning.main' : 'grey.700',
                color: 'white',
                '&:hover': { bgcolor: hasHandRaised ? 'warning.dark' : 'grey.600' },
              }}
            >
              <HandIcon />
            </IconButton>
          </Tooltip>
        )}

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.600', mx: 2 }} />

        <Tooltip title="Participants">
          <IconButton
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
            sx={{
              bgcolor: showParticipants ? 'primary.main' : 'grey.700',
              color: 'white',
              '&:hover': { bgcolor: showParticipants ? 'primary.dark' : 'grey.600' },
            }}
          >
            <Badge badgeContent={participants.length + 1} color="secondary">
              <PeopleIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Chat">
          <IconButton
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
            sx={{
              bgcolor: showChat ? 'primary.main' : 'grey.700',
              color: 'white',
              '&:hover': { bgcolor: showChat ? 'primary.dark' : 'grey.600' },
            }}
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton
            onClick={() => setShowSettings(true)}
            sx={{
              bgcolor: 'grey.700',
              color: 'white',
              '&:hover': { bgcolor: 'grey.600' },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.600', mx: 2 }} />

        <Tooltip title={userRole === 'INSTRUCTOR' ? 'End session' : 'Leave session'}>
          <IconButton
            onClick={() => userRole === 'INSTRUCTOR' ? setEndDialogOpen(true) : setLeaveDialogOpen(true)}
            sx={{
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': { bgcolor: 'error.dark' },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Leave Confirmation Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>Leave Session?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave this live session?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleLeave}>
            Leave
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Session Dialog (Instructor) */}
      <Dialog open={endDialogOpen} onClose={() => setEndDialogOpen(false)}>
        <DialogTitle>End Session?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This will end the session for all participants.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleEndSession}>
            End Session
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Audio & Video Settings
          </Typography>
          <Alert severity="info">
            Settings would include camera selection, microphone selection, and audio output device selection.
            This requires additional implementation with device enumeration.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiveSession;
