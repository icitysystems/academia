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
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemButton,
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
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import PaymentIcon from '@mui/icons-material/Payment';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DescriptionIcon from '@mui/icons-material/Description';

const GET_ADMIN_DASHBOARD = gql`
  query GetAdminDashboard {
    systemStats {
      totalUsers
      totalStudents
      totalFaculty
      totalCourses
      activeCourses
      totalEnrollments
      totalRevenue
      monthlyRevenue
      pendingPayments
      newUsersThisMonth
      activeUsersToday
    }
    recentUsers {
      id
      name
      email
      role
      isActive
      emailVerified
      createdAt
      lastLoginAt
    }
    recentEnrollments {
      id
      studentName
      courseName
      enrolledAt
      paymentStatus
    }
    pendingApprovals {
      id
      type
      title
      requestedBy
      requestedAt
    }
    systemAlerts {
      id
      type
      message
      createdAt
    }
  }
`;

const GET_ALL_USERS = gql`
  query GetAllUsers($role: String, $search: String, $page: Int, $limit: Int) {
    allUsers(role: $role, search: $search, page: $page, limit: $limit) {
      users {
        id
        name
        email
        role
        isActive
        emailVerified
        createdAt
        lastLoginAt
      }
      total
      page
      totalPages
    }
  }
`;

const GET_ALL_COURSES_ADMIN = gql`
  query GetAllCoursesAdmin($status: String, $search: String, $page: Int, $limit: Int) {
    allCoursesAdmin(status: $status, search: $search, page: $page, limit: $limit) {
      courses {
        id
        title
        instructorName
        status
        enrollmentCount
        price
        revenue
        createdAt
      }
      total
      page
      totalPages
    }
  }
`;

