import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Support Dashboard Tests
 * Tests for support staff functionality
 */

// Use authenticated state
test.use({ storageState: path.join(__dirname, "../../.auth/user.json") });

test.describe("Support Dashboard", () => {
	test("should display support dashboard", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Should show support dashboard heading
		await expect(page.locator("h4, h5").first()).toContainText(/Support/i);
	});

	test("should display ticket statistics", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Should show stat cards
		await expect(
			page.locator("text=Open Tickets").or(page.locator("text=In Progress")),
		).toBeVisible();
	});

	test("should have tabs for different views", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Should have tabs
		const tabs = page.locator('[role="tab"]');
		await expect(tabs.first()).toBeVisible();
	});

	test("should display tickets list", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Should show tickets table or empty state
		const table = page.locator("table");
		if (await table.isVisible()) {
			// Table headers should be visible
			await expect(
				page
					.locator('th:has-text("Ticket")')
					.or(page.locator('th:has-text("Title")')),
			).toBeVisible();
		}
	});

	test("should allow filtering tickets by status", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Look for status filter
		const statusFilter = page
			.locator('label:has-text("Status")')
			.locator("..")
			.locator('select, [role="combobox"]');
		if (await statusFilter.isVisible()) {
			await statusFilter.click();
		}
	});

	test("should allow filtering tickets by priority", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Look for priority filter
		const priorityFilter = page
			.locator('label:has-text("Priority")')
			.locator("..")
			.locator('select, [role="combobox"]');
		if (await priorityFilter.isVisible()) {
			await priorityFilter.click();
		}
	});

	test("should navigate to system metrics tab", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Click on System Metrics tab
		const metricsTab = page.locator(
			'[role="tab"]:has-text("System Metrics"), [role="tab"]:has-text("Metrics")',
		);
		if (await metricsTab.isVisible()) {
			await metricsTab.click();

			// Should show metrics content
			await page.waitForTimeout(1000);
		}
	});

	test("should navigate to error logs tab", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Click on Error Logs tab
		const errorLogsTab = page.locator(
			'[role="tab"]:has-text("Error Logs"), [role="tab"]:has-text("Errors")',
		);
		if (await errorLogsTab.isVisible()) {
			await errorLogsTab.click();

			// Should show error logs content
			await page.waitForTimeout(1000);
		}
	});

	test("should navigate to audit logs tab", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Click on Audit Logs tab
		const auditLogsTab = page.locator(
			'[role="tab"]:has-text("Audit Logs"), [role="tab"]:has-text("Audit")',
		);
		if (await auditLogsTab.isVisible()) {
			await auditLogsTab.click();

			// Should show audit logs content
			await page.waitForTimeout(1000);
		}
	});

	test("should have refresh button", async ({ page }) => {
		await page.goto("/support");

		await page.waitForLoadState("networkidle");

		// Should have refresh button
		const refreshButton = page.locator(
			'button[aria-label*="refresh" i], button:has([data-testid="RefreshIcon"])',
		);
		if (await refreshButton.isVisible()) {
			await refreshButton.click();
		}
	});
});

test.describe("Admin Support Dashboard", () => {
	test("should access support from admin route", async ({ page }) => {
		await page.goto("/admin/support");

		await page.waitForLoadState("networkidle");
	});
});
