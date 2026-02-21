# Phase 1: Identity & Personalization - Implementation Guide

This document serves as the technical roadmap for completing Phase 1 of the **RustiNet** ecosystem.

## 🎯 Goal
Implement a secure, domain-restricted authentication system and a personalized student dashboard.

---

## 🛡️ Dynamic Auth Flow (Zero Data Pre-stored)
Since we want to respect student privacy and keep costs at zero, we will use a **Verify-then-Create** model:

1.  **Input**: User enters their Roll Number (e.g., `12111001`).
2.  **Validation**: Backend ensures the format is correct (8 digits).
3.  **OTP**: Firebase sends a 6-digit OTP to `12111001@nitkkr.ac.in`.
4.  **Creation**: **Only after** the student enters the correct OTP, we create their profile in the `users` table for the first time.

---

## 🛠️ Step 1: Database Migration (Neon)
Add a `users` table to manage student profiles linked to Firebase Auth.

```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,      -- Links to Firebase Authentication ID
    roll_number TEXT UNIQUE NOT NULL,       -- Primary identifier (e.g., 12111XXX)
    email TEXT UNIQUE NOT NULL,             -- Always @nitkkr.ac.in
    name TEXT,                              -- Student Full Name
    branch TEXT,                            -- Department (e.g., CSE, ECE)
    semester INTEGER,                       -- Current Study Semester
    bio TEXT,                               -- Short student description
    profile_pic_url TEXT,                   -- Stored in Firebase Storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔐 Step 2: Firebase Auth Integration
1.  **Domain Guard**: Middleware must verify that the email ends with `@nitkkr.ac.in`.
2.  **Auth Service**: Use Firebase Admin SDK to verify `idToken` sent from the frontend.
3.  **Automatic Provisioning**: If a student logs in for the first time, automatically create their record in the `users` table using their roll number extracted from the email.

## 🏠 Step 3: User Dashboard API
Build the following endpoints in `src/routes/userRoutes.js`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/user/me` | Fetch profile details of the logged-in student. |
| `PATCH` | `/api/v1/user/me` | Update personal details (Bio, Semester, Profile Pic). |
| `GET` | `/api/v1/user/stats` | Fetch student-specific activity (Uploads, Votes). |

## 🚀 How to Execute
1.  **Install Admin SDK**: `npm install firebase-admin`
2.  **Initialize DB**: Update `src/utils/initDb.js` to include the `users` table.
3.  **Auth Middleware**: Create `src/middleware/auth.js` to protect user routes.
4.  **Controllers**: Create `src/controllers/userController.js` to handle profile logic.
