module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|react-native-qrcode-svg|react-native-svg|react-native-gesture-handler|@react-navigation|react-native-safe-area-context|react-native-screens)/)'
  ],
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/@env.js'
  },
  collectCoverageFrom: [
    'services/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    'hooks/**/*.{js,jsx}',
    'utils/**/*.{js,jsx}',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx)',
    '**/*.(test|spec).(js|jsx)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  globals: {
    __DEV__: true
  }
};