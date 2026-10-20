export default {
  test: {
    environment: 'node',
    include: ['tests/*.test.js'], // tests/unit uses node:test and runs via `npm run test:unit`
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false, // test files share one database
  },
};
