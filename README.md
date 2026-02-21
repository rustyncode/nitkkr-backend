# RustiNet - The NIT KKR Student Ecosystem

RustiNet is a high-performance, community-driven digital infrastructure designed exclusively for students of NIT Kurukshetra. It integrates academic resources, career growth, and campus communication into a single unified platform.

## 🚀 Vision
To become the default knowledge and networking layer for every NITian, built on a **100% Free** and secure engineering model.

---

## 🔑 Phase 1: Identity & Personalization (CURRENT)

### 🛡️ Smart Student Authentication
*   **Simple Login**: User enters their **Roll Number**.
*   **Domain Verification**: System automatically maps it to `rollno@nitkkr.ac.in`.
*   **Zero-Cost OTP**: Secure 6-digit code sent to the college mailbox via Supabase.
*   **Student Profile**: Roll No, Branch, Batch, Bio, and **Exact Location** (Hostel/Sector) linked to every account.

### 🏠 User Dashboard (Priority #1)
The central command center for every student.
*   **Current (v1)**: User identity (Name, Semester, Branch, Profile Picture).
*   **Future (Roadmap)**:
    *   **Academic**: CGPA (extracted from college results), Attendance Snapshot.
    *   **Career**: Resume Preview (built via internal builder), Jobs/Internship matches.
    *   **Notifications**: College-wide notices filtered by student preferences.
    *   **Coding**: Live LeetCode/Codeforces dashboard & upcoming Contest alerts.

---

## 📘 Phase 2: Academic & Institutional

### 📖 Papers (PYQ Hub)
*   Search by subject, year, exam type, and department.
*   Trending/Most Downloaded papers.
*   Discussion threads and related paper recommendations.

### 📅 Attendance & Academic Tracker
*   Manual attendance entry with **75% safety visualization**.
*   **Attendance Predictor**: Calculator for future classes needed to reach target percentage.
*   **Timetable Integration**: Automatic reminders and class schedule view (with floor-level department maps).
*   **Smart Alerts**: Push notifications for low attendance or upcoming class changes.

### 📊 Performance & result Extraction
*   **CGPA Hub**: Automatic extraction of results from college PDFs/Portals.
*   **Result Repository**: Direct links to official result pages.
*   **Benchmarking**: Internal vs External score analysis.

### 👨‍🏫 Teacher & Faculty Panel
*   **Faculty Ratings**: Student reviews on teaching style, grading, and attendance strictness.
*   **Directory**: Department-wise faculty profiles and contact emails.
*   **Notes Indicator**: Availability status for professors' notes.

---

## 🧠 Phase 3: Knowledge & Social Feed

### ❓ Doubts Center
*   Post doubts (text, image, PDF, or code).
*   Answer system with upvotes and "Verified" tags for toppers/teachers.
*   Linking of related PYQs to doubt threads.
*   **Solved/Open** status tracking.

### 🕊️ Social Feed (Twitter-like)
*   **Engagement**: Post, Like, Comment, Repost, and Hashtags.
*   **Resource Sharing**: Direct attachment of study materials to social posts.
*   **Anonymous Mode**: Safe space for campus-wide feedback and concerns.

---

## 💼 Phase 4: Career & Networking

### 📄 Resume Builder
*   **Smart Generation**: Auto-fill data directly from the student's authenticated profile.
*   **Tailored Templates**: Professional layouts for technical and non-technical internships.

### 💬 Chat & Networking
*   **Permission-based**: 1-to-1 chat is locked until a follow request is accepted.
*   **Study Groups**: Create or join subject-based community chats.
*   **Junior-Senior Buddy System**: Request temporary 1-to-1 mentorship for specific topics/projects.

### 💼 Jobs & Opportunities
*   Categorized listings with direct application links.
*   **Interview Experience Bank**: Community-sourced database of interview rounds for companies visiting NIT KKR.
*   **Find Hackathon Partners**: Dedicated matching system for students looking to form teams for technical and design hackathons.

---

## 🏫 Phase 5: Institutional Services

### 📩 Complaint System
*   **Structured Forms**: Submit issues regarding Hostel, Mess, or Academics.
*   **Auto-Mailing**: Automatically notifies Wardens or Admins via official channels.
*   **Status Tracking**: "In Progress," "Resolved," or "Awaiting" status dashboard.

### 📢 College Services
*   **Campus Feed**: Hostel notices, Event announcements, and Club activities.
*   **Mess Hub**: Daily mess menu updates + **Mess Quality Analytics** (student ratings for food).
*   **Club Recruitment Hub**: Dedicated portal for club recruitment notices and interview schedules.

### 🧪 Lab & Assignment Tools
*   **Lab Generator**: Automated tool to generate lab files in PDF format.
*   **Viva Bank**: Subject-wise repository of frequently asked viva questions.

---

## ✨ Advanced Features (Added by Antigravity)

### 🛒 Phase 6: Campus Ecosystem & Safety
*   **NIT Marketplace**: A safe portal to buy/sell/donate used books, cycles, or lab equipment within the campus.
*   **Lost & Found**: Centralized digital board for reporting and claiming lost items.
*   **Student Perks**: Database of local stores and restaurants offering discounts for NIT KKR IDs.
*   **SafeWalk**: Digital "SOS" or problem reporting for campus infrastructure (lighting, etc.).
*   **Interactive Campus Map**: High-detail floor plans and locations of labs/lecture halls.

---

## 📘 Phase 2: Academic & Institutional (CONT.)

### 📤 Community Contributions (NEW)
*   **Notes Upload**: Students can upload their handwritten or digital notes (PDF/Scan).
*   **PYQ Crowdsourcing**: Upload missing papers from recent exams.
*   **Verification System**: Community-voted "Trust" scores for uploaded materials.
*   **Direct Storage**: All uploads are securely stored in **Firebase Storage**.

---

## 🏗️ Technical Model (Free Tier Dream Team)
*   **Database**: [Neon PostgreSQL](https://neon.tech/) (0.5 GiB - Unlimited text data).
*   **File Storage**: [Firebase Storage](https://firebase.google.com/products/storage) (5 GB - For PYQs, Notes, and Images).
*   **Authentication**: [Firebase Auth](https://firebase.google.com/products/auth) (50k MAU - Domain restricted to `nitkkr.ac.in`).
*   **Hosting**: [Vercel](https://vercel.com/) (Serverless Backend).
*   **Cron Jobs**: Vercel Cron (Automated notification scraping).
