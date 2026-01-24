import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Grading Workflow Tests
 * Tests for the ML-powered grading system workflow
 */

// Use authenticated state
test.use({ storageState: path.join(__dirname, "../../.auth/user.json") });

test.describe("Templates", () => {
	test("should display templates page", async ({ page }) => {
		await page.goto("/templates");

		// Should show templates list or create button
		await expect(page.locator("h4, h5").first()).toContainText(
			/Templates|Exam|Papers/i,
		);
	});

	test("should have create template button", async ({ page }) => {
		await page.goto("/templates");

		// Look for create/add button
		const createButton = page.locator(
			'button:has-text("Create"), button:has-text("New"), button:has-text("Add")',
		);
		await expect(createButton.first()).toBeVisible();
	});
});

test.describe("Grading Dashboard", () => {
	test("should display grading dashboard", async ({ page }) => {
		await page.goto("/grading");

		await page.waitForLoadState("networkidle");

		// Should show grading interface
		await expect(page.locator("h4, h5, h6").first()).toBeVisible();
	});
});

test.describe("Exam Paper Builder", () => {
	test("should access exam paper builder", async ({ page }) => {
		await page.goto("/grading/exam-builder");

		await page.waitForLoadState("networkidle");
	});
});

test.describe("Review Interface", () => {
	test("should access grading review interface", async ({ page }) => {
		await page.goto("/grading/review");

		await page.waitForLoadState("networkidle");
	});
});

test.describe("Upload Workflow", () => {
	test("should navigate to upload page from template", async ({ page }) => {
		await page.goto("/templates");

		// Wait for templates to load
		await page.waitForLoadState("networkidle");

		// Look for any template card
		const templateCard = page
			.locator('[data-testid="template-card"], .MuiCard-root')
			.first();
		if (await templateCard.isVisible()) {
			await templateCard.click();

			// Should navigate to template details
			await expect(page).toHaveURL(/\/templates\/\w+/);
		}
	});
});

test.describe("Reports", () => {
	test("should display reports page", async ({ page }) => {
		await page.goto("/reports");

		await page.waitForLoadState("networkidle");

		// Should show reports interface
		await expect(page.locator("h4, h5, h6").first()).toBeVisible();
	});
});
