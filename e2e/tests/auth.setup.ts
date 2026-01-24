import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Global setup - creates authenticated state for tests
 */
setup("authenticate", async ({ page }) => {
	// Navigate to login page
	await page.goto("/login");

	// Use test credentials
	const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
	const testPassword = process.env.TEST_USER_PASSWORD || "testpassword123";

	// Fill login form
	await page.fill('input[type="email"]', testEmail);
	await page.fill('input[type="password"]', testPassword);

	// Submit login
	await page.click('button[type="submit"]');

	// Wait for redirect to dashboard/templates
	await page.waitForURL(/\/(templates|dashboard)/);

	// Save authentication state
	await page.context().storageState({ path: authFile });
});
