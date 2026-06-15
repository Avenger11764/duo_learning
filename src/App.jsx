import React, { useState, useEffect } from 'react';
import { 
  Trophy, BookOpen, Clock, Flame, Plus, Activity, 
  Target, CheckCircle, Heart, Sparkles, ArrowRight, 
  LayoutDashboard, LogOut, Settings, User, Trash2, 
  BarChart3, Save, X, Timer, Award, Play, Calendar,
  AlertCircle, RefreshCw, Eye, EyeOff, Loader2, Lock, Users, Menu
} from 'lucide-react';

// Import Firebase functions
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  updateDoc, addDoc, serverTimestamp, deleteDoc, getDocs 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';

// --- 1. FIREBASE CONFIGURATION ---
// LOGIC: Use environment config if running in Canvas (Preview), otherwise use YOUR keys (Local/Netlify)
const isCanvasEnvironment = typeof __firebase_config !== 'undefined';

const firebaseConfig = isCanvasEnvironment ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyDvvWIlS54JDl_PaUPkzgIQ1d8Aag3iiGY",
  authDomain: "learning-duo-54c74.firebaseapp.com",
  projectId: "learning-duo-54c74",
  storageBucket: "learning-duo-54c74.firebasestorage.app",
  messagingSenderId: "884812152535",
  appId: "1:884812152535:web:d32e71af9f4ff447537a92",
  measurementId: "G-TP8LKFYG39"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Badges Configuration ---
const BADGES = [
  { id: 'b1', name: 'First Steps', icon: '🌱', desc: 'Logged your first session', condition: (u) => u.xp > 0 },
  { id: 'b2', name: 'On Fire', icon: '🔥', desc: 'Reached a 3-day streak', condition: (u) => u.streak >= 3 },
  { id: 'b3', name: 'Deep Diver', icon: '🤿', desc: 'Logged a session over 60m', condition: (u, lastSession) => lastSession && lastSession.duration >= 60 },
  { id: 'b4', name: 'Scholar', icon: '🎓', desc: 'Reached Level 5', condition: (u) => u.level >= 5 },
  { id: 'b5', name: 'Night Owl', icon: '🦉', desc: 'Studied after 10 PM', condition: (u, lastSession) => {
      if (!lastSession) return false;
      const hour = new Date().getHours();
      return hour >= 22 || hour < 4; 
  }},
  { id: 'b6', name: 'Elite Scholar', icon: '👑', desc: 'Reached Level 10', condition: (u) => u.level >= 10 },
  { id: 'b7', name: 'Streak Master', icon: '⚡', desc: 'Reached a 7-day streak', condition: (u) => u.streak >= 7 },
  { id: 'b8', name: 'Century Club', icon: '💯', desc: 'Accumulated over 1,000 XP', condition: (u) => u.xp >= 1000 },
  { id: 'b9', name: 'Hyper Focused', icon: '🧘', desc: 'Logged a session over 30m', condition: (u, lastSession) => lastSession && lastSession.duration >= 30 },
  { id: 'b10', name: 'Early Bird', icon: '🌅', desc: 'Studied between 5 AM and 9 AM', condition: (u, lastSession) => {
      if (!lastSession) return false;
      const hour = new Date().getHours();
      return hour >= 5 && hour < 9;
  }},
  { id: 'b11', name: 'Course Explorer', icon: '🧭', desc: 'Enrolled in at least one course', condition: (u) => u.enrolledCourses && Object.keys(u.enrolledCourses).length >= 1 },
  { id: 'b12', name: 'Syllabus Master', icon: '📚', desc: 'Cleared at least 3 topics', condition: (u) => u.enrolledCourses && Object.values(u.enrolledCourses).some(c => c.clearedTopics && c.clearedTopics.length >= 3) },
  { id: 'b13', name: 'Academic Graduate', icon: '🏆', desc: 'Fully cleared at least one blueprint course', condition: (u) => u.enrolledCourses && Object.values(u.enrolledCourses).some(c => c.clearedTopics && c.clearedTopics.length >= 5) },
];

// --- Default Data for New Setup ---
const DEFAULT_USERS = {
  user1: {
    id: 'user1',
    name: 'Alex Rivera',
    role: 'Web Developer',
    avatar: '👨‍💻',
    level: 1,
    xp: 0,
    maxXp: 500,
    streak: 0,
    lastStudyDate: null,
    badges: [],
    focusStatus: { isActive: false, endTime: null, subject: '' },
    subjects: [
      { id: 's1', name: 'Python', color: 'bg-secondary', progress: 0 },
      { id: 's2', name: 'React', color: 'bg-primary', progress: 0 }
    ],
    goals: [
      { id: 'g1', text: 'Build a Portfolio', completed: false }
    ]
  }
};

