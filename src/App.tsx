import React from 'react';
import { useApp } from './context/AppContext';
import { MobileShell } from './components/layout/MobileShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { GetStartedScreen } from './screens/GetStartedScreen';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { SubjectDetailScreen } from './screens/SubjectDetailScreen';
import { CircularsScreen } from './screens/CircularsScreen';
import { CircularDetailScreen } from './screens/CircularDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TimetableScreen } from './screens/TimetableScreen';
import { LeaveScreen } from './screens/LeaveScreen';
import { ReportCardScreen } from './screens/ReportCardScreen';
import { PlusScreen } from './screens/PlusScreen';

export const App: React.FC = () => {
  const { currentRoute, isLoggedIn } = useApp();

  const renderScreen = () => {
    // If not logged in and route is not login, show get-started
    if (!isLoggedIn) {
      if (currentRoute === '/auth/login') {
        return <LoginScreen />;
      }
      return <GetStartedScreen />;
    }

    // Dynamic detail routes
    if (currentRoute.startsWith('/circulars/') && currentRoute.length > '/circulars/'.length) {
      const circularId = currentRoute.replace('/circulars/', '');
      return <CircularDetailScreen circularId={circularId} />;
    }

    if (currentRoute.startsWith('/attendance/') && currentRoute.length > '/attendance/'.length) {
      const courseCode = decodeURIComponent(currentRoute.replace('/attendance/', ''));
      return <SubjectDetailScreen courseCode={courseCode} />;
    }

    // Authenticated Routes
    switch (currentRoute) {
      case '/auth/get-started':
        return <GetStartedScreen />;
      case '/auth/login':
        return <LoginScreen />;
      case '/attendance':
        return <AttendanceScreen />;
      case '/circulars':
        return <CircularsScreen />;
      case '/profile':
        return <ProfileScreen />;
      case '/timetable':
        return <TimetableScreen />;
      case '/leave':
        return <LeaveScreen />;
      case '/reportcard':
        return <ReportCardScreen />;
      case '/plus':
        return <PlusScreen />;
      case '/':
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <MobileShell>
      <ErrorBoundary>
        {renderScreen()}
      </ErrorBoundary>
    </MobileShell>
  );
};
