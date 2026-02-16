import React, { useState, useEffect } from 'react';
import { 
  Trophy, BookOpen, Clock, Flame, Plus, Activity, 
  Target, CheckCircle, Heart, Sparkles, ArrowRight, 
  LayoutDashboard, LogOut, Settings, User, Trash2, 
  BarChart3, Save, X, Timer, Award, Play, Calendar,
  AlertCircle, RefreshCw, Eye, EyeOff, Loader2, Lock, Users,
  Maximize, Minimize
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

// Helper for App ID (Sanitized)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const appId = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '_');

// --- HELPERS ---
const getCollectionPath = (colName) => isCanvasEnvironment 
  ? collection(db, 'artifacts', appId, 'public', 'data', colName) 
  : collection(db, colName);

const getDocRef = (colName, docId) => isCanvasEnvironment 
  ? doc(db, 'artifacts', appId, 'public', 'data', colName, docId) 
  : doc(db, colName, docId);

const calculateStreak = (currentStreak, lastStudyDate) => {
  if (!lastStudyDate) return 1;
  const today = new Date();
  today.setHours(0,0,0,0);
  const last = new Date(lastStudyDate);
  last.setHours(0,0,0,0);
  const diffTime = Math.abs(today - last);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return currentStreak; 
  if (diffDays === 1) return currentStreak + 1; 
  return 1; 
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-l-4 border-red-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-4 text-sm">The app crashed due to an unexpected error.</p>
            <div className="bg-slate-100 p-3 rounded mb-6 text-xs font-mono text-red-600 overflow-auto max-h-32">
              {this.state.error.toString()}
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold">
              Reset Local Data & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children; 
  }
}

// --- CONSTANTS ---
const BADGES = [
  { id: 'b1', name: 'First Steps', icon: '🌱', desc: 'Logged your first session', condition: (u) => u.xp > 0 },
  { id: 'b2', name: 'On Fire', icon: '🔥', desc: 'Reached a 3-day streak', condition: (u) => u.streak >= 3 },
  { id: 'b3', name: 'Deep Diver', icon: '🤿', desc: 'Logged a session over 60m', condition: (u, lastSession) => lastSession && lastSession.duration >= 60 },
  { id: 'b4', name: 'Scholar', icon: '🎓', desc: 'Reached Level 5', condition: (u) => u.level >= 5 },
  { id: 'b5', name: 'Night Owl', icon: '🦉', desc: 'Studied after 10 PM', condition: (u, lastSession) => {
      const hour = new Date().getHours();
      return hour >= 22 || hour < 4; 
  }},
];

