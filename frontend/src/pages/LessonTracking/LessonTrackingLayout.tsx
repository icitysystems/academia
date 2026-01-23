import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LessonTrackingSidebar from '../../components/LessonTracking/LessonTrackingSidebar';
import './LessonTrackingLayout.css';

const LessonTrackingLayout: React.FC = () => {
  const location = useLocation();
  
  // Check if we're in a form or detail page that shouldn't show sidebar
  const isFullWidthPage = location.pathname.includes('/new') || 
                          location.pathname.includes('/edit');

  return (
    <div className={`lesson-tracking-layout ${isFullWidthPage ? 'full-width' : ''}`}>
      {!isFullWidthPage && <LessonTrackingSidebar />}
      <main className="lesson-tracking-content">
        <Outlet />
      </main>
    </div>
  );
};

export default LessonTrackingLayout;
