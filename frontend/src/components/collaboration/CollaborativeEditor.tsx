import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  AvatarGroup,
  Tooltip,
  Chip,
  IconButton,
  Badge,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  FiberManualRecord as OnlineIcon,
} from '@mui/icons-material';
import { useSubscription, useMutation, gql } from '@apollo/client';

const COLLABORATION_SUBSCRIPTION = gql`
  subscription OnCollaborationEvent($sessionId: String!) {
    collaborationEvents(sessionId: $sessionId) {
      type
      sessionId
      userId
      data
      timestamp
    }
  }
`;

const JOIN_SESSION = gql`
  mutation JoinSession($documentId: String!, $documentType: String!, $userName: String!) {
    joinCollaborationSession(documentId: $documentId, documentType: $documentType, userName: $userName) {
      session {
        id
        documentId
        documentType
        content
        version
        participants {
          id
          name
          color
          isActive
        }
      }
      participant {
        id
        name
        color
      }
    }
  }
`;

const LEAVE_SESSION = gql`
  mutation LeaveSession($sessionId: String!) {
    leaveCollaborationSession(sessionId: $sessionId)
  }
`;

const APPLY_OPERATION = gql`
  mutation ApplyOperation($sessionId: String!, $operation: OperationInput!) {
    applyCollaborationOperation(sessionId: $sessionId, operation: $operation) {
      applied {
        type
        position
        content
        length
        userId
        version
      }
      content
      version
    }
  }
`;

const UPDATE_CURSOR = gql`
  mutation UpdateCursor($sessionId: String!, $cursor: CursorPositionInput!) {
    updateCollaborationCursor(sessionId: $sessionId, cursor: $cursor)
  }
`;

interface Participant {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  cursor?: { line: number; column: number; offset: number };
}

