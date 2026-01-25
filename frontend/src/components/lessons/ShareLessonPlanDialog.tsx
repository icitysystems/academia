import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  Share as ShareIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  School as SchoolIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_SHARING_OPTIONS = gql`
  query GetSharingOptions($lessonPlanId: ID!) {
    lessonPlanSharingOptions(lessonPlanId: $lessonPlanId) {
      currentSharing {
        visibility
        shareLink
        sharedWith {
          id
          name
          email
          avatarUrl
          permission
        }
      }
      availableTeachers {
        id
        name
        email
        avatarUrl
        department
      }
      departments {
        id
        name
      }
    }
  }
`;

const UPDATE_SHARING = gql`
  mutation UpdateLessonPlanSharing($input: UpdateLessonPlanSharingInput!) {
    updateLessonPlanSharing(input: $input) {
      id
      visibility
      shareLink
      sharedWith {
        id
        name
        permission
      }
    }
  }
`;

const SHARE_WITH_USERS = gql`
  mutation ShareLessonPlanWithUsers($lessonPlanId: ID!, $userIds: [ID!]!, $permission: SharePermission!) {
    shareLessonPlanWithUsers(lessonPlanId: $lessonPlanId, userIds: $userIds, permission: $permission) {
      success
      sharedWith {
        id
        name
        permission
      }
    }
  }
`;

const REMOVE_SHARE = gql`
  mutation RemoveLessonPlanShare($lessonPlanId: ID!, $userId: ID!) {
    removeLessonPlanShare(lessonPlanId: $lessonPlanId, userId: $userId) {
      success
    }
  }
`;

const GENERATE_SHARE_LINK = gql`
  mutation GenerateShareLink($lessonPlanId: ID!, $expiresInDays: Int) {
    generateLessonPlanShareLink(lessonPlanId: $lessonPlanId, expiresInDays: $expiresInDays) {
      link
      expiresAt
    }
  }
`;

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  lessonPlanId: string;
  lessonPlanTitle: string;
}

