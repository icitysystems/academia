import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  useTheme,
  useMediaQuery,
  alpha,
  Badge,
  Tooltip
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import SchoolIcon from '@mui/icons-material/School';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BookIcon from '@mui/icons-material/Book';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TimelineIcon from '@mui/icons-material/Timeline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ClassIcon from '@mui/icons-material/Class';
import QuizIcon from '@mui/icons-material/Quiz';
import ArticleIcon from '@mui/icons-material/Article';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CloseIcon from '@mui/icons-material/Close';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Menu States
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [learningAnchorEl, setLearningAnchorEl] = useState<null | HTMLElement>(null);
  const [toolsAnchorEl, setToolsAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileLearningOpen, setMobileLearningOpen] = useState(false);

  // Profile menu handlers
  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  // Learning menu handlers
  const handleLearningMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLearningAnchorEl(event.currentTarget);
  };

  const handleLearningClose = () => {
    setLearningAnchorEl(null);
  };

  // Tools menu handlers
  const handleToolsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setToolsAnchorEl(event.currentTarget);
  };

  const handleToolsClose = () => {
    setToolsAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleProfileClose();
    handleLearningClose();
    handleToolsClose();
    setMobileDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
    handleProfileClose();
    setMobileDrawerOpen(false);
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Mobile Drawer Content
  const mobileDrawer = (
    <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: 'primary.main',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon />
          <Typography variant="h6" fontWeight="bold">Academia</Typography>
        </Box>
        <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <List sx={{ flexGrow: 1, py: 0 }}>
        {/* Main Course Link */}
        <ListItemButton 
          onClick={() => handleNavigate('/university')}
          selected={isActive('/university')}
          sx={{ py: 2 }}
        >
          <ListItemIcon><SchoolIcon color="primary" /></ListItemIcon>
          <ListItemText 
            primary="Browse Courses" 
            secondary="Explore our course catalog"
            primaryTypographyProps={{ fontWeight: 600 }}
          />
        </ListItemButton>

        <Divider />

        {isAuthenticated && (
          <>
            {/* My Learning Section */}
            <ListItemButton onClick={() => setMobileLearningOpen(!mobileLearningOpen)} sx={{ py: 2 }}>
              <ListItemIcon><BookIcon color="secondary" /></ListItemIcon>
              <ListItemText 
                primary="My Learning" 
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              {mobileLearningOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={mobileLearningOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/university/my-courses')}>
                  <ListItemIcon><BookIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="My Enrolled Courses" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/university/dashboard')}>
                  <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Student Dashboard" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/university/instructor')}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Instructor Dashboard" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/university/instructor/courses/new')}>
                  <ListItemIcon><AddIcon fontSize="small" color="primary" /></ListItemIcon>
                  <ListItemText primary="Create New Course" primaryTypographyProps={{ color: 'primary' }} />
                </ListItemButton>
              </List>
            </Collapse>

            <Divider />

            {/* Tools Section */}
            <ListItemButton onClick={() => setMobileToolsOpen(!mobileToolsOpen)} sx={{ py: 2 }}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText 
                primary="Teaching Tools" 
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              {mobileToolsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={mobileToolsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {/* ML Grading */}
                <ListItem sx={{ pl: 4, py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    ML GRADING
                  </Typography>
                </ListItem>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/grading')}>
                  <ListItemIcon><PsychologyIcon fontSize="small" color="primary" /></ListItemIcon>
                  <ListItemText primary="Grading Dashboard" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/templates')}>
                  <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Templates" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/reports')}>
                  <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Reports" />
                </ListItemButton>

                {/* Lesson Tracking */}
                <ListItem sx={{ pl: 4, py: 0.5, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    LESSON TRACKING
                  </Typography>
                </ListItem>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/lessons')}>
                  <ListItemIcon><TimelineIcon fontSize="small" color="warning" /></ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/lessons/schools')}>
                  <ListItemIcon><SchoolIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Schools" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/lessons/classes')}>
                  <ListItemIcon><ClassIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Classes" />
                </ListItemButton>

                {/* Learning Resources */}
                <ListItem sx={{ pl: 4, py: 0.5, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    LEARNING RESOURCES
                  </Typography>
                </ListItem>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/resources')}>
                  <ListItemIcon><MenuBookIcon fontSize="small" color="success" /></ListItemIcon>
                  <ListItemText primary="Resources Dashboard" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/resources/lesson-plans')}>
                  <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Lesson Plans" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigate('/resources/quizzes')}>
                  <ListItemIcon><QuizIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Online Quizzes" />
                </ListItemButton>
              </List>
            </Collapse>

            <Divider />
          </>
        )}

        {/* Pricing & Donate */}
        <ListItemButton onClick={() => handleNavigate('/pricing')} sx={{ py: 2 }}>
          <ListItemIcon><LocalOfferIcon /></ListItemIcon>
          <ListItemText primary="Pricing" />
        </ListItemButton>
        <ListItemButton onClick={() => handleNavigate('/donate')} sx={{ py: 2 }}>
          <ListItemIcon><FavoriteIcon sx={{ color: '#ff6b6b' }} /></ListItemIcon>
          <ListItemText primary="Support Us" />
        </ListItemButton>
      </List>

      {/* Bottom Auth Section */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {isAuthenticated ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {user?.name?.[0] || user?.email[0].toUpperCase()}
              </Avatar>
              <Box>
                <Typography fontWeight="bold">{user?.name || user?.email}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
              </Box>
            </Box>
            <Button 
              fullWidth 
              variant="outlined" 
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => handleNavigate('/register')}
            >
              Get Started Free
            </Button>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => handleNavigate('/login')}
            >
              Sign In
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: 'white', 
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          {/* Logo */}
          <Box 
            component={RouterLink} 
            to="/" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              textDecoration: 'none', 
              color: 'primary.main',
              mr: 4
            }}
          >
            <SchoolIcon sx={{ fontSize: 32 }} />
            <Typography 
              variant="h5" 
              fontWeight="800"
              sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Academia
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <>
              {/* Browse Courses - Primary CTA */}
              <Button 
                component={RouterLink} 
                to="/university"
                variant={isActive('/university') ? 'contained' : 'text'}
                startIcon={<SchoolIcon />}
                sx={{ 
                  mr: 1,
                  fontWeight: 600,
                  ...(isActive('/university') && {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' }
                  })
                }}
              >
                Courses
              </Button>

              {isAuthenticated && (
                <>
                  {/* My Learning Dropdown */}
                  <Button 
                    onClick={handleLearningMenu}
                    endIcon={<ExpandMoreIcon />}
                    sx={{ 
                      mr: 1,
                      fontWeight: 600,
                      color: (isActive('/university/my-courses') || isActive('/university/dashboard') || isActive('/university/instructor')) 
                        ? 'primary.main' 
                        : 'text.primary'
                    }}
                  >
                    My Learning
                  </Button>
                  <Menu
                    anchorEl={learningAnchorEl}
                    open={Boolean(learningAnchorEl)}
                    onClose={handleLearningClose}
                    PaperProps={{
                      sx: { 
                        mt: 1, 
                        minWidth: 240,
                        borderRadius: 2,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    <MenuItem onClick={() => handleNavigate('/university/my-courses')}>
                      <ListItemIcon><BookIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="My Enrolled Courses" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/university/dashboard')}>
                      <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Student Dashboard" />
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={() => handleNavigate('/university/instructor')}>
                      <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Instructor Dashboard" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/university/instructor/courses/new')} sx={{ color: 'primary.main' }}>
                      <ListItemIcon><AddIcon fontSize="small" color="primary" /></ListItemIcon>
                      <ListItemText primary="Create New Course" />
                    </MenuItem>
                  </Menu>

                  {/* Tools Dropdown */}
                  <Button 
                    onClick={handleToolsMenu}
                    endIcon={<ExpandMoreIcon />}
                    sx={{ 
                      mr: 1,
                      fontWeight: 600,
                      color: (isActive('/grading') || isActive('/lessons') || isActive('/resources') || isActive('/templates') || isActive('/reports')) 
                        ? 'primary.main' 
                        : 'text.primary'
                    }}
                  >
                    Tools
                  </Button>
                  <Menu
                    anchorEl={toolsAnchorEl}
                    open={Boolean(toolsAnchorEl)}
                    onClose={handleToolsClose}
                    PaperProps={{
                      sx: { 
                        mt: 1, 
                        minWidth: 280,
                        borderRadius: 2,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    {/* ML Grading Section */}
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        ML GRADING SYSTEM
                      </Typography>
                    </Box>
                    <MenuItem onClick={() => handleNavigate('/grading')}>
                      <ListItemIcon><PsychologyIcon fontSize="small" color="primary" /></ListItemIcon>
                      <ListItemText primary="Grading Dashboard" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/templates')}>
                      <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Templates" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/reports')}>
                      <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Reports" />
                    </MenuItem>

                    <Divider sx={{ my: 1 }} />

                    {/* Lesson Tracking Section */}
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        LESSON TRACKING
                      </Typography>
                    </Box>
                    <MenuItem onClick={() => handleNavigate('/lessons')}>
                      <ListItemIcon><TimelineIcon fontSize="small" color="warning" /></ListItemIcon>
                      <ListItemText primary="Dashboard" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/lessons/schools')}>
                      <ListItemIcon><SchoolIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Schools" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/lessons/classes')}>
                      <ListItemIcon><ClassIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Classes" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/lessons/lessons')}>
                      <ListItemIcon><BookIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Lessons" />
                    </MenuItem>

                    <Divider sx={{ my: 1 }} />

                    {/* Learning Resources Section */}
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        LEARNING RESOURCES
                      </Typography>
                    </Box>
                    <MenuItem onClick={() => handleNavigate('/resources')}>
                      <ListItemIcon><MenuBookIcon fontSize="small" color="success" /></ListItemIcon>
                      <ListItemText primary="Resources Dashboard" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/resources/lesson-plans')}>
                      <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Lesson Plans" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/resources/exams')}>
                      <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Exam Papers" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/resources/quizzes')}>
                      <ListItemIcon><QuizIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Online Quizzes" />
                    </MenuItem>
                  </Menu>
                </>
              )}

              <Box sx={{ flexGrow: 1 }} />

              {/* Right Side Items */}
              <Button 
                component={RouterLink}
                to="/pricing"
                sx={{ mr: 1, fontWeight: 600, color: 'text.secondary' }}
              >
                Pricing
              </Button>
              
              <Tooltip title="Support Academia">
                <IconButton 
                  component={RouterLink}
                  to="/donate"
                  sx={{ mr: 2 }}
                >
                  <FavoriteIcon sx={{ color: '#ff6b6b' }} />
                </IconButton>
              </Tooltip>

              {isAuthenticated ? (
                <>
                  <Button 
                    onClick={handleProfileMenu}
                    startIcon={
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                        {user?.name?.[0] || user?.email[0].toUpperCase()}
                      </Avatar>
                    }
                    endIcon={<ExpandMoreIcon />}
                    sx={{ 
                      textTransform: 'none',
                      color: 'text.primary'
                    }}
                  >
                    <Box sx={{ textAlign: 'left', ml: 1 }}>
                      <Typography variant="body2" fontWeight="600">
                        {user?.name || user?.email?.split('@')[0]}
                      </Typography>
                    </Box>
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleProfileClose}
                    PaperProps={{
                      sx: { 
                        mt: 1, 
                        minWidth: 200,
                        borderRadius: 2,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {user?.name || user?.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user?.role}
                      </Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={() => handleNavigate('/profile')}>
                      <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Profile" />
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigate('/pricing')}>
                      <ListItemIcon><WorkspacePremiumIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Subscription" />
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                      <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                      <ListItemText primary="Sign Out" />
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    component={RouterLink}
                    to="/login"
                    sx={{ fontWeight: 600 }}
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant="contained"
                    component={RouterLink}
                    to="/register"
                    sx={{ 
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    Get Started
                  </Button>
                </Box>
              )}
            </>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton 
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ color: 'primary.main' }}
              >
                <MenuIcon />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      >
        {mobileDrawer}
      </Drawer>
    </>
  );
};

export default Navbar;
