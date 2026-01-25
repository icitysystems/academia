import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Badge,
} from '@mui/material';
import {
  Work as WorkIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const GET_ALUMNI_DASHBOARD = gql`
  query GetAlumniDashboard {
    alumniDashboard {
      profile {
        id
        name
        email
        avatarUrl
        graduationYear
        degree
        major
        currentPosition
        currentCompany
        location
        linkedInUrl
        bio
      }
      careerServices {
        jobPostings {
          id
          title
          company
          location
          type
          postedDate
          deadline
          saved
        }
        mentorshipRequests
        upcomingWebinars {
          id
          title
          date
          presenter
          topic
        }
      }
      continuingEducation {
        availableCourses {
          id
          title
          instructor
          startDate
          duration
          level
          enrolled
        }
        certifications {
          id
          name
          issueDate
          expiryDate
        }
      }
      network {
        connections
        pendingRequests
        suggestedConnections {
          id
          name
          avatarUrl
          graduationYear
          currentPosition
          currentCompany
          mutualConnections
        }
      }
      upcomingEvents {
        id
        title
        date
        location
        type
        registrationOpen
      }
    }
  }
`;

const SAVE_JOB = gql`
  mutation SaveJob($jobId: ID!) {
    saveJob(jobId: $jobId) {
      id
      saved
    }
  }
`;

const CONNECT_ALUMNI = gql`
  mutation ConnectAlumni($alumniId: ID!) {
    sendConnectionRequest(alumniId: $alumniId) {
      success
      message
    }
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const AlumniPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery(GET_ALUMNI_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const [saveJob] = useMutation(SAVE_JOB, {
    onCompleted: () => refetch(),
  });

  const [connectAlumni] = useMutation(CONNECT_ALUMNI);

  if (loading && !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load alumni dashboard: {error.message}</Alert>
      </Container>
    );
  }

  const dashboard = data?.alumniDashboard;
  const profile = dashboard?.profile;
  const careers = dashboard?.careerServices;
  const education = dashboard?.continuingEducation;
  const network = dashboard?.network;
  const events = dashboard?.upcomingEvents || [];

  const filteredJobs = careers?.jobPostings?.filter((job: any) =>
    job.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(jobSearchQuery.toLowerCase())
  ) || [];

  const handleSaveJob = async (jobId: string) => {
    await saveJob({ variables: { jobId } });
  };

  const handleConnect = async (alumniId: string) => {
    await connectAlumni({ variables: { alumniId } });
    refetch();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Profile Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar src={profile?.avatarUrl} sx={{ width: 80, height: 80 }}>
              {profile?.name?.charAt(0)}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5">{profile?.name}</Typography>
            <Typography variant="body1" color="text.secondary">
              {profile?.currentPosition} at {profile?.currentCompany}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip icon={<SchoolIcon />} label={`Class of ${profile?.graduationYear}`} size="small" />
              <Chip icon={<LocationIcon />} label={profile?.location} size="small" variant="outlined" />
            </Box>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {profile?.linkedInUrl && (
                <IconButton href={profile.linkedInUrl} target="_blank" color="primary">
                  <LinkedInIcon />
                </IconButton>
              )}
              <Button variant="outlined" onClick={() => navigate('/alumni/profile/edit')}>
                Edit Profile
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <WorkIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4">{careers?.jobPostings?.length || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Job Opportunities</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SchoolIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4">{education?.availableCourses?.length || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Courses Available</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4">{network?.connections || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Network Connections</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EventIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4">{events.length}</Typography>
              <Typography variant="body2" color="text.secondary">Upcoming Events</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<WorkIcon />} label="Career Services" iconPosition="start" />
          <Tab icon={<SchoolIcon />} label="Continuing Education" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="Alumni Network" iconPosition="start" />
          <Tab icon={<EventIcon />} label="Events" iconPosition="start" />
        </Tabs>

        {/* Career Services Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography variant="h6" gutterBottom>Job Board</Typography>
            <TextField
              fullWidth
              placeholder="Search jobs by title or company..."
              value={jobSearchQuery}
              onChange={(e) => setJobSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            
            <Grid container spacing={2}>
              {filteredJobs.map((job: any) => (
                <Grid item xs={12} md={6} key={job.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium">{job.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            <BusinessIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            {job.company}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <LocationIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            {job.location}
                          </Typography>
                        </Box>
                        <IconButton onClick={() => handleSaveJob(job.id)}>
                          {job.saved ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
                        </IconButton>
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Chip label={job.type} size="small" />
                        <Typography variant="caption" color="text.secondary">
                          Posted: {new Date(job.postedDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => setSelectedJob(job)}>View Details</Button>
                      <Button size="small" color="primary">Apply</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Upcoming Career Webinars</Typography>
            <List>
              {careers?.upcomingWebinars?.map((webinar: any) => (
                <ListItem key={webinar.id} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <CalendarIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={webinar.title}
                    secondary={`${webinar.presenter} • ${new Date(webinar.date).toLocaleDateString()} • ${webinar.topic}`}
                  />
                  <Button variant="outlined" size="small">Register</Button>
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>

        {/* Continuing Education Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography variant="h6" gutterBottom>Available Courses</Typography>
            <Grid container spacing={2}>
              {education?.availableCourses?.map((course: any) => (
                <Grid item xs={12} md={4} key={course.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="medium">{course.title}</Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Instructor: {course.instructor}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        <Chip label={course.level} size="small" />
                        <Chip label={course.duration} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Starts: {new Date(course.startDate).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" disabled={course.enrolled}>
                        {course.enrolled ? 'Enrolled' : 'Enroll Now'}
                      </Button>
                      <Button size="small">Learn More</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Your Certifications</Typography>
            {education?.certifications?.length === 0 ? (
              <Alert severity="info">No certifications yet. Enroll in a course to earn certifications!</Alert>
            ) : (
              <Grid container spacing={2}>
                {education?.certifications?.map((cert: any) => (
                  <Grid item xs={12} sm={6} md={4} key={cert.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <StarIcon color="primary" />
                          <Typography variant="subtitle1">{cert.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Issued: {new Date(cert.issueDate).toLocaleDateString()}
                        </Typography>
                        {cert.expiryDate && (
                          <Typography variant="body2" color="text.secondary">
                            Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button size="small">View Certificate</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Alumni Network Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Suggested Connections</Typography>
              {network?.pendingRequests > 0 && (
                <Button variant="contained" size="small">
                  View Pending Requests ({network.pendingRequests})
                </Button>
              )}
            </Box>

            <Grid container spacing={2}>
              {network?.suggestedConnections?.map((alumni: any) => (
                <Grid item xs={12} sm={6} md={4} key={alumni.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={alumni.avatarUrl} sx={{ width: 56, height: 56 }}>
                          {alumni.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1">{alumni.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Class of {alumni.graduationYear}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {alumni.currentPosition}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {alumni.currentCompany}
                      </Typography>
                      {alumni.mutualConnections > 0 && (
                        <Typography variant="caption" color="primary">
                          {alumni.mutualConnections} mutual connection{alumni.mutualConnections > 1 ? 's' : ''}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleConnect(alumni.id)}>
                        Connect
                      </Button>
                      <Button size="small">View Profile</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button variant="outlined" onClick={() => navigate('/alumni/network/search')}>
                Search All Alumni
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* Events Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography variant="h6" gutterBottom>Upcoming Alumni Events</Typography>
            {events.length === 0 ? (
              <Alert severity="info">No upcoming events at this time.</Alert>
            ) : (
              <Grid container spacing={2}>
                {events.map((event: any) => (
                  <Grid item xs={12} md={6} key={event.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="medium">{event.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              <CalendarIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {new Date(event.date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <LocationIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {event.location}
                            </Typography>
                          </Box>
                          <Chip label={event.type} size="small" color="primary" variant="outlined" />
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!event.registrationOpen}
                        >
                          {event.registrationOpen ? 'Register' : 'Registration Closed'}
                        </Button>
                        <Button size="small">Learn More</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Job Details Dialog */}
      <Dialog open={!!selectedJob} onClose={() => setSelectedJob(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedJob?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {selectedJob?.company}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {selectedJob?.location}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
            <Chip label={selectedJob?.type} />
          </Box>
          <Typography variant="body2" paragraph>
            Application Deadline: {selectedJob?.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : 'Open'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedJob(null)}>Close</Button>
          <Button variant="contained" color="primary">Apply Now</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AlumniPortal;
