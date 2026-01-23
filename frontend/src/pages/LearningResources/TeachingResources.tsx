import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  InputAdornment,
  Alert,
  Skeleton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderIcon from '@mui/icons-material/Folder';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import DescriptionIcon from '@mui/icons-material/Description';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const GET_RESOURCES = gql`
  query GetTeachingResources($filter: ResourceFilterInput) {
    teachingResources(filter: $filter) {
      id
      title
      description
      type
      subject
      topic
      level
      tags
      fileUrl
      thumbnailUrl
      createdAt
      downloads
    }
    resourceCategories {
      name
      count
    }
  }
`;

const CREATE_RESOURCE = gql`
  mutation CreateTeachingResource($input: CreateResourceInput!) {
    createTeachingResource(input: $input) {
      id
      title
    }
  }
`;

const DELETE_RESOURCE = gql`
  mutation DeleteTeachingResource($id: ID!) {
    deleteTeachingResource(id: $id)
  }
`;

const resourceTypes = [
  { value: 'PDF', label: 'PDF Document', icon: <PictureAsPdfIcon /> },
  { value: 'PRESENTATION', label: 'Presentation', icon: <SlideshowIcon /> },
  { value: 'DOCUMENT', label: 'Word Document', icon: <DescriptionIcon /> },
  { value: 'VIDEO', label: 'Video', icon: <VideoLibraryIcon /> },
  { value: 'LINK', label: 'External Link', icon: <LinkIcon /> },
];

const TeachingResources: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: 'PDF',
    subject: '',
    topic: '',
    level: '',
    tags: '',
    fileUrl: '',
  });

  const { data, loading, error, refetch } = useQuery(GET_RESOURCES, {
    variables: {
      filter: {
        search: searchQuery || undefined,
        type: selectedType || undefined,
        subject: selectedSubject || undefined,
        level: selectedLevel || undefined,
      },
    },
  });

  const [createResource] = useMutation(CREATE_RESOURCE, {
    onCompleted: () => {
      setCreateDialogOpen(false);
      refetch();
      resetForm();
    },
  });

  const [deleteResource] = useMutation(DELETE_RESOURCE, {
    onCompleted: () => refetch(),
  });

  const resetForm = () => {
    setNewResource({
      title: '',
      description: '',
      type: 'PDF',
      subject: '',
      topic: '',
      level: '',
      tags: '',
      fileUrl: '',
    });
  };

  const handleCreate = () => {
    createResource({
      variables: {
        input: {
          ...newResource,
          tags: newResource.tags.split(',').map((t) => t.trim()).filter(Boolean),
        },
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      deleteResource({ variables: { id } });
    }
  };

  const getResourceIcon = (type: string) => {
    const resourceType = resourceTypes.find((r) => r.value === type);
    return resourceType?.icon || <FolderIcon />;
  };

  const resources = data?.teachingResources || [];
  const categories = data?.resourceCategories || [];

  const filteredResources = activeTab === 0
    ? resources
    : resources.filter((r: any) => r.type === resourceTypes[activeTab - 1]?.value);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Teaching Resources
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and share educational materials, handouts, and reference documents
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => {}}
          >
            AI Generate
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Upload Resource
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedType}
                label="Type"
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {resourceTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                label="Subject"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <MenuItem value="">All Subjects</MenuItem>
                <MenuItem value="Mathematics">Mathematics</MenuItem>
                <MenuItem value="Physics">Physics</MenuItem>
                <MenuItem value="Chemistry">Chemistry</MenuItem>
                <MenuItem value="Biology">Biology</MenuItem>
                <MenuItem value="English">English</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Level</InputLabel>
              <Select
                value={selectedLevel}
                label="Level"
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="Lower Sixth">Lower Sixth</MenuItem>
                <MenuItem value="Upper Sixth">Upper Sixth</MenuItem>
                <MenuItem value="Form 5">Form 5</MenuItem>
                <MenuItem value="Form 4">Form 4</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchQuery('');
                setSelectedType('');
                setSelectedSubject('');
                setSelectedLevel('');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All (${resources.length})`} />
          {resourceTypes.map((type) => (
            <Tab
              key={type.value}
              icon={type.icon}
              iconPosition="start"
              label={type.label}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Resources Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : filteredResources.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No resources found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Try adjusting your filters or upload new resources
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Upload Resource
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredResources.map((resource: any) => (
            <Grid item xs={12} sm={6} md={4} key={resource.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    height: 120,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.contrastText',
                  }}
                >
                  {React.cloneElement(getResourceIcon(resource.type) as React.ReactElement, {
                    sx: { fontSize: 48 },
                  })}
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip label={resource.type} size="small" />
                    <Chip label={resource.subject} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="h6" gutterBottom noWrap>
                    {resource.title}
                  </Typography>
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
                    {resource.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {resource.tags?.slice(0, 3).map((tag: string, index: number) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {resource.downloads || 0} downloads
                  </Typography>
                  <Box>
                    <IconButton size="small" title="Preview">
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" title="Download">
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Delete"
                      onClick={() => handleDelete(resource.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Resource Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Teaching Resource</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resource Title"
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Resource Type</InputLabel>
                <Select
                  value={newResource.type}
                  label="Resource Type"
                  onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                >
                  {resourceTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={newResource.subject}
                  label="Subject"
                  onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })}
                >
                  <MenuItem value="Mathematics">Mathematics</MenuItem>
                  <MenuItem value="Physics">Physics</MenuItem>
                  <MenuItem value="Chemistry">Chemistry</MenuItem>
                  <MenuItem value="Biology">Biology</MenuItem>
                  <MenuItem value="English">English</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Topic"
                value={newResource.topic}
                onChange={(e) => setNewResource({ ...newResource, topic: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={newResource.level}
                  label="Level"
                  onChange={(e) => setNewResource({ ...newResource, level: e.target.value })}
                >
                  <MenuItem value="Lower Sixth">Lower Sixth</MenuItem>
                  <MenuItem value="Upper Sixth">Upper Sixth</MenuItem>
                  <MenuItem value="Form 5">Form 5</MenuItem>
                  <MenuItem value="Form 4">Form 4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (comma-separated)"
                value={newResource.tags}
                onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                placeholder="e.g., calculus, derivatives, integration"
              />
            </Grid>
            <Grid item xs={12}>
              {newResource.type === 'LINK' ? (
                <TextField
                  fullWidth
                  label="Resource URL"
                  value={newResource.fileUrl}
                  onChange={(e) => setNewResource({ ...newResource, fileUrl: e.target.value })}
                  placeholder="https://..."
                />
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  sx={{ height: 56 }}
                >
                  {newResource.fileUrl ? 'File Selected' : 'Choose File'}
                  <input
                    type="file"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewResource({ ...newResource, fileUrl: file.name });
                      }
                    }}
                  />
                </Button>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newResource.title || !newResource.subject}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeachingResources;
