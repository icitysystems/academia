import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './LessonTrackingSidebar.css';

interface SidebarItem {
  path: string;
  icon: string;
  label: string;
  exact?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { path: '/lessons', icon: '📊', label: 'Dashboard', exact: true },
  { path: '/lessons/schools', icon: '🏫', label: 'Schools' },
  { path: '/lessons/classes', icon: '👥', label: 'Classes' },
  { path: '/lessons/lessons', icon: '📚', label: 'Lessons' },
  { path: '/lessons/syllabus', icon: '📋', label: 'Syllabus' },
  { path: '/lessons/reports', icon: '📈', label: 'Reports' },
];

const LessonTrackingSidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (item: SidebarItem): boolean => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside className="lesson-tracking-sidebar">
      <div className="sidebar-header">
        <h2>📖 Lesson Tracking</h2>
      </div>
      
      <nav className="sidebar-nav">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`sidebar-item ${isActive(item) ? 'active' : ''}`}
            end={item.exact}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/lessons/lessons/new" className="quick-action-btn">
          <span className="btn-icon">➕</span>
          <span>Log New Lesson</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default LessonTrackingSidebar;
