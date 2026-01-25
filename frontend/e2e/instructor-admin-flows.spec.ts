import { test, expect } from "@playwright/test";

test.describe("Instructor Course Management", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('[name="email"]', "instructor@test.com");
		await page.fill('[name="password"]', "password123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/instructor/dashboard");
	});

	test("should display instructor dashboard", async ({ page }) => {
		await expect(page.locator("text=Instructor Dashboard")).toBeVisible();
	});

	test("should list courses being taught", async ({ page }) => {
		await expect(
			page.locator('[data-testid="course-card"]').first(),
		).toBeVisible();
	});

	test("should navigate to course management", async ({ page }) => {
		await page.click('[data-testid="course-card"]:first-child');

		await expect(page.locator("text=Course Overview")).toBeVisible();
	});
});

test.describe("Instructor Gradebook", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('[name="email"]', "instructor@test.com");
		await page.fill('[name="password"]', "password123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/instructor/dashboard");
	});

	test("should display gradebook for course", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/gradebook");

		await expect(page.locator("text=Course Gradebook")).toBeVisible();
	});

	test("should show student grades matrix", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/gradebook");

		await expect(page.locator("table")).toBeVisible();
		await expect(page.locator('th:has-text("Student")')).toBeVisible();
	});

	test("should edit student grade", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/gradebook");

		await page.click('[data-testid="grade-cell"]:first-child');

		await expect(page.locator("text=Edit Grade")).toBeVisible();

		await page.fill('[name="points"]', "95");
		await page.fill('[name="feedback"]', "Great work!");
		await page.click('button:has-text("Save")');

		await expect(page.locator("text=95")).toBeVisible();
	});

	test("should export gradebook to CSV", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/gradebook");

		const downloadPromise = page.waitForEvent("download");
		await page.click('button:has-text("Export CSV")');
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toContain(".csv");
	});

	test("should show grade statistics", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/gradebook");

		await page.click('button:has-text("Statistics")');

		await expect(page.locator("text=Class Statistics")).toBeVisible();
		await expect(page.locator("text=Class Average")).toBeVisible();
		await expect(page.locator("text=Grade Distribution")).toBeVisible();
	});
});

test.describe("Instructor Discussion Management", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('[name="email"]', "instructor@test.com");
		await page.fill('[name="password"]', "password123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/instructor/dashboard");
	});

	test("should pin a discussion thread", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/discussions");

		await page.click('[data-testid="thread-menu"]:first-child');
		await page.click("text=Pin Thread");

		await expect(page.locator('[data-testid="pinned-badge"]')).toBeVisible();
	});

	test("should lock a discussion thread", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/discussions");

		await page.click('[data-testid="thread-menu"]:first-child');
		await page.click("text=Lock Thread");

		await expect(page.locator('[data-testid="locked-badge"]')).toBeVisible();
	});

	test("should delete a discussion post", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/discussions/thread-1");

		await page.click('[data-testid="post-menu"]:first-child');
		await page.click("text=Delete Post");
		await page.click('button:has-text("Confirm")');

		await expect(page.locator("text=Post deleted")).toBeVisible();
	});
});

test.describe("Instructor Live Session", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('[name="email"]', "instructor@test.com");
		await page.fill('[name="password"]', "password123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/instructor/dashboard");
	});

	test("should create a live session", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/live-sessions");

		await page.click('button:has-text("Schedule Session")');

		await page.fill('[name="title"]', "Review Session");
		await page.fill('[name="date"]', "2024-03-15");
		await page.fill('[name="time"]', "14:00");
		await page.fill('[name="duration"]', "60");

		await page.click('button:has-text("Create")');

		await expect(page.locator("text=Review Session")).toBeVisible();
	});

	test("should start a live session", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/live-sessions");

		await page.click('button:has-text("Start Session")');

		// Should redirect to live session room
		await page.waitForURL(/\/live\//);

		await expect(page.locator('[data-testid="video-container"]')).toBeVisible();
	});

	test("should share screen in live session", async ({ page }) => {
		await page.goto("/live/session-1");

		// Mock the getDisplayMedia API
		await page.evaluate(() => {
			(navigator.mediaDevices as any).getDisplayMedia = async () => {
				return new MediaStream();
			};
		});

		await page.click('[aria-label="Share screen"]');

		await expect(
			page.locator('[data-testid="screen-share-indicator"]'),
		).toBeVisible();
	});

	test("should end live session", async ({ page }) => {
		await page.goto("/live/session-1");

		await page.click('[aria-label="End session"]');
		await page.click('button:has-text("End Session")');

		// Should redirect back to course page
		await page.waitForURL(/\/dashboard/);
	});
});

