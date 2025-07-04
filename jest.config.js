module.exports = {
  // Environnement de test
  testEnvironment: 'node',
  
  // Extensions de fichiers à tester
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Ignore des dossiers
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/'
  ],
  
  // Support des alias TypeScript
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Setup des tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Transformation des fichiers
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Variables d'environnement pour les tests
  setupFiles: ['<rootDir>/jest.env.js'],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx'
  ],
  
  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};