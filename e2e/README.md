# E2E Tests for Academia Platform

This directory contains end-to-end tests using Playwright for the Academia ML-Powered Grading System.

## Setup

1. Install dependencies:

```bash
cd e2e
npm install
npx playwright install
```

2. Set environment variables (optional):

```bash
# .env file or environment
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
BASE_URL=http://localhost:3000
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in headed mode (visible browser)

```bash
npm run test:headed
```

### Run tests with Playwright UI

```bash
npm run test:ui
```

### Run tests for specific module

```bash
npm run test:auth      # Authentication tests
npm run test:grading   # Grading workflow tests
npm run test:courses   # Course management tests
```

### Debug tests

```bash
npm run test:debug
```

### Generate test code

```bash
npm run codegen
```

### View test report

```bash
npm run test:report
```

## Test Structure

```
e2e/
├── playwright.config.ts    # Playwright configuration
├── package.json
├── tests/
│   ├── auth.setup.ts       # Authentication setup (runs first)
│   ├── auth/
│   │   └── auth.spec.ts    # Login, register, password reset tests
│   ├── courses/
│   │   └── courses.spec.ts # Course catalog and enrollment tests
│   ├── grading/
│   │   └── grading.spec.ts # Grading workflow tests
│   └── support/
│       └── support.spec.ts # Support dashboard tests
└── .auth/
    └── user.json           # Saved authentication state
```

## Test Categories

### Authentication Tests (`auth/`)

- Login page display and functionality
- Registration form validation
- Password reset flow
- Email verification
- Error handling for invalid credentials

### Course Tests (`courses/`)

- Course catalog browsing
- Course search and filtering
- Course details navigation
- Student dashboard
- Instructor dashboard

### Grading Tests (`grading/`)

- Templates management
- Exam paper builder
- Grading dashboard
- Review interface
- Reports generation

### Support Tests (`support/`)

- Support dashboard display
- Ticket listing and filtering
- System metrics tab
- Error logs tab
- Audit logs tab

## CI/CD Integration

The tests are configured to run on CI with:

- Single worker for sequential execution
- 2 retries on failure
- Automatic screenshots and videos on failure

Add to your CI pipeline:

```yaml
- name: Run E2E Tests
  run: |
    cd e2e
    npm ci
    npx playwright install --with-deps
    npm test
```

## Writing New Tests

1. Create a new spec file in the appropriate directory
2. Use `test.use({ storageState: ... })` for authenticated tests
3. Follow existing patterns for page navigation and assertions

Example:

```typescript
import { test, expect } from "@playwright/test";
import path from "path";

test.use({ storageState: path.join(__dirname, "../../.auth/user.json") });

test.describe("My Feature", () => {
	test("should do something", async ({ page }) => {
		await page.goto("/my-page");
		await expect(page.locator("h1")).toContainText("Expected Text");
	});
});
```

## Troubleshooting

### Tests fail to authenticate

1. Ensure backend and frontend are running
2. Check that test user exists in the database
3. Verify credentials in environment variables

### Slow tests

1. Increase timeout in playwright.config.ts
2. Use `page.waitForLoadState('networkidle')` for API calls
3. Consider using `page.route()` to mock slow endpoints

### Flaky tests

1. Add explicit waits: `await page.waitForSelector()`
2. Use more specific selectors
3. Increase retry count for known flaky tests