test.describe("Instructor Progress Reports", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('[name="email"]', "instructor@test.com");
		await page.fill('[name="password"]', "password123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/instructor/dashboard");
	});

	test("should display student progress report", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/progress");

		await expect(page.locator("text=Student Progress Report")).toBeVisible();
	});

	test("should show progress distribution chart", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/progress");

		await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
	});

	test("should filter students by progress", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/progress");

		await page.click('[aria-label="Filter"]');
		await page.click("text=Not Started");

		// Should only show students with 0% progress
		const rows = page.locator("tbody tr");
		const count = await rows.count();

		for (let i = 0; i < count; i++) {
			const progress = await rows
				.nth(i)
				.locator('[data-testid="progress-cell"]')
				.textContent();
			expect(progress).toBe("0%");
		}
	});

	test("should export progress report", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/progress");

		const downloadPromise = page.waitForEvent("download");
		await page.click('button:has-text("Export Report")');
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(/\.(pdf|csv|xlsx)$/);
	});
});

test.describe("Admin User Management", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('[name="email"]', "admin@test.com");
		await page.fill('[name="password"]', "password123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/admin/dashboard");
	});

	test("should display user management page", async ({ page }) => {
		await page.goto("/admin/users");

		await expect(page.locator("text=User Management")).toBeVisible();
	});

	test("should list all users", async ({ page }) => {
		await page.goto("/admin/users");

		await expect(page.locator("table")).toBeVisible();
		await expect(page.locator("tbody tr").first()).toBeVisible();
	});

	test("should create new user", async ({ page }) => {
		await page.goto("/admin/users");

		await page.click('button:has-text("Add User")');

		await page.fill('[name="firstName"]', "John");
		await page.fill('[name="lastName"]', "Doe");
		await page.fill('[name="email"]', "john.doe@test.com");
		await page.click('[aria-label="Role"]');
		await page.click("text=Student");

		await page.click('button:has-text("Create")');

		await expect(page.locator("text=john.doe@test.com")).toBeVisible();
	});

	test("should edit user", async ({ page }) => {
		await page.goto("/admin/users");

		await page.click('[data-testid="edit-user-button"]:first-child');

		await page.fill('[name="firstName"]', "Jane");
		await page.click('button:has-text("Update")');

		await expect(page.locator("text=Jane")).toBeVisible();
	});

	test("should deactivate user", async ({ page }) => {
		await page.goto("/admin/users");

		await page.click('[data-testid="toggle-status-button"]:first-child');

		await expect(
			page.locator('[data-testid="status-badge"]:first-child'),
		).toHaveText("INACTIVE");
	});

	test("should delete user", async ({ page }) => {
		await page.goto("/admin/users");

		const email = await page
			.locator("tbody tr:first-child td:nth-child(2)")
			.textContent();

		await page.click('[data-testid="delete-user-button"]:first-child');
		await page.click('button:has-text("Delete")');

		await expect(page.locator(`text=${email}`)).not.toBeVisible();
	});

	test("should search users", async ({ page }) => {
		await page.goto("/admin/users");

		await page.fill('[placeholder="Search users"]', "john");

		// Should filter results
		const rows = page.locator("tbody tr");
		const count = await rows.count();

		for (let i = 0; i < count; i++) {
			const text = await rows.nth(i).textContent();
			expect(text?.toLowerCase()).toContain("john");
		}
	});

	test("should filter users by role", async ({ page }) => {
		await page.goto("/admin/users");

		await page.click('[aria-label="Role"]');
		await page.click("text=Instructor");

		// Should only show instructors
		const badges = page.locator('[data-testid="role-badge"]');
		const count = await badges.count();

		for (let i = 0; i < count; i++) {
			await expect(badges.nth(i)).toHaveText("INSTRUCTOR");
		}
	});

	test("should bulk import users", async ({ page }) => {
		await page.goto("/admin/users");

		await page.click('button:has-text("Import")');

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles({
			name: "users.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(
				"email,firstName,lastName,role\ntest1@test.com,Test,User1,STUDENT",
			),
		});

		await page.click('button:has-text("Import")');

		await expect(page.locator("text=test1@test.com")).toBeVisible();
	});
});

test.describe("Learning Analytics", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('[name="email"]', "instructor@test.com");
		await page.fill('[name="password"]', "password123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/instructor/dashboard");
	});

	test("should display course analytics", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/analytics");

		await expect(page.locator("text=Course Analytics")).toBeVisible();
	});

	test("should show enrollment statistics", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/analytics");

		await expect(page.locator("text=Total Enrolled")).toBeVisible();
	});

	test("should show engagement metrics", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/analytics");

		await expect(page.locator("text=Engagement Score")).toBeVisible();
	});

	test("should display charts", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/analytics");

		await expect(
			page.locator('[data-testid="enrollment-chart"]'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="engagement-chart"]'),
		).toBeVisible();
	});

	test("should change time range", async ({ page }) => {
		await page.goto("/instructor/courses/course-1/analytics");

		await page.click('[aria-label="Time Range"]');
		await page.click("text=Last 90 days");

		// Charts should update (we can't easily verify chart data in E2E)
		await expect(
			page.locator('[data-testid="enrollment-chart"]'),
		).toBeVisible();
	});
});