interface CollaborativeEditorProps {
  documentId: string;
  documentType: 'lesson_plan' | 'assignment' | 'document' | 'note';
  userName: string;
  userId: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
  placeholder?: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  documentType,
  userName,
  userId,
  readOnly = false,
  onContentChange,
  placeholder = 'Start typing...',
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myColor, setMyColor] = useState('#4ECDC4');
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'info' | 'warning' | 'error' } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lastCursorPosition = useRef<number>(0);

  const [joinSession] = useMutation(JOIN_SESSION);
  const [leaveSession] = useMutation(LEAVE_SESSION);
  const [applyOperation] = useMutation(APPLY_OPERATION);
  const [updateCursor] = useMutation(UPDATE_CURSOR);

  // Subscribe to collaboration events
  const { data: eventData } = useSubscription(COLLABORATION_SUBSCRIPTION, {
    variables: { sessionId },
    skip: !sessionId,
  });

  // Join session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const result = await joinSession({
          variables: {
            documentId,
            documentType,
            userName,
          },
        });

        const { session, participant } = result.data.joinCollaborationSession;
        setSessionId(session.id);
        setContent(session.content);
        setVersion(session.version);
        setParticipants(session.participants);
        setMyColor(participant.color);
        setIsConnected(true);
        setNotification({ message: 'Connected to collaboration session', severity: 'success' });
      } catch (error: any) {
        setNotification({ message: `Failed to connect: ${error.message}`, severity: 'error' });
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        leaveSession({ variables: { sessionId } }).catch(console.error);
      }
    };
  }, [documentId, documentType, userName]);

  // Handle incoming collaboration events
  useEffect(() => {
    if (!eventData?.collaborationEvents) return;

    const event = eventData.collaborationEvents;
    const data = JSON.parse(event.data);

    switch (event.type) {
      case 'operation':
        if (event.userId !== userId) {
          // Apply remote operation
          setContent(data.content);
          setVersion(data.version);
        }
        break;
      case 'join':
        setParticipants(prev => {
          if (!prev.find(p => p.id === data.participant.id)) {
            return [...prev, data.participant];
          }
          return prev.map(p => p.id === data.participant.id ? { ...p, isActive: true } : p);
        });
        if (data.participant.name !== userName) {
          setNotification({ message: `${data.participant.name} joined`, severity: 'info' });
        }
        break;
      case 'leave':
        setParticipants(prev => prev.map(p => 
          p.id === data.participantId ? { ...p, isActive: false } : p
        ));
        break;
      case 'cursor':
        setParticipants(prev => prev.map(p =>
          p.id === event.userId ? { ...p, cursor: data.cursor } : p
        ));
        break;
    }
  }, [eventData, userId, userName]);

  // Handle local text changes
  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly || !sessionId) return;

    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    const oldContent = content;

    // Determine what operation occurred
    let operation: any;
    if (newContent.length > oldContent.length) {
      // Insert
      const insertPos = cursorPos - (newContent.length - oldContent.length);
      const insertedText = newContent.slice(insertPos, cursorPos);
      operation = {
        type: 'INSERT',
        position: insertPos,
        content: insertedText,
      };
    } else if (newContent.length < oldContent.length) {
      // Delete
      const deleteLength = oldContent.length - newContent.length;
      operation = {
        type: 'DELETE',
        position: cursorPos,
        length: deleteLength,
      };
    } else {
      // Replace (same length)
      operation = {
        type: 'REPLACE',
        position: cursorPos - 1,
        content: newContent[cursorPos - 1],
        length: 1,
      };
    }

    setContent(newContent);
    onContentChange?.(newContent);

    try {
      const result = await applyOperation({
        variables: {
          sessionId,
          operation,
        },
      });
      setVersion(result.data.applyCollaborationOperation.version);
    } catch (error) {
      console.error('Failed to apply operation:', error);
    }
  }, [sessionId, content, readOnly, applyOperation, onContentChange]);

  // Handle cursor movement
  const handleCursorMove = useCallback(async () => {
    if (!sessionId || !textAreaRef.current) return;

    const pos = textAreaRef.current.selectionStart;
    if (pos === lastCursorPosition.current) return;
    lastCursorPosition.current = pos;

    // Calculate line and column
    const textBeforeCursor = content.slice(0, pos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    try {
      await updateCursor({
        variables: {
          sessionId,
          cursor: { line, column, offset: pos },
        },
      });
    } catch (error) {
      console.error('Failed to update cursor:', error);
    }
  }, [sessionId, content, updateCursor]);

  const activeParticipants = participants.filter(p => p.isActive && p.id !== userId);

  return (
    <Box>
      {/* Header with participants */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge
              overlap="circular"
              badgeContent={
                <OnlineIcon sx={{ fontSize: 12, color: isConnected ? 'success.main' : 'error.main' }} />
              }
            >
              {readOnly ? <ViewIcon /> : <EditIcon />}
            </Badge>
            <Typography variant="subtitle1">
              {readOnly ? 'View Mode' : 'Collaborative Editing'}
            </Typography>
            <Chip
              size="small"
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              v{version}
            </Typography>
            
            {activeParticipants.length > 0 && (
              <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
                {activeParticipants.map(p => (
                  <Tooltip key={p.id} title={`${p.name} is editing`}>
                    <Avatar sx={{ bgcolor: p.color, fontSize: 14 }}>
                      {p.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            )}
            
            <Tooltip title="You">
              <Avatar sx={{ bgcolor: myColor, width: 32, height: 32, fontSize: 14 }}>
                {userName.charAt(0).toUpperCase()}
              </Avatar>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Editor */}
      <Paper sx={{ position: 'relative' }}>
        <TextField
          inputRef={textAreaRef}
          multiline
          fullWidth
          minRows={15}
          maxRows={30}
          value={content}
          onChange={handleChange}
          onSelect={handleCursorMove}
          onKeyUp={handleCursorMove}
          onClick={handleCursorMove}
          placeholder={placeholder}
          disabled={!isConnected}
          InputProps={{
            readOnly,
            sx: {
              fontFamily: 'monospace',
              fontSize: 14,
              lineHeight: 1.6,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
            },
          }}
          aria-label="Collaborative document editor"
        />

        {/* Remote cursors overlay - simplified representation */}
        {activeParticipants.filter(p => p.cursor).map(p => (
          <Box
            key={p.id}
            sx={{
              position: 'absolute',
              left: `${(p.cursor!.column * 8) + 14}px`,
              top: `${(p.cursor!.line * 24) + 16}px`,
              width: 2,
              height: 20,
              bgcolor: p.color,
              pointerEvents: 'none',
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0 },
              },
            }}
          >
            <Chip
              size="small"
              label={p.name}
              sx={{
                position: 'absolute',
                top: -24,
                left: 0,
                bgcolor: p.color,
                color: 'white',
                fontSize: 10,
                height: 18,
              }}
            />
          </Box>
        ))}
      </Paper>

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification?.severity} onClose={() => setNotification(null)}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CollaborativeEditor;
