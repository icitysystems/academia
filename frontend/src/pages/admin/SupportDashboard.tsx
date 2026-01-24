import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Chip,
  Skeleton,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Badge,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  Alert,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import CloudIcon from '@mui/icons-material/Cloud';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';

// GraphQL Queries
const GET_SUPPORT_DASHBOARD = gql`
  query GetSupportDashboard {
    supportDashboardStats {
      openTickets
      inProgressTickets
      resolvedToday
      closedToday
      avgResolutionTime
    }
    systemHealth {
      status
      timestamp
      metrics {
        totalUsers
        activeUsers24h
      }
    }
    allTickets(options: { take: 20 }) {
      tickets {
        id
        title
        description
        category
        priority
        status
        createdAt
        updatedAt
        submitter {
          id
          name
          email
        }
        assignee {
          id
          name
        }
      }
      total
    }
  }
`;

const GET_SYSTEM_METRICS = gql`
  query GetSystemMetrics {
    systemMetrics {
      timestamp
      users {
        total
        byRole
        newToday
        newThisWeek
      }
      grading {
        activeSessions
        totalGraded
      }
      support {
        pendingTickets
      }
      activity {
        logsLastHour
      }
    }
  }
`;

const GET_ERROR_LOGS = gql`
  query GetErrorLogs($limit: Int) {
    errorLogs(limit: $limit) {
      id
      action
      entityType
      entityId
      details
      createdAt
      user {
        id
        email
        name
      }
    }
  }
`;

const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($options: AuditLogOptionsInput) {
    auditLogs(options: $options) {
      logs {
        id
        action
        entityType
        entityId
        details
        ipAddress
        createdAt
        user {
          id
          email
          name
        }
      }
      total
    }
  }
`;

const ASSIGN_TICKET = gql`
  mutation AssignTicket($ticketId: String!, $assigneeId: String!) {
    assignTicket(ticketId: $ticketId, assigneeId: $assigneeId) {
      id
      status
      assignee {
        id
        name
      }
    }
  }
`;

const UPDATE_TICKET_STATUS = gql`
  mutation UpdateTicketStatus($ticketId: String!, $status: String!) {
    updateTicketStatus(ticketId: $ticketId, status: $status) {
      id
      status
    }
  }
