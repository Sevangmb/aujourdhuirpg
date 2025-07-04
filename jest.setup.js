// Setup global pour Jest
import '@testing-library/jest-dom';

// Mock des APIs du navigateur
global.fetch = jest.fn();

// Mock de console pour réduire le bruit pendant les tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  // Supprimer les logs pendant les tests sauf si explicitement activés
  if (!process.env.JEST_VERBOSE) {
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  }
});

afterAll(() => {
  // Restaurer les logs originaux
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

// Mock des modules Firebase pour éviter l'initialisation réelle
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({}))
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInAnonymously: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn()
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn()
}));

// Mock Genkit pour éviter l'initialisation réelle
jest.mock('@genkit-ai/googleai', () => ({
  googleAI: jest.fn(() => ({}))
}));

jest.mock('genkit', () => ({
  genkit: jest.fn(() => ({}))
}));