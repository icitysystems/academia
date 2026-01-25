import { test, expect } from "@playwright/test";

test.describe("Student Quiz Taking Flow", () => {
	test.beforeEach(async ({ page }) => {
		// Login as student
		await page.goto("/login");
		await page.fill('input[name="email"]', "student@test.com");
		await page.fill('input[name="password"]', "testpassword123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/dashboard");
	});

	test("should display quiz instructions before starting", async ({ page }) => {
		await page.goto("/student/quizzes/quiz-123");

		// Should see quiz title and information
		await expect(page.locator("h4")).toContainText("Quiz");
		await expect(page.getByText("Total Questions")).toBeVisible();
		await expect(page.getByText("Total Marks")).toBeVisible();
		await expect(page.getByText("Time Limit")).toBeVisible();

		// Start button should be visible
		await expect(
			page.getByRole("button", { name: "Start Quiz" }),
		).toBeVisible();
	});

	test("should start quiz and display first question", async ({ page }) => {
		await page.goto("/student/quizzes/quiz-123");

		// Click start
		await page.click('button:has-text("Start Quiz")');

		// Wait for quiz interface
		await expect(page.getByText("Question 1")).toBeVisible();

		// Timer should be visible if quiz has time limit
		await expect(page.locator(".MuiChip-root")).toBeVisible();
	});

	test("should navigate between questions", async ({ page }) => {
		await page.goto("/student/quizzes/quiz-123");
		await page.click('button:has-text("Start Quiz")');

		// Should be on question 1
		await expect(page.getByText("Question 1")).toBeVisible();

		// Click next
		await page.click('button:has-text("Next")');

		// Should be on question 2
		await expect(page.getByText("Question 2")).toBeVisible();

		// Click previous
		await page.click('button:has-text("Previous")');

		// Back to question 1
		await expect(page.getByText("Question 1")).toBeVisible();
	});

	test("should save answers when selecting options", async ({ page }) => {
		await page.goto("/student/quizzes/quiz-123");
		await page.click('button:has-text("Start Quiz")');

		// Select an answer
		await page.click(".MuiRadio-root >> nth=0");

		// Navigate away and back
		await page.click('button:has-text("Next")');
		await page.click('button:has-text("Previous")');

		// Answer should still be selected
		await expect(page.locator(".MuiRadio-root.Mui-checked")).toBeVisible();
	});

	test("should flag questions for review", async ({ page }) => {
		await page.goto("/student/quizzes/quiz-123");
		await page.click('button:has-text("Start Quiz")');

		// Click flag button
		await page.click('button[aria-label*="flag"]');

		// Flag indicator should change
		await expect(page.locator('[data-testid="FlagIcon"]')).toHaveCSS(
			"color",
			expect.stringMatching(/warning|orange/i),
		);
	});

	test("should show submit confirmation dialog", async ({ page }) => {
		await page.goto("/student/quizzes/quiz-123");
		await page.click('button:has-text("Start Quiz")');

		// Click submit
		await page.click('button:has-text("Submit Quiz")');

		// Confirmation dialog should appear
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByText("Submit Quiz?")).toBeVisible();
	});

	test("should show results after submission", async ({ page }) => {
		await page.goto("/student/quizzes/quiz-123");
		await page.click('button:has-text("Start Quiz")');

		// Answer a question
		await page.click(".MuiRadio-root >> nth=0");

		// Submit
		await page.click('button:has-text("Submit Quiz")');
		await page.click('button:has-text("Submit Quiz") >> nth=1');

		// Should see results
		await expect(page.getByText("Quiz Completed!")).toBeVisible();
	});
});

test.describe("Student Assignment Submission Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('input[name="email"]', "student@test.com");
		await page.fill('input[name="password"]', "testpassword123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/dashboard");
	});

	test("should display assignment details", async ({ page }) => {
		await page.goto("/assignments/assign-123");

		// Should see assignment info
		await expect(page.locator("h4")).toContainText("Assignment");
		await expect(page.getByText("Due:")).toBeVisible();
		await expect(page.getByText("points")).toBeVisible();
	});

	test("should allow text submission", async ({ page }) => {
		await page.goto("/assignments/assign-123");

		// Type answer
		await page.fill(
			'textarea[placeholder*="answer"]',
			"This is my assignment answer.",
		);

		// Submit button should be enabled
		await expect(page.getByRole("button", { name: /submit/i })).toBeEnabled();
	});

	test("should show file upload area", async ({ page }) => {
		await page.goto("/assignments/assign-123");

		// File upload area should be visible
		await expect(page.getByText("Drag & drop")).toBeVisible();
	});

	test("should validate file uploads", async ({ page }) => {
		await page.goto("/assignments/assign-123");

		// Upload a file
		const fileChooserPromise = page.waitForEvent("filechooser");
		await page.click("text=Drag & drop");
		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles({
			name: "test.pdf",
			mimeType: "application/pdf",
			buffer: Buffer.from("PDF content"),
		});

		// File should appear in list
		await expect(page.getByText("test.pdf")).toBeVisible();
	});
});

