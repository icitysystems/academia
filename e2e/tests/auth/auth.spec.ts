import { test, expect } from "@playwright/test";

/**
 * Authentication Flow Tests
 * Tests for login, registration, password reset, and email verification
 */

test.describe("Authentication", () => {
	test.describe("Login", () => {
		test("should display login page", async ({ page }) => {
			await page.goto("/login");

			await expect(page.locator("h4")).toContainText("Login");
			await expect(page.locator('input[type="email"]')).toBeVisible();
			await expect(page.locator('input[type="password"]')).toBeVisible();
			await expect(page.locator('button[type="submit"]')).toBeVisible();
		});

		test("should show error for invalid credentials", async ({ page }) => {
			await page.goto("/login");

			await page.fill('input[type="email"]', "invalid@example.com");
			await page.fill('input[type="password"]', "wrongpassword");
			await page.click('button[type="submit"]');

			// Wait for error message
			await expect(page.locator('[role="alert"]')).toBeVisible();
		});

		test("should have link to forgot password", async ({ page }) => {
			await page.goto("/login");

			const forgotLink = page.locator('a[href="/forgot-password"]');
			await expect(forgotLink).toBeVisible();
			await forgotLink.click();

			await expect(page).toHaveURL("/forgot-password");
		});

		test("should have link to register", async ({ page }) => {
			await page.goto("/login");

			const registerLink = page.locator('a[href="/register"]');
			await expect(registerLink).toBeVisible();
		});
	});

	test.describe("Registration", () => {
		test("should display registration page", async ({ page }) => {
			await page.goto("/register");

			await expect(page.locator("h4")).toContainText("Register");
			await expect(page.locator('input[name="name"]')).toBeVisible();
			await expect(page.locator('input[type="email"]')).toBeVisible();
			await expect(page.locator('input[type="password"]')).toBeVisible();
		});

		test("should validate email format", async ({ page }) => {
			await page.goto("/register");

			await page.fill('input[name="name"]', "Test User");
			await page.fill('input[type="email"]', "invalidemail");
			await page.fill('input[type="password"]', "testpassword123");

			// The HTML5 validation should prevent submission
			await page.click('button[type="submit"]');

			// Should still be on register page due to validation
			await expect(page).toHaveURL("/register");
		});

		test("should have link to login", async ({ page }) => {
			await page.goto("/register");

			const loginLink = page.locator('a[href="/login"]');
			await expect(loginLink).toBeVisible();
		});
	});

	test.describe("Password Reset", () => {
		test("should display forgot password page", async ({ page }) => {
			await page.goto("/forgot-password");

			await expect(page.locator("h4")).toContainText("Forgot Password");
			await expect(page.locator('input[type="email"]')).toBeVisible();
		});

		test("should submit password reset request", async ({ page }) => {
			await page.goto("/forgot-password");

			await page.fill('input[type="email"]', "test@example.com");
			await page.click('button[type="submit"]');

			// Wait for success message
			await expect(page.locator("text=Check Your Email")).toBeVisible({
				timeout: 10000,
			});
		});

		test("should have link back to login", async ({ page }) => {
			await page.goto("/forgot-password");

			const loginLink = page.locator('a[href="/login"]');
			await expect(loginLink).toBeVisible();
		});
	});

	test.describe("Reset Password Page", () => {
		test("should show error for missing token", async ({ page }) => {
			await page.goto("/reset-password");

			await expect(page.locator("text=Invalid Reset Link")).toBeVisible();
		});

		test("should show error for invalid token", async ({ page }) => {
			await page.goto("/reset-password?token=invalidtoken");

			// Wait for validation to complete
			await page.waitForLoadState("networkidle");

			// Should show expired/invalid message
			await expect(
				page.locator("text=Link Expired").or(page.locator("text=Invalid")),
			).toBeVisible({ timeout: 10000 });
		});
	});

	test.describe("Email Verification", () => {
		test("should show error for missing verification token", async ({
			page,
		}) => {
			await page.goto("/verify-email");

			await expect(
				page.locator("text=Invalid Verification Link"),
			).toBeVisible();
		});

		test("should attempt verification with token", async ({ page }) => {
			await page.goto("/verify-email?token=testtoken");

			// Wait for verification attempt
			await page.waitForLoadState("networkidle");

			// Should show either success or failure message
			const resultVisible = await page
				.locator("text=Email Verified")
				.or(page.locator("text=Verification Failed"))
				.isVisible();
			expect(resultVisible).toBeTruthy();
		});
	});
});
