# Tourist Safety App 🛡️

A comprehensive React Native mobile application designed to enhance tourist safety through digital identity verification, real-time location monitoring, emergency response capabilities, and AI-powered assistance.

## Features

- **Digital Identity & QR Code System**: Secure QR code generation for tourist verification
- **Emergency Response**: Panic button with instant emergency contact alerts
- **Location Monitoring**: Real-time safety zone detection and geo-fencing
- **AI-Powered Assistance**: Multilingual chatbot for local information and emergency guidance
- **Privacy & Data Protection**: GDPR-compliant privacy controls and data management
- **Accessibility**: Full accessibility support with high contrast mode and voice-over
- **Offline Capabilities**: Essential safety features work without internet connection

## Tech Stack

- **Frontend**: React Native 0.81.4 with Expo SDK 54
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Cloud Messaging)
- **Navigation**: React Navigation 7
- **State Management**: React Context API with useReducer
- **Security**: Expo Crypto, Expo Secure Store
- **Location**: Expo Location with geo-fencing
- **Notifications**: Expo Notifications
- **QR Codes**: React Native QR Code SVG

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Card, etc.)
│   ├── safety/          # Safety-related components
│   ├── identity/        # QR code and profile components
│   └── chat/            # Chatbot components
├── screens/             # Screen components
│   ├── auth/            # Authentication screens
│   ├── main/            # Main app screens
│   └── settings/        # Settings screens
├── services/            # Business logic and API services
│   ├── firebase/        # Firebase service integrations
│   ├── security/        # Security and encryption services
│   ├── location/        # Location and geo-fencing services
│   └── ai/              # AI chatbot and translation services
├── context/             # React Context providers
├── navigation/          # Navigation configuration
└── utils/               # Utility functions and constants
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd SIH-25002-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp env/.env.example env/.env
   # Edit env/.env with your Firebase configuration
   ```

4. Start the development server
   ```bash
   npm start
   ```

### Environment Configuration

Create a `.env` file in the `env/` directory with the following variables:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Key Services

### Firebase Services
- **Authentication**: User registration and login
- **Firestore**: Real-time data synchronization
- **Cloud Functions**: Server-side logic
- **Cloud Messaging**: Push notifications
- **Storage**: File and media storage

### Security Services
- **Encryption**: Data encryption for QR codes
- **QR Generator**: Secure QR code generation and verification
- **Blockchain**: Mock blockchain verification (for demo)

### Location Services
- **Geo Location**: GPS tracking and location services
- **Geo Fencing**: Safety zone detection and monitoring
- **Safety Zones**: Safety zone management and scoring

### AI Services
- **Chat Bot**: Intelligent assistance and local information
- **Language Detection**: Automatic language detection
- **Translation**: Multi-language support and translation

## Safety Features

### Emergency Response
- One-tap panic button activation
- Automatic emergency contact notification
- Real-time location sharing during emergencies
- Local emergency service numbers (Police: 100, Medical: 108, Fire: 101, Tourist Helpline: 1363)

### Location Safety
- Real-time safety zone monitoring
- Color-coded safety indicators (Green: Safe, Yellow: Caution, Red: Restricted)
- Route safety scoring and recommendations
- Geo-fence alerts for restricted areas

### Digital Identity
- Secure QR code generation with blockchain verification
- 24-hour QR code validity with automatic refresh
- Encrypted tourist data with verification hash
- Offline QR code access for areas with poor connectivity

## Accessibility

The app is designed with accessibility in mind:
- Screen reader compatibility
- High contrast mode (WCAG AAA compliant)
- Font scaling up to 200%
- Voice-over support with descriptive labels
- One-handed operation optimization
- Minimum 44pt touch targets

## Privacy & Security

- End-to-end encryption for sensitive data
- Granular privacy controls
- GDPR-compliant data management
- Secure storage using Expo Secure Store
- Blockchain verification for identity authenticity
- Data deletion and grievance redressal system

## Development Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
npm run web        # Run on web browser
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@touristsafety.app
- Emergency Helpline: 1363 (Tourist Helpline India)

## Acknowledgments

- Built for Smart India Hackathon 2025
- Designed to enhance tourist safety and security
- Compliant with Indian government safety guidelines