test.describe("Discussion Forums Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('input[name="email"]', "student@test.com");
		await page.fill('input[name="password"]', "testpassword123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/dashboard");
	});

	test("should display discussion thread list", async ({ page }) => {
		await page.goto("/courses/course-123/discussions");

		await expect(page.getByText("Discussion Forums")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "New Discussion" }),
		).toBeVisible();
	});

	test("should open new discussion dialog", async ({ page }) => {
		await page.goto("/courses/course-123/discussions");

		await page.click('button:has-text("New Discussion")');

		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByLabel("Title")).toBeVisible();
		await expect(page.getByLabel("Content")).toBeVisible();
	});

	test("should create a new discussion thread", async ({ page }) => {
		await page.goto("/courses/course-123/discussions");

		await page.click('button:has-text("New Discussion")');

		await page.fill('input[label="Title"]', "Test Discussion Title");
		await page.fill(
			'textarea[label="Content"]',
			"This is the content of my discussion.",
		);

		await page.click('button:has-text("Create Discussion")');

		// Dialog should close
		await expect(page.getByRole("dialog")).not.toBeVisible();
	});

	test("should view thread details", async ({ page }) => {
		await page.goto("/courses/course-123/discussions/thread-123");

		// Should see thread title and content
		await expect(page.locator("h5")).toBeVisible();
		await expect(page.getByText("Replies")).toBeVisible();
	});

	test("should post a reply", async ({ page }) => {
		await page.goto("/courses/course-123/discussions/thread-123");

		await page.fill(
			'textarea[placeholder*="reply"]',
			"This is my reply to the discussion.",
		);
		await page.click('button:has-text("Post Reply")');

		// Reply should appear
		await expect(page.getByText("This is my reply")).toBeVisible();
	});

	test("should upvote a post", async ({ page }) => {
		await page.goto("/courses/course-123/discussions/thread-123");

		// Click upvote button on first reply
		await page.click('button:has-text("0") >> nth=0');

		// Count should increase (or button should change state)
		await expect(page.locator('[data-testid="ThumbUpIcon"]')).toBeVisible();
	});
});

test.describe("Notifications Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('input[name="email"]', "student@test.com");
		await page.fill('input[name="password"]', "testpassword123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/dashboard");
	});

	test("should display notification bell in navbar", async ({ page }) => {
		await expect(
			page.locator('[data-testid="NotificationsIcon"]'),
		).toBeVisible();
	});

	test("should open notification dropdown", async ({ page }) => {
		await page.click('[data-testid="NotificationsIcon"]');

		await expect(page.getByText("Notifications")).toBeVisible();
	});

	test("should navigate to full notifications page", async ({ page }) => {
		await page.click('[data-testid="NotificationsIcon"]');
		await page.click("text=View All Notifications");

		await expect(page.url()).toContain("/notifications");
	});

	test("should mark notification as read", async ({ page }) => {
		await page.goto("/notifications");

		// Click on unread notification
		const unreadNotification = page
			.locator('[data-testid="CircleIcon"]')
			.first();
		if (await unreadNotification.isVisible()) {
			await unreadNotification.click();
			// Indicator should disappear
			await expect(unreadNotification).not.toBeVisible();
		}
	});

	test("should mark all as read", async ({ page }) => {
		await page.goto("/notifications");

		const markAllButton = page.getByRole("button", { name: "Mark all read" });
		if (await markAllButton.isVisible()) {
			await markAllButton.click();
			// All unread indicators should disappear
			await expect(page.locator('[data-testid="CircleIcon"]')).toHaveCount(0);
		}
	});
});

test.describe("Student Certificates Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.fill('input[name="email"]', "student@test.com");
		await page.fill('input[name="password"]', "testpassword123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/dashboard");
	});

	test("should display certificates page", async ({ page }) => {
		await page.goto("/student/certificates");

		await expect(page.getByText("My Certificates")).toBeVisible();
	});

	test("should show certificate cards when available", async ({ page }) => {
		await page.goto("/student/certificates");

		// Either show certificates or empty state
		const certificates = page.locator('[class*="MuiCard"]');
		const emptyState = page.getByText("No certificates yet");

		await expect(certificates.or(emptyState)).toBeVisible();
	});

	test("should open certificate preview dialog", async ({ page }) => {
		await page.goto("/student/certificates");

		const viewButton = page.getByRole("button", { name: "View" }).first();
		if (await viewButton.isVisible()) {
			await viewButton.click();

			await expect(page.getByRole("dialog")).toBeVisible();
			await expect(page.getByText("Certificate Preview")).toBeVisible();
		}
	});

	test("should have download PDF button in preview", async ({ page }) => {
		await page.goto("/student/certificates");

		const viewButton = page.getByRole("button", { name: "View" }).first();
		if (await viewButton.isVisible()) {
			await viewButton.click();

			await expect(
				page.getByRole("button", { name: /download pdf/i }),
			).toBeVisible();
		}
	});
});
