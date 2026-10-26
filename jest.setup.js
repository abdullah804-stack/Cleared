// jest.setup.js
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}), { virtual: true });

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
}), { virtual: true });

jest.mock('../contexts/AuthContext', () => ({
  supabase: { from: jest.fn().mockReturnThis(), insert: jest.fn(), select: jest.fn(), delete: jest.fn(), eq: jest.fn() },
}), { virtual: true });