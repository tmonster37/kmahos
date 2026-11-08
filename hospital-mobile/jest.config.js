process.env.RNTL_SKIP_DEPS_CHECK = 'true';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/test/file-mock.ts',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/src/test/react-native-mock.ts',
    '^expo-secure-store$': '<rootDir>/src/test/expo-secure-store-mock.ts',
    '^expo-web-browser$': '<rootDir>/src/test/expo-web-browser-mock.ts',
    '^expo-device$': '<rootDir>/src/test/expo-device-mock.ts',
    '^expo-notifications$': '<rootDir>/src/test/expo-notifications-mock.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};
