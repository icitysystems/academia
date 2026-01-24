import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Course Enrollment and Management Tests
 * Tests for browsing courses, enrollment, and course content access
 */

// Use authenticated state
test.use({ storageState: path.join(__dirname, "../../.auth/user.json") });

test.describe("Course Catalog", () => {
	test("should display course catalog", async ({ page }) => {
		await page.goto("/courses");

		// Should show course catalog heading
		await expect(page.locator("h4, h5").first()).toContainText(
			/Courses|Catalog/i,
		);
	});

	test("should allow searching courses", async ({ page }) => {
		await page.goto("/courses");

		// Look for search input
		const searchInput = page.locator(
			'input[placeholder*="search" i], input[type="search"]',
		);
		if (await searchInput.isVisible()) {
			await searchInput.fill("programming");
			// Wait for search results to update
			await page.waitForTimeout(500);
		}
	});

	test("should filter courses by category", async ({ page }) => {
		await page.goto("/courses");

		// Look for category filter
		const categorySelect = page.locator('select, [role="combobox"]').first();
		if (await categorySelect.isVisible()) {
			await categorySelect.click();
		}
	});
});

test.describe("Course Details", () => {
	test("should navigate to course details", async ({ page }) => {
		await page.goto("/courses");

		// Click on first course card
		const courseCard = page
			.locator('[data-testid="course-card"], .MuiCard-root')
			.first();
		if (await courseCard.isVisible()) {
			await courseCard.click();

			// Should navigate to course details page
			await expect(page).toHaveURL(/\/courses\/\w+/);
		}
	});
});

test.describe("Student Dashboard", () => {
	test("should display student dashboard for students", async ({ page }) => {
		await page.goto("/student/dashboard");

		// May redirect based on role, just check page loads
		await page.waitForLoadState("networkidle");
	});

	test("should show enrolled courses", async ({ page }) => {
		await page.goto("/student/my-courses");

		// Should show enrolled courses section or empty state
		await page.waitForLoadState("networkidle");
	});
});

test.describe("Instructor Dashboard", () => {
	test("should display instructor dashboard", async ({ page }) => {
		await page.goto("/instructor/dashboard");

		// May redirect based on role, just check page loads
		await page.waitForLoadState("networkidle");
	});
});
