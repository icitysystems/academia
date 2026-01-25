import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventIcon from '@mui/icons-material/Event';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import VideocamIcon from '@mui/icons-material/Videocam';
import SchoolIcon from '@mui/icons-material/School';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  type: 'ASSIGNMENT' | 'QUIZ' | 'LIVE_SESSION' | 'COURSE_START' | 'COURSE_END' | 'DEADLINE' | 'EVENT';
  courseName?: string;
  description?: string;
}

interface AcademicCalendarProps {
  events?: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const AcademicCalendar: React.FC<AcademicCalendarProps> = ({
  events = [],
  onDateSelect,
  onEventClick,
}) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ASSIGNMENT':
        return <AssignmentIcon color="primary" />;
      case 'QUIZ':
        return <QuizIcon color="secondary" />;
      case 'LIVE_SESSION':
        return <VideocamIcon color="error" />;
      case 'COURSE_START':
      case 'COURSE_END':
        return <SchoolIcon color="success" />;
      default:
        return <EventIcon color="action" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'ASSIGNMENT':
        return theme.palette.primary.main;
      case 'QUIZ':
        return theme.palette.secondary.main;
      case 'LIVE_SESSION':
        return theme.palette.error.main;
      case 'COURSE_START':
      case 'COURSE_END':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
    onDateSelect?.(newDate);
  };

  const getEventsForDate = (day: number): CalendarEvent[] => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === targetDate.getFullYear() &&
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getDate() === targetDate.getDate()
      );
    });
  };

  const getSelectedDateEvents = (): CalendarEvent[] => {
    if (!selectedDate) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    });
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const days = [];

    // Empty cells before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <Grid item xs={12 / 7} key={`empty-${i}`}>
          <Box sx={{ p: 1, minHeight: 60 }} />
        </Grid>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;
      const isSelected =
        selectedDate &&
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day;

      days.push(
        <Grid item xs={12 / 7} key={day}>
          <Box
            onClick={() => handleDateClick(day)}
            sx={{
              p: 1,
              minHeight: 60,
              cursor: 'pointer',
              borderRadius: 1,
              backgroundColor: isSelected
                ? alpha(theme.palette.primary.main, 0.1)
                : isToday
                ? alpha(theme.palette.info.main, 0.05)
                : 'transparent',
              border: isToday ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
              transition: 'all 0.2s',
            }}
            role="button"
            aria-label={`${monthNames[month]} ${day}, ${year}${dayEvents.length > 0 ? `, ${dayEvents.length} events` : ''}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleDateClick(day);
              }
            }}
          >
            <Typography
              variant="body2"
              fontWeight={isToday ? 'bold' : 'normal'}
              color={isSelected ? 'primary' : 'textPrimary'}
            >
              {day}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {dayEvents.slice(0, 3).map((event, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: getEventColor(event.type),
                  }}
                  title={event.title}
                />
              ))}
              {dayEvents.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{dayEvents.length - 3}
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>
      );
    }

    return days;
  };

  const selectedDateEvents = getSelectedDateEvents();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          {/* Calendar Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <IconButton
              onClick={previousMonth}
              aria-label="Previous month"
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Typography>
            <IconButton
              onClick={nextMonth}
              aria-label="Next month"
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Days of Week Header */}
          <Grid container sx={{ mb: 1 }}>
            {daysOfWeek.map((day) => (
              <Grid item xs={12 / 7} key={day}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  fontWeight="medium"
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar Grid */}
          <Grid container>
            {renderCalendarDays()}
          </Grid>

          {/* Legend */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant="caption">Assignment</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'secondary.main' }} />
              <Typography variant="caption">Quiz</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
              <Typography variant="caption">Live Session</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography variant="caption">Course Event</Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {selectedDate
              ? `Events on ${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}`
              : 'Select a date'}
          </Typography>

          {selectedDate && selectedDateEvents.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No events scheduled for this date.
            </Typography>
          )}

          <List disablePadding>
            {selectedDateEvents.map((event, index) => (
              <React.Fragment key={event.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    px: 0,
                    cursor: onEventClick ? 'pointer' : 'default',
                    '&:hover': onEventClick ? { bgcolor: 'action.hover' } : {},
                    borderRadius: 1,
                  }}
                  onClick={() => onEventClick?.(event)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getEventIcon(event.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={event.title}
                    secondary={
                      <Box component="span">
                        {event.courseName && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {event.courseName}
                          </Typography>
                        )}
                        <Chip
                          label={event.type.replace('_', ' ')}
                          size="small"
                          sx={{ mt: 0.5, fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          {!selectedDate && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Click on a date to view scheduled events
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AcademicCalendar;