type Permission = 'VIEW' | 'COMMENT' | 'EDIT' | 'ADMIN';
type Visibility = 'PRIVATE' | 'SHARED' | 'DEPARTMENT' | 'SCHOOL' | 'PUBLIC';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export const ShareLessonPlanDialog: React.FC<ShareDialogProps> = ({
  open,
  onClose,
  lessonPlanId,
  lessonPlanTitle,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [permission, setPermission] = useState<Permission>('VIEW');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkExpiry, setLinkExpiry] = useState(7);
  const [allowDownload, setAllowDownload] = useState(true);
  const [shareLink, setShareLink] = useState('');

  const { data, loading, refetch } = useQuery(GET_SHARING_OPTIONS, {
    variables: { lessonPlanId },
    skip: !open || !lessonPlanId,
    onCompleted: (data) => {
      setVisibility(data?.lessonPlanSharingOptions?.currentSharing?.visibility || 'PRIVATE');
      setShareLink(data?.lessonPlanSharingOptions?.currentSharing?.shareLink || '');
    },
  });

  const [updateSharing, { loading: updatingSharing }] = useMutation(UPDATE_SHARING);
  const [shareWithUsers, { loading: sharing }] = useMutation(SHARE_WITH_USERS, {
    onCompleted: () => {
      setSelectedUsers([]);
      refetch();
    },
  });
  const [removeShare] = useMutation(REMOVE_SHARE, {
    onCompleted: () => refetch(),
  });
  const [generateLink, { loading: generatingLink }] = useMutation(GENERATE_SHARE_LINK);

  const availableTeachers = data?.lessonPlanSharingOptions?.availableTeachers || [];
  const departments = data?.lessonPlanSharingOptions?.departments || [];
  const currentSharing = data?.lessonPlanSharingOptions?.currentSharing;
  const sharedWith = currentSharing?.sharedWith || [];

  const handleVisibilityChange = async (newVisibility: Visibility) => {
    setVisibility(newVisibility);
    await updateSharing({
      variables: {
        input: {
          lessonPlanId,
          visibility: newVisibility,
          allowDownload,
        },
      },
    });
    refetch();
  };

  const handleShareWithUsers = async () => {
    if (selectedUsers.length === 0) return;
    await shareWithUsers({
      variables: {
        lessonPlanId,
        userIds: selectedUsers.map((u) => u.id),
        permission,
      },
    });
  };

  const handleRemoveShare = async (userId: string) => {
    await removeShare({
      variables: { lessonPlanId, userId },
    });
  };

  const handleGenerateLink = async () => {
    const result = await generateLink({
      variables: {
        lessonPlanId,
        expiresInDays: linkExpiry,
      },
    });
    setShareLink(result.data?.generateLessonPlanShareLink?.link || '');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const getVisibilityIcon = (vis: Visibility) => {
    switch (vis) {
      case 'PRIVATE': return <LockIcon />;
      case 'SHARED': return <PersonIcon />;
      case 'DEPARTMENT': return <GroupIcon />;
      case 'SCHOOL': return <SchoolIcon />;
      case 'PUBLIC': return <PublicIcon />;
      default: return <LockIcon />;
    }
  };

  const getPermissionLabel = (perm: Permission) => {
    switch (perm) {
      case 'VIEW': return 'Can view';
      case 'COMMENT': return 'Can comment';
      case 'EDIT': return 'Can edit';
      case 'ADMIN': return 'Full access';
      default: return perm;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShareIcon />
          Share "{lessonPlanTitle}"
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="Share with People" />
              <Tab label="Link Sharing" />
              <Tab label="Visibility" />
            </Tabs>

            {/* Share with People Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Autocomplete
                  multiple
                  options={availableTeachers.filter(
                    (t: any) => !sharedWith.find((s: any) => s.id === t.id)
                  )}
                  getOptionLabel={(option: any) => `${option.name} (${option.department})`}
                  value={selectedUsers}
                  onChange={(_, newValue) => setSelectedUsers(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Add people" placeholder="Search teachers..." />
                  )}
                  renderOption={(props, option: any) => (
                    <li {...props}>
                      <ListItemAvatar>
                        <Avatar src={option.avatarUrl} sx={{ width: 32, height: 32 }}>
                          {option.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={option.name}
                        secondary={`${option.department} • ${option.email}`}
                      />
                    </li>
                  )}
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Permission</InputLabel>
                  <Select
                    value={permission}
                    label="Permission"
                    onChange={(e) => setPermission(e.target.value as Permission)}
                  >
                    <MenuItem value="VIEW">View</MenuItem>
                    <MenuItem value="COMMENT">Comment</MenuItem>
                    <MenuItem value="EDIT">Edit</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Button
                variant="contained"
                onClick={handleShareWithUsers}
                disabled={selectedUsers.length === 0 || sharing}
                fullWidth
                sx={{ mb: 2 }}
              >
                {sharing ? <CircularProgress size={20} /> : 'Share'}
              </Button>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>People with access</Typography>
              {sharedWith.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Not shared with anyone yet
                </Typography>
              ) : (
                <List dense>
                  {sharedWith.map((person: any) => (
                    <ListItem key={person.id}>
                      <ListItemAvatar>
                        <Avatar src={person.avatarUrl} sx={{ width: 32, height: 32 }}>
                          {person.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={person.name}
                        secondary={person.email}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={getPermissionLabel(person.permission)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <IconButton edge="end" size="small" onClick={() => handleRemoveShare(person.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </TabPanel>

            {/* Link Sharing Tab */}
            <TabPanel value={activeTab} index={1}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Anyone with the link can access this lesson plan based on visibility settings.
              </Alert>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  value={shareLink}
                  placeholder="No link generated yet"
                  InputProps={{
                    readOnly: true,
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
                <Tooltip title={linkCopied ? 'Copied!' : 'Copy link'}>
                  <IconButton onClick={handleCopyLink} disabled={!shareLink}>
                    {linkCopied ? <CheckIcon color="success" /> : <CopyIcon />}
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Link expires in</InputLabel>
                  <Select
                    value={linkExpiry}
                    label="Link expires in"
                    onChange={(e) => setLinkExpiry(e.target.value as number)}
                  >
                    <MenuItem value={1}>1 day</MenuItem>
                    <MenuItem value={7}>7 days</MenuItem>
                    <MenuItem value={30}>30 days</MenuItem>
                    <MenuItem value={-1}>Never</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  startIcon={generatingLink ? <CircularProgress size={16} /> : <LinkIcon />}
                >
                  {shareLink ? 'Regenerate Link' : 'Generate Link'}
                </Button>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                  />
                }
                label="Allow viewers to download"
              />
            </TabPanel>

            {/* Visibility Tab */}
            <TabPanel value={activeTab} index={2}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control who can discover and access this lesson plan.
              </Typography>

              <List>
                {[
                  { value: 'PRIVATE', label: 'Private', description: 'Only you can access' },
                  { value: 'SHARED', label: 'Shared', description: 'Only people you share with' },
                  { value: 'DEPARTMENT', label: 'Department', description: 'All teachers in your department' },
                  { value: 'SCHOOL', label: 'School', description: 'All teachers in your school' },
                  { value: 'PUBLIC', label: 'Public Library', description: 'Anyone can discover and use' },
                ].map((option) => (
                  <ListItem
                    key={option.value}
                    button
                    selected={visibility === option.value}
                    onClick={() => handleVisibilityChange(option.value as Visibility)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: visibility === option.value ? 'primary.main' : 'action.selected' }}>
                        {getVisibilityIcon(option.value as Visibility)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={option.label}
                      secondary={option.description}
                    />
                    {visibility === option.value && (
                      <CheckIcon color="primary" />
                    )}
                  </ListItem>
                ))}
              </List>

              {updatingSharing && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </TabPanel>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareLessonPlanDialog;
