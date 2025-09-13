# StickerSmash - Authentication & Firestore Integration

A React Native Expo app with Firebase Authentication and Firestore integration.

## Setup Instructions

1. Clone the repository:
```bash
git clone [repository-url]
cd StickerSmash
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Create Firestore database
   - Get your web configuration

4. Configure environment variables:
   - Copy `env/.env.example` to `env/.env`
   - Fill in your Firebase configuration values
   ```
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

5. Start the development server:
```bash
npm start
```

6. Run on your device/emulator:
   - Press 'a' for Android
   - Press 'i' for iOS
   - Scan QR code with Expo Go app for physical device

## Firebase Security Rules

The project includes Firestore security rules in `firestore.rules`. Deploy them using Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Environment Variables & Security

- Firebase API Key and configuration are safe to include in client-side code
- NEVER include service account JSON or admin credentials in the client
- Use `.env` for local development
- Use EAS Secrets or CI variables for production builds

## Deployment

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure EAS:
```bash
eas init
```

3. Set up secrets for production:
```bash
eas secret:create --scope project --name FIREBASE_API_KEY --value "xxx"
# Repeat for other environment variables
```

4. Build for production:
```bash
eas build --platform all
```

## Security Checklist

- [ ] Environment variables properly configured
- [ ] Firebase security rules deployed
- [ ] Authentication state properly handled
- [ ] Input validation implemented
- [ ] Error handling in place
- [ ] User data access restricted
- [ ] Sensitive data not logged
- [ ] Production secrets configured in EAS

## QA Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Password reset functional
- [ ] Auth state persists after app restart
- [ ] Profile updates successful
- [ ] Error messages clear and helpful
- [ ] Loading states visible
- [ ] Navigation flows correctly
- [ ] Data validation working
- [ ] Offline behavior graceful

## Testing

Run tests with:
```bash
npm test
```

Test cases:
1. Authentication flow (register, login, logout)
2. Form validation and error handling
3. Protected route access
4. Profile data updates

## Folder Structure

```
StickerSmash/
├── App.js                 # Root component
├── babel.config.js        # Babel configuration
├── firebaseConfig.js      # Firebase initialization
├── firestore.rules        # Firestore security rules
├── components/           
│   ├── LoadingIndicator.jsx
│   └── ErrorText.jsx
├── context/
│   └── AuthContext.js
├── env/
│   ├── .env              # (gitignored) Local environment variables
│   └── .env.example      # Example environment variables
├── navigation/
│   └── index.js
├── screens/
│   ├── LoginScreen.jsx
│   ├── RegisterScreen.jsx
│   ├── ForgotPasswordScreen.jsx
│   ├── HomeScreen.jsx
│   └── ProfileScreen.jsx
└── utils/
    └── firebaseHelpers.js