import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ThemeMode,
  UserData,
  StudentProfile,
  OverallAttendance,
  TimetableSlot,
  CircularItem,
  ReportCard,
  AttendanceRegister,
} from '../types';
import {
  DEMO_USER_DATA,
  DEMO_PROFILE,
  DEMO_ATTENDANCE,
  DEMO_ATTENDANCE_REGISTER,
  DEMO_TIMETABLE,
  DEMO_FEED,
  DEMO_REPORT_CARD,
} from '../data/mockData';
import { schoolPadApi, LoginResult } from '../services/schoolpadApi';

interface AppContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  isLoggedIn: boolean;
  isDemoMode: boolean;
  isLoadingData: boolean;
  dataError: string | null;
  userData: UserData | null;
  studentProfile: StudentProfile;
  attendanceData: OverallAttendance;
  attendanceRegister: AttendanceRegister | null;
  timetableData: TimetableSlot[];
  circulars: CircularItem[];
  reportCard: ReportCard | null;
  currentRoute: string;
  navigate: (route: string) => void;
  enableDemoMode: () => void;
  login: (username: string, pass: string) => Promise<LoginResult>;
  verifyOTP: (authUserId: string, otpText: string) => Promise<LoginResult>;
  logout: () => void;
  refreshData: () => Promise<void>;
  whatsNewDismissed: boolean;
  dismissWhatsNew: () => void;
  schoolCode: string;
  setSchoolCode: (code: string) => void;
  markCircularRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('attendly_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Auth & Session state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('attendly_logged_in') === 'true';
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('attendly_demo_mode') === 'true';
  });
  const [schoolCode, setSchoolCodeState] = useState<string>(() => {
    return localStorage.getItem('attendly_school_code') || '800002';
  });

  // Navigation Route state
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = window.location.pathname;
    if (path && path !== '/') {
      return path;
    }
    const loggedIn = localStorage.getItem('attendly_logged_in') === 'true';
    return loggedIn ? '/' : '/auth/get-started';
  });

  // Loading & error states
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Data states
  const [userData, setUserData] = useState<UserData | null>(() => {
    const loggedIn = localStorage.getItem('attendly_logged_in') === 'true';
    const isDemo = localStorage.getItem('attendly_demo_mode') === 'true';
    if (loggedIn && isDemo) return DEMO_USER_DATA;
    return schoolPadApi.getUserDetails();
  });

  const EMPTY_ATTENDANCE: OverallAttendance = {
    title: 'Attendance',
    page_id: '28',
    page_name: 'Attendance Subjectwise',
    total_subjects: 0,
    overall_percentage: 0,
    subjects: [],
  };

  const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => {
    const isDemo = localStorage.getItem('attendly_demo_mode') === 'true';
    if (isDemo) return DEMO_PROFILE;
    const u = schoolPadApi.getUserDetails();
    if (u) {
      const rollMatch = u.feedName ? u.feedName.match(/\(([^)]+)\)/) : null;
      const studentName = u.name || 'Student';
      return {
        ...DEMO_PROFILE,
        studentName,
        firstName: studentName.split(' ')[0],
        rollNo: rollMatch ? rollMatch[1] : u.feedName || '',
        profilePhoto: u.photo || '',
      };
    }
    return {
      ...DEMO_PROFILE,
      studentName: 'Student',
      firstName: 'Student',
      rollNo: '',
      profilePhoto: '',
    };
  });
  const [attendanceData, setAttendanceData] = useState<OverallAttendance>(() => {
    const isDemo = localStorage.getItem('attendly_demo_mode') === 'true';
    return isDemo ? DEMO_ATTENDANCE : EMPTY_ATTENDANCE;
  });
  const [attendanceRegister, setAttendanceRegister] = useState<AttendanceRegister | null>(() => {
    const isDemo = localStorage.getItem('attendly_demo_mode') === 'true';
    return isDemo ? DEMO_ATTENDANCE_REGISTER : null;
  });
  const [timetableData, setTimetableData] = useState<TimetableSlot[]>(() => {
    const isDemo = localStorage.getItem('attendly_demo_mode') === 'true';
    return isDemo ? DEMO_TIMETABLE : [];
  });
  const [circulars, setCirculars] = useState<CircularItem[]>(() => {
    const isDemo = localStorage.getItem('attendly_demo_mode') === 'true';
    return isDemo ? DEMO_FEED : [];
  });
  const [reportCard, setReportCard] = useState<ReportCard | null>(() => {
    const loggedIn = localStorage.getItem('attendly_logged_in') === 'true';
    const isDemo = localStorage.getItem('attendly_demo_mode') === 'true';
    return loggedIn && isDemo ? DEMO_REPORT_CARD : null;
  });

  // What's New modal dismissed state
  const [whatsNewDismissed, setWhatsNewDismissed] = useState<boolean>(() => {
    return localStorage.getItem('attendly_whats_new_shown_v2.02-ota-test') === 'true';
  });

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('attendly_theme', theme);
  }, [theme]);

  // Sync browser popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setSchoolCode = (code: string) => {
    setSchoolCodeState(code);
    schoolPadApi.setSchoolCode(code);
    localStorage.setItem('attendly_school_code', code);
  };

  /**
   * Loads real student data from Chitkara University SchoolPad endpoints
   */
  const loadRealStudentData = useCallback(async () => {
    setIsLoadingData(true);
    setDataError(null);

    try {
      // Parallel fetch profile, attendance, register, timetable, feed, and report card
      const [profileRes, attendanceRes, registerRes, timetableRes, feedRes, reportRes] = await Promise.allSettled([
        schoolPadApi.getProfileDetails(),
        schoolPadApi.getAttendanceSubjectwise(),
        schoolPadApi.getAttendanceRegister(),
        schoolPadApi.getTimetable(),
        schoolPadApi.getFeed(0, 15),
        schoolPadApi.getReportCard(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setStudentProfile(profileRes.value);
      }
      if (attendanceRes.status === 'fulfilled' && attendanceRes.value) {
        setAttendanceData(attendanceRes.value);
      }
      if (registerRes.status === 'fulfilled' && registerRes.value) {
        setAttendanceRegister(registerRes.value);
      }
      if (timetableRes.status === 'fulfilled' && timetableRes.value.length > 0) {
        setTimetableData(timetableRes.value);
      }
      if (feedRes.status === 'fulfilled' && feedRes.value.length > 0) {
        setCirculars(feedRes.value);
      }
      if (reportRes.status === 'fulfilled' && reportRes.value) {
        setReportCard(reportRes.value);
      }
    } catch (err: any) {
      console.error('Error loading real student data:', err);
      setDataError('Could not sync all university data. Some records may be temporarily cached.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Fetch real data on initial load if logged in to a live university account
  useEffect(() => {
    if (isLoggedIn && !isDemoMode && schoolPadApi.isLoggedIn()) {
      loadRealStudentData();
    }
  }, [isLoggedIn, isDemoMode, loadRealStudentData]);

  // Separate Demo Mode activation
  const enableDemoMode = () => {
    schoolPadApi.logout();
    setIsLoggedIn(true);
    setIsDemoMode(true);
    setUserData(DEMO_USER_DATA);
    setStudentProfile(DEMO_PROFILE);
    setAttendanceData(DEMO_ATTENDANCE);
    setAttendanceRegister(DEMO_ATTENDANCE_REGISTER);
    setTimetableData(DEMO_TIMETABLE);
    setCirculars(DEMO_FEED);
    setReportCard(DEMO_REPORT_CARD);
    localStorage.setItem('attendly_logged_in', 'true');
    localStorage.setItem('attendly_demo_mode', 'true');
    navigate('/');
  };

  // Real Account Login
  const login = async (username: string, pass: string): Promise<LoginResult> => {
    if (!username.trim() || !pass.trim()) {
      return { success: false, error: 'Please enter both your Roll Number / Username and Password.' };
    }

    setDataError(null);
    schoolPadApi.setSchoolCode(schoolCode);

    const result = await schoolPadApi.login(username, pass);

    if (result.success && result.userData) {
      const u = result.userData;
      const rollMatch = u.feedName ? u.feedName.match(/\(([^)]+)\)/) : null;
      const studentName = u.name || 'Student';

      setIsLoggedIn(true);
      setIsDemoMode(false);
      setUserData(u);
      setStudentProfile(prev => ({
        ...prev,
        studentName,
        firstName: studentName.split(' ')[0],
        rollNo: rollMatch ? rollMatch[1] : u.feedName || prev.rollNo,
        profilePhoto: u.photo || prev.profilePhoto,
      }));
      localStorage.setItem('attendly_logged_in', 'true');
      localStorage.setItem('attendly_demo_mode', 'false');

      // Fetch real university records
      await loadRealStudentData();
      navigate('/');
      return { success: true };
    }

    // Never fallback to demo user on real login attempt
    return result;
  };

  const verifyOTP = async (authUserId: string, otpText: string): Promise<LoginResult> => {
    const result = await schoolPadApi.verifyOTP(authUserId, otpText);
    if (result.success && result.userData) {
      const u = result.userData;
      const rollMatch = u.feedName ? u.feedName.match(/\(([^)]+)\)/) : null;
      const studentName = u.name || 'Student';

      setIsLoggedIn(true);
      setIsDemoMode(false);
      setUserData(u);
      setStudentProfile(prev => ({
        ...prev,
        studentName,
        firstName: studentName.split(' ')[0],
        rollNo: rollMatch ? rollMatch[1] : u.feedName || prev.rollNo,
        profilePhoto: u.photo || prev.profilePhoto,
      }));
      localStorage.setItem('attendly_logged_in', 'true');
      localStorage.setItem('attendly_demo_mode', 'false');
      await loadRealStudentData();
      navigate('/');
    }
    return result;
  };

  const logout = () => {
    schoolPadApi.logout();
    setIsLoggedIn(false);
    setIsDemoMode(false);
    setUserData(null);
    setReportCard(null);
    setStudentProfile({
      ...DEMO_PROFILE,
      studentName: 'Student',
      firstName: 'Student',
      rollNo: '',
      profilePhoto: '',
    });
    setAttendanceData(EMPTY_ATTENDANCE);
    setAttendanceRegister(null);
    setTimetableData([]);
    setCirculars([]);
    localStorage.removeItem('attendly_logged_in');
    localStorage.removeItem('attendly_demo_mode');
    localStorage.removeItem('bunkwise_logged_in');
    localStorage.removeItem('bunkwise_demo_mode');
    navigate('/auth/get-started');
  };

  const refreshData = async () => {
    if (isLoggedIn && !isDemoMode) {
      await loadRealStudentData();
    }
  };

  const dismissWhatsNew = () => {
    setWhatsNewDismissed(true);
    localStorage.setItem('attendly_whats_new_shown_v2.02-ota-test', 'true');
  };

  const markCircularRead = (id: string) => {
    setCirculars(prev =>
      prev.map(item => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isLoggedIn,
        isDemoMode,
        isLoadingData,
        dataError,
        userData,
        studentProfile,
        attendanceData,
        attendanceRegister,
        timetableData,
        circulars,
        reportCard,
        currentRoute,
        navigate,
        enableDemoMode,
        login,
        verifyOTP,
        logout,
        refreshData,
        whatsNewDismissed,
        dismissWhatsNew,
        schoolCode,
        setSchoolCode,
        markCircularRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
