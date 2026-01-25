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
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  LinearProgress,
  Divider,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  Message as MessageIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const GET_PARENT_DASHBOARD = gql`
  query GetParentDashboard {
    parentDashboard {
      children {
        id
        name
        avatarUrl
        grade
        school
        currentGPA
        attendance
        upcomingAssignments {
          id
          title
          dueDate
          courseName
          status
        }
        recentGrades {
          id
          assignment
          grade
          maxGrade
          date
          courseName
        }
        upcomingEvents {
          id
          title
          date
          type
        }
      }
      notifications {
        id
        type
        title
        message
        date
        read
        childId
      }
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

export const ParentDashboard: React.FC = () => {
  const [selectedChild, setSelectedChild] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(GET_PARENT_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

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
        <Alert severity="error">Failed to load dashboard: {error.message}</Alert>
      </Container>
    );
  }

  const children = data?.parentDashboard?.children || [];
  const notifications = data?.parentDashboard?.notifications || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const currentChild = children[selectedChild];

  if (children.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          No children linked to your account. Please contact the school administration to link your children.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Parent Dashboard</Typography>
        <IconButton onClick={() => navigate('/parent/notifications')}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Box>

      {/* Child Selector (if multiple children) */}
      {children.length > 1 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Select Child</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {children.map((child: any, index: number) => (
              <Chip
                key={child.id}
                avatar={<Avatar src={child.avatarUrl}>{child.name.charAt(0)}</Avatar>}
                label={child.name}
                variant={selectedChild === index ? 'filled' : 'outlined'}
                color={selectedChild === index ? 'primary' : 'default'}
                onClick={() => setSelectedChild(index)}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Child Overview Card */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  src={currentChild.avatarUrl}
                  sx={{ width: 64, height: 64 }}
                >
                  {currentChild.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{currentChild.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentChild.grade} • {currentChild.school}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">GPA</Typography>
                  <Typography variant="h5" color="primary">
                    {currentChild.currentGPA?.toFixed(2) || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Attendance</Typography>
                  <Typography variant="h5" color={currentChild.attendance >= 90 ? 'success.main' : 'warning.main'}>
                    {currentChild.attendance}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate(`/parent/child/${currentChild.id}/profile`)}>
                View Full Profile
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <AssignmentIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4">
                  {currentChild.upcomingAssignments?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Assignments
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <GradeIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4">
                  {currentChild.recentGrades?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recent Grades
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <EventIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4">
                  {currentChild.upcomingEvents?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upcoming Events
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <MessageIcon color="action" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4">{unreadCount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  New Messages
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Tabs for Details */}
      <Paper sx={{ mt: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Assignments" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="Grades" icon={<GradeIcon />} iconPosition="start" />
          <Tab label="Schedule" icon={<ScheduleIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <List>
            {currentChild.upcomingAssignments?.length === 0 ? (
              <ListItem>
                <ListItemText primary="No upcoming assignments" secondary="All caught up!" />
              </ListItem>
            ) : (
              currentChild.upcomingAssignments?.map((assignment: any) => (
                <ListItem key={assignment.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: assignment.status === 'OVERDUE' ? 'error.main' : 'primary.main' }}>
                      <AssignmentIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={assignment.title}
                    secondary={`${assignment.courseName} • Due: ${new Date(assignment.dueDate).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      size="small"
                      label={assignment.status}
                      color={assignment.status === 'OVERDUE' ? 'error' : assignment.status === 'SUBMITTED' ? 'success' : 'default'}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <List>
            {currentChild.recentGrades?.length === 0 ? (
              <ListItem>
                <ListItemText primary="No recent grades" />
              </ListItem>
            ) : (
              currentChild.recentGrades?.map((grade: any) => {
                const percentage = (grade.grade / grade.maxGrade) * 100;
                return (
                  <ListItem key={grade.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: percentage >= 70 ? 'success.main' : percentage >= 50 ? 'warning.main' : 'error.main' }}>
                        <GradeIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={grade.assignment}
                      secondary={`${grade.courseName} • ${new Date(grade.date).toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6" color={percentage >= 70 ? 'success.main' : percentage >= 50 ? 'warning.main' : 'error.main'}>
                        {grade.grade}/{grade.maxGrade}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })
            )}
          </List>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <List>
            {currentChild.upcomingEvents?.length === 0 ? (
              <ListItem>
                <ListItemText primary="No upcoming events" />
              </ListItem>
            ) : (
              currentChild.upcomingEvents?.map((event: any) => (
                <ListItem key={event.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <EventIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={event.title}
                    secondary={new Date(event.date).toLocaleDateString()}
                  />
                  <ListItemSecondaryAction>
                    <Chip size="small" label={event.type} />
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </TabPanel>
      </Paper>

      {/* Quick Actions */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<MessageIcon />} onClick={() => navigate('/parent/messages')}>
          Message Teacher
        </Button>
        <Button variant="outlined" startIcon={<EventIcon />} onClick={() => navigate('/parent/calendar')}>
          View Calendar
        </Button>
        <Button variant="outlined" startIcon={<GradeIcon />} onClick={() => navigate(`/parent/child/${currentChild.id}/grades`)}>
          Full Grade Report
        </Button>
      </Box>
    </Container>
  );
};

export default ParentDashboard;
