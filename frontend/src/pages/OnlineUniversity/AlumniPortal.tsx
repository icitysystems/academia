import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Box,
  Button,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Chip,
  Skeleton,
  Divider,
  Tabs,
  Tab,
  Stack,
  Alert,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SchoolIcon from '@mui/icons-material/School';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import WorkIcon from '@mui/icons-material/Work';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import DownloadIcon from '@mui/icons-material/Download';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmailIcon from '@mui/icons-material/Email';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CampaignIcon from '@mui/icons-material/Campaign';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const GET_ALUMNI_DASHBOARD = gql`
  query GetAlumniDashboard {
    me {
      id
      name
      email
      graduationYear
      degree
      major
    }
    myTranscripts {
      id
      title
      issuedAt
      status
      downloadUrl
    }
    myCertificates {
      id
      title
      courseName
      issuedAt
      credentialId
      verificationUrl
    }
    alumniNetwork {
      id
      name
      graduationYear
      company
      position
      location
      linkedInUrl
      avatarUrl
    }
    alumniEvents {
      id
      title
      description
      date
      location
      type
      registrationUrl
    }
    jobPostings {
      id
      title
      company
      location
      type
      salary
      postedAt
      applyUrl
    }
    alumniAnnouncements {
      id
      title
      message
      createdAt
    }
    alumniPerks {
      id
      title
      description
      discount
      validUntil
      code
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AlumniPortal: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [networkSearch, setNetworkSearch] = useState('');

  const { data, loading, error } = useQuery(GET_ALUMNI_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const transcripts = data?.myTranscripts || [];
  const certificates = data?.myCertificates || [];
  const alumniNetwork = data?.alumniNetwork || [];
  const alumniEvents = data?.alumniEvents || [];
  const jobPostings = data?.jobPostings || [];
  const announcements = data?.alumniAnnouncements || [];
  const perks = data?.alumniPerks || [];

  // Filter network by search
  const filteredNetwork = alumniNetwork.filter((alumni: any) =>
    alumni.name.toLowerCase().includes(networkSearch.toLowerCase()) ||
    alumni.company?.toLowerCase().includes(networkSearch.toLowerCase()) ||
    alumni.position?.toLowerCase().includes(networkSearch.toLowerCase())
  );

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color,
    onClick 
  }: { 
    title: string; 
    value: string | number;
    icon: React.ReactNode; 
    color: string;
    onClick?: () => void;
  }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? { transform: 'translateY(-4px)', boxShadow: 4 } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && !data) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Error loading portal. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', pb: 4 }}>
      {/* Header */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          py: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Alumni Portal
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>
                Welcome back, {user?.name}. Class of {data?.me?.graduationYear || '2024'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip 
                  icon={<VerifiedIcon />} 
                  label="Verified Alumni" 
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip 
                  label={data?.me?.degree || 'Bachelor\'s Degree'} 
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Box>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<DescriptionIcon />}
                sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Request Transcript
              </Button>
              <Button
                variant="contained"
                startIcon={<CardMembershipIcon />}
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
              >
                Alumni Card
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Certificates"
              value={certificates.length}
              icon={<EmojiEventsIcon />}
              color={theme.palette.primary.main}
              onClick={() => setTabValue(1)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Network Members"
              value={alumniNetwork.length}
              icon={<PeopleIcon />}
              color={theme.palette.success.main}
              onClick={() => setTabValue(2)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Job Opportunities"
              value={jobPostings.length}
              icon={<WorkIcon />}
              color={theme.palette.info.main}
              onClick={() => setTabValue(3)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Upcoming Events"
              value={alumniEvents.length}
              icon={<EventIcon />}
              color={theme.palette.warning.main}
              onClick={() => setTabValue(4)}
            />
          </Grid>
        </Grid>

        {/* Tabs Navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<DashboardIcon />} label="Overview" iconPosition="start" />
            <Tab icon={<DescriptionIcon />} label="Transcripts & Certificates" iconPosition="start" />
            <Tab icon={<PeopleIcon />} label="Alumni Network" iconPosition="start" />
            <Tab icon={<WorkIcon />} label="Career Center" iconPosition="start" />
            <Tab icon={<EventIcon />} label="Events" iconPosition="start" />
            <Tab icon={<LocalOfferIcon />} label="Perks & Benefits" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab: Overview */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Announcements */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Alumni News & Announcements
                </Typography>

                {announcements.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CampaignIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No announcements
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {announcements.map((announcement: any, index: number) => (
                      <React.Fragment key={announcement.id}>
                        {index > 0 && <Divider />}
                        <ListItem sx={{ py: 2 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.light' }}>
                              <CampaignIcon color="primary" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={announcement.title}
                            secondary={
                              <>
                                {announcement.message}
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(announcement.createdAt).toLocaleDateString()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Actions
                </Typography>
                <Stack spacing={1}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<DescriptionIcon />}
                    onClick={() => setTabValue(1)}
                  >
                    Request Official Transcript
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<VerifiedIcon />}
                  >
                    Verify Credentials
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<SchoolIcon />}
                    component={RouterLink}
                    to="/university/courses"
                  >
                    Continuing Education
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<PeopleIcon />}
                    onClick={() => setTabValue(2)}
                  >
                    Find Alumni
                  </Button>
                </Stack>
              </Paper>

              {/* Upcoming Events Preview */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Upcoming Events
                </Typography>
                {alumniEvents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No upcoming events
                  </Typography>
                ) : (
                  <List disablePadding>
                    {alumniEvents.slice(0, 3).map((event: any) => (
                      <ListItem key={event.id} disableGutters sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.light', width: 40, height: 40 }}>
                            <EventIcon fontSize="small" color="warning" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={event.title}
                          secondary={new Date(event.date).toLocaleDateString()}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Button fullWidth sx={{ mt: 2 }} onClick={() => setTabValue(4)}>
                  View All Events
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Transcripts & Certificates */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* Transcripts */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Official Transcripts
                  </Typography>
                  <Button variant="contained" startIcon={<DescriptionIcon />}>
                    Request New
                  </Button>
                </Box>

                {transcripts.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No transcripts available
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {transcripts.map((transcript: any, index: number) => (
                      <React.Fragment key={transcript.id}>
                        {index > 0 && <Divider />}
                        <ListItem 
                          sx={{ py: 2 }}
                          secondaryAction={
                            transcript.status === 'READY' && (
                              <Button 
                                size="small" 
                                startIcon={<DownloadIcon />}
                                href={transcript.downloadUrl}
                              >
                                Download
                              </Button>
                            )
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.light' }}>
                              <DescriptionIcon color="primary" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={transcript.title}
                            secondary={
                              <>
                                Issued: {new Date(transcript.issuedAt).toLocaleDateString()}
                                <br />
                                <Chip
                                  label={transcript.status}
                                  size="small"
                                  color={transcript.status === 'READY' ? 'success' : 'warning'}
                                />
                              </>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Certificates */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Certificates & Credentials
                </Typography>

                {certificates.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <EmojiEventsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No certificates yet
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {certificates.map((cert: any) => (
                      <Card key={cert.id} variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {cert.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {cert.courseName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Credential ID: {cert.credentialId}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Chip
                                icon={<VerifiedIcon />}
                                label="Verified"
                                size="small"
                                color="success"
                              />
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                {new Date(cert.issuedAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 2 }}>
                            <Button size="small" href={cert.verificationUrl} target="_blank">
                              Verify
                            </Button>
                            <Button size="small" startIcon={<DownloadIcon />}>
                              Download
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Alumni Network */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Alumni Network
              </Typography>
              <TextField
                size="small"
                placeholder="Search by name, company, or position..."
                value={networkSearch}
                onChange={(e) => setNetworkSearch(e.target.value)}
                sx={{ width: 350 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {filteredNetwork.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <PeopleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  {networkSearch ? 'No alumni found matching your search' : 'No alumni in network yet'}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredNetwork.map((alumni: any) => (
                  <Grid item xs={12} sm={6} md={4} key={alumni.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar 
                            src={alumni.avatarUrl}
                            sx={{ width: 56, height: 56 }}
                          >
                            {alumni.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {alumni.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Class of {alumni.graduationYear}
                            </Typography>
                          </Box>
                        </Box>

                        <Stack spacing={1}>
                          {alumni.position && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <WorkIcon fontSize="small" color="action" />
                              <Typography variant="body2">{alumni.position}</Typography>
                            </Box>
                          )}
                          {alumni.company && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <BusinessIcon fontSize="small" color="action" />
                              <Typography variant="body2">{alumni.company}</Typography>
                            </Box>
                          )}
                          {alumni.location && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOnIcon fontSize="small" color="action" />
                              <Typography variant="body2">{alumni.location}</Typography>
                            </Box>
                          )}
                        </Stack>

                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button size="small" startIcon={<EmailIcon />}>
                            Connect
                          </Button>
                          {alumni.linkedInUrl && (
                            <Button 
                              size="small" 
                              startIcon={<LinkedInIcon />}
                              href={alumni.linkedInUrl}
                              target="_blank"
                            >
                              LinkedIn
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </TabPanel>

        {/* Tab: Career Center */}
        <TabPanel value={tabValue} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Job Opportunities
            </Typography>

            {jobPostings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <WorkIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No job postings available
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {jobPostings.map((job: any) => (
                  <Card key={job.id} variant="outlined">
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                          <Typography variant="h6">{job.title}</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BusinessIcon fontSize="small" color="action" />
                              <Typography variant="body2">{job.company}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOnIcon fontSize="small" color="action" />
                              <Typography variant="body2">{job.location}</Typography>
                            </Box>
                            <Chip label={job.type} size="small" />
                            {job.salary && <Chip label={job.salary} size="small" color="success" />}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Posted: {new Date(job.postedAt).toLocaleDateString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                          <Button 
                            variant="contained"
                            href={job.applyUrl}
                            target="_blank"
                          >
                            Apply Now
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </TabPanel>

        {/* Tab: Events */}
        <TabPanel value={tabValue} index={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Alumni Events
            </Typography>

            {alumniEvents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <EventIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No upcoming events
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {alumniEvents.map((event: any) => (
                  <Grid item xs={12} md={6} key={event.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Box 
                            sx={{ 
                              bgcolor: 'primary.main', 
                              color: 'white', 
                              p: 2, 
                              borderRadius: 2,
                              textAlign: 'center',
                              minWidth: 80
                            }}
                          >
                            <Typography variant="h4" fontWeight="bold">
                              {new Date(event.date).getDate()}
                            </Typography>
                            <Typography variant="body2">
                              {new Date(event.date).toLocaleString('default', { month: 'short' })}
                            </Typography>
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="h6">{event.title}</Typography>
                              <Chip label={event.type} size="small" />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {event.description}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOnIcon fontSize="small" color="action" />
                              <Typography variant="body2">{event.location}</Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ mt: 2, textAlign: 'right' }}>
                          <Button 
                            variant="contained"
                            href={event.registrationUrl}
                            target="_blank"
                          >
                            Register
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </TabPanel>

        {/* Tab: Perks & Benefits */}
        <TabPanel value={tabValue} index={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Alumni Perks & Benefits
            </Typography>

            {perks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <LocalOfferIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No perks available at this time
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {perks.map((perk: any) => (
                  <Grid item xs={12} sm={6} md={4} key={perk.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                            <LocalOfferIcon color="success" />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="bold" color="success.main">
                              {perk.discount}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          {perk.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {perk.description}
                        </Typography>
                        {perk.code && (
                          <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1, mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Code: <strong>{perk.code}</strong>
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Valid until: {new Date(perk.validUntil).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default AlumniPortal;
