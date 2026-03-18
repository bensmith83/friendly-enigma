export default {
  testEnvironment: "node",
  transform: {},
  extensionsToTreatAsEsm: [],
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "lib/**/*.js",
    "*.js",
    "!eslint.config.js",
    "!jest.config.js",
    "!coverage/**",
  ],
};
