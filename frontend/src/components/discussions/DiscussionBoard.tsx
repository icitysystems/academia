import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Card,
  CardContent,
  CardActions,
  Menu,
  MenuItem,
  InputAdornment,
  Badge,
  Tooltip,
  Skeleton,
  Pagination,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Reply as ReplyIcon,
  PushPin as PinIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Forum as ForumIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_COURSE_DISCUSSIONS,
  GET_DISCUSSION_THREAD,
  CREATE_DISCUSSION_THREAD,
  CREATE_DISCUSSION_POST,
  TOGGLE_THREAD_PIN,
  TOGGLE_THREAD_LOCK,
} from '../../graphql/operations';
import { useAuth } from '../../contexts/AuthContext';

interface DiscussionBoardProps {
  courseId?: string;
  courseName?: string;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  };
  _count: {
    posts: number;
  };
  lastPost?: {
    id: string;
    createdAt: string;
    author: {
      name: string;
    };
  };
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  };
  parentId?: string;
  replies?: Post[];
}

const roleColors: Record<string, string> = {
  ADMIN: '#f44336',
  FACULTY: '#2196f3',
  STUDENT: '#4caf50',
  SUPPORT_STAFF: '#ff9800',
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const DiscussionBoard: React.FC<DiscussionBoardProps> = ({ courseId: propCourseId, courseName }) => {
  const { courseId: paramCourseId } = useParams<{ courseId: string }>();
  const courseId = propCourseId || paramCourseId || '';
  
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newThreadDialog, setNewThreadDialog] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedThreadMenu, setSelectedThreadMenu] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;

  const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } = useQuery(
    GET_COURSE_DISCUSSIONS,
    {
      variables: {
        courseId,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      },
    }
  );

  const { data: threadData, loading: threadLoading } = useQuery(GET_DISCUSSION_THREAD, {
    variables: { threadId: selectedThread },
    skip: !selectedThread,
  });

  const [createThread, { loading: creatingThread }] = useMutation(CREATE_DISCUSSION_THREAD, {
    onCompleted: () => {
      setNewThreadDialog(false);
      setNewThreadTitle('');
      setNewThreadContent('');
      refetchThreads();
    },
  });

  const [createPost, { loading: creatingPost }] = useMutation(CREATE_DISCUSSION_POST, {
    onCompleted: () => {
      setReplyContent('');
      setReplyTo(null);
    },
    refetchQueries: [{ query: GET_DISCUSSION_THREAD, variables: { threadId: selectedThread } }],
  });

  const [togglePin] = useMutation(TOGGLE_THREAD_PIN, {
    refetchQueries: [{ query: GET_COURSE_DISCUSSIONS, variables: { courseId } }],
  });

  const [toggleLock] = useMutation(TOGGLE_THREAD_LOCK, {
    refetchQueries: [{ query: GET_COURSE_DISCUSSIONS, variables: { courseId } }],
  });

  const threads = threadsData?.courseDiscussions?.threads || [];
  const totalCount = threadsData?.courseDiscussions?.totalCount || 0;
  const currentThread = threadData?.discussionThread;
  const isInstructor = user?.role === 'FACULTY' || user?.role === 'ADMIN';

  const handleCreateThread = () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) return;
    createThread({
      variables: {
        input: {
          courseId,
          title: newThreadTitle,
          content: newThreadContent,
        },
      },
    });
  };

  const handleReply = (parentId?: string) => {
    if (!replyContent.trim()) return;
    createPost({
      variables: {
        input: {
          threadId: selectedThread,
          content: replyContent,
          parentId,
        },
      },
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, threadId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedThreadMenu(threadId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedThreadMenu(null);
  };

  const renderThreadList = () => (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ForumIcon color="primary" />
          {courseName ? `${courseName} - Discussions` : 'Course Discussions'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewThreadDialog(true)}
        >
          New Discussion
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search discussions..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Thread List */}
      {threadsLoading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
          ))}
        </Box>
      ) : threads.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ForumIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No discussions yet
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            Be the first to start a discussion!
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewThreadDialog(true)}
            sx={{ mt: 2 }}
          >
            Start Discussion
          </Button>
        </Paper>
      ) : (
        <List sx={{ p: 0 }}>
          {threads
            .filter((t: Thread) =>
              t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.content.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((thread: Thread) => (
              <Card
                key={thread.id}
                sx={{
                  mb: 2,
                  cursor: 'pointer',
                  borderLeft: thread.isPinned ? '4px solid' : 'none',
                  borderLeftColor: 'primary.main',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
                onClick={() => setSelectedThread(thread.id)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                      <Avatar
                        src={thread.author.avatarUrl}
                        sx={{
                          bgcolor: roleColors[thread.author.role] || 'grey.500',
                        }}
                      >
                        {thread.author.name?.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {thread.isPinned && (
                            <Tooltip title="Pinned">
                              <PinIcon fontSize="small" color="primary" />
                            </Tooltip>
                          )}
                          {thread.isLocked && (
                            <Tooltip title="Locked">
                              <LockIcon fontSize="small" color="error" />
                            </Tooltip>
                          )}
                          <Typography variant="subtitle1" fontWeight={600}>
                            {thread.title}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {thread.content}
                        </Typography>
                      </Box>
                    </Box>

                    {isInstructor && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, thread.id);
                        }}
                      >
                        <MoreIcon />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon fontSize="inherit" />
                      {thread.author.name}
                    </Typography>
                    <Chip
                      label={thread.author.role}
                      size="small"
                      sx={{
                        bgcolor: roleColors[thread.author.role] || 'grey.500',
                        color: 'white',
                        height: 20,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CommentIcon fontSize="inherit" />
                      {thread._count.posts} replies
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon fontSize="inherit" />
                      {formatDate(thread.createdAt)}
                    </Typography>
                  </Box>
                </CardActions>
              </Card>
            ))}
        </List>
      )}

      {/* Pagination */}
      {totalCount > ITEMS_PER_PAGE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={Math.ceil(totalCount / ITEMS_PER_PAGE)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Thread Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            togglePin({ variables: { threadId: selectedThreadMenu } });
            handleMenuClose();
          }}
        >
          <PinIcon fontSize="small" sx={{ mr: 1 }} />
          {threads.find((t: Thread) => t.id === selectedThreadMenu)?.isPinned ? 'Unpin' : 'Pin'} Thread
        </MenuItem>
        <MenuItem
          onClick={() => {
            toggleLock({ variables: { threadId: selectedThreadMenu } });
            handleMenuClose();
          }}
        >
          {threads.find((t: Thread) => t.id === selectedThreadMenu)?.isLocked ? (
            <>
              <UnlockIcon fontSize="small" sx={{ mr: 1 }} />
              Unlock Thread
            </>
          ) : (
            <>
              <LockIcon fontSize="small" sx={{ mr: 1 }} />
              Lock Thread
            </>
          )}
        </MenuItem>
      </Menu>
    </Box>
  );

  const renderThreadView = () => (
    <Box>
      {/* Back Button */}
      <Button
        startIcon={<ForumIcon />}
        onClick={() => setSelectedThread(null)}
        sx={{ mb: 2 }}
      >
        Back to Discussions
      </Button>

      {threadLoading ? (
        <Skeleton variant="rectangular" height={300} />
      ) : currentThread ? (
        <>
          {/* Thread Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {currentThread.isPinned && <PinIcon color="primary" />}
              {currentThread.isLocked && <LockIcon color="error" />}
              <Typography variant="h5">{currentThread.title}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Avatar src={currentThread.author.avatarUrl}>
                {currentThread.author.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">{currentThread.author.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(currentThread.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {currentThread.content}
            </Typography>
          </Paper>

          {/* Locked Alert */}
          {currentThread.isLocked && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This discussion has been locked. No new replies can be posted.
            </Alert>
          )}

          {/* Reply Form */}
          {!currentThread.isLocked && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<ReplyIcon />}
                  onClick={() => handleReply()}
                  disabled={!replyContent.trim() || creatingPost}
                >
                  {creatingPost ? 'Posting...' : 'Post Reply'}
                </Button>
              </Box>
            </Paper>
          )}

          {/* Posts */}
          <Typography variant="h6" gutterBottom>
            Replies ({currentThread.posts?.length || 0})
          </Typography>
          
          {currentThread.posts?.map((post: Post) => (
            <Card key={post.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar src={post.author.avatarUrl}>
                    {post.author.name?.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2">{post.author.name}</Typography>
                      <Chip
                        label={post.author.role}
                        size="small"
                        sx={{
                          bgcolor: roleColors[post.author.role] || 'grey.500',
                          color: 'white',
                          height: 18,
                          fontSize: '0.65rem',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(post.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {post.content}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </>
      ) : (
        <Alert severity="error">Thread not found</Alert>
      )}
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {selectedThread ? renderThreadView() : renderThreadList()}

      {/* New Thread Dialog */}
      <Dialog
        open={newThreadDialog}
        onClose={() => setNewThreadDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Start New Discussion</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Content"
            multiline
            rows={6}
            value={newThreadContent}
            onChange={(e) => setNewThreadContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewThreadDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateThread}
            disabled={!newThreadTitle.trim() || !newThreadContent.trim() || creatingThread}
          >
            {creatingThread ? 'Creating...' : 'Create Discussion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscussionBoard;
