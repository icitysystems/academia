import React, { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Badge,
  Tooltip,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Forum as ForumIcon,
  Reply as ReplyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  MoreVert as MoreVertIcon,
  Flag as FlagIcon,
  PushPin as PinIcon,
  Lock as LockIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { gql } from '@apollo/client';

// GraphQL queries and mutations
const GET_DISCUSSION_THREADS = gql`
  query GetDiscussionThreads($courseId: ID!, $page: Int, $limit: Int) {
    discussionThreads(courseId: $courseId, page: $page, limit: $limit) {
      threads {
        id
        title
        content
        isPinned
        isLocked
        createdAt
        author {
          id
          name
          role
        }
        _count {
          posts
        }
        lastPost {
          id
          createdAt
          author {
            id
            name
          }
        }
      }
      totalCount
      hasMore
    }
  }
`;

const GET_THREAD_DETAILS = gql`
  query GetThreadDetails($threadId: ID!) {
    discussionThread(id: $threadId) {
      id
      title
      content
      isPinned
      isLocked
      createdAt
      author {
        id
        name
        role
      }
      course {
        id
        title
      }
      posts {
        id
        content
        createdAt
        updatedAt
        author {
          id
          name
          role
        }
        upvotes {
          id
          userId
        }
        _count {
          upvotes
        }
      }
    }
  }
`;

const CREATE_THREAD = gql`
  mutation CreateDiscussionThread($input: CreateThreadInput!) {
    createDiscussionThread(input: $input) {
      id
      title
    }
  }
`;

const CREATE_POST = gql`
  mutation CreateDiscussionPost($input: CreatePostInput!) {
    createDiscussionPost(input: $input) {
      id
      content
    }
  }
`;

const TOGGLE_UPVOTE = gql`
  mutation ToggleUpvote($postId: ID!) {
    togglePostUpvote(postId: $postId) {
      id
      _count {
        upvotes
      }
    }
  }
`;

const FLAG_POST = gql`
  mutation FlagPost($postId: ID!, $reason: String!) {
    flagPost(postId: $postId, reason: $reason) {
      id
      isFlagged
    }
  }
`;

const TOGGLE_PIN_THREAD = gql`
  mutation TogglePinThread($threadId: ID!) {
    togglePinThread(threadId: $threadId) {
      id
      isPinned
    }
  }
`;

const TOGGLE_LOCK_THREAD = gql`
  mutation ToggleLockThread($threadId: ID!) {
    toggleLockThread(threadId: $threadId) {
      id
      isLocked
    }
  }
`;

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Thread List Component
export const DiscussionThreadList: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_DISCUSSION_THREADS, {
    variables: { courseId, page, limit: 20 },
    skip: !courseId,
  });

  const [createThread, { loading: creating }] = useMutation(CREATE_THREAD);

  const threads = data?.discussionThreads?.threads || [];
  const totalCount = data?.discussionThreads?.totalCount || 0;
  const pageCount = Math.ceil(totalCount / 20);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) return;

    try {
      await createThread({
        variables: {
          input: {
            courseId,
            title: newThreadTitle,
            content: newThreadContent,
          },
        },
      });
      setShowNewThreadDialog(false);
      setNewThreadTitle('');
      setNewThreadContent('');
      refetch();
    } catch (err) {
      console.error('Failed to create thread:', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load discussions</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <ForumIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Discussion Forums
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowNewThreadDialog(true)}
        >
          New Discussion
        </Button>
      </Box>

      {threads.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ForumIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No discussions yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Be the first to start a discussion!
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowNewThreadDialog(true)}
          >
            Start Discussion
          </Button>
        </Paper>
      ) : (
        <>
          <List>
            {/* Pinned threads first */}
            {threads
              .sort((a: any, b: any) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
              .map((thread: any) => (
                <Paper
                  key={thread.id}
                  sx={{
                    mb: 2,
                    '&:hover': { bgcolor: 'grey.50' },
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/courses/${courseId}/discussions/${thread.id}`)}
                >
                  <ListItem>
                    <ListItemAvatar>
                      <Badge
                        badgeContent={thread._count.posts}
                        color="primary"
                        max={99}
                      >
                        <Avatar sx={{ bgcolor: thread.isPinned ? 'warning.main' : 'primary.main' }}>
                          {thread.isPinned ? <PinIcon /> : <ForumIcon />}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {thread.title}
                          </Typography>
                          {thread.isPinned && (
                            <Chip label="Pinned" size="small" color="warning" />
                          )}
                          {thread.isLocked && (
                            <Chip
                              icon={<LockIcon sx={{ fontSize: 14 }} />}
                              label="Locked"
                              size="small"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Started by {thread.author.name} • {formatRelativeTime(thread.createdAt)}
                          </Typography>
                          {thread.lastPost && (
                            <Typography variant="body2" color="text.secondary">
                              Last reply by {thread.lastPost.author.name} • {formatRelativeTime(thread.lastPost.createdAt)}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
          </List>

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* New Thread Dialog */}
      <Dialog
        open={showNewThreadDialog}
        onClose={() => setShowNewThreadDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Start New Discussion</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Content"
            placeholder="What would you like to discuss?"
            value={newThreadContent}
            onChange={(e) => setNewThreadContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewThreadDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateThread}
            disabled={creating || !newThreadTitle.trim() || !newThreadContent.trim()}
          >
            {creating ? 'Creating...' : 'Create Discussion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Thread Detail Component
export const DiscussionThreadDetail: React.FC = () => {
  const { courseId, threadId } = useParams<{ courseId: string; threadId: string }>();
  const navigate = useNavigate();
  const [replyContent, setReplyContent] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_THREAD_DETAILS, {
    variables: { threadId },
    skip: !threadId,
  });

  const [createPost, { loading: posting }] = useMutation(CREATE_POST);
  const [toggleUpvote] = useMutation(TOGGLE_UPVOTE);
  const [flagPost] = useMutation(FLAG_POST);
  const [togglePinThread] = useMutation(TOGGLE_PIN_THREAD);
  const [toggleLockThread] = useMutation(TOGGLE_LOCK_THREAD);

  const thread = data?.discussionThread;

  const handleReply = async () => {
    if (!replyContent.trim() || !threadId) return;

    try {
      await createPost({
        variables: {
          input: {
            threadId,
            content: replyContent,
          },
        },
      });
      setReplyContent('');
      refetch();
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  const handleUpvote = async (postId: string) => {
    try {
      await toggleUpvote({ variables: { postId } });
      refetch();
    } catch (err) {
      console.error('Failed to toggle upvote:', err);
    }
  };

  const handleFlag = async () => {
    if (!selectedPostId || !flagReason.trim()) return;

    try {
      await flagPost({
        variables: { postId: selectedPostId, reason: flagReason },
      });
      setShowFlagDialog(false);
      setFlagReason('');
      setSelectedPostId(null);
    } catch (err) {
      console.error('Failed to flag post:', err);
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePinThread({ variables: { threadId } });
      refetch();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleToggleLock = async () => {
    try {
      await toggleLockThread({ variables: { threadId } });
      refetch();
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !thread) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load discussion thread</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumb */}
      <Box sx={{ mb: 2 }}>
        <Button
          component={RouterLink}
          to={`/courses/${courseId}/discussions`}
          startIcon={<ForumIcon />}
        >
          Back to Discussions
        </Button>
      </Box>

      {/* Thread Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h5">{thread.title}</Typography>
              {thread.isPinned && <Chip label="Pinned" size="small" color="warning" />}
              {thread.isLocked && <Chip icon={<LockIcon />} label="Locked" size="small" />}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Started by <strong>{thread.author.name}</strong> ({thread.author.role}) • {formatRelativeTime(thread.createdAt)}
            </Typography>
          </Box>
          
          {/* Thread actions for instructors/admins */}
          <Box>
            <Tooltip title={thread.isPinned ? 'Unpin Thread' : 'Pin Thread'}>
              <IconButton onClick={handleTogglePin}>
                <PinIcon color={thread.isPinned ? 'warning' : 'inherit'} />
              </IconButton>
            </Tooltip>
            <Tooltip title={thread.isLocked ? 'Unlock Thread' : 'Lock Thread'}>
              <IconButton onClick={handleToggleLock}>
                <LockIcon color={thread.isLocked ? 'error' : 'inherit'} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{thread.content}</Typography>
      </Paper>

      {/* Replies */}
      <Typography variant="h6" gutterBottom>
        {thread.posts?.length || 0} Replies
      </Typography>

      {thread.posts?.map((post: any, index: number) => (
        <Card key={post.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {post.author.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2">{post.author.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {post.author.role} • {formatRelativeTime(post.createdAt)}
                    {post.updatedAt !== post.createdAt && ' (edited)'}
                  </Typography>
                </Box>
              </Box>

              <IconButton
                size="small"
                onClick={(e) => {
                  setAnchorEl(e.currentTarget);
                  setSelectedPostId(post.id);
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>

            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{post.content}</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                size="small"
                startIcon={
                  post.upvotes?.some((u: any) => u.userId === 'currentUserId') ? (
                    <ThumbUpIcon />
                  ) : (
                    <ThumbUpOutlinedIcon />
                  )
                }
                onClick={() => handleUpvote(post.id)}
              >
                {post._count?.upvotes || 0}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Reply Box */}
      {!thread.isLocked ? (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Add a Reply
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Write your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              startIcon={posting ? <CircularProgress size={20} /> : <ReplyIcon />}
              onClick={handleReply}
              disabled={posting || !replyContent.trim()}
            >
              {posting ? 'Posting...' : 'Post Reply'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mt: 3 }}>
          <LockIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          This thread is locked. No new replies can be added.
        </Alert>
      )}

      {/* Post Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setShowFlagDialog(true);
          setAnchorEl(null);
        }}>
          <FlagIcon sx={{ mr: 1 }} /> Report Post
        </MenuItem>
      </Menu>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onClose={() => setShowFlagDialog(false)}>
        <DialogTitle>Report Post</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please describe why you are reporting this post:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Reason for reporting..."
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFlagDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleFlag}
            disabled={!flagReason.trim()}
          >
            Report
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DiscussionThreadList;