const GET_PAYMENTS_ADMIN = gql`
  query GetPaymentsAdmin($status: String, $page: Int, $limit: Int) {
    paymentsAdmin(status: $status, page: $page, limit: $limit) {
      payments {
        id
        userId
        userName
        userEmail
        amount
        type
        status
        paymentMethod
        transactionId
        createdAt
      }
      total
      totalAmount
      page
      totalPages
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

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [userRowsPerPage, setUserRowsPerPage] = useState(10);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const { data, loading, error, refetch } = useQuery(GET_ADMIN_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const stats = data?.systemStats || {};
  const recentUsers = data?.recentUsers || [];
  const recentEnrollments = data?.recentEnrollments || [];
  const pendingApprovals = data?.pendingApprovals || [];
  const systemAlerts = data?.systemAlerts || [];

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    subtitle,
    icon, 
    color,
    trend,
    trendValue,
    onClick 
  }: { 
    title: string; 
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode; 
    color: string;
    trend?: 'up' | 'down';
    trendValue?: string;
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
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && trendValue && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend === 'up' ? (
                  <TrendingUpIcon fontSize="small" color="success" />
                ) : (
                  <TrendingDownIcon fontSize="small" color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={trend === 'up' ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'FACULTY': return 'primary';
      case 'STUDENT': return 'success';
      case 'SUPPORT_STAFF': return 'info';
      case 'PARENT': return 'secondary';
      case 'ALUMNI': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': case 'PAID': case 'ACTIVE': return 'success';
      case 'PENDING': case 'PROCESSING': return 'warning';
      case 'FAILED': case 'REJECTED': case 'INACTIVE': return 'error';
      default: return 'default';
    }
  };

  const handleUserMenu = (event: React.MouseEvent<HTMLElement>, user: any) => {
    event.stopPropagation();
    setUserMenuAnchor(event.currentTarget);
    setSelectedUser(user);
  };

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
            <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Error loading dashboard. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', pb: 4 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', py: 3 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Admin Dashboard
              </Typography>
              <Typography color="text.secondary">
                System administration and management
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <IconButton onClick={() => refetch()}>
                <RefreshIcon />
              </IconButton>
              <Badge badgeContent={systemAlerts.length} color="error">
                <IconButton>
                  <NotificationsIcon />
                </IconButton>
              </Badge>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                Export Report
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setUserDialogOpen(true)}
              >
                Add User
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            icon={<WarningIcon />}
            action={
              <Button color="inherit" size="small">
                View All
              </Button>
            }
          >
            {systemAlerts[0]?.message || 'System alerts require your attention'}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={stats.totalUsers || 0}
              subtitle={`+${stats.newUsersThisMonth || 0} this month`}
              icon={<PeopleIcon />}
              color={theme.palette.primary.main}
              trend="up"
              trendValue="+12%"
              onClick={() => setTabValue(1)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Courses"
              value={stats.totalCourses || 0}
              subtitle={`${stats.activeCourses || 0} active`}
              icon={<SchoolIcon />}
              color={theme.palette.success.main}
              onClick={() => setTabValue(2)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Enrollments"
              value={stats.totalEnrollments || 0}
              icon={<DescriptionIcon />}
              color={theme.palette.info.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Monthly Revenue"
              value={`$${(stats.monthlyRevenue || 0).toLocaleString()}`}
              subtitle={`$${stats.pendingPayments || 0} pending`}
              icon={<AttachMoneyIcon />}
              color={theme.palette.warning.main}
              trend="up"
              trendValue="+8%"
              onClick={() => setTabValue(3)}
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
            <Tab icon={<PeopleIcon />} label="User Management" iconPosition="start" />
            <Tab icon={<SchoolIcon />} label="Course Catalog" iconPosition="start" />
            <Tab icon={<PaymentIcon />} label="Finance & Billing" iconPosition="start" />
            <Tab icon={<SupportAgentIcon />} label="Support" iconPosition="start" />
            <Tab icon={<BarChartIcon />} label="Reports" iconPosition="start" />
            <Tab icon={<SettingsIcon />} label="Settings" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab: Overview */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Recent Users */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">Recent Users</Typography>
                  <Button size="small" onClick={() => setTabValue(1)}>View All</Button>
                </Box>
                <List disablePadding>
                  {recentUsers.slice(0, 5).map((user: any, index: number) => (
                    <React.Fragment key={user.id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                            {user.name?.charAt(0) || 'U'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {user.name}
                              </Typography>
                              <Chip 
                                label={user.role} 
                                size="small" 
                                color={getRoleColor(user.role) as any}
                              />
                            </Box>
                          }
                          secondary={user.email}
                        />
                        <ListItemSecondaryAction>
                          <Chip 
                            label={user.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={user.isActive ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Recent Enrollments */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">Recent Enrollments</Typography>
                  <Button size="small" onClick={() => setTabValue(2)}>View All</Button>
                </Box>
                <List disablePadding>
                  {recentEnrollments.slice(0, 5).map((enrollment: any, index: number) => (
                    <React.Fragment key={enrollment.id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.light' }}>
                            <SchoolIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={enrollment.studentName}
                          secondary={
                            <>
                              {enrollment.courseName}
                              <br />
                              {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Chip 
                            label={enrollment.paymentStatus} 
                            size="small" 
                            color={getStatusColor(enrollment.paymentStatus) as any}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Pending Approvals */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Pending Approvals
                </Typography>
                {pendingApprovals.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography color="text.secondary">No pending approvals</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {pendingApprovals.map((approval: any, index: number) => (
                      <React.Fragment key={approval.id}>
                        {index > 0 && <Divider />}
                        <ListItem 
                          sx={{ py: 1.5 }}
                          secondaryAction={
                            <Stack direction="row" spacing={1}>
                              <Button size="small" color="success">Approve</Button>
                              <Button size="small" color="error">Reject</Button>
                            </Stack>
                          }
                        >
                          <ListItemText
                            primary={approval.title}
                            secondary={`${approval.type} • ${approval.requestedBy}`}
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Quick Stats */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  User Distribution
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Students</Typography>
                      <Typography variant="body2" fontWeight="bold">{stats.totalStudents || 0}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.totalStudents / stats.totalUsers) * 100 || 0}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="success"
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Faculty</Typography>
                      <Typography variant="body2" fontWeight="bold">{stats.totalFaculty || 0}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.totalFaculty / stats.totalUsers) * 100 || 0}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="primary"
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Active Today</Typography>
                      <Typography variant="body2" fontWeight="bold">{stats.activeUsersToday || 0}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.activeUsersToday / stats.totalUsers) * 100 || 0}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="info"
                    />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: User Management */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">User Management</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  size="small"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Filter by Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Filter by Role"
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="STUDENT">Student</MenuItem>
                    <MenuItem value="FACULTY">Faculty</MenuItem>
                    <MenuItem value="ADMIN">Admin</MenuItem>
                    <MenuItem value="SUPPORT_STAFF">Support Staff</MenuItem>
                    <MenuItem value="PARENT">Parent</MenuItem>
                    <MenuItem value="ALUMNI">Alumni</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setUserDialogOpen(true)}
                >
                  Add User
                </Button>
              </Stack>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Email Verified</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentUsers.map((user: any) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {user.name?.charAt(0) || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role} 
                          size="small" 
                          color={getRoleColor(user.role) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.isActive ? 'Active' : 'Inactive'} 
                          size="small" 
                          color={user.isActive ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {user.emailVerified ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt 
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small"
                          onClick={(e) => handleUserMenu(e, user)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={100}
              rowsPerPage={userRowsPerPage}
              page={userPage}
              onPageChange={(_, p) => setUserPage(p)}
              onRowsPerPageChange={(e) => {
                setUserRowsPerPage(parseInt(e.target.value, 10));
                setUserPage(0);
              }}
            />
          </Paper>
        </TabPanel>

        {/* Tab: Course Catalog */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">Course Catalog Management</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  size="small"
                  placeholder="Search courses..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" defaultValue="">
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="PUBLISHED">Published</MenuItem>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="ARCHIVED">Archived</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Box sx={{ textAlign: 'center', py: 6 }}>
              <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Course Catalog
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Manage all courses, assign instructors, set pricing, and control visibility.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                Add Course
              </Button>
            </Box>
          </Paper>
        </TabPanel>

        {/* Tab: Finance & Billing */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.light', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                  <AccountBalanceIcon color="success" />
                </Avatar>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  ${(stats.totalRevenue || 0).toLocaleString()}
                </Typography>
                <Typography color="text.secondary">Total Revenue</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.light', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                  <AttachMoneyIcon color="primary" />
                </Avatar>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  ${(stats.monthlyRevenue || 0).toLocaleString()}
                </Typography>
                <Typography color="text.secondary">This Month</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.light', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                  <ReceiptIcon color="warning" />
                </Avatar>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  ${(stats.pendingPayments || 0).toLocaleString()}
                </Typography>
                <Typography color="text.secondary">Pending</Typography>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Recent Transactions</Typography>
                  <Stack direction="row" spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Status</InputLabel>
                      <Select label="Status" defaultValue="">
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="COMPLETED">Completed</MenuItem>
                        <MenuItem value="PENDING">Pending</MenuItem>
                        <MenuItem value="FAILED">Failed</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="outlined" startIcon={<DownloadIcon />}>
                      Export
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CreditCardIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">
                    View all payment transactions, refunds, and billing history.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Support */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Access the full Support Dashboard for ticket management, system monitoring, and troubleshooting tools.
              </Alert>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                      <SupportAgentIcon color="primary" />
                    </Avatar>
                    <Typography variant="h6">Support Dashboard</Typography>
                  </Box>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Manage support tickets, view system health, and monitor error logs.
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    component={RouterLink}
                    to="/admin/support"
                    startIcon={<SupportAgentIcon />}
                  >
                    Open Support Dashboard
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.light', mr: 2 }}>
                      <SecurityIcon color="warning" />
                    </Avatar>
                    <Typography variant="h6">System Monitoring</Typography>
                  </Box>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    View server status, security alerts, and audit logs for the platform.
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    component={RouterLink}
                    to="/admin/support"
                    startIcon={<SecurityIcon />}
                  >
                    View System Metrics
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'error.light', mr: 2 }}>
                      <WarningIcon color="error" />
                    </Avatar>
                    <Typography variant="h6">Error Logs</Typography>
                  </Box>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Troubleshoot issues by reviewing error logs and system events.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    component={RouterLink}
                    to="/admin/support"
                    startIcon={<WarningIcon />}
                  >
                    View Error Logs
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Reports */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Available Reports
                </Typography>
                <List>
                  <ListItemButton component={RouterLink} to="/reports">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <BarChartIcon color="primary" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Grading Analytics" 
                      secondary="ML grading performance and accuracy"
                    />
                  </ListItemButton>
                  <ListItemButton>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.light' }}>
                        <TrendingUpIcon color="success" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Enrollment Trends" 
                      secondary="Student enrollment over time"
                    />
                  </ListItemButton>
                  <ListItemButton>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.light' }}>
                        <AttachMoneyIcon color="warning" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Revenue Report" 
                      secondary="Financial performance summary"
                    />
                  </ListItemButton>
                  <ListItemButton>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.light' }}>
                        <PeopleIcon color="info" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="User Activity" 
                      secondary="Login patterns and engagement"
                    />
                  </ListItemButton>
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Export
                </Typography>
                <Stack spacing={2}>
                  <Button variant="outlined" fullWidth startIcon={<DownloadIcon />}>
                    Export User Data (CSV)
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<DownloadIcon />}>
                    Export Course Data (CSV)
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<DownloadIcon />}>
                    Export Transaction History
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<DownloadIcon />}>
                    Export Grading Reports
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Settings */}
        <TabPanel value={tabValue} index={6}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  System Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Allow New Registrations" 
                      secondary="Enable public user registration"
                    />
                    <Switch defaultChecked />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText 
                      primary="Email Verification Required" 
                      secondary="Require email verification for new users"
                    />
                    <Switch defaultChecked />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText 
                      primary="Maintenance Mode" 
                      secondary="Put the system in maintenance mode"
                    />
                    <Switch />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Security Settings
                </Typography>
                <List>
                  <ListItemButton>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <SecurityIcon color="primary" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Access Control" 
                      secondary="Manage role permissions"
                    />
                  </ListItemButton>
                  <ListItemButton>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.light' }}>
                        <DescriptionIcon color="warning" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Audit Logs" 
                      secondary="View system activity logs"
                    />
                  </ListItemButton>
                  <ListItemButton component={RouterLink} to="/admin/subscription-plans">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.light' }}>
                        <PaymentIcon color="success" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Subscription Plans" 
                      secondary="Manage pricing and plans"
                    />
                  </ListItemButton>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Container>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
      >
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit User
        </MenuItem>
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <SecurityIcon fontSize="small" sx={{ mr: 1 }} /> Reset Password
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          {selectedUser?.isActive ? (
            <>
              <BlockIcon fontSize="small" sx={{ mr: 1 }} /> Deactivate
            </>
          ) : (
            <>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> Activate
            </>
          )}
        </MenuItem>
        <MenuItem onClick={() => setUserMenuAnchor(null)} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete User
        </MenuItem>
      </Menu>

      {/* Add User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField label="Full Name" fullWidth required />
            <TextField label="Email" type="email" fullWidth required />
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select label="Role" defaultValue="STUDENT">
                <MenuItem value="STUDENT">Student</MenuItem>
                <MenuItem value="FACULTY">Faculty</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="SUPPORT_STAFF">Support Staff</MenuItem>
                <MenuItem value="PARENT">Parent</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Temporary Password" type="password" fullWidth required />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Send welcome email with login credentials"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setUserDialogOpen(false)}>
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
