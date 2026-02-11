import React, { useState, useEffect } from 'react';
import { 
  Trophy, BookOpen, Clock, Flame, Plus, Activity, 
  Target, CheckCircle, Heart, Sparkles, ArrowRight, 
  LayoutDashboard, LogOut, Settings, User, Trash2, 
  BarChart3, Save, X, Timer, Award, Play, Calendar 
} from 'lucide-react';

// Import Firebase functions
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  updateDoc, addDoc, serverTimestamp 
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
];

// --- Default Data for New Setup ---
const DEFAULT_USERS = {
  user1: {
    id: 'user1',
    name: 'Alex',
    role: 'Web Developer',
    avatar: '👨‍💻',
    level: 1,
    xp: 0,
    maxXp: 500,
    streak: 0,
    badges: [],
    focusStatus: { isActive: false, endTime: null, subject: '' },
    subjects: [
      { id: 's1', name: 'React', color: 'bg-blue-500', progress: 0 },
      { id: 's2', name: 'Node.js', color: 'bg-green-500', progress: 0 },
      { id: 's3', name: 'Tailwind', color: 'bg-cyan-400', progress: 0 }
    ],
    goals: [
      { id: 'g1', text: 'Build a Portfolio', completed: false },
      { id: 'g2', text: 'Complete React Course', completed: false }
    ]
  },
  user2: {
    id: 'user2',
    name: 'Sam',
    role: 'Academic Scholar',
    avatar: '👩‍🎓',
    level: 1,
    xp: 0,
    maxXp: 500,
    streak: 0,
    badges: [],
    focusStatus: { isActive: false, endTime: null, subject: '' },
    subjects: [
      { id: 's4', name: 'Calculus', color: 'bg-red-500', progress: 0 },
      { id: 's5', name: 'History', color: 'bg-amber-500', progress: 0 },
      { id: 's6', name: 'Literature', color: 'bg-purple-500', progress: 0 }
    ],
    goals: [
      { id: 'g3', text: 'Read 2 Books', completed: false },
      { id: 'g4', text: 'Pass Finals', completed: false }
    ]
  }
};