`;

const RESOLVE_TICKET = gql`
  mutation ResolveTicket($ticketId: String!, $resolution: String!) {
    resolveTicket(ticketId: $ticketId, resolution: $resolution) {
      id
      status
      resolution
      resolvedAt
    }
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}> = ({ title, value, icon, color, trend }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              color: color,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold" color={color}>
          {value}
        </Typography>
        {trend && (
          <Typography variant="caption" color="text.secondary">
            {trend}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Priority Chip Component
const PriorityChip: React.FC<{ priority: string }> = ({ priority }) => {
  const getConfig = () => {
    switch (priority) {
      case 'URGENT':
        return { color: 'error' as const, icon: <PriorityHighIcon fontSize="small" /> };
      case 'HIGH':
        return { color: 'warning' as const, icon: <WarningIcon fontSize="small" /> };
      case 'MEDIUM':
        return { color: 'info' as const, icon: null };
      case 'LOW':
        return { color: 'default' as const, icon: null };
      default:
        return { color: 'default' as const, icon: null };
    }
  };
  const config = getConfig();
  return (
    <Chip
      label={priority}
      size="small"
      color={config.color}
      icon={config.icon || undefined}
    />
  );
};

// Status Chip Component
const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const getConfig = () => {
    switch (status) {
      case 'OPEN':
        return { color: 'warning' as const, label: 'Open' };
      case 'IN_PROGRESS':
        return { color: 'info' as const, label: 'In Progress' };
      case 'RESOLVED':
        return { color: 'success' as const, label: 'Resolved' };
      case 'CLOSED':
        return { color: 'default' as const, label: 'Closed' };
      default:
        return { color: 'default' as const, label: status };
    }
  };
  const config = getConfig();
  return <Chip label={config.label} size="small" color={config.color} />;
};

// Main Support Dashboard Component
const SupportDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Queries
  const { data: dashboardData, loading: dashboardLoading, refetch: refetchDashboard } = useQuery(
    GET_SUPPORT_DASHBOARD,
    { pollInterval: 30000 } // Refresh every 30 seconds
  );

  const { data: metricsData, loading: metricsLoading, refetch: refetchMetrics } = useQuery(
    GET_SYSTEM_METRICS,
    { skip: currentTab !== 1 }
  );

  const { data: errorLogsData, loading: errorLogsLoading, refetch: refetchErrors } = useQuery(
    GET_ERROR_LOGS,
    { variables: { limit: 50 }, skip: currentTab !== 2 }
  );

  const { data: auditLogsData, loading: auditLogsLoading, refetch: refetchAudit } = useQuery(
    GET_AUDIT_LOGS,
    { variables: { options: { limit: 100 } }, skip: currentTab !== 3 }
  );

  // Mutations
  const [assignTicket] = useMutation(ASSIGN_TICKET, {
    onCompleted: () => refetchDashboard(),
  });

  const [updateTicketStatus] = useMutation(UPDATE_TICKET_STATUS, {
    onCompleted: () => refetchDashboard(),
  });

  const [resolveTicket] = useMutation(RESOLVE_TICKET, {
    onCompleted: () => {
      refetchDashboard();
      setResolveDialogOpen(false);
      setResolution('');
      setSelectedTicket(null);
    },
  });

  const handleAssignToMe = (ticketId: string) => {
    if (user?.id) {
      assignTicket({ variables: { ticketId, assigneeId: user.id } });
    }
  };

  const handleResolve = () => {
    if (selectedTicket && resolution) {
      resolveTicket({
        variables: { ticketId: selectedTicket.id, resolution },
      });
    }
  };

  const handleRefresh = () => {
    refetchDashboard();
    if (currentTab === 1) refetchMetrics();
    if (currentTab === 2) refetchErrors();
    if (currentTab === 3) refetchAudit();
  };

  const stats = dashboardData?.supportDashboardStats;
  const tickets = dashboardData?.allTickets?.tickets || [];
  const systemHealth = dashboardData?.systemHealth;

  // Filter tickets
  const filteredTickets = tickets.filter((ticket: any) => {
    const matchesSearch =
      !searchQuery ||
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = !filterPriority || ticket.priority === filterPriority;
    const matchesStatus = !filterStatus || ticket.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <SupportAgentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Support Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor system health, manage support tickets, and troubleshoot issues
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* System Health Alert */}
      {systemHealth && (
        <Alert
          severity={systemHealth.status === 'healthy' ? 'success' : 'warning'}
          icon={<HealthAndSafetyIcon />}
          sx={{ mb: 3 }}
        >
          System Status: <strong>{systemHealth.status.toUpperCase()}</strong> |
          Active Users (24h): <strong>{systemHealth.metrics?.activeUsers24h || 0}</strong> |
          Total Users: <strong>{systemHealth.metrics?.totalUsers || 0}</strong>
        </Alert>
      )}

      {/* Stats Cards */}
      {dashboardLoading ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Open Tickets"
              value={stats?.openTickets || 0}
              icon={<ConfirmationNumberIcon />}
              color={theme.palette.warning.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="In Progress"
              value={stats?.inProgressTickets || 0}
              icon={<AccessTimeIcon />}
              color={theme.palette.info.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Resolved Today"
              value={stats?.resolvedToday || 0}
              icon={<CheckCircleIcon />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Avg Resolution Time"
              value={stats?.avgResolutionTime ? `${stats.avgResolutionTime.toFixed(1)}h` : 'N/A'}
              icon={<SpeedIcon />}
              color={theme.palette.primary.main}
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<ConfirmationNumberIcon />} label="Tickets" iconPosition="start" />
          <Tab icon={<AssessmentIcon />} label="System Metrics" iconPosition="start" />
          <Tab icon={<BugReportIcon />} label="Error Logs" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="Audit Logs" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        {/* Tickets Tab */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search tickets..."
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
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  label="Priority"
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="OPEN">Open</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="RESOLVED">Resolved</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ticket</TableCell>
                <TableCell>Submitter</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No tickets found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket: any) => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {ticket.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{ticket.id.slice(0, 8)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ width: 28, height: 28, mr: 1 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {ticket.submitter?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ticket.submitter?.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={ticket.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <PriorityChip priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      {ticket.assignee?.name || (
                        <Typography variant="body2" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {!ticket.assignee && (
                          <Tooltip title="Assign to me">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleAssignToMe(ticket.id)}
                            >
                              <AssignmentIndIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                          <Tooltip title="Resolve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setResolveDialogOpen(true);
                              }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {/* System Metrics Tab */}
        {metricsLoading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : metricsData?.systemMetrics ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">User Statistics</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Total Users</Typography>
                      <Typography fontWeight="bold">
                        {metricsData.systemMetrics.users.total}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">New Today</Typography>
                      <Typography fontWeight="bold" color="success.main">
                        +{metricsData.systemMetrics.users.newToday}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">New This Week</Typography>
                      <Typography fontWeight="bold" color="success.main">
                        +{metricsData.systemMetrics.users.newThisWeek}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MemoryIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Grading Activity</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Active Sessions</Typography>
                      <Typography fontWeight="bold">
                        {metricsData.systemMetrics.grading.activeSessions}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Total Graded</Typography>
                      <Typography fontWeight="bold">
                        {metricsData.systemMetrics.grading.totalGraded}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SupportAgentIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Support Activity</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Pending Tickets</Typography>
                      <Typography fontWeight="bold" color="warning.main">
                        {metricsData.systemMetrics.support.pendingTickets}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Logs Last Hour</Typography>
                      <Typography fontWeight="bold">
                        {metricsData.systemMetrics.activity.logsLastHour}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Users by Role
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {metricsData.systemMetrics.users.byRole &&
                      Object.entries(metricsData.systemMetrics.users.byRole).map(
                        ([role, count]) => (
                          <Grid item xs={6} sm={4} md={2} key={role}>
                            <Paper
                              sx={{
                                p: 2,
                                textAlign: 'center',
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                              }}
                            >
                              <Typography variant="h4" color="primary">
                                {count as number}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {role}
                              </Typography>
                            </Paper>
                          </Grid>
                        )
                      )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">No system metrics available</Alert>
        )}
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        {/* Error Logs Tab */}
        {errorLogsLoading ? (
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errorLogsData?.errorLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                      <Typography color="text.secondary">No errors found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  errorLogsData?.errorLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(log.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.entityType}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.entityId?.slice(0, 8)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.user?.email || 'System'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            maxWidth: 300,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {log.details}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        {/* Audit Logs Tab */}
        {auditLogsLoading ? (
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity Type</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogsData?.auditLogs?.logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No audit logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogsData?.auditLogs?.logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(log.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.user?.email || 'System'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {log.ipAddress || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            maxWidth: 200,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {log.details}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Resolve Ticket Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resolve Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a resolution summary for ticket: <strong>{selectedTicket?.title}</strong>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Describe how the issue was resolved..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolve}
            disabled={!resolution.trim()}
          >
            Resolve Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SupportDashboard;
