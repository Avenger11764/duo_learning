# 📚 DuoLearning Platform

🌐 **Live Demo:** [duo-learning.vercel.app](https://duo-learning.vercel.app/)

DuoLearning is a modern, high-performance, and visually stunning gamified learning platform built to help students master complex subjects through rapid feedback loops and social accountability. Experience flow-state education designed for developer and engineering roadmaps.

---

## 🚀 Key Features

### 🎓 1. Dynamic Learning Academies
* **Structured Blueprints:** Comes pre-seeded with full educational tracks:
  * **Data Structures & Algorithms (DSA):** Covers Arrays & Hashing, Lists, Stacks, Queues, Recursion, Backtracking, Trees, Graphs, and DP/Greedy strategies.
  * **Full Stack Web Development:** Covers Semantic HTML5, CSS layout engines, React Component architecture, Node.js & Express servers, SQL vs NoSQL databases, and DevOps/CI/CD pipelines.
* **Topic Progression Locks:** Topics must be unlocked sequentially. To progress to the next level, students must review the topic subtopics and pass the verification quiz.
* **Sectional Enrollment:** Allows users to enroll only in specific sections or topics if they want modular learning instead of enrolling in the entire course.

### ✍️ 2. Custom Course Creator Studio
* **Syllabus Customizer:** Allows users to create their own custom courses by adding custom titles, descriptions, and dynamic lists of topics and comma-separated subtopics.
* **Real-time Firestore Integration:** Custom courses publish instantly to the shared Firestore database (`duo_courses`), listing them in real-time on all active user feeds.
* **Automated Quiz Generator:** Automatically creates a minimum of 10 comprehensive MCQ validation questions mapped to custom subtopics for validation testing.

### ⏱️ 3. Verification Quiz Engine
* **Rigorous Gatekeeping:** Each topic quiz contains a minimum of 10 questions of varying difficulty (Easy, Medium, Hard).
* **Success Gates:** Students must answer **at least 7 out of 10 questions correctly** to mark the topic as cleared, earn 100 XP, and unlock the next lesson.
* **Retry Gate:** Failing the quiz locks progression, encouraging students to review material before retrying.

### 🤝 4. Social Accountability & Spying Mode
* **Live Partner Spying:** Watch other users' active goals, consistency heatmaps, and stats. Allows users to switch views seamlessly to see peer progress.
* **Live Activity Logs:** Real-time logging of focus sessions and cleared topics directly pushed to a public activity feed (`duo_logs`).
* **Active Status Tracker:** Real-time pulsed indicators showing when peers are actively studying or running focus timers.

### 🏆 5. Gamification & Dynamic Badges
* **Level Progression:** Accumulate XP, level up, and dynamically scale requirements for subsequent levels.
* **Streak Tracking:** Computes daily activity consistency streaks with active streak freezes.
* **13 Collectible Badges:** Unlocked instantly upon meeting specific conditions:
  * 🎖️ **First Steps:** Logged your first session.
  * 🔥 **On Fire:** Reached a 3-day streak.
  * ⚡ **Streak Master:** Reached a 7-day streak.
  * 👑 **Elite Scholar:** Reached Level 10.
  * 🌅 **Early Bird:** Studied in the morning (5 AM - 9 AM).
  * 🦉 **Night Owl:** Studied after 10 PM.
  * 💯 **Century Club:** Accumulated over 1,000 XP.
  * 🧘 **Hyper Focused:** Logged a study session over 30 minutes.
  * 🧭 **Course Explorer:** Enrolled in at least one course.
  * 📚 **Syllabus Master:** Cleared at least 3 topics.
  * 🏆 **Academic Graduate:** Fully completed at least 1 blueprint course.

---

## 🛠️ Technology Stack

* **Frontend:** React.js, Tailwind CSS (Clean Utility Styles), Lucide Icons
* **Database & Auth:** Google Firebase (Firestore real-time listeners, Anonymous Authentication)
* **Build System:** Vite.js & Rollup

---

## ⚡ Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Avenger11764/duo_learning.git
   cd duo_learning
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