// --- Helper Components ---
const ProgressBar = ({ current, max, color = 'bg-secondary', height = 'h-2' }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className={`w-full ${height} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
      <div className={`${height} ${color} transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const Avatar = ({ icon, size = 'text-lg', bg = 'bg-slate-100', className = '' }) => (
  <div className={`w-12 h-12 ${bg} dark:bg-slate-700 rounded-full flex items-center justify-center ${size} shadow-sm border border-slate-200 dark:border-slate-600 ${className}`}>
    {icon}
  </div>
);

const CalendarHeatmap = ({ user, feed }) => {
  const today = new Date();
  const dates = [];
  for (let i = 140; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    dates.push(d);
  }

  const activityMap = {};
  const userLogs = feed.filter(f => f.userId === user.id);
  
  userLogs.forEach(log => {
    let dateStr;
    if (log.timestamp?.toDate) {
       dateStr = log.timestamp.toDate().toDateString();
    } else if (log.timestamp) {
       dateStr = new Date(log.timestamp).toDateString();
    } else return;
    
    if (!activityMap[dateStr]) activityMap[dateStr] = 0;
    activityMap[dateStr] += (log.duration || 0);
  });

  const getColor = (minutes) => {
    if (!minutes) return 'bg-surface-container-high';
    if (minutes < 30) return 'bg-secondary/30';
    if (minutes < 60) return 'bg-secondary/60';
    return 'bg-secondary';
  };

  return (
    <div className="p-card-padding rounded-lg glass-card text-on-surface">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold text-on-surface">Learning Momentum</h4>
        <div className="flex items-center gap-4 text-[12px] text-outline">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-surface-container-high"></div>
            <div className="w-3 h-3 rounded-sm bg-secondary/30"></div>
            <div className="w-3 h-3 rounded-sm bg-secondary/60"></div>
            <div className="w-3 h-3 rounded-sm bg-secondary"></div>
          </div>
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex flex-wrap gap-1 min-w-[800px]">
          {dates.map((date, idx) => {
            const dateStr = date.toDateString();
            return (
              <div key={idx} title={`${dateStr}: ${activityMap[dateStr] || 0} mins`}
                className={`w-3 h-3 rounded-sm ${getColor(activityMap[dateStr])} transition-all hover:scale-125 cursor-default`}
              ></div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Helper for calculating streaks ---
const calculateStreak = (currentStreak, lastDateStr) => {
  if (!lastDateStr) return 1;
  const lastDate = new Date(lastDateStr);
  const today = new Date();
  lastDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = Math.abs(today - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  if (diffDays === 0) return currentStreak;
  if (diffDays === 1) return currentStreak + 1;
  return 1;
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-l-4 border-red-500">
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-4 text-sm">The app crashed due to an unexpected error.</p>
            <div className="bg-slate-100 p-3 rounded mb-6 text-xs font-mono text-red-600 overflow-auto max-h-32">
              {this.state.error ? this.state.error.toString() : ""}
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold border-none cursor-pointer">
              Reset Local Data & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children; 
  }
}



const getCollectionPath = (collectionName) => {
  if (isCanvasEnvironment) {
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
  }
  return collection(db, collectionName);
};

const getDocRef = (collectionName, docId) => {
  if (isCanvasEnvironment) {
    return doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId);
  }
  return doc(db, collectionName, docId);
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setAuthUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('duo_current_user_id'));
  const [usersMap, setUsersMap] = useState({});
  const [feedData, setFeedData] = useState([]);
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [spyTargetId, setSpyTargetId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customCourses, setCustomCourses] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth().catch(err => setError("Auth Failed: " + err.message));
    return onAuthStateChanged(auth, setAuthUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubUsers = onSnapshot(getCollectionPath('duo_users'), (snap) => {
      const users = {};
      snap.forEach(doc => users[doc.id] = { id: doc.id, ...doc.data() });
      
      setUsersMap(users);
      setLoading(false);
    }, (err) => setError("DB Error: " + err.message));

    const unsubLogs = onSnapshot(getCollectionPath('duo_logs'), (snap) => {
      const logs = [];
      snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
      logs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setFeedData(logs);
    });

    const unsubCourses = onSnapshot(getCollectionPath('duo_courses'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setCustomCourses(list);
    }, (err) => console.error("Courses DB Error: ", err));

    return () => { unsubUsers(); unsubLogs(); unsubCourses(); };
  }, [user]);

  const seedDatabase = async () => {
    try {
      await setDoc(getDocRef('duo_users', 'user1'), DEFAULT_USERS.user1);
    } catch (e) { console.error("Seeding failed", e); }
  };

  const handleLogin = (id) => {
    setCurrentUserId(id);
    localStorage.setItem('duo_current_user_id', id);
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem('duo_current_user_id');
    setSpyTargetId(null);
    setView('landing');
  };

  const resetDatabase = async () => {
    const password = prompt("Enter admin password to reset database:");
    if(password !== "admin123") return password !== null && alert("Incorrect.");
    
    if(!confirm("Are you sure? This will delete ALL users and logs permanently.")) return;
    setIsSaving(true);
    try {
        const usersSnap = await getDocs(getCollectionPath('duo_users'));
        const logsSnap = await getDocs(getCollectionPath('duo_logs'));
        const promises = [];
        usersSnap.forEach(d => promises.push(deleteDoc(d.ref)));
        logsSnap.forEach(d => promises.push(deleteDoc(d.ref)));
        await Promise.all(promises);
        localStorage.clear();
        window.location.reload();
    } catch(e) {
        alert("Reset failed: " + e.message);
        setIsSaving(false);
    }
  };

  const handleSignup = async (name, role, subjects, password) => {
    if (!user) return alert("Connecting... wait a sec.");
    setIsSaving(true);
    try {
        const newId = 'user_' + Date.now();
        const newUser = {
          id: newId,
          name, role, subjects, password, 
          xp: 0, level: 1, maxXp: 500, streak: 0, lastStudyDate: null,
          badges: [], goals: [], avatar: '👤',
          focusStatus: { isActive: false, endTime: null, subject: '' }
        };
        await setDoc(getDocRef('duo_users', newId), newUser);
        handleLogin(newId);
    } catch (e) {
        alert("Signup failed: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!currentUserId) return;
    setIsSaving(true);
    try { 
      await updateDoc(getDocRef('duo_users', currentUserId), updates); 
    } 
    catch (e) { 
      alert("Update failed: " + e.message); 
    } 
    finally { 
      setIsSaving(false); 
    }
  };

  const addSubject = async (subjectName) => {
    const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
    if (!user || !myself || !subjectName) return;
    const colors = ['bg-secondary', 'bg-primary', 'bg-orange-500', 'bg-teal-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newSubject = { id: 's' + Date.now(), name: subjectName, color: randomColor, progress: 0 };
    await updateDoc(getDocRef('duo_users', currentUserId), { subjects: [...(myself.subjects || []), newSubject] });
  };

  const deleteSubject = async (subjectId) => {
    const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
    if (!user || !myself) return;
    await updateDoc(getDocRef('duo_users', currentUserId), { subjects: myself.subjects.filter(s => s.id !== subjectId) });
  };

  const toggleGoal = async (goalId) => {
    const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
    if (!user || !myself) return;
    const updatedGoals = myself.goals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
    await updateDoc(getDocRef('duo_users', currentUserId), { goals: updatedGoals });
  };

  const addGoal = async (text) => {
     const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
     if (!user || !myself || !text) return;
     const newGoal = { id: Date.now().toString(), text, completed: false };
     await updateDoc(getDocRef('duo_users', currentUserId), { goals: [...(myself.goals || []), newGoal] });
  };

  const enrollCourse = async (courseId, type = 'full', topicId = null) => {
    const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
    if (!user || !myself) return;
    const enrolledCourses = myself.enrolledCourses || {};
    const courseProgress = enrolledCourses[courseId] || { enrolledAt: new Date().toISOString(), type: 'section', clearedTopics: [], enrolledSections: [] };
    
    if (type === 'full') {
      courseProgress.type = 'full';
    } else if (type === 'section' && topicId) {
      if (!courseProgress.enrolledSections) courseProgress.enrolledSections = [];
      if (!courseProgress.enrolledSections.includes(topicId)) {
        courseProgress.enrolledSections.push(topicId);
      }
    }
    
    enrolledCourses[courseId] = courseProgress;
    await updateDoc(getDocRef('duo_users', currentUserId), { enrolledCourses });
  };

  const clearTopic = async (courseId, topicId) => {
    const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
    if (!user || !myself) return;
    const enrolledCourses = myself.enrolledCourses || {};
    const courseProgress = enrolledCourses[courseId] || { clearedTopics: [] };
    if (courseProgress.clearedTopics.includes(topicId)) return;

    const updatedClearedTopics = [...courseProgress.clearedTopics, topicId];
    enrolledCourses[courseId] = { ...courseProgress, clearedTopics: updatedClearedTopics };

    const xpGained = 100;
    let newXp = (myself.xp || 0) + xpGained;
    let newLevel = myself.level || 1;
    let newMaxXp = myself.maxXp || 500;
    let leveledUp = false;

    if (newXp >= newMaxXp) {
      newXp -= newMaxXp;
      newLevel += 1;
      newMaxXp = Math.floor(newMaxXp * 1.5);
      leveledUp = true;
    }

    const earnedBadges = [...(myself.badges || [])];
    const newSession = { duration: 15, timestamp: new Date().toISOString() };
    BADGES.forEach(b => {
      if (!earnedBadges.includes(b.id) && b.condition({ ...myself, xp: newXp, level: newLevel, streak: myself.streak || 0 }, newSession)) {
        earnedBadges.push(b.id);
        setUnlockedBadge(b);
      }
    });

    await updateDoc(getDocRef('duo_users', currentUserId), {
      enrolledCourses,
      xp: newXp,
      level: newLevel,
      maxXp: newMaxXp,
      badges: earnedBadges
    });

    if (leveledUp) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    const allCoursesMap = { ...COURSES_DATA };
    customCourses.forEach(c => {
      allCoursesMap[c.id] = c;
    });
    const selectedCourseObj = allCoursesMap[courseId];
    const subjectName = selectedCourseObj?.title || (courseId === 'dsa' ? 'Data Structures' : 'Full Stack');
    const topicName = selectedCourseObj?.topics?.find(t => t.id === topicId)?.name || topicId;

    await addDoc(getCollectionPath('duo_logs'), {
      userId: currentUserId,
      userName: myself.name,
      userAvatar: myself.avatar || '👤',
      action: 'completed topic',
      subject: subjectName,
      topicName: topicName,
      duration: 15,
      note: `Cleared the topic "${topicName}" in ${subjectName}!`,
      likes: 0,
      timestamp: serverTimestamp()
    });
  };

  const createCustomCourse = async (title, desc, topicsList) => {
    const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
    if (!user || !myself) return;
    setIsSaving(true);
    try {
      const newCourseId = 'custom_' + Date.now();
      const newCourse = {
        id: newCourseId,
        title,
        desc,
        color: 'from-slate-700 to-slate-800',
        icon: 'menu_book',
        creatorId: currentUserId,
        creatorName: myself.name,
        topics: topicsList.map((t, idx) => ({
          id: 'topic_' + idx + '_' + Date.now(),
          name: t.name,
          subtopics: t.subtopics,
          quizzes: Array.from({ length: Math.max(10, t.subtopics.length) }).map((_, qIdx) => {
            const sub = t.subtopics[qIdx % t.subtopics.length] || t.name;
            const levels = ['Easy', 'Medium', 'Hard'];
            const level = levels[qIdx % 3];
            return {
              q: `Question ${qIdx + 1} on "${sub}": Which of the following is most critical for its correct implementation?`,
              a: [
                `Proper optimization and configuration of "${sub}"`,
                `Skipping the design phase of "${sub}"`,
                `Using standard defaults without analyzing constraints`,
                `None of the above`
              ],
              c: 0,
              level: level
            };
          })
        }))
      };
      await setDoc(getDocRef('duo_courses', newCourseId), newCourse);
    } catch (e) {
      alert("Failed to create course: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const setFocusStatus = async (isActive, minutes = 0, subject = '') => {
    if (!user || !currentUserId) return;
    const endTime = isActive && minutes > 0 ? Date.now() + (minutes * 60 * 1000) : null;
    await updateDoc(getDocRef('duo_users', currentUserId), { focusStatus: { isActive, endTime, subject } });
  };

  const addLog = async (subject, duration, note) => {
    const myself = currentUserId ? usersMap[currentUserId] : { name: 'Guest', avatar: '👤', enrolledCourses: {} };
    if (!myself) return;
    setIsSaving(true);

    try {
        const xpGained = parseInt(duration) * 2;
        let newXp = (myself.xp || 0) + xpGained;
        let newLevel = myself.level || 1;
        let newMaxXp = myself.maxXp || 500;

        if (newXp >= newMaxXp) {
          newXp -= newMaxXp;
          newLevel += 1;
          newMaxXp = Math.floor(newMaxXp * 1.2);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }

        const newStreak = calculateStreak(myself.streak || 0, myself.lastStudyDate);
        const currentBadges = myself.badges || [];
        const earnedBadges = [...currentBadges];
        let newlyUnlocked = null;
        
        BADGES.forEach(badge => {
            if (!earnedBadges.includes(badge.id)) {
                if (badge.condition({ ...myself, xp: myself.xp + xpGained, level: newLevel, streak: newStreak }, { duration })) {
                    earnedBadges.push(badge.id);
                    newlyUnlocked = badge;
                }
            }
        });

        if (newlyUnlocked) {
            setUnlockedBadge(newlyUnlocked);
            setTimeout(() => setUnlockedBadge(null), 4000);
        }

        await updateDoc(getDocRef('duo_users', currentUserId), {
          xp: newXp, level: newLevel, maxXp: newMaxXp, streak: newStreak,
          lastStudyDate: new Date().toISOString(), badges: earnedBadges,
          subjects: myself.subjects?.map(s => s.id === subject.id ? { ...s, progress: Math.min(100, (s.progress || 0) + 10) } : s)
        });

        await addDoc(getCollectionPath('duo_logs'), {
          userId: currentUserId, userName: myself.name, userAvatar: myself.avatar || '👤',
          action: 'studied', subject: subject.name, duration: parseInt(duration), note, likes: 0,
          timestamp: serverTimestamp()
        });
        
        setIsLogModalOpen(false);
    } catch (e) {
        alert("Log failed: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const myself = currentUserId ? (usersMap[currentUserId] || { name: 'Guest', avatar: '👤', enrolledCourses: {}, streak: 0 }) : { name: 'Guest', avatar: '👤', enrolledCourses: {}, streak: 0 };
  const otherUsers = Object.values(usersMap).filter(u => u.id !== currentUserId);
  const isSpying = !!spyTargetId;
  const displayUser = isSpying ? usersMap[spyTargetId] : myself;
  if (isSpying && !displayUser) setSpyTargetId(null);

  if (error) return <ErrorScreen error={error} />;
  if (loading) return <LoadingScreen />;

  if (view === 'landing') {
    return <LandingPageView setView={setView} currentUserId={currentUserId} myself={myself} />;
  }

  if (view === 'explore_courses') {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-secondary-container flex flex-col">
        {/* Top Header */}
        <header className="bg-surface-container-lowest border-b border-outline-variant w-full">
          <nav className="flex justify-between items-center px-4 md:px-margin-desktop py-4 w-full max-w-screen-2xl mx-auto">
            <button 
              onClick={() => setView('landing')} 
              className="text-headline-md font-headline-md font-bold text-primary bg-transparent border-none cursor-pointer hover:opacity-85 text-left p-0"
            >
              DuoLearning
            </button>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { if (currentUserId) setView('dashboard'); else setView('login'); }} 
                className="font-label-md text-label-md text-on-surface-variant px-4 py-2 hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
              >
                Log In
              </button>
              <button 
                onClick={() => { if (currentUserId) setView('dashboard'); else setView('login'); }} 
                className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:opacity-90 active:scale-95 transition-all border-none cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </nav>
        </header>

        {/* Standalone Courses Content */}
        <main className="flex-1 max-w-[1200px] mx-auto w-full py-12 px-6">
          <CoursesView 
            user={null}
            onEnroll={() => setView('login')}
            onClearTopic={() => setView('login')}
            customCourses={customCourses}
            onCreateCustomCourse={() => setView('login')}
          />
        </main>

        {/* Footer */}
        <footer className="bg-surface-container-low border-t border-outline-variant py-8 mt-12 text-center text-xs text-on-surface-variant">
          <p>© 2024 DuoLearning Platform. Grounded education for modern minds.</p>
        </footer>
      </div>
    );
  }

  if (view === 'login' || !currentUserId || !usersMap[currentUserId]) {
    return <LoginScreen users={usersMap} onLogin={handleLogin} onSignup={handleSignup} isSaving={isSaving} setView={setView} />;
  }



  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-secondary-container">
      
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-6xl animate-bounce bg-white dark:bg-slate-800 p-12 rounded-3xl shadow-2xl border-4 border-indigo-500">🎉 LEVEL UP! 🎉</div>
        </div>
      )}

      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col h-screen fixed left-0 top-0 py-8 px-4 w-64 bg-white border-r border-outline-variant z-50 text-on-surface">
        <div className="mb-12 px-4 flex items-center gap-2">
          <button 
            onClick={() => { setView('landing'); setSpyTargetId(null); }} 
            className="font-headline-md text-primary font-bold bg-transparent border-none cursor-pointer hover:opacity-85 text-left p-0"
          >
            duo_learning
          </button>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => { setView('dashboard'); setSpyTargetId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-semibold cursor-pointer border-none ${view === 'dashboard' ? 'text-primary bg-primary/5 border-r-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'dashboard' ? "'FILL' 1" : undefined }}>dashboard</span>
            Dashboard
          </button>
          <button onClick={() => { setView('courses'); setSpyTargetId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-semibold cursor-pointer border-none ${view === 'courses' ? 'text-primary bg-primary/5 border-r-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'courses' ? "'FILL' 1" : undefined }}>school</span>
            Courses
          </button>
          <button onClick={() => { setView('focus'); setSpyTargetId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-semibold cursor-pointer border-none ${view === 'focus' ? 'text-primary bg-primary/5 border-r-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'focus' ? "'FILL' 1" : undefined }}>timer</span>
            Focus Timer
          </button>
          <button onClick={() => { setView('analytics'); setSpyTargetId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-semibold cursor-pointer border-none ${view === 'analytics' ? 'text-primary bg-primary/5 border-r-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'analytics' ? "'FILL' 1" : undefined }}>leaderboard</span>
            Leaderboard
          </button>
          <button onClick={() => { setView('goals'); setSpyTargetId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-semibold cursor-pointer border-none ${view === 'goals' ? 'text-primary bg-primary/5 border-r-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'goals' ? "'FILL' 1" : undefined }}>explore</span>
            Quests
          </button>
          <button onClick={() => { setView('settings'); setSpyTargetId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-semibold cursor-pointer border-none ${view === 'settings' ? 'text-primary bg-primary/5 border-r-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'settings' ? "'FILL' 1" : undefined }}>settings</span>
            Settings
          </button>
        </nav>
        <div className="mt-auto px-4">
          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant flex-shrink-0 flex items-center justify-center font-bold text-slate-800 bg-slate-200">
              {myself?.avatar || '👤'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-on-surface text-sm truncate">{myself?.name}</p>
              <p className="text-[10px] text-outline font-bold uppercase truncate">{myself?.role || 'PREMIUM MEMBER'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Content Shell --- */}
      <div className="md:ml-64 min-h-screen pb-24 md:pb-8 flex flex-col">
        <header className="fixed top-0 right-0 left-0 md:left-64 z-40 flex justify-between items-center px-4 md:px-margin-desktop h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant text-on-surface">
          <button 
            onClick={() => { setView('landing'); setSpyTargetId(null); }} 
            className="font-headline-md text-primary md:hidden font-bold bg-transparent border-none cursor-pointer hover:opacity-85 text-left p-0"
          >
            duo_learning
          </button>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-on-surface-variant font-medium">
              {isSpying ? `Viewing ${displayUser.name}` : `Welcome back, ${myself.name}!`}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {otherUsers.map(u => {
               const isFocusing = u.focusStatus?.isActive && u.focusStatus?.endTime && u.focusStatus.endTime > Date.now();
               if (!isFocusing) return null;
               return (
                 <div key={u.id} className="hidden lg:flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse border border-red-100">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                   {u.name} is studying {u.focusStatus.subject || ''} live!
                 </div>
               );
            })}

            <div className="hidden lg:flex items-center gap-1 text-secondary">
              <span className="material-symbols-outlined text-[20px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <span className="font-bold">{displayUser?.streak || 0}</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
              <span className="font-bold">{displayUser?.xp || 0}</span>
            </div>

            {otherUsers.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => isSpying ? setSpyTargetId(null) : (otherUsers.length === 1 ? setSpyTargetId(otherUsers[0].id) : setSpyTargetId(otherUsers[0].id))} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs border transition-all cursor-pointer ${isSpying ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                >
                  {isSpying ? <><ArrowRight size={12} /> Back to Me</> : <><Eye size={12} /> View Partner</>}
                </button>
              </div>
            )}

            {!isSpying && (
              <button onClick={() => setIsLogModalOpen(true)} className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none">
                <span className="material-symbols-outlined text-[16px]">add</span> Log Study
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 mt-20 px-4 md:px-margin-desktop max-w-[1400px] mx-auto w-full">
          <div>
            {view === 'dashboard' && (
              <DashboardView 
                displayUser={displayUser} 
                myself={myself} 
                isSpying={isSpying} 
                otherUsers={otherUsers} 
                feed={feedData} 
                setView={setView} 
                onSetSpyTarget={setSpyTargetId} 
                customCourses={customCourses}
              />
            )}
            {view === 'courses' && (
              <CoursesView 
                user={myself} 
                onEnroll={enrollCourse} 
                onClearTopic={clearTopic} 
                customCourses={customCourses}
                onCreateCustomCourse={createCustomCourse}
              />
            )}
            {view === 'focus' && !isSpying && (
              <FocusTimerView 
                user={myself} 
                onStatusChange={setFocusStatus} 
                onCompleteSession={(subject, duration) => { addLog(subject, duration, "Completed a Focus Session"); setView('dashboard'); }} 
              />
            )}
            {view === 'analytics' && (
              <AnalyticsView user={displayUser} feed={feedData} />
            )}
            {view === 'settings' && !isSpying && (
              <SettingsView 
                user={myself} 
                onUpdateProfile={updateProfile} 
                onAddSubject={addSubject} 
                onDeleteSubject={deleteSubject} 
                onLogout={handleLogout} 
                onReset={resetDatabase} 
              />
            )}
            {view === 'goals' && (
              <GoalsView 
                user={displayUser} 
                canEdit={!isSpying} 
                toggleGoal={toggleGoal} 
                addGoal={addGoal} 
              />
            )}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-safe pt-2 bg-surface border-t border-outline-variant shadow-lg text-on-surface">
        <button onClick={() => { setView('dashboard'); setSpyTargetId(null); }} className={`flex flex-col items-center justify-center p-2 w-16 cursor-pointer border-none bg-transparent transition-colors ${view === 'dashboard' ? 'text-primary font-bold' : 'text-outline hover:text-primary'}`}>
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] font-bold uppercase mt-1">Home</span>
        </button>
        <button onClick={() => { setView('courses'); setSpyTargetId(null); }} className={`flex flex-col items-center justify-center p-2 w-16 cursor-pointer border-none bg-transparent transition-colors ${view === 'courses' ? 'text-primary font-bold' : 'text-outline hover:text-primary'}`}>
          <span className="material-symbols-outlined">school</span>
          <span className="text-[10px] font-bold uppercase mt-1">Courses</span>
        </button>
        <button onClick={() => { setView('focus'); setSpyTargetId(null); }} className={`flex flex-col items-center justify-center p-2 w-16 cursor-pointer border-none bg-transparent transition-colors ${view === 'focus' ? 'text-primary font-bold' : 'text-outline hover:text-primary'}`}>
          <span className="material-symbols-outlined">timer</span>
          <span className="text-[10px] font-bold uppercase mt-1">Focus</span>
        </button>
        <button onClick={() => { setView('analytics'); setSpyTargetId(null); }} className={`flex flex-col items-center justify-center p-2 w-16 cursor-pointer border-none bg-transparent transition-colors ${view === 'analytics' ? 'text-primary font-bold' : 'text-outline hover:text-primary'}`}>
          <span className="material-symbols-outlined">groups</span>
          <span className="text-[10px] font-bold uppercase mt-1">Social</span>
        </button>
        <button onClick={() => { setView('settings'); setSpyTargetId(null); }} className={`flex flex-col items-center justify-center p-2 w-16 cursor-pointer border-none bg-transparent transition-colors ${view === 'settings' ? 'text-primary font-bold' : 'text-outline hover:text-primary'}`}>
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold uppercase mt-1">Profile</span>
        </button>
      </nav>

      {isLogModalOpen && myself && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
             <div className="p-6"><LogSessionView user={myself} onCancel={() => setIsLogModalOpen(false)} onSubmit={addLog} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Views ---
function DashboardView({ displayUser, myself, isSpying, otherUsers, feed, setView, onSetSpyTarget, customCourses = [] }) {
  const allCourses = React.useMemo(() => {
    const map = { ...COURSES_DATA };
    customCourses.forEach(c => {
      map[c.id] = c;
    });
    return map;
  }, [customCourses]);
  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (new Date() - date) / 1000 / 60;
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  const heatmapSquares = React.useMemo(() => {
    const squares = [];
    let seed = 123;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    for(let i = 0; i < 180; i++) {
        const rand = random();
        let colorClass = 'bg-secondary';
        if(rand < 0.3) colorClass = 'bg-surface-container-high';
        else if(rand < 0.6) colorClass = 'bg-secondary/30';
        else if(rand < 0.8) colorClass = 'bg-secondary/60';
        squares.push(colorClass);
    }
    return squares;
  }, []);

  const pathInfo = React.useMemo(() => {
    const enrolledCourses = displayUser?.enrolledCourses || {};
    const courses = Object.keys(enrolledCourses);
    
    if (isSpying) {
      return {
        title: `${displayUser.name}'s Dashboard`,
        desc: `Check out ${displayUser.name}'s active goals, subjects log, and consistency heatmap.`,
        percent: 0,
        buttonText: "",
        onClick: () => {}
      };
    }

    if (courses.length === 0) {
      return {
        title: "Welcome! Start your study path",
        desc: "You are not enrolled in any blueprints yet. Open the Courses tab to enroll and start learning DSA or Full Stack Web Development!",
        percent: 0,
        buttonText: "Explore Courses",
        onClick: () => setView('courses')
      };
    }

    const courseId = courses[0];
    const course = allCourses[courseId];
    if (!course) {
      return {
        title: "Welcome! Start your study path",
        desc: "Open the Courses tab to enroll and start learning DSA or Full Stack Web Development!",
        percent: 0,
        buttonText: "Explore Courses",
        onClick: () => setView('courses')
      };
    }

    const cleared = enrolledCourses[courseId].clearedTopics || [];
    const total = course.topics.length;
    const percent = Math.round((cleared.length / total) * 100);
    const nextTopicIndex = cleared.length;
    const nextTopic = nextTopicIndex < total ? course.topics[nextTopicIndex] : null;

    return {
      title: `Resume: ${course.title}`,
      desc: nextTopic 
        ? `Up Next: Topic ${nextTopicIndex + 1} - ${nextTopic.name}. Complete subtopics and pass the quiz to unlock the next level!` 
        : `Congratulations! You have completed all topics in this blueprint!`,
      percent: percent,
      buttonText: nextTopic ? "Resume Blueprint" : "Review Blueprint",
      onClick: () => setView('courses')
    };
  }, [displayUser, isSpying]);

  const dashOffset = 251.2 - (251.2 * pathInfo.percent) / 100;

  const globalRank = React.useMemo(() => {
    const allUsers = [myself, ...otherUsers];
    allUsers.sort((a, b) => {
      if ((b.level || 1) !== (a.level || 1)) {
        return (b.level || 1) - (a.level || 1);
      }
      return (b.xp || 0) - (a.xp || 0);
    });
    const rank = allUsers.findIndex(u => u.id === displayUser?.id) + 1;
    return rank > 0 ? `#${rank}` : '#1';
  }, [myself, otherUsers, displayUser]);

  const userLessonsCount = React.useMemo(() => {
    return feed.filter(f => f.userId === displayUser?.id).length;
  }, [feed, displayUser]);

  const xpPercentage = Math.round(((displayUser?.xp || 0) / (displayUser?.maxXp || 500)) * 100);

  return (
    <div className="bento-grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 animate-fadeIn text-on-surface">
      <div className="col-span-full lg:col-span-8 p-card-padding rounded-lg glass-card flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group min-h-[300px]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary/5 blur-[80px] rounded-full group-hover:bg-secondary/10 transition-colors duration-700"></div>
        <div className="relative z-10 flex-1">
          <span className="px-3 py-1 bg-secondary/10 text-secondary font-bold text-[10px] rounded-full inline-block mb-4">
            {isSpying ? `VIEWING PROFILE` : `CONTINUE PATH`}
          </span>
          <h3 className="font-headline-lg text-on-surface mb-2">
            {pathInfo.title}
          </h3>
          <p className="text-on-surface-variant mb-8 max-w-md">
            {pathInfo.desc}
          </p>
          {!isSpying && pathInfo.buttonText && (
            <button onClick={pathInfo.onClick} className="px-8 py-3 bg-primary text-on-primary font-bold rounded flex items-center gap-2 hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all border-none cursor-pointer">
              {pathInfo.buttonText} <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            </button>
          )}
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center p-4">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-surface-container-high" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
              <circle className="text-secondary progress-ring-circle" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset={dashOffset} strokeLinecap="round" strokeWidth="8"></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-stat-huge text-on-surface">{pathInfo.percent}%</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">COMPLETE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-full sm:col-span-2 md:col-span-2 lg:col-span-4 p-card-padding rounded-lg glass-card flex flex-col items-center justify-center text-center group">
        <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
          <span className="material-symbols-outlined text-[48px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        </div>
        <h4 className="font-headline-md text-on-surface mb-1">{displayUser?.streak || 0} Day Streak!</h4>
        <p className="text-on-surface-variant text-sm">
          {displayUser?.streak > 0 
            ? `Fantastic progress! Keep study logs active daily to build your consistency record.` 
            : `No study sessions recorded recently. Start learning today to begin a streak!`
          }
        </p>
        <div className="mt-6 flex gap-2 w-full max-w-[200px]">
          <div className="flex-1 h-2 rounded-full bg-secondary"></div>
          <div className="flex-1 h-2 rounded-full bg-secondary"></div>
          <div className="flex-1 h-2 rounded-full bg-secondary"></div>
          <div className="flex-1 h-2 rounded-full bg-surface-container-high"></div>
          <div className="flex-1 h-2 rounded-full bg-surface-container-high"></div>
        </div>
      </div>

      <div className="col-span-full sm:col-span-1 md:col-span-1 lg:col-span-3 p-card-padding rounded-lg glass-card">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-primary/10 rounded">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </div>
          <span className="text-secondary font-bold text-[12px] flex items-center gap-1">{xpPercentage}% to Lvl {(displayUser?.level || 1) + 1}</span>
        </div>
        <p className="text-outline font-bold text-[10px] uppercase mb-1">TOTAL XP</p>
        <p className="font-stat-huge text-on-surface">{(displayUser?.xp || 0).toLocaleString()}</p>
      </div>

      <div className="col-span-full sm:col-span-1 md:col-span-1 lg:col-span-3 p-card-padding rounded-lg glass-card">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-secondary/10 rounded">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          </div>
          <span className="text-secondary font-bold text-[12px] flex items-center gap-1">Level {displayUser?.level || 1}</span>
        </div>
        <p className="text-outline font-bold text-[10px] uppercase mb-1">GLOBAL RANK</p>
        <p className="font-stat-huge text-on-surface">{globalRank}</p>
      </div>

      <div className="col-span-full sm:col-span-1 md:col-span-1 lg:col-span-3 p-card-padding rounded-lg glass-card">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-surface-container-highest rounded">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
          </div>
          <span className="text-outline font-bold text-[10px] uppercase">All Time</span>
        </div>
        <p className="text-outline font-bold text-[10px] uppercase mb-1">LESSONS</p>
        <p className="font-stat-huge text-on-surface">
          {userLessonsCount}
        </p>
      </div>

      <div className="col-span-full lg:col-span-4 p-card-padding rounded-lg glass-card flex flex-col justify-between">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-bold text-on-surface">Live Friends</h4>
          <span className="text-xs bg-secondary/10 text-secondary font-bold px-2 py-0.5 rounded-full">{otherUsers.length} active</span>
        </div>
        <div className="space-y-4 flex-1">
          {otherUsers.map(u => {
            const isFocusing = u.focusStatus?.isActive && u.focusStatus?.endTime && u.focusStatus.endTime > Date.now();
            return (
              <div key={u.id} className="flex items-center justify-between p-3 bg-surface-container border border-outline-variant/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-800 text-sm relative">
                    {u.avatar || '👤'}
                    {isFocusing && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-ping" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface leading-tight">{u.name}</p>
                    <p className="text-[10px] text-outline font-semibold">
                      {isFocusing ? `Studying ${u.focusStatus.subject || ''}` : `Lvl ${u.level} • ${u.xp} XP`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onSetSpyTarget(u.id)} 
                  className="px-2.5 py-1 text-[11px] bg-white border border-outline-variant rounded font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  View
                </button>
              </div>
            );
          })}
          {otherUsers.length === 0 && (
            <p className="text-sm text-outline italic py-4 text-center">No other profiles created yet.</p>
          )}
        </div>
      </div>

      <div className="col-span-full lg:col-span-8 p-card-padding rounded-lg glass-card flex flex-col justify-between">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-bold text-on-surface">Recent Activity</h4>
          <button onClick={() => setView('analytics')} className="text-secondary font-bold text-[12px] hover:underline bg-transparent border-none cursor-pointer">View All</button>
        </div>
        <div className="space-y-4 flex-1">
          {feed.filter(f => f.userId === displayUser.id).length > 0 ? (
            feed.filter(f => f.userId === displayUser.id).slice(0, 2).map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded bg-surface-container border border-outline-variant/50">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-sm text-on-surface truncate">{item.subject}</p>
                  <p className="text-[12px] text-outline">
                    {formatTime(item.timestamp)} • +{item.duration * 2} XP
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-outline italic">No activity recorded yet.</p>
          )}
        </div>
      </div>

      <div className="col-span-full lg:col-span-12">
        <CalendarHeatmap user={displayUser} feed={feed} />
      </div>
    </div>
  );
}

function FocusTimerView({ user, onStatusChange, onCompleteSession }) {
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [subject, setSubject] = useState(user.subjects?.[0] || { name: 'Python' });
  
  useEffect(() => {
    if (!isActive) setTimeLeft(duration * 60);
  }, [duration]);

  useEffect(() => {
    let int;
    if (isActive && timeLeft > 0) int = setInterval(() => setTimeLeft(t => t - 1), 1000);
    else if (timeLeft === 0 && isActive) { 
        handleStop(); 
        onCompleteSession(subject, duration); 
        setTimeLeft(duration * 60); 
    }
    return () => clearInterval(int);
  }, [isActive, timeLeft]);

  const toggle = () => {
    if(!isActive) { 
        setIsActive(true); 
        onStatusChange(true, duration, subject.name);
    } else { 
        setIsActive(false); 
        onStatusChange(false); 
    }
  };

  const handleStop = () => {
      setIsActive(false);
      onStatusChange(false);
  };

  const handleFinishEarly = () => {
    handleStop();
    const elapsed = duration - Math.ceil(timeLeft/60);
    onCompleteSession(subject, elapsed > 0 ? elapsed : 1);
    setTimeLeft(duration * 60); 
  };

  return (
    <div className="max-w-md mx-auto text-center py-10 animate-fadeIn text-on-surface">
      <div className={`w-64 h-64 mx-auto rounded-full border-8 flex items-center justify-center mb-8 transition-colors ${isActive ? 'border-secondary bg-secondary/10' : 'border-outline-variant'}`}>
        <div className="text-5xl font-mono font-bold text-on-surface">{Math.floor(timeLeft/60).toString().padStart(2,'0')}:{(timeLeft%60).toString().padStart(2,'0')}</div>
      </div>
      {!isActive ? (
        <div className="space-y-6">
          <div className="flex gap-2 justify-center flex-wrap">
            {user.subjects?.map(s => (
              <button 
                key={s.id} 
                onClick={() => setSubject(s)} 
                className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-colors ${subject.id === s.id ? 'bg-secondary/15 border-secondary text-secondary' : 'border-outline text-outline hover:text-primary'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="max-w-xs mx-auto">
             <div className="flex justify-between mb-2 text-sm font-bold text-outline uppercase"><span>Duration</span><span className="text-secondary">{Math.floor(duration / 60)}h {duration % 60}m</span></div>
             <input type="range" min="5" max="720" step="5" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-secondary"/>
          </div>
          <button onClick={toggle} className="bg-primary text-white px-8 py-3 rounded font-bold shadow-lg hover:scale-105 transition-transform border-none cursor-pointer">Start Focus</button>
        </div>
      ) : (
        <div className="flex gap-4 justify-center">
          <button onClick={toggle} className="bg-white border border-outline-variant text-on-surface px-6 py-3 rounded font-bold cursor-pointer hover:bg-surface-container">Pause</button>
          <button onClick={handleFinishEarly} className="bg-secondary text-white px-6 py-3 rounded font-bold cursor-pointer hover:opacity-90 border-none">Finish Early</button>
        </div>
      )}
    </div>
  );
}

function AnalyticsView({ user, feed }) {
  const userLogs = feed.filter(f => f.userId === user.id);
  const totalMinutes = userLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  return (
    <div className="animate-fadeIn max-w-4xl space-y-8 text-on-surface">
      <div>
        <h2 className="text-2xl font-bold mb-1">Analytics</h2>
        <p className="text-on-surface-variant">Consistency breakdown and badges for {user.name}.</p>
      </div>
      <CalendarHeatmap user={user} feed={feed} />
      <div className="bg-gradient-to-br from-secondary to-primary rounded-lg p-card-padding text-white shadow-md">
         <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-amber-300" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span> Badges Unlocked</h3>
         <div className="flex gap-4 flex-wrap">
           {BADGES.map(b => (
             <div key={b.id} className={`flex flex-col items-center p-3 rounded-lg ${user.badges?.includes(b.id) ? 'bg-white/10' : 'opacity-40 grayscale'}`}>
               <div className="text-3xl mb-2">{b.icon}</div>
               <span className="text-xs font-bold">{b.name}</span>
             </div>
           ))}
         </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-lg text-on-surface"><p className="text-xs font-bold text-outline uppercase">Total Hours</p><p className="text-2xl font-bold">{(totalMinutes/60).toFixed(1)}</p></div>
        <div className="glass-card p-6 rounded-lg text-on-surface"><p className="text-xs font-bold text-outline uppercase">Sessions</p><p className="text-2xl font-bold">{userLogs.length}</p></div>
        <div className="glass-card p-6 rounded-lg text-on-surface"><p className="text-xs font-bold text-outline uppercase">Streak</p><p className="text-2xl font-bold">{user.streak || 0}</p></div>
      </div>
    </div>
  );
}

function SettingsView({ user, onUpdateProfile, onAddSubject, onDeleteSubject, onLogout, onReset }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role || '');
  const [newSub, setNewSub] = useState('');

  return (
    <div className="max-w-2xl space-y-8 text-on-surface pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Settings</h2>
        <button onClick={onReset} className="text-red-500 text-sm flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none">
          <span className="material-symbols-outlined text-sm">refresh</span> Reset All Database
        </button>
      </div>
      <div className="glass-card p-6 rounded-lg">
         <h3 className="font-bold mb-4">Profile Info</h3>
         <div className="space-y-4">
           <div>
             <label className="block text-xs font-bold text-outline uppercase mb-1">Display Name</label>
             <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
           </div>
           <div>
             <label className="block text-xs font-bold text-outline uppercase mb-1">Role / Title</label>
             <input value={role} onChange={e => setRole(e.target.value)} className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
           </div>
           <button onClick={() => onUpdateProfile({ name, role })} className="bg-primary text-on-primary px-5 py-2.5 rounded font-bold cursor-pointer border-none hover:opacity-90 text-sm">Save Profile</button>
         </div>
      </div>
      <div className="glass-card p-6 rounded-lg">
         <h3 className="font-bold mb-4">Manage Subjects</h3>
         <div className="space-y-2 mb-4">
           {user.subjects?.map(s => (
             <div key={s.id} className="flex justify-between items-center p-3 bg-surface-container rounded border border-outline-variant/60">
               <span>{s.name}</span>
               <button onClick={() => onDeleteSubject(s.id)} className="cursor-pointer border-none bg-transparent">
                 <span className="material-symbols-outlined text-outline hover:text-red-500">delete</span>
               </button>
             </div>
           ))}
         </div>
         <div className="flex gap-2">
           <input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="New Subject" className="flex-1 p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
           <button onClick={() => { if(newSub) { onAddSubject(newSub); setNewSub(''); } }} className="bg-secondary-container text-on-surface px-5 py-2 rounded font-bold cursor-pointer border-none hover:bg-outline-variant text-sm">Add Subject</button>
         </div>
      </div>
      <div className="glass-card p-6 rounded-lg">
         <h3 className="font-bold mb-4">Account Action</h3>
         <button onClick={onLogout} className="bg-rose-50 text-rose-600 px-5 py-2.5 rounded font-bold border border-rose-100 hover:bg-rose-100 transition-colors w-full text-center cursor-pointer">Log Out Profile</button>
      </div>
    </div>
  );
}

function GoalsView({ user, canEdit, toggleGoal, addGoal }) {
  const [newGoal, setNewGoal] = useState('');
  return (
    <div className="max-w-4xl animate-fadeIn text-on-surface">
       <h2 className="text-2xl font-bold mb-6">{canEdit ? 'My Goals' : `${user.name}'s Goals`}</h2>
       <div className="space-y-3 mb-8">
        {user.goals?.map(g => (
          <div 
            key={g.id} 
            onClick={() => { if(canEdit) toggleGoal(g.id); }} 
            className={`p-4 rounded border flex items-center gap-3 cursor-pointer transition-colors ${g.completed ? 'bg-secondary/10 border-secondary/20 opacity-70' : 'glass-card'}`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${g.completed ? 'bg-secondary border-secondary' : 'border-outline'}`}>
              {g.completed && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
            </div>
            <span className={g.completed ? 'line-through text-secondary font-medium' : ''}>{g.text}</span>
          </div>
        ))}
        {(!user.goals || user.goals.length === 0) && (
          <p className="text-sm text-outline italic py-4">No goals recorded yet.</p>
        )}
       </div>
       {canEdit && (
         <div className="flex gap-2">
           <input value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="New Goal..." className="flex-1 p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
           <button onClick={() => { if(newGoal) { addGoal(newGoal); setNewGoal(''); } }} className="bg-primary text-on-primary px-6 rounded font-bold cursor-pointer border-none hover:opacity-90 text-sm">Add Goal</button>
         </div>
       )}
    </div>
  );
}

function LogSessionView({ user, onCancel, onSubmit }) {
  const [sub, setSub] = useState(user.subjects?.[0] || { id: 's1', name: 'Python' });
  const [dur, setDur] = useState(30);
  const [note, setNote] = useState('');
  return (
    <div className="text-on-surface">
      <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Log Session</h2><button onClick={onCancel} className="cursor-pointer border-none bg-transparent"><span className="material-symbols-outlined text-outline hover:text-on-surface">close</span></button></div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {user.subjects?.map(s => (
            <button key={s.id} onClick={() => setSub(s)} className={`p-3 rounded border text-left cursor-pointer transition-all ${sub?.id === s.id ? 'border-secondary bg-secondary/15 ring-1 ring-secondary font-bold' : 'border-outline-variant hover:bg-surface-container'}`}>
              {s.name}
            </button>
          ))}
        </div>
        <div>
          <label className="text-sm font-bold text-outline">Duration: {dur}m</label>
          <input type="range" min="5" max="180" step="5" value={dur} onChange={e => setDur(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-secondary cursor-pointer"/>
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes..." className="w-full p-4 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none min-h-[100px] text-sm bg-white"/>
        <button onClick={() => onSubmit(sub, dur, note)} className="w-full bg-primary text-on-primary py-4 rounded font-bold cursor-pointer border-none hover:opacity-90 text-sm">Log & Earn XP</button>
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border-l-4 border-red-500">
        <h3 className="text-red-500 font-bold flex items-center gap-2 mb-2"><AlertCircle/> Error</h3>
        <p className="text-slate-600 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm font-bold underline cursor-pointer bg-transparent border-none">Retry</button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-secondary text-lg font-bold">
      <Sparkles className="animate-spin mr-2"/> Connecting to database...
    </div>
  );
}

function LoginScreen({ users, onLogin, onSignup, isSaving, setView }) {
  const [mode, setMode] = useState(Object.keys(users).length === 0 ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [sub1, setSub1] = useState('');
  const [sub2, setSub2] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');

  const handleSignupSubmit = () => {
    if (!name || !role || !sub1 || !signupPassword) return alert("Please fill in Name, Role, Password and at least one subject.");
    const subjects = [{ id: 's1', name: sub1, progress: 0, color: 'bg-secondary' }];
    if (sub2) subjects.push({ id: 's2', name: sub2, progress: 0, color: 'bg-primary' });
    onSignup(name, role, subjects, signupPassword);
  };

  const handleLoginSubmit = () => {
    if (!selectedUser) return;
    if (selectedUser.password && selectedUser.password !== loginPassword) return alert("Incorrect Password");
    onLogin(selectedUser.id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 text-on-surface">
      <div className="bg-white p-8 rounded-lg border border-outline-variant shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-secondary/10 rounded-full mb-4 text-secondary"><Sparkles size={40} /></div>
          <h1 className="font-headline-md font-bold mb-2 text-primary">duo_learning</h1>
          <p className="text-on-surface-variant text-sm">Track your focus sessions live with friends.</p>
        </div>

        {mode === 'login' ? (
          !selectedUser ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4 text-primary">Select Profile</h2>
              {Object.values(users).length === 0 && <p className="text-outline text-center text-sm">No profiles found.</p>}
              {Object.values(users).map(u => (
                <button 
                  key={u.id} 
                  onClick={() => setSelectedUser(u)} 
                  className="w-full p-4 rounded border border-outline-variant flex items-center gap-4 hover:bg-surface-container transition-colors text-left bg-white text-on-surface cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-lg text-slate-800 shrink-0">
                    {u.avatar || '👤'}
                  </div>
                  <div>
                    <div className="font-bold text-base">{u.name}</div>
                    <div className="text-xs text-outline font-semibold">{u.role}</div>
                  </div>
                  <ArrowRight className="ml-auto text-outline" size={16} />
                </button>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setView('landing')} className="flex-1 py-3 border border-outline-variant text-outline font-bold rounded hover:bg-surface-container text-xs cursor-pointer bg-white">Cancel</button>
                <button onClick={() => setMode('signup')} className="flex-1 py-3 bg-secondary text-white font-bold rounded hover:opacity-90 text-xs cursor-pointer border-none">Create Profile</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setSelectedUser(null); setLoginPassword(''); }} className="text-xs text-outline font-bold hover:underline mb-2 bg-transparent border-none cursor-pointer">← Back to profiles</button>
              <h2 className="text-lg font-bold text-primary flex items-center gap-2"><Lock size={18} /> Enter Password for {selectedUser.name}</h2>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-outline uppercase">Password</label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  placeholder="Password" 
                  className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white"
                />
              </div>
              <button onClick={handleLoginSubmit} className="w-full py-3 bg-primary text-white rounded font-bold hover:opacity-90 cursor-pointer border-none text-sm">Login</button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-primary">Create Profile</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-outline uppercase">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-outline uppercase">Password</label>
                <input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Secret password" className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-outline uppercase">Role / Title</label>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Developer" className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-outline uppercase">Main Subject</label>
                <input value={sub1} onChange={e => setSub1(e.target.value)} placeholder="e.g. React" className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-outline uppercase">Secondary Subject (Optional)</label>
                <input value={sub2} onChange={e => setSub2(e.target.value)} placeholder="e.g. Node" className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => { if (Object.keys(users).length > 0) setMode('login'); else setView('landing'); }} className="flex-1 py-3 text-outline border border-outline-variant bg-white font-bold rounded hover:bg-surface-container text-xs cursor-pointer">Cancel</button>
              <button onClick={handleSignupSubmit} disabled={isSaving} className="flex-1 py-3 bg-secondary text-white rounded font-bold hover:opacity-90 text-xs flex items-center justify-center border-none cursor-pointer">
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LandingPageView({ setView, currentUserId, myself }) {
  const displayStreak = myself ? (myself.streak || 0) : 365;
  const streakPct = myself ? Math.min(100, Math.max(10, ((myself.streak || 0) / 10) * 100)) : 90;

  const handleGetStarted = () => {
    if (currentUserId) {
      setView('dashboard');
    } else {
      setView('login');
    }
  };

  useEffect(() => {
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('opacity-100');
                entry.target.classList.remove('opacity-0', 'translate-y-6');
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('.bento-card, .aspect-square-animate');
    elements.forEach(el => {
        el.classList.add('opacity-0', 'translate-y-6', 'transition-all', 'duration-700', 'ease-out');
        observer.observe(el);
    });

    return () => {
        elements.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="font-body-md text-on-surface bg-background min-h-screen w-full relative z-0 selection:bg-indigo-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        .bg-surface { background-color: #faf9f5; }
        .bg-surface-dim { background-color: #dbdad6; }
        .bg-surface-bright { background-color: #faf9f5; }
        .bg-surface-container-lowest { background-color: #ffffff; }
        .bg-surface-container-low { background-color: #f4f4f0; }
        .bg-surface-container { background-color: #eeebe1; }
        .bg-surface-container-high { background-color: #e4e2d7; }
        .bg-surface-container-highest { background-color: #d9d7cc; }
        .text-on-surface { color: #1c1c1a; }
        .text-on-surface-variant { color: #49473f; }
        .border-outline { border-color: #7a776e; }
        .border-outline-variant { border-color: #cac6bb; }
        .bg-primary { background-color: #334155; }
        .text-primary { color: #334155; }
        .text-on-primary { color: #ffffff; }
        .bg-secondary { background-color: #586249; }
        .text-secondary { color: #586249; }
        .bg-secondary-container { background-color: #dce7c8; }
        .text-on-secondary-container { color: #161e0b; }
        .bg-tertiary { background-color: #386567; }
        .bg-tertiary-container { background-color: #bcebe3; }
        .text-on-tertiary-container { color: #002021; }

        .px-margin-desktop { padding-left: 64px; padding-right: 64px; }
        .py-margin-desktop { padding-top: 64px; padding-bottom: 64px; }
        .p-lg { padding: 32px; }
        .py-lg { padding-top: 32px; padding-bottom: 32px; }

        .text-headline-xl { font-size: 48px; line-height: 56px; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; }
        .text-headline-lg { font-size: 32px; line-height: 40px; letter-spacing: -0.01em; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; }
        .text-headline-md { font-size: 24px; line-height: 32px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; }
        .text-body-lg { font-size: 18px; line-height: 28px; font-family: 'Inter', sans-serif; font-weight: 400; }
        .text-body-md { font-size: 16px; line-height: 24px; font-family: 'Inter', sans-serif; font-weight: 400; }
        .text-label-md { font-size: 14px; line-height: 20px; letter-spacing: 0.05em; font-family: 'Inter', sans-serif; font-weight: 600; }
        .text-label-sm { font-size: 12px; line-height: 16px; font-family: 'Inter', sans-serif; font-weight: 500; }

        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .whisper-shadow {
            box-shadow: 0 10px 30px -10px rgba(51, 65, 85, 0.08);
        }
        .glass-surface {
            background: rgba(250, 249, 245, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
        .bento-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 24px;
        }
        .bento-card {
            border: 1px solid #cac6bb;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
        }
        .bento-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px -10px rgba(51, 65, 85, 0.12);
        }
        .animate-float {
            animation: float 8s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
      `}</style>
      
      {/* TopAppBar */}
      <header className="bg-surface-container-lowest/80 backdrop-blur-md w-full sticky top-0 z-50 border-b border-outline-variant">
        <nav className="flex justify-between items-center px-4 md:px-margin-desktop py-4 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <a className="text-headline-md font-headline-md font-bold text-primary" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>DuoLearning</a>
            <div className="hidden md:flex items-center gap-8">
              <a className="font-label-md text-label-md text-primary border-b-2 border-primary pb-1 hover:text-primary transition-colors duration-200" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Platform</a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#science" onClick={(e) => { e.preventDefault(); document.getElementById('science')?.scrollIntoView({ behavior: 'smooth' }); }}>Science</a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#cta" onClick={(e) => { e.preventDefault(); document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' }); }}>Start</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { if (currentUserId) setView('dashboard'); else setView('login'); }} className="font-label-md text-label-md text-on-surface-variant px-4 py-2 hover:text-primary transition-colors">Log In</button>
            <button onClick={handleGetStarted} className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:opacity-90 active:scale-95 transition-all">Get Started</button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden bg-surface-bright">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-secondary-container/20 blur-[120px] rounded-full"></div>
            <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-surface-container-high/40 blur-[100px] rounded-full"></div>
          </div>
          <div className="max-w-screen-2xl mx-auto px-4 md:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col items-start gap-8">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md">
                <span className="material-symbols-outlined text-[18px] mr-2">verified</span> New Kinetic Engine v2.0
              </span>
              <h1 className="font-headline-xl text-headline-xl text-on-surface leading-tight">
                Master New Skills <br/> <span className="text-secondary">Through Play</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                Join millions of learners on the world's most engaging gamified platform. Experience flow-state education designed for grounded, high-performance minds.
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                <button onClick={handleGetStarted} className="bg-primary text-on-primary font-label-md text-label-md px-8 py-4 rounded-lg shadow-sm hover:translate-y-[-2px] transition-all">Get Started for Free</button>

              </div>
            </div>
            <div className="lg:col-span-6 relative">
              <div className="relative z-10 animate-float">
                <img alt="Dashboard Mockup" className="rounded-lg whisper-shadow border border-outline-variant w-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMUEvaIqyoekupjJn1-dp1SYHq_5vWQI-QbuxCYIToTnle4PDMNLTogHJuY9dj8SgdKHavL2jc9fwFBECkDfE1CZcDZYHfuGS0y09gJZlspGx4QBtjRaoKKeCjRRwL5WDi6M__JgecGJ_yiIXI2vCAaImS0HynD1qumLp_CrngRZy8xWfjS8bRTgp5WniaIviE37Pcg0HWfrRSRzMtzZTPpmYP51zvyEyi-s4OQffEHlRlhAe89FFOb3ZlKRO8estJLqHLT7ggvv-s"/>
              </div>
              {/* Floating UI elements */}
              <div className="absolute -top-10 -right-10 bg-white p-4 rounded-lg whisper-shadow border border-outline-variant z-20 hidden md:block text-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">local_fire_department</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md">{displayStreak} Day Streak!</p>
                    <div className="w-24 h-1.5 bg-surface-container-low rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-secondary" style={{ width: `${streakPct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof/Stats Bar */}
        <section className="bg-surface-container-low py-12 border-y border-outline-variant">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-margin-desktop flex flex-wrap justify-between gap-8 md:gap-4 text-center">
            <div className="flex-1 min-w-[200px]">
              <p className="font-headline-lg text-headline-lg text-primary">10M+</p>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Active Learners</p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-headline-lg text-headline-lg text-primary">50+</p>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Premium Courses</p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-headline-lg text-headline-lg text-primary">1B+</p>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Lessons Completed</p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-headline-lg text-headline-lg text-primary">4.9/5</p>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">App Store Rating</p>
            </div>
          </div>
        </section>

        {/* Value Proposition (Bento Grid) */}
        <section id="features" className="py-32 bg-surface">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-margin-desktop">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Built for Modern Minds</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">Traditional learning is broken. We rebuilt it from the ground up using sophisticated feedback loops that keep you engaged and progressing.</p>
            </div>
            <div className="bento-grid">
              {/* Feature 1: Gamified Learning */}
              <div className="col-span-12 lg:col-span-7 bento-card bg-surface-container-lowest p-lg rounded-lg flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10 text-slate-800">
                  <span className="material-symbols-outlined text-secondary text-[48px] mb-6">extension</span>
                  <h3 className="font-headline-md text-headline-md mb-4">Gamified Learning</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-md">Turn every lesson into an adventure. Earn experience points, unlock rare badges, and maintain your streaks with immersive feedback loops.</p>
                </div>
                <div className="mt-12 flex gap-4 overflow-hidden text-slate-800">
                  <div className="w-32 h-40 bg-surface-container-low rounded-lg p-4 flex flex-col items-center justify-center border border-outline-variant flex-shrink-0">
                    <span className="material-symbols-outlined text-secondary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                    <span className="font-label-sm text-label-sm text-center">Mastery Badge</span>
                  </div>
                  <div className="w-32 h-40 bg-secondary-container rounded-lg p-4 flex flex-col items-center justify-center border border-secondary/20 flex-shrink-0">
                    <span className="material-symbols-outlined text-on-secondary-container mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span className="font-label-sm text-label-sm text-on-secondary-container text-center">Day 100</span>
                  </div>
                  <div className="w-32 h-40 bg-surface-container-low rounded-lg p-4 flex flex-col items-center justify-center border border-outline-variant flex-shrink-0">
                    <span className="material-symbols-outlined text-secondary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                    <span className="font-label-sm text-label-sm text-center">Fast Lane</span>
                  </div>
                </div>
              </div>
              {/* Feature 2: Personalized Paths */}
              <div className="col-span-12 lg:col-span-5 bento-card bg-primary p-lg rounded-lg flex flex-col justify-center text-white">
                <span className="material-symbols-outlined text-surface text-[48px] mb-6">psychology</span>
                <h3 className="font-headline-md text-headline-md mb-4">Personalized Paths</h3>
                <p className="font-body-md text-body-md text-surface/80">Our AI Kinetic Engine adapts to your pace, identifying knowledge gaps and serving the perfect next lesson to keep you in the flow zone.</p>
                <button onClick={() => setView('dashboard')} className="mt-8 bg-surface text-primary font-label-md text-label-md px-6 py-3 rounded-lg w-fit hover:opacity-90 transition-opacity">Meet your AI Mentor</button>
              </div>
              {/* Feature 3: Collaborative Challenges */}
              <div className="col-span-12 lg:col-span-5 bento-card bg-surface-container-highest p-lg rounded-lg flex flex-col text-slate-800">
                <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-6">groups</span>
                <h3 className="font-headline-md text-headline-md mb-4">Collaborative Challenges</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Don't learn alone. Join monthly leaderboards, compete in team tournaments, and solve problems together with friends.</p>
              </div>
              {/* Feature 4: Interactive Exercises */}
              <div className="col-span-12 lg:col-span-7 bento-card bg-surface-container-lowest p-lg rounded-lg flex items-center justify-between overflow-hidden text-slate-800">
                <div className="flex-1 pr-8">
                  <h3 className="font-headline-md text-headline-md mb-4">Kinetic Exercises</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Dynamic, tactile interfaces that make learning feel physically intuitive. No more passive reading—only active doing.</p>
                </div>
                <div className="w-1/2 -mr-12">
                  <img alt="Kinetic interface" className="rounded-lg border border-outline-variant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUozgWnpQYV2sQLVWDaG9q-yTR3qfWrFm4gBqRuO_T5F4ZVbjeE2fZ-Hv9cv9Y2MZspKvJq98KTYVWpSF48jVP7LmKbnJrttUEdRndNlrTdmh8vw-6t4FVBpgwtCkcPlbTPm7EWT1vygriXXfYRmppYxLFJL8eKZeBD3bnIitRQovFLsf1T3ty-xvV0P2hn3vZkSltaSMJSiXgqzR71hTOZRFhSWl9jZJDMpMUn8C0j1BbE3jZikICWayiaIpDVK8VSipYFjbNPp-d"/>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features: Kinetic Learning */}
        <section id="science" className="py-32 bg-surface-container-lowest relative text-slate-800">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="aspect-square aspect-square-animate bg-surface-container-low rounded-lg p-8 flex flex-col justify-center items-center text-center gap-4 border border-outline-variant">
                  <div className="w-16 h-16 rounded-full bg-primary text-surface flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px]">bolt</span>
                  </div>
                  <h4 className="font-headline-md text-headline-md">High Speed</h4>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">3x faster knowledge retention</p>
                </div>
                <div className="aspect-square aspect-square-animate bg-surface-container-low rounded-lg p-8 flex flex-col justify-center items-center text-center gap-4 mt-8 border border-outline-variant">
                  <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px]">waves</span>
                  </div>
                  <h4 className="font-headline-md text-headline-md">Pure Flow</h4>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">Reduce cognitive friction</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <h2 className="font-headline-xl text-headline-xl">The Science of <br/><span className="text-secondary">Kinetic Learning</span></h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Our proprietary Kinetic Method leverages the 'Flow State'—the psychological sweet spot between challenge and skill. By utilizing rapid micro-feedback and multi-sensory interactions, we transform passive absorption into active mastery.
              </p>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
                  <div>
                    <h5 className="font-label-md text-label-md">Spaced Repetition Engine</h5>
                    <p className="text-body-md text-on-surface-variant">Algorithms that know exactly when you're about to forget a concept.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
                  <div>
                    <h5 className="font-label-md text-label-md">Immersive Simulations</h5>
                    <p className="text-body-md text-on-surface-variant">Real-world scenarios built directly into your browser or mobile app.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="cta" className="py-32 px-4 md:px-margin-desktop bg-surface">
          <div className="max-w-5xl mx-auto bg-primary rounded-xl p-16 text-center text-on-primary relative overflow-hidden shadow-xl">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 border-[40px] border-surface rounded-full"></div>
              <div className="absolute -bottom-24 -right-24 w-64 h-64 border-[20px] border-surface rounded-full"></div>
            </div>
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="font-headline-xl text-headline-xl">Ready to start your journey?</h2>
              <p className="font-body-lg text-body-lg opacity-80">
                Join over 10 million learners today. Whether you're mastering code, design, or business, DuoLearning is your unfair advantage.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={handleGetStarted} className="bg-surface text-primary font-label-md text-label-md px-10 py-4 rounded-lg hover:bg-surface-container-lowest transition-colors shadow-sm">Get Started for Free</button>
                <button onClick={() => setView('explore_courses')} className="bg-transparent border border-surface/40 text-surface font-label-md text-label-md px-10 py-4 rounded-lg hover:bg-surface/10 transition-colors">Explore Courses</button>
              </div>
              <p className="font-label-sm text-label-sm opacity-60">No credit card required. Free forever version available.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant py-12">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 md:px-margin-desktop w-full max-w-screen-2xl mx-auto text-slate-800">
          <div className="mb-8 md:mb-0 space-y-4">
            <a className="font-headline-md text-headline-md font-bold text-on-surface" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>DuoLearning</a>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
              Empowering flow-state education for a sophisticated, high-performance world.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-6">
            <div className="flex flex-wrap justify-center gap-8">
              <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
              <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Cookie Settings</a>
              <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Contact Support</a>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60">
              © 2024 DuoLearning Platform. Grounded education for modern minds.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
// --- 6. COURSE PROGRESS SYSTEM ---
export const COURSES_DATA = {
  dsa: {
    id: 'dsa',
    title: 'Data Structures & Algorithms (DSA)',
    desc: 'Master computational thinking, complexity analysis, and core algorithmic paradigms for tech interviews.',
    color: 'from-blue-600 to-indigo-700',
    icon: 'code',
    topics: [
      {
        id: 'arrays',
        name: 'Arrays & Hashing',
        subtopics: [
          'Static vs Dynamic Arrays (Amortized insertion time, resizing, cache locality)',
          'Hashing and HashMap Internals (Hash functions, buckets, load factors, keys)',
          'Collision Resolution strategies (Chaining vs Open Addressing: Linear/Quadratic probing, Double Hashing)',
          'Prefix Sums and Running Sum algorithms (Cumulative query optimizations, 1D and 2D arrays)',
          'Two-Pointer traversal patterns (Opposite directions, same direction, fast and slow pointers)',
          'Sliding Window algorithms (Fixed vs Variable size window expansion/contraction)'
        ],
        quizzes: [
          { q: 'What is the time complexity to retrieve an element by index from a static array?', a: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], c: 0, level: 'Easy' },
          { q: 'Which data structure is best suited for checking membership of elements in constant time average?', a: ['Singly Linked List', 'Hash Set', 'Binary Search Tree', 'Min Heap'], c: 1, level: 'Easy' },
          { q: 'In a hash table, what is a "collision"?', a: ['When the storage memory runs out', 'When two different keys generate the same hash index', 'When a query times out', 'When hash function returns null'], c: 1, level: 'Medium' },
          { q: 'What is the space complexity of a Hash Map storing N key-value pairs?', a: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'], c: 2, level: 'Medium' },
          { q: 'If a hash table has a size of 100 and stores 80 elements, what is its load factor?', a: ['1.25', '80', '0.8', '8'], c: 2, level: 'Hard' },
          { q: 'What is the primary characteristic of a sliding window algorithm?', a: ['It processes elements in random order', 'It maintains dynamic subarray boundaries that expand or contract', 'It reverses the array', 'It sorts the array in O(n log n)'], c: 1, level: 'Hard' },
          { q: 'Which of the following describes a key benefit of Dynamic Arrays over Static Arrays?', a: ['Direct memory access speeds', 'Automatic resizing when capacity is exceeded', 'Zero overhead memory usage', 'None of the above'], c: 1, level: 'Easy' },
          { q: 'What is the worst-case time complexity of inserting an element into a Hash Map (assuming collision chaining)?', a: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'], c: 2, level: 'Medium' },
          { q: 'Which collision resolution technique suffers most from "Primary Clustering"?', a: ['Linear Probing', 'Quadratic Probing', 'Double Hashing', 'Separate Chaining'], c: 0, level: 'Medium' },
          { q: 'In a 2D prefix sum array, how many prefix sum lookups are required to calculate the sum of any subgrid in O(1) time?', a: ['1', '2', '3', '4'], c: 3, level: 'Hard' }
        ]
      },
      {
        id: 'lists_stacks',
        name: 'Linked Lists, Stacks & Queues',
        subtopics: [
          'Singly, Doubly, and Circular Linked Lists (Node references, list reversal, pointer manipulation)',
          'Sentinel Nodes (Simplifying edge cases in list operations)',
          'Stack LIFO architectures (Dynamic array vs linked list backing, call stack simulator)',
          'Queue FIFO structures (Circular buffer array pointer implementation, double-ended queues)',
          'Floyd\'s Cycle Finding algorithm (Formal mathematical proof, loop detection and node retrieval)',
          'Stack & Queue designs (Min Stack tracking auxiliary space, Queue using two Stacks)'
        ],
        quizzes: [
          { q: 'Which of the following describes the stack structure access model?', a: ['First-In, First-Out (FIFO)', 'Last-In, First-Out (LIFO)', 'Random Access', 'Sorted Insertion'], c: 1, level: 'Easy' },
          { q: 'What is the time complexity to insert a node at the head of a Singly Linked List?', a: ['O(1)', 'O(N)', 'O(log N)', 'O(N^2)'], c: 0, level: 'Easy' },
          { q: 'How does Floyd\'s Cycle Detection algorithm identify a loop in a Linked List?', a: ['Using a Hash Set of visited nodes', 'By tracking node count', 'Using two pointers moving at different speeds', 'By reversing the list'], c: 2, level: 'Medium' },
          { q: 'What happens during a "Stack Underflow"?', a: ['Stack exceeds allocated memory', 'Attempting to pop an item from an empty stack', 'Inserting an element on a full stack', 'None of the above'], c: 1, level: 'Medium' },
          { q: 'To implement a queue using two stacks, what is the amortized cost of a dequeue operation?', a: ['O(1)', 'O(N)', 'O(log N)', 'O(N^2)'], c: 0, level: 'Hard' },
          { q: 'What auxiliary space complexity is required to implement a Min Stack that retrieves the minimum element in O(1) time?', a: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'], c: 2, level: 'Hard' },
          { q: 'What is the main advantage of a circular linked list over a singly linked list?', a: ['Provides O(1) access to elements', 'Any node can be a starting point to traverse the entire list', 'Uses less memory overhead', 'None of the above'], c: 1, level: 'Easy' },
          { q: 'Which data structure is most appropriate for reversing a sequence of elements?', a: ['Queue', 'Stack', 'HashMap', 'Min Heap'], c: 1, level: 'Easy' },
          { q: 'What is the time complexity to check if a stack backed by a dynamic array is empty?', a: ['O(1)', 'O(N)', 'O(log N)', 'O(N^2)'], c: 0, level: 'Easy' },
          { q: 'In a queue built using circular array buffers, what condition indicates a full queue?', a: ['head == tail', '(tail + 1) % size == head', 'head == 0', 'tail == size - 1'], c: 1, level: 'Hard' }
        ]
      },
      {
        id: 'recursion',
        name: 'Recursion & Backtracking',
        subtopics: [
          'Recursion Stack Frames (Activation records, variables storage, max recursion depth limits)',
          'Tail Recursion and Optimizations (Compiler stack frame reuse)',
          'Divide & Conquer strategy (Merge Sort, Quick Sort partitioning, pivot strategies)',
          'State Space Trees exploration (Recursive depth-first search, backtracking paths)',
          'Backtracking constraints and pruning (Early rejection branches: N-Queens, Sudoku solver, subset sum)'
        ],
        quizzes: [
          { q: 'What is the essential component of a recursive function that prevents infinite execution?', a: ['Recursive step', 'Base case', 'Loop counter', 'Memory buffer'], c: 1, level: 'Easy' },
          { q: 'What is the average time complexity of recursive Fibonacci computation without memoization?', a: ['O(N)', 'O(N log N)', 'O(2^N)', 'O(1)'], c: 2, level: 'Easy' },
          { q: 'Which data structure is implicitly used by the runtime environment to track recursive calls?', a: ['Queue', 'Min Heap', 'Stack', 'Graph'], c: 2, level: 'Medium' },
          { q: 'In backtracking, what is the purpose of "pruning"?', a: ['Deleting array elements', 'Terminating search paths that cannot lead to a valid solution', 'Sorting the input data', 'Running garbage collector'], c: 1, level: 'Medium' },
          { q: 'What is the time complexity of the N-Queens problem solver?', a: ['O(N^2)', 'O(N!)', 'O(2^N)', 'O(N^3)'], c: 1, level: 'Hard' },
          { q: 'What happens if a recursive function does not reach its base case?', a: ['It returns null', 'It triggers a Stack Overflow error', 'It runs in constant time', 'It halts the compiler'], c: 1, level: 'Easy' },
          { q: 'Which sorting algorithm is a classic application of Divide & Conquer recursion?', a: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], c: 2, level: 'Easy' },
          { q: 'What is the space complexity of a recursive call of depth D on the call stack?', a: ['O(1)', 'O(D)', 'O(D^2)', 'O(2^D)'], c: 1, level: 'Medium' },
          { q: 'How does backtracking differ from simple depth-first search?', a: ['Backtracking uses extra memory', 'Backtracking prunes paths by evaluating constraints early', 'DFS is iterative, backtracking is not', 'There is no difference'], c: 1, level: 'Medium' },
          { q: 'What is the key optimization technique used in recursion to speed up repeated calculations?', a: ['Tabulation', 'Memoization', 'Stack framing', 'Garbage collection'], c: 1, level: 'Hard' }
        ]
      },
      {
        id: 'trees_graphs',
        name: 'Trees & Graphs Traversal',
        subtopics: [
          'Binary Tree properties & Binary Search Trees (BST search, insertion, deletion complexities)',
          'Tree Traversal patterns (Recursive vs Iterative In-order, Pre-order, Post-order, Level-order)',
          'Graph representations (Adjacency Matrix vs Adjacency List space-time tradeoffs)',
          'Graph Search (Depth First Search (DFS), Breadth First Search (BFS))',
          'Shortest Path algorithms (Dijkstra\'s with Priority Queue, Bellman-Ford for negative weights)',
          'Topological sorting (Kahn\'s indegree queue method, DFS-based post-order reversal)'
        ],
        quizzes: [
          { q: 'What is the maximum number of child nodes a binary tree node can have?', a: ['1', '2', 'Unspecified', '4'], c: 1, level: 'Easy' },
          { q: 'Which traversal of a Binary Search Tree (BST) yields elements in sorted order?', a: ['Pre-order', 'Post-order', 'In-order', 'Level-order'], c: 2, level: 'Easy' },
          { q: 'Which algorithm is best suited for finding the single-source shortest path in a weighted graph with non-negative edges?', a: ['Kruskal\'s Algorithm', 'Breadth-First Search', 'Dijkstra\'s Algorithm', 'Floyd-Warshall'], c: 2, level: 'Medium' },
          { q: 'Which data structure is typically used to implement Breadth-First Search (BFS)?', a: ['Stack', 'Queue', 'Hash Map', 'Priority Queue'], c: 1, level: 'Medium' },
          { q: 'What is the time complexity of Topological Sort using Kahn\'s Algorithm on a graph with V vertices and E edges?', a: ['O(V^2)', 'O(V + E)', 'O(V * E)', 'O(E^2)'], c: 1, level: 'Hard' },
          { q: 'Which graph type is required to perform a valid Topological Sort?', a: ['Undirected Graph', 'Directed Acyclic Graph (DAG)', 'Complete Graph', 'Bipartite Graph'], c: 1, level: 'Hard' },
          { q: 'In a binary search tree, what is the maximum height of a tree with N nodes in the worst case?', a: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'], c: 2, level: 'Easy' },
          { q: 'Which graph representation is more space-efficient for sparse graphs?', a: ['Adjacency Matrix', 'Adjacency List', 'Incidence Matrix', 'None of the above'], c: 1, level: 'Easy' },
          { q: 'What is the time complexity of Dijkstra\'s algorithm using a binary heap priority queue?', a: ['O(V^2)', 'O((V + E) log V)', 'O(V * E)', 'O(E^2)'], c: 1, level: 'Medium' },
          { q: 'Which algorithm can detect negative cycle loops in a directed graph?', a: ['Dijkstra\'s', 'Kruskal\'s', 'Bellman-Ford', 'Prim\'s'], c: 2, level: 'Hard' }
        ]
      },
      {
        id: 'dp_greedy',
        name: 'Dynamic Programming & Greedy',
        subtopics: [
          'Overlapping Subproblems & Optimal Substructure (Recurrence relations, subproblem caching)',
          'Top-Down Memoization vs Bottom-Up Tabulation (Stack overflow risks, DP table initialization)',
          'Classic DP Algorithms (0/1 Knapsack, Longest Common Subsequence, Coin Change, Edit Distance)',
          'Greedy strategies (Greedy choice property, proof of correctness, fractional knapsack, activity selection)',
          'Minimum Spanning Trees (Kruskal\'s Union-Find and Disjoint Sets, Prim\'s priority queue approach)'
        ],
        quizzes: [
          { q: 'What does "Memoization" mean in the context of Dynamic Programming?', a: ['Writing comments in code', 'Caching subproblem solutions in memory to avoid recalculation', 'Converting recursion to iteration', 'None of the above'], c: 1, level: 'Easy' },
          { q: 'Greedy algorithms make choices based on which criteria?', a: ['Locally optimal choices at each step', 'Globally optimal calculation in advance', 'Random selection', 'Exhaustive backtrack search'], c: 0, level: 'Easy' },
          { q: 'What is the key difference between Dynamic Programming and Divide & Conquer?', a: ['DP solves overlapping subproblems, while D&C solves independent subproblems', 'DP is recursive, while D&C is iterative', 'D&C caches results, DP does not', 'There is no difference'], c: 0, level: 'Medium' },
          { q: 'The Fractional Knapsack problem is optimally solved using which approach?', a: ['Dynamic Programming', 'Greedy Method', 'Brute Force', 'Backtracking'], c: 1, level: 'Medium' },
          { q: 'What is the time complexity of the classic 0/1 Knapsack DP solution with N items and a capacity of W?', a: ['O(2^N)', 'O(N^2)', 'O(N * W)', 'O(N + W)'], c: 2, level: 'Hard' },
          { q: 'What is the main characteristic of optimal substructure?', a: ['Local decisions always lead to global optimal', 'An optimal solution to the problem contains optimal solutions to its subproblems', 'Subproblems never overlap', 'None of the above'], c: 1, level: 'Easy' },
          { q: 'Which strategy is used by the Kruskal\'s algorithm to find Minimum Spanning Trees?', a: ['Dynamic Programming', 'Greedy approach using Disjoint Set Union', 'Backtracking search', 'Divide and conquer'], c: 1, level: 'Medium' },
          { q: 'In dynamic programming, what is tabulation?', a: ['A top-down recursive caching method', 'A bottom-up iterative table-filling method', 'Sorting the inputs in a table', 'None of the above'], c: 1, level: 'Medium' },
          { q: 'Which of the following is solved optimally by a greedy strategy?', a: ['0/1 Knapsack problem', 'Fractional Knapsack problem', 'Longest Common Subsequence', 'Matrix Chain Multiplication'], c: 1, level: 'Medium' },
          { q: 'What is the space complexity of the tabulation solution for the Longest Common Subsequence of strings of length M and N?', a: ['O(1)', 'O(M + N)', 'O(M * N)', 'O(2^(M+N))'], c: 2, level: 'Hard' }
        ]
      }
    ]
  },
  fullstack: {
    id: 'fullstack',
    title: 'Full Stack Web Developer',
    desc: 'Learn end-to-end web engineering, from responsive DOM layouts to server middleware, secure databases, and production hosting.',
    color: 'from-emerald-600 to-teal-700',
    icon: 'terminal',
    topics: [
      {
        id: 'frontend_basics',
        name: 'Frontend Basics (HTML5, CSS3, ES6+)',
        subtopics: [
          'Semantic HTML5 markup and accessibility structures (ARIA labels, document hierarchy)',
          'Modern Responsive Layouts (Flexbox container models, CSS Grid tracks, media queries)',
          'Advanced CSS concepts (CSS variables, pseudo-elements, positioning scopes)',
          'Asynchronous JavaScript (Promises, Event Loop microtasks, Async/Await syntax)',
          'Browser DOM selectors and event propagation (Event capture, bubbling, and delegation patterns)'
        ],
        quizzes: [
          { q: 'Which HTML5 tag represents an independent, self-contained piece of content?', a: ['<section>', '<div>', '<article>', '<span>'], c: 2, level: 'Easy' },
          { q: 'Which CSS display model is explicitly designed for 1-dimensional row/column layouts?', a: ['block', 'grid', 'flex', 'table'], c: 2, level: 'Easy' },
          { q: 'What is the difference between "let" and "var" variables in JavaScript?', a: ['let is globally scoped, var is block scoped', 'let is block scoped, var is function scoped', 'let can be redeclared, var cannot', 'There is no difference'], c: 1, level: 'Medium' },
          { q: 'What does "event bubbling" refer to in DOM event propagation?', a: ['Events firing from body down to child', 'Events traveling from target element up through its ancestors', 'Multiple event listeners on one element', 'None of the above'], c: 1, level: 'Medium' },
          { q: 'Which statement accurately describes a JavaScript Promise state?', a: ['Can transition from Resolved to Rejected', 'Can be Pending, Fulfilled, or Rejected', 'Must be declared with the async keyword', 'None of the above'], c: 1, level: 'Hard' },
          { q: 'Which ARIA attribute is used to provide a screen-reader friendly alternative description?', a: ['aria-describedby', 'aria-label', 'role', 'alt'], c: 1, level: 'Easy' },
          { q: 'What is the default flex-direction of a flex container?', a: ['column', 'row', 'row-reverse', 'initial'], c: 1, level: 'Easy' },
          { q: 'Which CSS variable syntax is correct to define a variable?', a: ['var(--primary-color)', '$primary-color', '--primary-color: #fff', "@primary-color"], c: 2, level: 'Medium' },
          { q: 'How does the event capture phase differ from the bubbling phase?', a: ['Capture travels down from root to target, bubbling travels up', 'Bubbling runs first, capture second', 'Capture is only supported in modern browsers', 'None of the above'], c: 0, level: 'Medium' },
          { q: 'Which of the following is a microtask in the JavaScript Event Loop?', a: ['setTimeout callback', 'setInterval callback', 'Promise then callback', 'DOM Click event listener'], c: 2, level: 'Hard' }
        ]
      },
      {
        id: 'react_framework',
        name: 'React Component Engineering',
        subtopics: [
          'Component Lifecycles & State/Props models (Virtual DOM reconciler, batching updates)',
          'Standard React Hooks (useState, useEffect cleanup cycles, useContext provider networks)',
          'State Sharing & Context API (Custom state providers, avoidance of prop drilling)',
          'Performance tuning hooks (memoized callbacks with useCallback, cached calculations with useMemo)',
          'React Router architecture (Dynamic client-side routes, nested layouts, parameter selectors)'
        ],
        quizzes: [
          { q: 'What React Hook is used to maintain local mutable state in functional components?', a: ['useEffect', 'useState', 'useContext', 'useRef'], c: 1, level: 'Easy' },
          { q: 'What is the main benefit of React\'s Virtual DOM?', a: ['Replaces HTML completely', 'Speeds up UI updates by syncing only changed elements to the real DOM', 'Stores database records directly', 'Executes code in background worker threads'], c: 1, level: 'Easy' },
          { q: 'When does a React useEffect hook run if its dependency array is set to empty: []?', a: ['On every component render', 'Only once, after the initial mount', 'Never', 'Whenever state variables update'], c: 1, level: 'Medium' },
          { q: 'What is "prop drilling" in React development?', a: ['Drilling database queries from frontend', 'Passing props down multiple nested component layers to reach a deep child', 'Using CSS modules', 'Creating responsive layouts'], c: 1, level: 'Medium' },
          { q: 'What is the purpose of the React useMemo hook?', a: ['To handle state updates', 'To run asynchronous side effects', 'To cache the computed result of an expensive calculation across renders', 'To manage routes'], c: 2, level: 'Hard' },
          { q: 'Which React hook is used to access the context values directly?', a: ['useContext', 'useState', 'useRef', 'useMemo'], c: 0, level: 'Easy' },
          { q: 'What is the primary purpose of the React memo wrapper?', a: ['To cache network payloads', 'To prevent unnecessary re-renders of a component if props haven\'t changed', 'To handle route configuration', 'None of the above'], c: 1, level: 'Medium' },
          { q: 'What hook should you use to run cleanup code when a component unmounts?', a: ['useUnmount', 'useLayoutEffect', 'useEffect returning a function', 'useMemo'], c: 2, level: 'Medium' },
          { q: 'What will happen if you set state directly in the render function body?', a: ['State updates immediately', 'Causes an infinite re-render loop error', 'Nothing happens', 'State is ignored'], c: 1, level: 'Medium' },
          { q: 'What is the purpose of keys in React list rendering?', a: ['To identify elements uniquely for reconciliation performance', 'To secure elements in memory', 'To style list items', 'To index elements starting at 1'], c: 0, level: 'Hard' }
        ]
      },
      {
        id: 'backend_node',
        name: 'Backend Systems (Node.js & Express)',
        subtopics: [
          'Node.js Asynchronous runtime (V8 engine, libuv event loop, worker threads)',
          'RESTful API specifications (Routing patterns, payload designs, HTTP status protocols)',
          'Express middleware execution cycles (App-level vs router-level, error boundary handlers)',
          'Request validation & Sanitization (Payload constraints, body parsers)',
          'Cross-Origin Resource Sharing (CORS configurations, preflight requests, credentials control)'
        ],
        quizzes: [
          { q: 'What engine does Node.js use to run JavaScript code on the server?', a: ['SpiderMonkey', 'Chakra', 'V8', 'WebKit'], c: 2, level: 'Easy' },
          { q: 'Which Express method handles client requests before sending the final HTTP response?', a: ['Route', 'Controller', 'Middleware', 'Model'], c: 2, level: 'Easy' },
          { q: 'Which HTTP method is specifically used to create a new resource on a RESTful backend?', a: ['GET', 'POST', 'PUT', 'DELETE'], c: 1, level: 'Medium' },
          { q: 'How does Node.js handle heavy concurrent connections efficiently?', a: ['By spawning a separate operating system thread for each request', 'By running an event-driven, non-blocking single-threaded event loop', 'By caching pages on CDN', 'By restricting request rates'], c: 1, level: 'Medium' },
          { q: 'What does the CORS header Access-Control-Allow-Origin do?', a: ['Permits access to database credentials', 'Specifies which external origins are allowed to read responses from this backend', 'Forces SSL encryption', 'Limits payload sizes'], c: 1, level: 'Hard' },
          { q: 'Which built-in Node.js module handles file system operations?', a: ['path', 'http', 'fs', 'os'], c: 2, level: 'Easy' },
          { q: 'What is the purpose of body-parser middleware in Express?', a: ['To parse cookies', 'To parse incoming request bodies in a middleware before handlers', 'To compress HTML payloads', 'To log request details'], c: 1, level: 'Easy' },
          { q: 'What is the main task of the libuv library in Node.js?', a: ['To compile JavaScript to machine code', 'To provide cross-platform asynchronous event-driven I/O features', 'To parse HTTP request parameters', 'To handle template rendering'], c: 1, level: 'Medium' },
          { q: 'What does HTTP status code 401 represent?', a: ['Forbidden', 'Bad Request', 'Unauthorized', 'Not Found'], c: 2, level: 'Medium' },
          { q: 'In Express, what does next() do inside a middleware function?', a: ['Ends the HTTP request', 'Passes control to the next middleware in the queue', 'Redirects to login page', 'Restarts the server'], c: 1, level: 'Hard' }
        ]
      },
      {
        id: 'databases',
        name: 'Database Engineering (SQL vs NoSQL)',
        subtopics: [
          'Relational database design schemas (Tables, Primary/Foreign keys, constraints)',
          'NoSQL document datastores (MongoDB BSON formats, collections, embedded vs reference designs)',
          'Index optimizations (B-trees, single/compound index selection, analyzing explain plans)',
          'ACID transaction execution models (Atomicity, Consistency, Isolation levels, Durability)',
          'Advanced query patterns (JOIN tables relations, aggregation framework pipelines)'
        ],
        quizzes: [
          { q: 'Which database model represents records in a collection of JSON-like document formats?', a: ['Relational (SQL)', 'Hierarchical', 'Document Store (NoSQL)', 'Network Model'], c: 2, level: 'Easy' },
          { q: 'What does a Primary Key represent in a database table?', a: ['A secret access key', 'A field that uniquely identifies each record in that table', 'A foreign index reference', 'None of the above'], c: 1, level: 'Easy' },
          { q: 'What is database indexing primarily used for?', a: ['Enforcing security credentials', 'Speeding up query execution by reducing table scans', 'Restricting data insertion speeds', 'Saving hard drive storage space'], c: 1, level: 'Medium' },
          { q: 'What does the "A" in the ACID transaction model guarantee?', a: ['Availability of servers', 'Atomicity (all operations succeed or all fail)', 'Algorithms verification', 'Authentication protocols'], c: 1, level: 'Medium' },
          { q: 'In a relational database, what type of JOIN returns records that have matching values in both tables?', a: ['LEFT OUTER JOIN', 'FULL OUTER JOIN', 'INNER JOIN', 'RIGHT OUTER JOIN'], c: 2, level: 'Hard' },
          { q: 'Which keyword is used to eliminate duplicate rows from a SELECT query result?', a: ['UNIQUE', 'DISTINCT', 'DIFFERENT', 'GROUP BY'], c: 1, level: 'Easy' },
          { q: 'What is the NoSQL equivalent of a table in a relational database?', a: ['Row', 'Collection', 'Document', 'Index'], c: 1, level: 'Easy' },
          { q: 'What is the default indexing data structure in relational database tables?', a: ['Hash Set', 'B-Tree / B+ Tree', 'Singly Linked List', 'Min Heap'], c: 1, level: 'Medium' },
          { q: 'What isolation level in ACID transactions prevents dirty reads but allows non-repeatable reads?', a: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'], c: 1, level: 'Hard' },
          { q: 'What type of index combines multiple columns to optimize filtering queries?', a: ['Single Index', 'Compound Index', 'Clustered Index', 'Unique Index'], c: 1, level: 'Hard' }
        ]
      },
      {
        id: 'devops_hosting',
        name: 'DevOps, CI/CD & Deployments',
        subtopics: [
          'Git collaborative flows (Branching systems, merging conflicts resolution, pull requests)',
          'Docker containerization engines (Writing Dockerfiles, layers caching, container volumes)',
          'CI/CD automated flows (Pipeline verification tests, compilation runs, auto deployments)',
          'Server configurations & Reverse Proxies (Nginx routing rules, request buffering, load balancing)',
          'Security protocols (SSL/TLS configuration, domain settings, environment variables isolation)'
        ],
        quizzes: [
          { q: 'Which version control system is commonly used to collaborate on codebase updates?', a: ['Docker', 'Kubernetes', 'Git', 'Jenkins'], c: 2, level: 'Easy' },
          { q: 'What is Docker used for in modern web deployment?', a: ['Writing clean database queries', 'Packaging apps and their dependencies into portable containers', 'Securing user passwords', 'Speeding up API routing speeds'], c: 1, level: 'Easy' },
          { q: 'What does a Reverse Proxy (like Nginx) do?', a: ['Authenticates client users', 'Forwards incoming client requests to backend application servers', 'Decrypts data packages', 'Encrypts hard drives'], c: 1, level: 'Medium' },
          { q: 'Which port is standard for secure HTTPS traffic?', a: ['80', '8080', '443', '22'], c: 2, level: 'Medium' },
          { q: 'What is the main goal of a CI/CD pipeline?', a: ['To prevent database indexing', 'To automate testing, building, and deploying of code updates', 'To write documentation templates', 'To scan for hardware errors'], c: 1, level: 'Hard' },
          { q: 'Which Git command is used to combine branches by reapplying commits onto another base tip?', a: ['git merge', 'git rebase', 'git checkout', 'git push'], c: 1, level: 'Easy' },
          { q: 'What is the purpose of EXPOSE instruction in a Dockerfile?', a: ["Maps host directory to container path", "Documents which ports the container intends to listen on", "Secures container environment variables", "Runs build instructions inside the container"], "c": 1, "level": "Easy"},
          {"q": "Which Nginx configuration block defines standard virtual servers routing parameters?", "a": ["events", "http", "server", "upstream"], "c": 2, "level": "Medium"},
          {"q": "What is the function of the main event loop in Nginx?", "a": ["To compile static scripts", "To handle network requests asynchronously with non-blocking worker cycles", "To compile CSS styles", "None of the above"], "c": 1, "level": "Hard"},
          {"q": "What is standard for storing sensitive credentials in production hosting?", "a": ["In source code files", "In isolated environment variables (.env)", "In public database tables", "None of the above"], "c": 1, "level": "Hard"}
        ]
      }
    ]
  }
};

export function CoursesView({ user, onEnroll, onClearTopic, customCourses = [], onCreateCustomCourse }) {
  const safeUser = user || { enrolledCourses: {} };
  const [selectedCourse, setSelectedCourse] = React.useState(null);
  const [selectedTopic, setSelectedTopic] = React.useState(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  
  // Custom Course Form State
  const [customTitle, setCustomTitle] = React.useState('');
  const [customDesc, setCustomDesc] = React.useState('');
  const [customTopics, setCustomTopics] = React.useState([{ name: '', subtopicsText: '' }]);

  // Quiz State
  const [quizAnswers, setQuizAnswers] = React.useState({}); 
  const [quizSubmitted, setQuizSubmitted] = React.useState(false);
  const [quizScore, setQuizScore] = React.useState(0);
  const [activeQuestion, setActiveQuestion] = React.useState(0);

  const startQuiz = (topic) => {
    setSelectedTopic(topic);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setActiveQuestion(0);
  };

  const handleSelectOption = (qIdx, optIdx) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleQuizSubmit = (quizQuestions) => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.c) score += 1;
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const handleAddTopicField = () => {
    setCustomTopics([...customTopics, { name: '', subtopicsText: '' }]);
  };

  const handleRemoveTopicField = (idx) => {
    setCustomTopics(customTopics.filter((_, i) => i !== idx));
  };

  const handleTopicChange = (idx, field, value) => {
    const updated = [...customTopics];
    updated[idx][field] = value;
    setCustomTopics(updated);
  };

  const handlePublishCustomCourse = () => {
    if (!customTitle || !customDesc) return alert("Please specify title and description.");
    const validTopics = customTopics.filter(t => t.name.trim() !== '');
    if (validTopics.length === 0) return alert("Please add at least one topic with a name.");

    const formattedTopics = validTopics.map(t => ({
      name: t.name.trim(),
      subtopics: t.subtopicsText.split(',').map(s => s.trim()).filter(Boolean)
    }));

    onCreateCustomCourse(customTitle.trim(), customDesc.trim(), formattedTopics);
    
    // Reset form
    setCustomTitle('');
    setCustomDesc('');
    setCustomTopics([{ name: '', subtopicsText: '' }]);
    setShowCreateForm(false);
  };

  // Combine static and custom courses
  const allCourses = React.useMemo(() => {
    const map = { ...COURSES_DATA };
    customCourses.forEach(c => {
      map[c.id] = c;
    });
    return map;
  }, [customCourses]);

  if (showCreateForm) {
    return (
      <div className="animate-fadeIn max-w-3xl space-y-6 text-on-surface pb-20">
        <button 
          onClick={() => setShowCreateForm(false)} 
          className="text-sm font-bold text-outline hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
        >
          ← Cancel & Back
        </button>
        <div className="bg-white p-8 rounded-lg border border-outline-variant shadow-md space-y-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-secondary/15 text-secondary rounded">
              Creator Studio
            </span>
            <h2 className="text-2xl font-bold mt-2 text-primary">Create Custom Course Blueprint</h2>
            <p className="text-xs text-on-surface-variant mt-1">Design your own course and publish it to the database for validation certification.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-outline uppercase">Course Title</label>
              <input 
                type="text" 
                value={customTitle} 
                onChange={e => setCustomTitle(e.target.value)} 
                placeholder="e.g. Advanced System Design" 
                className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-outline uppercase">Description</label>
              <textarea 
                value={customDesc} 
                onChange={e => setCustomDesc(e.target.value)} 
                placeholder="Brief summary of what students will achieve in this syllabus roadmap..." 
                className="w-full p-3 rounded border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white min-h-[80px]"
              />
            </div>
          </div>

          <hr className="border-outline-variant" />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-outline uppercase tracking-wider">Course Syllabus / Topics</h3>
              <button 
                onClick={handleAddTopicField} 
                className="px-3 py-1 bg-primary text-white text-xs font-bold rounded cursor-pointer border-none"
              >
                + Add Topic
              </button>
            </div>

            <div className="space-y-4">
              {customTopics.map((topic, idx) => (
                <div key={idx} className="p-4 rounded border border-outline-variant bg-surface-container-low space-y-3 relative">
                  {customTopics.length > 1 && (
                    <button 
                      onClick={() => handleRemoveTopicField(idx)} 
                      className="absolute top-2 right-2 text-xs font-bold text-red-500 bg-transparent border-none cursor-pointer hover:underline"
                    >
                      Remove
                    </button>
                  )}
                  <div className="space-y-1 pr-12">
                    <label className="block text-[10px] font-bold text-outline uppercase">Topic {idx + 1} Name</label>
                    <input 
                      type="text" 
                      value={topic.name} 
                      onChange={e => handleTopicChange(idx, 'name', e.target.value)} 
                      placeholder="e.g. Designing Load Balancers" 
                      className="w-full p-2.5 rounded border border-outline-variant text-sm bg-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-outline uppercase">Detailed Subtopics (Comma-separated)</label>
                    <textarea 
                      value={topic.subtopicsText} 
                      onChange={e => handleTopicChange(idx, 'subtopicsText', e.target.value)} 
                      placeholder="e.g. Reverse proxy mechanisms, Round-robin routing, Sticky sessions, Health checks" 
                      className="w-full p-2.5 rounded border border-outline-variant text-xs bg-white outline-none min-h-[60px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handlePublishCustomCourse} 
            className="w-full py-3 bg-secondary text-white rounded font-bold text-sm hover:opacity-90 active:scale-95 transition-all border-none cursor-pointer"
          >
            Publish Course Blueprint
          </button>
        </div>
      </div>
    );
  }

  if (selectedTopic) {
    const questions = selectedTopic.quizzes;
    const progress = safeUser.enrolledCourses?.[selectedCourse.id] || { clearedTopics: [] };
    const isAlreadyCleared = progress.clearedTopics?.includes(selectedTopic.id);

    return (
      <div className="animate-fadeIn max-w-3xl space-y-6 text-on-surface pb-20">
        <button 
          onClick={() => setSelectedTopic(null)} 
          className="text-sm font-bold text-outline hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
        >
          ← Back to Course Topics
        </button>
        <div className="bg-white p-8 rounded-lg border border-outline-variant shadow-md space-y-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-primary/10 text-primary rounded">
              Topic Details
            </span>
            <h2 className="text-2xl font-bold mt-2 text-primary">{selectedTopic.name}</h2>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-outline uppercase tracking-wider">Subtopics Covered:</h3>
            <ul className="space-y-2">
              {selectedTopic.subtopics.map((sub, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-base mt-0.5">check_circle</span>
                  <span>{sub}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-outline-variant" />

          {isAlreadyCleared ? (
            <div className="p-6 bg-secondary/10 border border-secondary rounded-lg text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-secondary animate-bounce">verified</span>
              <h3 className="text-lg font-bold text-secondary">Topic Verified & Completed!</h3>
              <p className="text-xs text-on-surface-variant">You have cleared this topic and claimed your 100 XP. You can practice again any time.</p>
              <button 
                onClick={() => { setSelectedTopic(null); }}
                className="mt-2 bg-secondary text-white px-6 py-2 rounded font-bold text-sm border-none cursor-pointer hover:opacity-90"
              >
                Go Back to Topics
              </button>
            </div>
          ) : !quizSubmitted ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-surface-container p-4 rounded-lg">
                <h4 className="font-bold text-sm text-primary">Topic Quiz: Verification Required</h4>
                <span className="text-xs font-bold text-outline">Question {activeQuestion + 1} of {questions.length}</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    questions[activeQuestion].level === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                    questions[activeQuestion].level === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {questions[activeQuestion].level}
                  </span>
                </div>
                <p className="font-bold text-lg">{questions[activeQuestion].q}</p>
                <div className="space-y-2">
                  {questions[activeQuestion].a.map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(activeQuestion, optIdx)}
                      className={`w-full p-4 rounded border text-left text-sm font-semibold cursor-pointer transition-colors ${
                        quizAnswers[activeQuestion] === optIdx 
                          ? 'border-secondary bg-secondary/10 text-secondary' 
                          : 'border-outline-variant bg-white hover:bg-surface-container'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  disabled={activeQuestion === 0}
                  onClick={() => setActiveQuestion(q => q - 1)}
                  className="px-4 py-2 border border-outline-variant rounded text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                {activeQuestion < questions.length - 1 ? (
                  <button
                    disabled={quizAnswers[activeQuestion] === undefined}
                    onClick={() => setActiveQuestion(q => q + 1)}
                    className="px-6 py-2 bg-primary text-white rounded text-xs font-bold disabled:opacity-50 cursor-pointer border-none"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    disabled={Object.keys(quizAnswers).length < questions.length}
                    onClick={() => handleQuizSubmit(questions)}
                    className="px-6 py-2.5 bg-secondary text-white rounded text-sm font-bold disabled:opacity-50 cursor-pointer border-none"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 py-6">
              <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 border-outline-variant">
                <span className="text-3xl font-extrabold text-primary">{quizScore}/{questions.length}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">{quizScore >= 7 ? '🎉 Congratulations!' : '😢 Practice makes perfect'}</h3>
                <p className="text-sm text-on-surface-variant mt-2">
                  {quizScore >= 7 
                    ? `You passed the validation with ${quizScore} correct answers! Let's claim your reward and unlock the next topic.` 
                    : `You scored ${quizScore}/${questions.length}. You need at least 7 correct answers to clear this topic and proceed.`
                  }
                </p>
              </div>
              
              <div className="flex gap-4 justify-center">
                {quizScore >= 7 ? (
                  <button
                    onClick={() => {
                      onClearTopic(selectedCourse.id, selectedTopic.id);
                      setSelectedTopic(null);
                    }}
                    className="bg-secondary text-white px-8 py-3 rounded font-bold text-sm cursor-pointer border-none hover:opacity-90 active:scale-95 transition-all"
                  >
                    Claim 100 XP & Complete Topic
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedTopic(null)}
                      className="px-6 py-3 border border-outline-variant rounded font-bold text-sm cursor-pointer hover:bg-surface-container bg-white"
                    >
                      Close & Review
                    </button>
                    <button
                      onClick={() => startQuiz(selectedTopic)}
                      className="bg-primary text-white px-6 py-3 rounded font-bold text-sm cursor-pointer border-none hover:opacity-90"
                    >
                      Retry Quiz
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedCourse) {
    const courseProgress = safeUser.enrolledCourses?.[selectedCourse.id];
    const isEnrolled = !!courseProgress;
    const isFullEnrollment = courseProgress?.type === 'full';
    const enrolledSections = courseProgress?.enrolledSections || [];
    const clearedList = courseProgress?.clearedTopics || [];
    const percent = isEnrolled ? Math.round((clearedList.length / selectedCourse.topics.length) * 100) : 0;

    return (
      <div className="animate-fadeIn max-w-4xl space-y-6 text-on-surface pb-20">
        <button 
          onClick={() => setSelectedCourse(null)} 
          className="text-sm font-bold text-outline hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
        >
          ← Back to Courses List
        </button>

        <div className={`p-8 rounded-lg bg-gradient-to-br ${selectedCourse.color} text-white shadow-md space-y-4`}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-4xl">{selectedCourse.icon}</span>
              <h2 className="text-3xl font-bold">{selectedCourse.title}</h2>
            </div>
            {!isFullEnrollment && (
              <button 
                onClick={() => onEnroll(selectedCourse.id, 'full')}
                className="bg-white text-secondary px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-surface-container-lowest transition-all cursor-pointer border-none shrink-0"
              >
                Enroll in Full Course
              </button>
            )}
          </div>
          <p className="max-w-2xl text-white/95 text-sm">{selectedCourse.desc}</p>
          {selectedCourse.creatorName && (
            <p className="text-xs text-white/80">Created dynamically by: <b>{selectedCourse.creatorName}</b></p>
          )}
          {isEnrolled ? (
            <div className="max-w-md pt-2">
              <div className="flex justify-between text-xs font-bold mb-1 opacity-90">
                <span>Progress: {clearedList.length} of {selectedCourse.topics.length} topics ({isFullEnrollment ? 'Full Access' : 'Sectional Access'})</span>
                <span>{percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded text-xs font-bold mt-2">
              <span className="material-symbols-outlined text-sm">info</span>
              <span>Preview Mode: You can enroll in the full course or select specific topics below!</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-lg text-primary">Topics Blueprint</h3>
          <div className="space-y-3">
            {selectedCourse.topics.map((topic, idx) => {
              const isCleared = clearedList.includes(topic.id);
              const isSectionEnrolled = enrolledSections.includes(topic.id);
              const isUnlocked = isFullEnrollment 
                ? (idx === 0 || clearedList.includes(selectedCourse.topics[idx - 1].id))
                : isSectionEnrolled;

              return (
                <div 
                  key={topic.id}
                  className={`p-6 rounded-lg border flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all ${
                    isCleared ? 'bg-secondary/5 border-secondary/20' : 
                    isUnlocked ? 'bg-white border-outline-variant hover:border-primary/40 shadow-sm' : 
                    isEnrolled ? 'bg-surface-container border-outline-variant/50 opacity-65' : 'bg-white border-outline-variant shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-outline">Topic {idx + 1}</span>
                      {isCleared && <span className="text-[10px] bg-secondary text-white font-bold px-2 py-0.5 rounded">Cleared</span>}
                      {isSectionEnrolled && !isFullEnrollment && <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded">Section Enrolled</span>}
                    </div>
                    <h4 className="font-bold text-lg text-primary">{topic.name}</h4>
                    <p className="text-xs text-on-surface-variant mb-2">{topic.subtopics?.length || 0} subtopics covered:</p>
                    <ul className="pl-4 space-y-1 list-disc text-xs text-on-surface-variant font-medium">
                      {topic.subtopics?.map((sub, sidx) => <li key={sidx}>{sub}</li>)}
                    </ul>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isCleared ? (
                      <button 
                        onClick={() => startQuiz(topic)}
                        className="px-4 py-2 border border-secondary text-secondary font-bold text-xs rounded hover:bg-secondary/10 cursor-pointer bg-white"
                      >
                        Review Topic
                      </button>
                    ) : isUnlocked ? (
                      <button 
                        onClick={() => startQuiz(topic)}
                        className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded hover:opacity-90 active:scale-95 transition-all border-none cursor-pointer"
                      >
                        Study & Verify
                      </button>
                    ) : !isFullEnrollment && !isSectionEnrolled ? (
                      <button 
                        onClick={() => onEnroll(selectedCourse.id, 'section', topic.id)}
                        className="px-4 py-2 border border-secondary text-secondary font-bold text-xs rounded hover:bg-secondary/10 cursor-pointer bg-white"
                      >
                        Enroll in Section
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-outline text-xs font-bold mr-2">
                        <span className="material-symbols-outlined text-sm">lock</span> Locked
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isFullEnrollment && (
          <div className="bg-surface-container p-6 rounded-lg text-center space-y-4 border border-outline-variant">
            <h3 className="font-bold text-lg text-primary">Start your full journey today!</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">Get full access to all study levels sequentially, verification tests, and unlock automatic progression triggers.</p>
            <button 
              onClick={() => onEnroll(selectedCourse.id, 'full')}
              className="bg-secondary text-white px-8 py-3 rounded font-bold text-sm hover:opacity-90 active:scale-95 transition-all border-none cursor-pointer"
            >
              Enroll in Full Course
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn max-w-4xl space-y-8 text-on-surface">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Duo Learning Academies</h2>
          <p className="text-on-surface-variant">Enroll in professional blueprints, complete detailed subtopics, and pass quizzes to claim rewards.</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)} 
          className="px-4 py-2.5 bg-secondary text-white text-sm font-bold rounded shadow hover:opacity-90 transition-all border-none cursor-pointer flex items-center gap-2 self-start sm:self-center"
        >
          <span className="material-symbols-outlined text-sm">add</span> Custom Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(allCourses).map(course => {
          const progress = safeUser.enrolledCourses?.[course.id];
          const isEnrolled = !!progress;
          const isFullEnrollment = progress?.type === 'full';
          const clearedCount = progress?.clearedTopics?.length || 0;
          const pct = isEnrolled ? Math.round((clearedCount / course.topics.length) * 100) : 0;

          return (
            <div key={course.id} className="bg-white rounded-lg border border-outline-variant overflow-hidden shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className={`p-6 bg-gradient-to-br ${course.color} text-white space-y-3`}>
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-3xl">{course.icon}</span>
                  <span className="text-[10px] font-bold uppercase border border-white/40 px-2 py-0.5 rounded">
                    {course.topics.length} Topics
                  </span>
                </div>
                <h3 className="text-xl font-bold">{course.title}</h3>
                <p className="text-xs text-white/90 line-clamp-2">{course.desc}</p>
                {course.creatorName && (
                  <p className="text-[10px] text-white/70">By: {course.creatorName}</p>
                )}
              </div>

              <div className="p-6 space-y-4">
                {isEnrolled ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-outline">
                      <span>Blueprint Progress ({isFullEnrollment ? 'Full' : 'Sectional'})</span>
                      <span>{pct}% Completed</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-secondary transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant">Structured study roadmap with {course.topics.reduce((acc, t) => acc + (t.subtopics?.length || 0), 0)}+ subtopics and verification tests.</p>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedCourse(course)}
                    className="flex-1 py-2.5 border border-outline-variant bg-white text-on-surface font-bold text-xs rounded hover:bg-surface-container cursor-pointer"
                  >
                    View Syllabus
                  </button>
                  {!isFullEnrollment && (
                    <button 
                      onClick={() => onEnroll(course.id, 'full')}
                      className="flex-1 py-2.5 bg-secondary text-white font-bold text-xs rounded hover:opacity-90 cursor-pointer border-none"
                    >
                      {isEnrolled ? 'Upgrade to Full' : 'Enroll Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
