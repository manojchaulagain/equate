# ⚽ Soccer Team Balancer

A modern web application for managing soccer players, tracking weekly availability, and generating balanced teams automatically. Built with React, TypeScript, and Firebase.

![Live Demo](https://manojchaulagain.github.io/equate)

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## ✨ Features

### 🔐 Authentication
- **Email/Password Authentication**: Secure sign-up and sign-in functionality
- **User Roles**: Admin and regular user roles with different permissions
- **Role-based Access Control**: Only admins can generate teams

### 👥 Player Management
- **Player Registration**: Add players with name, position, and skill level
- **Position Support**: 10 different positions (GK, LB, RB, CB, CDM, CM, CAM, ST, LW, RW)
- **Skill Levels**: 10-point skill rating system (1-10) with descriptive labels
- **Real-time Updates**: All players are synced in real-time across all users

### 📊 Availability Poll
- **Weekly Availability Tracking**: Toggle player availability for the week
- **Visual Indicators**: Clear visual feedback for available/unavailable players
- **Real-time Sync**: Availability changes are instantly visible to all users

### 🎯 Team Generation
- **Balanced Team Algorithm**: Automatically generates balanced teams based on skill levels
- **Admin-only Feature**: Only admins can generate teams
- **Shared Teams**: Generated teams are visible to all users in real-time
- **Team Statistics**: View team composition, skill totals, and position distribution

### 👨‍💼 Admin Features
- **User Role Management**: Admins can set and update user roles
- **Team Generation Control**: Exclusive access to team generation functionality
- **User Management UI**: Easy-to-use interface for managing user permissions

## 📸 Screenshots

### Sign In / Sign Up
![Sign In Screen](./docs/screenshots/sign-in.png)
*Clean and intuitive authentication interface with email/password login and sign-up options*

### Player Registration
![Player Registration](./docs/screenshots/player-registration.png)
*Add new players with position selection and skill level rating*

### Availability Poll
![Availability Poll](./docs/screenshots/availability-poll.png)
*Track weekly player availability with visual indicators*

### Team Results
![Team Results](./docs/screenshots/team-results.png)
*View balanced teams with detailed statistics and player distribution*

### Admin Panel
![Admin Panel](./docs/screenshots/admin-panel.png)
*Manage user roles and permissions from the admin interface*

> **Note**: To add screenshots, create a `docs/screenshots/` directory and add your images there. Update the paths above to match your screenshot filenames.

## 🛠 Tech Stack

- **Frontend Framework**: React 19.2.0
- **Language**: TypeScript 4.9.5
- **Styling**: Tailwind CSS 3.4.18
- **Icons**: Lucide React
- **Backend**: Firebase
  - Authentication (Email/Password)
  - Firestore (Real-time Database)
  - Analytics
- **Build Tool**: Create React App
- **Deployment**: GitHub Pages

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account and project

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/manojchaulagain/equate.git
   cd equate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase** (see Configuration section below)

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration

### Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one

2. **Enable Authentication**
   - Navigate to Authentication → Sign-in method
   - Enable "Email/Password" provider

3. **Set up Firestore Database**
   - Go to Firestore Database
   - Create a database in production mode
   - Set up security rules (see below)

4. **Get Firebase Configuration**
   - Go to Project Settings → General
   - Scroll down to "Your apps" section
   - Copy your Firebase configuration object

5. **Update Firebase Config in App.tsx**
   ```typescript
   const __firebase_config = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```

### Firestore Security Rules

Set up appropriate security rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players collection - read for all authenticated users, write for all
    match /artifacts/{appId}/public/data/soccer_players/{playerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Teams collection - read for all authenticated users, write for admins
    match /artifacts/{appId}/public/data/teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection - read own data, write for admins
    match /artifacts/{appId}/public/data/users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || 
        get(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Setting Up the First Admin

1. **Get User UID**
   - Sign up a user through the app
   - Go to Firebase Console → Authentication → Users
   - Copy the User UID

2. **Create Admin Document in Firestore**
   - Go to Firestore Database
   - Navigate to: `artifacts/{appId}/public/data/users/{userId}`
   - Create a document with:
     ```json
     {
       "email": "admin@example.com",
       "role": "admin"
     }
     ```

3. **Sign out and sign back in** to refresh the role

## 🚀 Usage

### For Regular Users

1. **Sign Up / Sign In**
   - Create an account or sign in with existing credentials

2. **Register Players** (Register tab)
   - Add players with their name, position, and skill level
   - All players are shared across all users

3. **Set Availability** (Availability tab)
   - Toggle players available for the week
   - View total available players count

4. **View Teams** (Teams tab)
   - View teams generated by admins
   - See team composition and statistics

### For Admins

1. **All Regular User Features** plus:

2. **Generate Teams** (Availability tab)
   - Click "Generate Teams" button (only visible to admins)
   - Teams are automatically balanced based on skill levels
   - Teams are shared with all users in real-time

3. **Manage Users** (Admin tab)
   - Set user roles (admin/user)
   - Manage user permissions
   - View all registered users

## 📁 Project Structure

```
equate/
├── public/                 # Static files
├── src/
│   ├── components/         # React components
│   │   ├── admin/          # Admin components
│   │   │   └── UserManagement.tsx
│   │   ├── auth/           # Authentication components
│   │   │   └── AuthUI.tsx
│   │   ├── players/        # Player management
│   │   │   └── PlayerRegistrationForm.tsx
│   │   ├── poll/           # Availability poll
│   │   │   └── WeeklyAvailabilityPoll.tsx
│   │   └── teams/          # Team display
│   │       ├── TeamCard.tsx
│   │       └── TeamResults.tsx
│   ├── constants/          # Constants and configurations
│   │   └── player.ts        # Player-related constants
│   ├── types/              # TypeScript type definitions
│   │   ├── player.ts        # Player types
│   │   └── user.ts          # User types
│   ├── App.tsx             # Main application component
│   ├── index.tsx           # Application entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 🚢 Deployment

### Deploy to GitHub Pages

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy**
   ```bash
   npm run deploy
   ```

   This will:
   - Build the production version
   - Deploy to the `gh-pages` branch
   - Make the app available at `https://manojchaulagain.github.io/equate`

### Environment Variables

If you need to use environment variables, create a `.env` file:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

Then update `App.tsx` to use these variables instead of hardcoded values.

## 🧪 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to GitHub Pages

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Manoj Chaulagain**

- GitHub: [@manojchaulagain](https://github.com/manojchaulagain)
- Live Demo: [https://manojchaulagain.github.io/equate](https://manojchaulagain.github.io/equate)

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI library
- [Firebase](https://firebase.google.com/) - Backend services
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Lucide React](https://lucide.dev/) - Icon library

---

**Made with ❤️ for soccer team management**
