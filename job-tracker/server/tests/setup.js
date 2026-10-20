import dotenv from 'dotenv';

// Load the TEST database config, overriding anything already in the environment.
dotenv.config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret';

// Safety net: these tests TRUNCATE tables. Refuse to run against a non-test database.
if (!/test/i.test(process.env.DATABASE_URL || '')) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL must point to a database with "test" in its name. ' +
      'Copy .env.test.example to .env.test.'
  );
}