// --- Helper Components ---
const ProgressBar = ({ current, max, color = 'bg-indigo-500', height = 'h-2' }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className={`w-full ${height} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
      <div className={`${height} ${color} transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const Avatar = ({ icon, size = 'text-2xl', bg = 'bg-slate-100', className = '' }) => (
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
  const userLogs = feed.filter(f => f.userId === user.id || f.userName === user.name);
  
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
    if (!minutes) return 'bg-slate-200 dark:bg-slate-700';
    if (minutes < 30) return 'bg-emerald-200 dark:bg-emerald-900';
    if (minutes < 60) return 'bg-emerald-300 dark:bg-emerald-700';
    if (minutes < 120) return 'bg-emerald-400 dark:bg-emerald-600';
    return 'bg-emerald-600 dark:bg-emerald-500';
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-slate-400" /> Study Consistency
      </h3>
      <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
        {dates.map((date, idx) => {
          const dateStr = date.toDateString();
          return (
            <div key={idx} title={`${dateStr}: ${activityMap[dateStr] || 0} mins`}
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm ${getColor(activityMap[dateStr])} transition-all hover:scale-125 cursor-default`}
            ></div>
          );
        })}
      </div>
    </div>
  );
};

// --- HELPER FOR DB PATHS ---
// If running locally with your keys, use simple root paths ('duo_users').
// If running in Canvas preview, use the secure 'artifacts' paths.
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
  const [user, setUser] = useState(null); 
  const [activeProfileId, setActiveProfileId] = useState('user1'); 
  const [usersData, setUsersData] = useState(null);
  const [feedData, setFeedData] = useState([]);
  const [view, setView] = useState('dashboard');
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Authenticate
  useEffect(() => {
    const initAuth = async () => {
      // Check for environment token first (Preview Mode), else Anonymous (Local/Production)
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth().catch(err => console.error("Auth failed:", err));

    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. Real-time Data Listeners
  useEffect(() => {
    if (!user) return;

    // Listen to "duo_users" collection
    const usersRef = getCollectionPath('duo_users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => { data[doc.id] = doc.data(); });

      // If database is empty, create default users
      if (Object.keys(data).length === 0) {
        seedDatabase();
      } else {
        setUsersData(data);
        setLoading(false);
      }
    });

    // Listen to "duo_logs" collection
    const logsRef = getCollectionPath('duo_logs');
    const unsubLogs = onSnapshot(logsRef, (snapshot) => {
      const logs = [];
      snapshot.forEach(doc => { logs.push({ id: doc.id, ...doc.data() }); });
      // Sort by timestamp (handling both Firestore timestamps and dates)
      logs.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      setFeedData(logs);
    });

    return () => { unsubUsers(); unsubLogs(); };
  }, [user]);

  const seedDatabase = async () => {
    try {
      await setDoc(getDocRef('duo_users', 'user1'), DEFAULT_USERS.user1);
      await setDoc(getDocRef('duo_users', 'user2'), DEFAULT_USERS.user2);
    } catch (e) { console.error("Seeding failed", e); }
  };

  const currentUser = usersData ? usersData[activeProfileId] : DEFAULT_USERS.user1;
  const partnerUser = usersData ? (activeProfileId === 'user1' ? usersData['user2'] : usersData['user1']) : DEFAULT_USERS.user2;

  // --- Actions ---

  const handleLike = async (feedId) => {
    if (!user) return;
    const feedItem = feedData.find(f => f.id === feedId);
    if (!feedItem) return;
    const logRef = getDocRef('duo_logs', feedId);
    await updateDoc(logRef, { likes: (feedItem.likes || 0) + 1 });
  };

  const updateProfile = async (updates) => {
    if (!user || !currentUser) return;
    const userRef = getDocRef('duo_users', activeProfileId);
    await updateDoc(userRef, updates);
  };

  const addSubject = async (subjectName) => {
    if (!user || !currentUser || !subjectName) return;
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-rose-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newSubject = { id: 's' + Date.now(), name: subjectName, color: randomColor, progress: 0 };
    const userRef = getDocRef('duo_users', activeProfileId);
    await updateDoc(userRef, { subjects: [...currentUser.subjects, newSubject] });
  };

  const deleteSubject = async (subjectId) => {
    if (!user || !currentUser) return;
    const userRef = getDocRef('duo_users', activeProfileId);
    await updateDoc(userRef, { subjects: currentUser.subjects.filter(s => s.id !== subjectId) });
  };

  const setFocusStatus = async (isActive, minutes = 0, subject = '') => {
    if (!user || !currentUser) return;
    const userRef = getDocRef('duo_users', activeProfileId);
    const endTime = isActive && minutes > 0 ? Date.now() + (minutes * 60 * 1000) : null;
    await updateDoc(userRef, { focusStatus: { isActive, endTime, subject } });
  };

  const toggleGoal = async (goalId) => {
    if (!user || !currentUser) return;
    const updatedGoals = currentUser.goals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
    const userRef = getDocRef('duo_users', activeProfileId);
    await updateDoc(userRef, { goals: updatedGoals });
  };

  const addGoal = async (text) => {
     if (!user || !currentUser || !text) return;
     const newGoal = { id: Date.now().toString(), text, completed: false };
     const userRef = getDocRef('duo_users', activeProfileId);
     await updateDoc(userRef, { goals: [...currentUser.goals, newGoal] });
  };

  const addLog = async (subject, duration, note) => {
    if (!user || !currentUser) return;

    // Calc Stats
    const xpGained = parseInt(duration) * 2;
    let newXp = currentUser.xp + xpGained;
    let newLevel = currentUser.level;
    let newMaxXp = currentUser.maxXp;

    if (newXp >= currentUser.maxXp) {
      newXp = newXp - currentUser.maxXp;
      newLevel += 1;
      newMaxXp = Math.floor(newMaxXp * 1.2);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    const updatedSubjects = currentUser.subjects.map(s => 
      s.id === subject.id ? { ...s, progress: Math.min(100, (s.progress || 0) + 10) } : s
    );

    // Badges Check
    const currentBadges = currentUser.badges || [];
    const earnedBadges = [...currentBadges];
    let newlyUnlocked = null;
    const tempUser = { ...currentUser, xp: currentUser.xp + xpGained, level: newLevel, streak: currentUser.streak }; 

    BADGES.forEach(badge => {
        if (!earnedBadges.includes(badge.id)) {
            if (badge.condition(tempUser, { duration })) {
                earnedBadges.push(badge.id);
                newlyUnlocked = badge;
            }
        }
    });

    if (newlyUnlocked) {
        setUnlockedBadge(newlyUnlocked);
        setTimeout(() => setUnlockedBadge(null), 4000);
    }

    // Update User
    const userRef = getDocRef('duo_users', activeProfileId);
    await updateDoc(userRef, {
      xp: newXp,
      level: newLevel,
      maxXp: newMaxXp,
      subjects: updatedSubjects,
      badges: earnedBadges,
      streak: (currentUser.streak || 0) // Real streak logic would require date comparison
    });

    // Add Log
    const logsRef = getCollectionPath('duo_logs');
    await addDoc(logsRef, {
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      action: 'studied',
      subject: subject.name,
      duration: parseInt(duration),
      note: note,
      likes: 0,
      timestamp: serverTimestamp() 
    });
    
    setIsLogModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
        <Sparkles className="animate-spin mr-2" /> Loading your duo space...
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 md:flex">
      
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-6xl animate-bounce bg-white dark:bg-slate-800 p-12 rounded-3xl shadow-2xl border-4 border-indigo-500">🎉 LEVEL UP! 🎉</div>
        </div>
      )}

      {unlockedBadge && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border-4 border-amber-400 text-center transform scale-110 transition-transform">
             <div className="text-6xl mb-4 animate-bounce">{unlockedBadge.icon}</div>
             <h2 className="text-2xl font-bold text-amber-500 mb-2">Badge Unlocked!</h2>
             <p className="text-xl font-bold text-slate-800 dark:text-white">{unlockedBadge.name}</p>
             <p className="text-slate-500">{unlockedBadge.desc}</p>
          </div>
        </div>
      )}

      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Sparkles size={24} className="fill-current" />
            <h1 className="font-bold text-xl tracking-tight">DuoLearn</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <SidebarItem icon={<Timer />} label="Focus Mode" active={view === 'focus'} onClick={() => setView('focus')} />
          <SidebarItem icon={<BarChart3 />} label="Analytics" active={view === 'analytics'} onClick={() => setView('analytics')} /> 
          <SidebarItem icon={<Settings />} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
           <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex items-center gap-3">
             <Avatar icon={currentUser?.avatar} size="text-lg" className="w-10 h-10" />
             <div className="flex-1 min-w-0">
               <p className="font-bold text-sm truncate">{currentUser?.name}</p>
               <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Lvl {currentUser?.level} • {currentUser?.xp} XP</p>
             </div>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-xl font-bold hidden md:block capitalize">{view === 'analytics' ? 'Analytics & Badges' : view}</h2>
          <div className="md:hidden flex items-center gap-2 text-indigo-600">
             <Sparkles size={24} /> <span className="font-bold">DuoLearn</span>
          </div>
          <div className="flex items-center gap-4">
             {partnerUser?.focusStatus?.isActive && (
                <div className="hidden sm:flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 px-3 py-1.5 rounded-full text-xs font-bold border border-rose-100 dark:border-rose-900/30 animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    {partnerUser.name} is focusing...
                </div>
             )}
             <button onClick={() => setIsLogModalOpen(true)} className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                <Plus size={18} /> Log Study
              </button>
            <button onClick={() => setActiveProfileId(activeProfileId === 'user1' ? 'user2' : 'user1')} className="flex items-center gap-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors border border-transparent hover:border-slate-300">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Act as:</span>
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">{activeProfileId === 'user1' ? '👨‍💻 Alex' : '👩‍🎓 Sam'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {view === 'dashboard' && currentUser && partnerUser && (
              <DashboardView currentUser={currentUser} partnerUser={partnerUser} feed={feedData} onLike={handleLike} onAddSubject={() => setView('settings')} />
            )}
            {view === 'focus' && currentUser && (
                <FocusTimerView user={currentUser} onStatusChange={setFocusStatus} onCompleteSession={(subject, duration) => { addLog(subject, duration, "Completed a Focus Session"); setView('dashboard'); }} />
            )}
            {view === 'analytics' && currentUser && ( <AnalyticsView user={currentUser} feed={feedData} /> )}
            {view === 'settings' && currentUser && ( <SettingsView user={currentUser} onUpdateProfile={updateProfile} onAddSubject={addSubject} onDeleteSubject={deleteSubject} /> )}
            {view === 'goals' && currentUser && ( <GoalsView user={currentUser} toggleGoal={toggleGoal} addGoal={addGoal} /> )}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe z-40">
        <div className="flex justify-around p-3">
          <NavBtn icon={<LayoutDashboard />} label="Home" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavBtn icon={<Timer />} label="Focus" active={view === 'focus'} onClick={() => setView('focus')} />
          <div className="-mt-8"><button onClick={() => setIsLogModalOpen(true)} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform"><Plus size={24} /></button></div>
          <NavBtn icon={<BarChart3 />} label="Stats" active={view === 'analytics'} onClick={() => setView('analytics')} />
          <NavBtn icon={<Settings />} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
        </div>
      </nav>

      {isLogModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
             <div className="p-6"><LogSessionView user={currentUser} onCancel={() => setIsLogModalOpen(false)} onSubmit={addLog} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Views (Simplified for brevity but fully functional) ---
function DashboardView({ currentUser, partnerUser, feed, onLike }) {
  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (new Date() - date) / 1000 / 60;
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 animate-fadeIn">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="relative flex justify-between items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <Avatar icon={currentUser.avatar} size="text-3xl" className="w-16 h-16 bg-white shadow-md" />
                 <div><h2 className="text-3xl font-bold">Hi, {currentUser.name}</h2><p className="text-indigo-600 font-medium">{currentUser.role}</p></div>
              </div>
              <div className="flex gap-6 mt-4">
                 <div><p className="text-xs uppercase font-bold tracking-wider text-slate-500">Level {currentUser.level}</p><p className="text-2xl font-bold">{currentUser.xp} XP</p></div>
                 <div className="w-px bg-slate-200 h-10 self-center"></div>
                 <div><p className="text-xs uppercase font-bold tracking-wider text-slate-500">Duo Streak</p><div className="flex items-center gap-1 text-orange-500"><Flame size={20} className="fill-current"/><span className="text-2xl font-bold">{Math.max(currentUser.streak, partnerUser.streak)}</span></div></div>
              </div>
            </div>
            <div className="w-48"><ProgressBar current={currentUser.xp} max={currentUser.maxXp} height="h-3" /></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentUser.subjects.map(sub => (
              <div key={sub.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between mb-3"><div className={`w-10 h-10 rounded-xl ${sub.color} bg-opacity-10 flex items-center justify-center`}><div className={`w-3 h-3 rounded-full ${sub.color}`}></div></div><span className="text-xs font-bold text-slate-400">{sub.progress}%</span></div>
                <h4 className="font-bold text-lg mb-1">{sub.name}</h4>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className={`h-full ${sub.color}`} style={{ width: `${sub.progress}%` }}></div></div>
              </div>
            ))}
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-5 h-full min-h-[500px]">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={20} className="text-slate-400"/> Recent Activity</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {feed.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex gap-3"><Avatar icon={item.userAvatar || '👤'} size="text-lg" className="w-10 h-10 mt-1"/><div className="flex-1"><p className="text-sm"><span className="font-bold">{item.userName}</span> studied <span className="text-indigo-600 font-medium">{item.subject}</span></p><p className="text-xs text-slate-400">{formatTime(item.timestamp)}</p></div></div>
                <div className="mt-2 ml-13 pl-3 border-l-2 border-indigo-100"><p className="text-sm italic">"{item.note}"</p></div>
                <div className="flex justify-between mt-3 pt-2 border-t border-slate-50"><span className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center"><Clock size={12} className="mr-1"/> {item.duration}m</span><button onClick={() => onLike(item.id)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-500"><Heart size={14} className={item.likes > 0 ? 'fill-rose-500 text-rose-500' : ''}/> {item.likes}</button></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FocusTimerView({ user, onStatusChange, onCompleteSession }) {
    const [timeLeft, setTimeLeft] = useState(25 * 60); 
    const [isActive, setIsActive] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(user.subjects[0] || {});
    const [duration, setDuration] = useState(25);

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        else if (timeLeft === 0 && isActive) { setIsActive(false); onStatusChange(false); }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggle = () => {
        if (!isActive) { setTimeLeft(duration * 60); setIsActive(true); onStatusChange(true, duration, selectedSubject.name); }
        else { setIsActive(false); onStatusChange(false); }
    };
    
    return (
        <div className="max-w-xl mx-auto text-center pt-8 space-y-8 animate-fadeIn">
            <div><h2 className="text-3xl font-bold mb-2">Focus Mode</h2><p className="text-slate-500">Distraction-free timer.</p></div>
            <div className={`relative w-72 h-72 mx-auto flex items-center justify-center rounded-full border-8 ${isActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'} transition-all`}>
                <div className="text-6xl font-mono font-bold tabular-nums">{Math.floor(timeLeft/60).toString().padStart(2,'0')}:{(timeLeft%60).toString().padStart(2,'0')}</div>
                {isActive && <div className="absolute -bottom-4 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold animate-bounce">Focusing...</div>}
            </div>
            {!isActive ? <button onClick={toggle} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform"><Play size={24} className="inline mr-2"/> Start Session</button> : <div className="flex gap-3"><button onClick={toggle} className="flex-1 bg-white border border-slate-200 py-3 rounded-xl font-bold">Pause</button><button onClick={() => {setIsActive(false); onStatusChange(false); onCompleteSession(selectedSubject, duration - Math.ceil(timeLeft/60));}} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">Finish</button></div>}
        </div>
    );
}

function AnalyticsView({ user, feed }) {
  const userLogs = feed.filter(f => f.userId === user.id || f.userName === user.name);
  const totalMinutes = userLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  return (
    <div className="animate-fadeIn max-w-4xl space-y-8">
      <div><h2 className="text-2xl font-bold mb-1">Analytics</h2><p className="text-slate-500">Your learning habits.</p></div>
      <CalendarHeatmap user={user} feed={feed} />
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg">
         <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Award className="text-amber-300"/> Badges</h3>
         <div className="flex gap-4 flex-wrap">{BADGES.map(b => (<div key={b.id} className={`flex flex-col items-center p-3 rounded-xl ${user.badges?.includes(b.id) ? 'bg-white/10' : 'opacity-50 grayscale'}`}><div className="text-3xl mb-2">{b.icon}</div><span className="text-xs font-bold">{b.name}</span></div>))}</div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200"><p className="text-xs font-bold text-slate-500 uppercase">Total Hours</p><p className="text-2xl font-bold">{(totalMinutes/60).toFixed(1)}</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200"><p className="text-xs font-bold text-slate-500 uppercase">Sessions</p><p className="text-2xl font-bold">{userLogs.length}</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200"><p className="text-xs font-bold text-slate-500 uppercase">Streak</p><p className="text-2xl font-bold">{user.streak}</p></div>
      </div>
    </div>
  );
}

function SettingsView({ user, onUpdateProfile, onAddSubject, onDeleteSubject }) {
  const [name, setName] = useState(user.name);
  const [newSub, setNewSub] = useState('');
  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="bg-white p-6 rounded-3xl border border-slate-200">
         <h3 className="font-bold mb-4">Profile</h3>
         <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 mb-4"/>
         <button onClick={() => onUpdateProfile({ name })} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold">Save</button>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200">
         <h3 className="font-bold mb-4">Subjects</h3>
         <div className="space-y-2 mb-4">{user.subjects.map(s => <div key={s.id} className="flex justify-between p-3 bg-slate-50 rounded-xl"><span>{s.name}</span><button onClick={() => onDeleteSubject(s.id)}><Trash2 size={16} className="text-slate-400 hover:text-red-500"/></button></div>)}</div>
         <div className="flex gap-2"><input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="New Subject" className="flex-1 p-3 rounded-xl border border-slate-200"/><button onClick={() => {onAddSubject(newSub); setNewSub('');}} className="bg-indigo-50 text-indigo-600 px-5 py-2 rounded-xl font-bold">Add</button></div>
      </div>
    </div>
  );
}

function GoalsView({ user, toggleGoal, addGoal }) {
  const [newGoal, setNewGoal] = useState('');
  return (
    <div className="max-w-4xl animate-fadeIn">
       <h2 className="text-2xl font-bold mb-6">Goals</h2>
       <div className="space-y-3 mb-8">
        {user.goals.map(g => (
          <div key={g.id} onClick={() => toggleGoal(g.id)} className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer ${g.completed ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white'}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${g.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>{g.completed && <CheckCircle size={14} className="text-white"/>}</div>
            <span className={g.completed ? 'line-through text-emerald-700' : ''}>{g.text}</span>
          </div>
        ))}
       </div>
       <div className="flex gap-2"><input value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="New Goal..." className="flex-1 p-3 rounded-xl border-slate-200 border"/><button onClick={() => {addGoal(newGoal); setNewGoal('')}} className="bg-indigo-600 text-white px-6 rounded-xl font-bold">Add</button></div>
    </div>
  );
}

function LogSessionView({ user, onCancel, onSubmit }) {
  const [sub, setSub] = useState(user.subjects[0]);
  const [dur, setDur] = useState(30);
  const [note, setNote] = useState('');
  return (
    <div>
      <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Log Session</h2><button onClick={onCancel}><X/></button></div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">{user.subjects.map(s => <button key={s.id} onClick={() => setSub(s)} className={`p-3 rounded-xl border text-left ${sub?.id === s.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200'}`}>{s.name}</button>)}</div>
        <div><label className="text-sm font-bold text-slate-500">Duration: {dur}m</label><input type="range" min="5" max="180" step="5" value={dur} onChange={e => setDur(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg"/></div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes..." className="w-full p-4 rounded-xl border border-slate-200 min-h-[100px]"/>
        <button onClick={() => onSubmit(sub, dur, note)} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Log & Earn XP</button>
      </div>
    </div>
  );
}

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 20 })}<span>{label}</span></button>
);
const NavBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}<span className="text-[10px] font-medium">{label}</span></button>
);