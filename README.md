# 🎬 SyncSpace - Next.js Real-Time Watch Party Template

Welcome to **SyncSpace**! This is a premium, fully responsive Next.js and Firebase template designed to let you host synchronized virtual watch parties, live masterclasses, and digital hangouts with real-time video sync and chat.

## ✨ Features
* **Real-Time Video Sync:** Play, pause, and sync video playback across all connected users instantly.
* **Live Chat System:** Built-in real-time chat with custom UI, reply features, and host-only mute capabilities.
* **Role-Based Access:** Master Admin, Host, and Guest roles.
* **Secure Waiting Rooms:** Scheduled events with countdown timers and passcode-protected private rooms.
* **Admin Dashboard:** A complete control center to monitor live rooms, manage users, and trigger global maintenance mode.
* **Responsive Dark-Mode UI:** Cinematic aesthetic that works flawlessly on mobile, tablet, and desktop.

---

## 🚀 Quick Start Guide

Follow these steps to get your watch party platform live in minutes.

### Step 1: Set Up Firebase
This app uses Firebase for its database and authentication. You will need a free Firebase account.
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Navigate to **Build > Authentication** and enable **Email/Password** sign-in.
3. Navigate to **Build > Firestore Database** and click **Create Database**.
4. Go to your **Project Settings** (the gear icon), scroll down to "Your apps", and register a new Web App. Copy the `firebaseConfig` object they give you.

### Step 2: Configure Environment Variables
1. Clone or download this repository to your local machine.
2. In the root directory of the project, create a new file named `.env.local`.
3. Paste your Firebase credentials into the file using this format:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234:web:5678

### Step 3: Secure Your Database (Critical)
To ensure your data is safe, you must apply Security Rules to your Firestore database.
In the Firebase Console, go to Firestore Database > Rules.
Replace the default rules with the following secure rules and click Publish

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /rooms/{roomId} {
      allow read, write: if request.auth != null; 
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    match /settings/system {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}


### Step 4: Customize Your Branding
Make the platform your own by updating the branding assets:
The Favicon (Browser Tab Icon): Replace the default favicon.ico file located in the src/app directory with your own .ico image file. Make sure your new file is named exactly favicon.ico.
The Landing Page: Open src/app/page.tsx and scroll to the bottom to update the Footer with your own social media links and company name.
Metadata: Open src/app/layout.tsx and update the title and description to match your brand.
### Step 5: Install & Run Locally
Open your terminal, navigate to the project folder, and run:

npm install
npm run dev


Open http://localhost:3000 in your browser.
​### Step 6: Create Your Admin Account
​Sign up for a normal account on your running website.
​Go to the Firebase Console > Firestore Database.
​Open the users collection, find the document with your email, and change the role field from "user" to "admin".
​Refresh your website, and you will now see the Admin Panel!
​🌐 Deployment
​This template is optimized for Vercel and Cloudflare Pages.
Simply push your repository to GitHub, connect it to your hosting provider of choice, and ensure you add your .env.local variables into the hosting provider's Environment Variables settings before deploying.
​Thank you for purchasing SyncSpace!