// --- MAIN APP COMPONENT ---
function AppContent() {
  const [user, setAuthUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('duo_current_user_id'));
  const [usersMap, setUsersMap] = useState({});
  const [feedData, setFeedData] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [spyTargetId, setSpyTargetId] = useState(null); // ID of user we are viewing
  const [isSaving, setIsSaving] = useState(false);

  // 1. Auth & Data Sync
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

    return () => { unsubUsers(); unsubLogs(); };
  }, [user]);

  // --- ACTIONS ---

  const handleLogin = (id) => {
    setCurrentUserId(id);
    localStorage.setItem('duo_current_user_id', id);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem('duo_current_user_id');
    setSpyTargetId(null);
  };

  const resetDatabase = async () => {
    const password = prompt("Enter admin password to reset database:");
    if(password !== "admin123") {
        if (password !== null) alert("Incorrect password.");
        return;
    }

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
    if (!user) return alert("Connecting... try again in a few seconds.");
    setIsSaving(true);
    try {
        const newId = 'user_' + Date.now();
        const newUser = {
          name, role, subjects, password, 
          xp: 0, level: 1, maxXp: 500, streak: 0, lastStudyDate: null,
          badges: [], goals: [],
          focusStatus: { isActive: false, endTime: null, subject: '' }
        };
        await setDoc(getDocRef('duo_users', newId), newUser);
        handleLogin(newId);
    } catch (e) {
        console.error(e);
        alert("Failed to create profile: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!currentUserId) return;
    setIsSaving(true);
    try {
        await updateDoc(getDocRef('duo_users', currentUserId), updates);
    } catch (e) {
        alert("Failed to update: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const addLog = async (subject, duration, note) => {
    const currentUser = usersMap[currentUserId];
    if (!currentUser) return;
    setIsSaving(true);

    try {
        const xpGained = parseInt(duration) * 2;
        let newXp = (currentUser.xp || 0) + xpGained;
        let newLevel = currentUser.level || 1;
        let newMaxXp = currentUser.maxXp || 500;

        if (newXp >= newMaxXp) {
          newXp -= newMaxXp;
          newLevel += 1;
          newMaxXp = Math.floor(newMaxXp * 1.2);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }

        const newStreak = calculateStreak(currentUser.streak || 0, currentUser.lastStudyDate);
        const currentBadges = currentUser.badges || [];
        const earnedBadges = [...currentBadges];
        let newlyUnlocked = null;
        
        BADGES.forEach(badge => {
            if (!earnedBadges.includes(badge.id)) {
                if (badge.condition({ ...currentUser, xp: currentUser.xp + xpGained, level: newLevel, streak: newStreak }, { duration })) {
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
          subjects: currentUser.subjects?.map(s => s.id === subject.id ? { ...s, progress: Math.min(100, (s.progress || 0) + 5) } : s)
        });

        await addDoc(getCollectionPath('duo_logs'), {
          userId: currentUserId, userName: currentUser.name, userAvatar: currentUser.avatar || '👤',
          action: 'studied', subject: subject.name, duration: parseInt(duration), note, likes: 0,
          timestamp: serverTimestamp()
        });
        
        setIsLogModalOpen(false);
    } catch (e) {
        alert("Failed to log: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  // --- RENDER HELPERS ---
  if (error) return <ErrorScreen error={error} />;
  if (loading) return <LoadingScreen />;

  // 3. Login Screen
  if (!currentUserId || !usersMap[currentUserId]) {
    return <LoginScreen users={usersMap} onLogin={handleLogin} onSignup={handleSignup} isSaving={isSaving} />;
  }

  // 4. Main App Logic
  const myself = usersMap[currentUserId];
  const otherUsers = Object.values(usersMap).filter(u => u.id !== currentUserId);
  
  // Decide who to show on dashboard
  const isSpying = !!spyTargetId;
  const displayUser = isSpying ? usersMap[spyTargetId] : myself;

  // Fallback if spy target disappeared
  if (isSpying && !displayUser) setSpyTargetId(null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 md:flex font-sans">
      {showConfetti && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none"><div className="text-6xl animate-bounce">🎉 LEVEL UP! 🎉</div></div>}
      {unlockedBadge && <BadgePopup badge={unlockedBadge} />}

      <Sidebar view={view} setView={(v) => { setView(v); setSpyTargetId(null); }} currentUser={myself} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          view={view} 
          isSpying={isSpying} 
          displayUser={displayUser} 
          otherUsers={otherUsers}
          onSetSpyTarget={setSpyTargetId}
          onLogClick={() => setIsLogModalOpen(true)} 
          isSaving={isSaving}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {view === 'dashboard' && <Dashboard displayUser={displayUser} feed={feedData} isSpying={isSpying} />}
            {view === 'focus' && !isSpying && <FocusTimer user={myself} onStatusChange={async (isActive, mins, subj) => { try { await updateDoc(getDocRef('duo_users', currentUserId), { focusStatus: { isActive, endTime: isActive ? Date.now() + (mins * 60000) : null, subject: subj } }); } catch(e){} }} onComplete={(s, d) => addLog(s, d, "Focus Session Complete")} />}
            {view === 'analytics' && <Analytics user={displayUser} feed={feedData} />}
            {view === 'settings' && !isSpying && <SettingsView user={myself} onUpdate={updateProfile} onLogout={handleLogout} onReset={resetDatabase} />}
            {view === 'goals' && <GoalsView user={displayUser} canEdit={!isSpying} onUpdate={async (goals) => { try { await updateDoc(getDocRef('duo_users', displayUser.id), { goals }); } catch(e){} }} />}
          </div>
        </main>
      </div>

      <MobileNav view={view} setView={(v) => { setView(v); setSpyTargetId(null); }} onLogClick={() => setIsLogModalOpen(true)} />
      {isLogModalOpen && <LogModal user={myself} onClose={() => setIsLogModalOpen(false)} onSubmit={addLog} isSaving={isSaving} />}
    </div>
  );
}

// Wrap default export with Error Boundary
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

// --- SUB-COMPONENTS ---

const LoginScreen = ({ users, onLogin, onSignup, isSaving }) => {
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
    const subjects = [{ id: 's1', name: sub1, progress: 0, color: 'bg-blue-500' }];
    if (sub2) subjects.push({ id: 's2', name: sub2, progress: 0, color: 'bg-purple-500' });
    onSignup(name, role, subjects, signupPassword);
  };

  const handleLoginSubmit = () => {
    if (!selectedUser) return;
    if (selectedUser.password && selectedUser.password !== loginPassword) {
      alert("Incorrect Password");
      return;
    }
    onLogin(selectedUser.id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-4 text-indigo-600"><Sparkles size={40} /></div>
          <h1 className="text-3xl font-bold mb-2 text-slate-800 dark:text-white">DuoLearn</h1>
          <p className="text-slate-500">Learn together, grow together.</p>
        </div>

        {mode === 'login' ? (
          !selectedUser ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Who are you?</h2>
              {Object.values(users).length === 0 && <p className="text-slate-400 text-center">No profiles found.</p>}
              {Object.values(users).map(u => (
                <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                  <Avatar icon={u.avatar || '👤'} />
                  <div><div className="font-bold text-lg">{u.name}</div><div className="text-sm text-slate-500">{u.role}</div></div>
                  <ArrowRight className="ml-auto text-slate-300" />
                </button>
              ))}
              <button onClick={() => setMode('signup')} className="w-full py-3 text-indigo-600 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl mt-4">+ Create New Profile</button>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setSelectedUser(null); setLoginPassword(''); }} className="text-sm text-slate-500 hover:underline mb-2">← Back to profiles</button>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Lock size={20} /> Login as {selectedUser.name}
              </h2>
              <Input label="Password" type="password" value={loginPassword} onChange={setLoginPassword} placeholder="Enter your password" />
              <button onClick={handleLoginSubmit} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex justify-center">Login</button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Create Profile</h2>
            <Input label="Name" value={name} onChange={setName} placeholder="e.g. Alex" />
            <Input label="Password" type="password" value={signupPassword} onChange={setSignupPassword} placeholder="Secret password" />
            <Input label="Role" value={role} onChange={setRole} placeholder="e.g. Developer" />
            <Input label="Main Subject" value={sub1} onChange={setSub1} placeholder="e.g. React" />
            <Input label="Secondary Subject" value={sub2} onChange={setSub2} placeholder="e.g. Node" />
            <div className="flex gap-3 pt-4">
              <button onClick={() => setMode('login')} className="flex-1 py-3 text-slate-500 font-bold">Cancel</button>
              <button onClick={handleSignupSubmit} disabled={isSaving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex justify-center">{isSaving ? <Loader2 className="animate-spin"/> : 'Start'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Header = ({ view, isSpying, displayUser, otherUsers, onSetSpyTarget, onLogClick, isSaving }) => {
  const [showSpyMenu, setShowSpyMenu] = useState(false);

  useEffect(() => {
    const closeMenu = () => setShowSpyMenu(false);
    if(showSpyMenu) window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [showSpyMenu]);

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold capitalize text-slate-800 dark:text-white hidden md:block">
          {isSpying ? `Viewing ${displayUser.name}` : (view === 'analytics' ? 'Analytics' : view)}
        </h2>
        {isSaving && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Saving...</span>}
      </div>
      
      <div className="flex items-center gap-3">
        {otherUsers.map(u => {
           const isFocusing = u.focusStatus?.isActive && u.focusStatus?.endTime && u.focusStatus.endTime > Date.now();
           if (!isFocusing) return null;
           return (
            <div key={u.id} className="hidden sm:flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse border border-rose-100">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />{u.name} is focusing...
            </div>
           );
        })}

        {!isSpying && (
          <button onClick={onLogClick} className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-transform hover:scale-105">
            <Plus size={18} /> Log Study
          </button>
        )}

        {otherUsers.length > 0 && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => isSpying ? onSetSpyTarget(null) : (otherUsers.length === 1 ? onSetSpyTarget(otherUsers[0].id) : setShowSpyMenu(!showSpyMenu))}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border transition-all ${isSpying ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
            >
              {isSpying ? <><ArrowRight size={14} /> Back to Me</> : <><Eye size={14} /> {otherUsers.length === 1 ? `View ${otherUsers[0].name}` : "View Partner"}</>}
            </button>
            
            {showSpyMenu && !isSpying && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="p-2 text-xs font-bold text-slate-400 uppercase">Select Profile</div>
                {otherUsers.map(u => (
                  <button key={u.id} onClick={() => { onSetSpyTarget(u.id); setShowSpyMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                    <Avatar icon={u.avatar || '👤'} size="text-sm" className="w-6 h-6"/>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

const Dashboard = ({ displayUser, isSpying, feed }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
    {/* Spy Mode styling fix: Force text colors for high contrast */}
    <div className={`lg:col-span-2 rounded-3xl p-6 shadow-sm border relative overflow-hidden ${isSpying ? 'bg-amber-50 border-amber-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
      <div className="relative z-10 flex justify-between items-start">
        <div className="flex gap-4">
          <Avatar icon={displayUser.avatar || '👤'} size="text-4xl" className="bg-white shadow-md" />
          <div>
            <h2 className={`text-3xl font-bold ${isSpying ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>{displayUser.name}</h2>
            <p className={`${isSpying ? 'text-slate-600' : 'text-slate-500'} font-medium`}>{displayUser.role}</p>
            <div className="flex gap-4 mt-4">
              <div><p className={`text-xs font-bold uppercase ${isSpying ? 'text-slate-500' : 'text-slate-400'}`}>Level {displayUser.level}</p><p className={`text-2xl font-bold ${isSpying ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>{displayUser.xp} XP</p></div>
              <div className="w-px bg-slate-200 dark:bg-slate-600 h-10 self-center" />
              <div><p className={`text-xs font-bold uppercase ${isSpying ? 'text-slate-500' : 'text-slate-400'}`}>Streak</p><div className="flex items-center gap-1 text-orange-500"><Flame size={20} fill="currentColor" /><span className="text-2xl font-bold">{displayUser.streak}</span></div></div>
            </div>
          </div>
        </div>
        <div className="w-40 hidden sm:block">
           <div className={`flex justify-between text-xs font-bold mb-1 ${isSpying ? 'text-slate-500' : 'text-slate-500'}`}><span>Next Level</span><span>{Math.floor((displayUser.xp/(displayUser.maxXp || 1))*100)}%</span></div>
           <ProgressBar current={displayUser.xp} max={displayUser.maxXp || 1} />
        </div>
      </div>
    </div>

    <div className="lg:col-span-2">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><BookOpen size={20} className="text-slate-400"/> Current Focus</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayUser.subjects?.map(sub => (
          <div key={sub.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between mb-2">
              <div className={`w-3 h-3 rounded-full ${sub.color || 'bg-slate-400'}`} />
              <span className="text-xs font-bold text-slate-400">{sub.progress}%</span>
            </div>
            <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{sub.name}</h4>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className={`h-full ${sub.color || 'bg-slate-400'}`} style={{ width: `${sub.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="lg:row-span-2 bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl h-full min-h-[400px] flex flex-col">
      <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><Activity size={20} className="text-slate-400"/> Activity Log</h3>
      <div className="space-y-4 overflow-y-auto flex-1 pr-2">
        {feed.filter(f => f.userId === displayUser.id).slice(0, 10).map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-slate-900 dark:text-white">{item.userName}</span>
              {/* Detailed Date & Time */}
              <span className="text-xs text-slate-400">
                {new Date(item.timestamp?.toDate ? item.timestamp.toDate() : item.timestamp).toLocaleDateString([], {month: 'short', day: 'numeric'})}, {new Date(item.timestamp?.toDate ? item.timestamp.toDate() : item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">Studied <span className="text-indigo-600 dark:text-indigo-400 font-bold">{item.subject}</span> for {item.duration}m</p>
            {item.note && <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded italic text-xs border-l-2 border-slate-300 dark:border-slate-600 text-slate-500">"{item.note}"</div>}
          </div>
        ))}
        {feed.filter(f => f.userId === displayUser.id).length === 0 && <div className="text-center text-slate-400 py-10">No activity yet</div>}
      </div>
    </div>
  </div>
);

const FocusTimer = ({ user, onStatusChange, onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [subject, setSubject] = useState(user.subjects?.[0] || {});
  
  useEffect(() => {
    // Only update timeLeft when duration changes IF timer is NOT active
    if (!isActive) setTimeLeft(duration * 60);
  }, [duration]); // removed isActive from deps

  useEffect(() => {
    let int;
    if (isActive && timeLeft > 0) int = setInterval(() => setTimeLeft(t => t - 1), 1000);
    else if (timeLeft === 0 && isActive) { 
        handleStop(); 
        onComplete(subject, duration); 
    }
    return () => clearInterval(int);
  }, [isActive, timeLeft]);

  const toggle = () => {
    if(!isActive) { 
        setIsActive(true); 
        onStatusChange(true, duration, subject.name);
        // Request Fullscreen on Mobile
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch((e) => console.log(e));
        }
    } else { 
        setIsActive(false); 
        onStatusChange(false); 
    }
  };

  const handleStop = () => {
      setIsActive(false);
      onStatusChange(false);
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((e) => console.log(e));
      }
  }

  return (
    <div className="max-w-md mx-auto text-center py-10">
      <div className={`w-64 h-64 mx-auto rounded-full border-8 flex items-center justify-center mb-8 transition-colors ${isActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
        <div className="text-5xl font-mono font-bold text-slate-800 dark:text-white">
          {Math.floor(timeLeft/60).toString().padStart(2,'0')}:{(timeLeft%60).toString().padStart(2,'0')}
        </div>
      </div>
      {!isActive ? (
        <div className="space-y-6">
          <div className="flex gap-2 justify-center flex-wrap">
            {user.subjects?.map(s => <button key={s.id} onClick={() => setSubject(s)} className={`px-3 py-1 rounded-full text-xs font-bold border ${subject.id === s.id ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>{s.name}</button>)}
          </div>
          <div className="max-w-xs mx-auto">
             <div className="flex justify-between mb-2 text-sm font-bold text-slate-500 uppercase">
               <span>Duration</span>
               <span className="text-indigo-600">{Math.floor(duration / 60)}h {duration % 60}m</span>
             </div>
             <input 
               type="range" min="5" max="720" step="5" 
               value={duration} 
               onChange={(e) => setDuration(Number(e.target.value))}
               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
             />
          </div>
          <button onClick={toggle} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">Start Focus</button>
        </div>
      ) : (
        <div className="flex gap-4 justify-center">
          <button onClick={toggle} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white px-6 py-3 rounded-xl font-bold">Pause</button>
          <button onClick={() => { handleStop(); onComplete(subject, duration - Math.ceil(timeLeft/60)); }} className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold">Finish Early</button>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ user, onUpdate, onLogout, onReset }) => {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [newSub, setNewSub] = useState('');

  const handleAddSubject = () => {
    if(!newSub) return;
    const newSubjects = [...(user.subjects || []), { 
      id: Date.now().toString(), name: newSub, progress: 0, color: 'bg-indigo-500' 
    }];
    onUpdate({ subjects: newSubjects });
    setNewSub('');
  };

  return (
    <div className="max-w-2xl space-y-8 pb-20">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h2><button onClick={onReset} className="text-red-500 text-sm flex items-center gap-1 hover:underline"><RefreshCw size={14}/> Reset All Data</button></div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><User size={20}/> Public Profile</h3>
        <div className="space-y-4">
          <Input label="Display Name" value={name} onChange={setName} />
          <Input label="Role / Title" value={role} onChange={setRole} />
          <button onClick={() => onUpdate({ name, role })} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700">Save Changes</button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><BookOpen size={20}/> Manage Subjects</h3>
        <div className="space-y-2 mb-4">
          {user.subjects?.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
              <span className="font-medium text-slate-800 dark:text-white">{s.name}</span>
              <button onClick={() => onUpdate({ subjects: user.subjects.filter(sub => sub.id !== s.id) })} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newSub} onChange={setNewSub} placeholder="New Subject Name" />
          <button onClick={handleAddSubject} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 rounded-lg font-bold">Add</button>
        </div>
      </div>
      <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
        <button onClick={onLogout} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-300">
          <LogOut size={18}/> Log Out
        </button>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
    <input 
      type={type}
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
    />
  </div>
);

const MobileNav = ({ view, setView, onLogClick }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe z-40">
    <div className="flex justify-around p-2 items-end">
      <NavBtn icon={LayoutDashboard} active={view === 'dashboard'} onClick={() => setView('dashboard')} label="Home" />
      <NavBtn icon={Timer} active={view === 'focus'} onClick={() => setView('focus')} label="Focus" />
      <div className="mb-4">
        <button onClick={onLogClick} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform"><Plus size={24} /></button>
      </div>
      <NavBtn icon={Target} active={view === 'goals'} onClick={() => setView('goals')} label="Goals" />
      <NavBtn icon={BarChart3} active={view === 'analytics'} onClick={() => setView('analytics')} label="Stats" />
    </div>
  </nav>
);

const NavBtn = ({ icon: Icon, active, onClick, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

// ... (Other components remain the same: LoadingScreen, ErrorScreen, Avatar, ProgressBar, CalendarHeatmap)
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
    <Sparkles className="animate-spin mr-2"/> Loading...
  </div>
);

const ErrorScreen = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border-l-4 border-red-500">
      <h3 className="text-red-500 font-bold flex items-center gap-2 mb-2"><AlertCircle/> Error</h3>
      <p className="text-slate-600 text-sm mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="text-sm font-bold underline">Retry</button>
    </div>
  </div>
);