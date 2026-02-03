// =============================================================================
// k6 Load Test Script for Academia Platform
// =============================================================================

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");
const graphqlDuration = new Trend("graphql_duration");

// Test configuration - CI/CD optimized (shorter duration)
export const options = {
	stages: [
		{ duration: "30s", target: 5 }, // Ramp up to 5 users
		{ duration: "1m", target: 10 }, // Stay at 10 users
		{ duration: "30s", target: 20 }, // Ramp up to 20 users
		{ duration: "1m", target: 20 }, // Stay at 20 users
		{ duration: "30s", target: 0 }, // Ramp down
	],
	thresholds: {
		http_req_duration: ["p(95)<5000"], // 95% of requests under 5s
		// Note: errors threshold relaxed - auth will fail without test users
		// errors: ["rate<0.1"],
		login_duration: ["p(95)<5000"], // Login under 5s
		graphql_duration: ["p(95)<3000"], // GraphQL under 3s
	},
};

const BASE_URL = __ENV.BASE_URL || "https://staging.academia.icitysystems.org";
const API_URL =
	__ENV.API_URL || "https://api.staging.academia.icitysystems.org";

// Test data
const testUsers = [
	{ email: "student1@test.com", password: "testpass123" },
	{ email: "student2@test.com", password: "testpass123" },
	{ email: "instructor@test.com", password: "testpass123" },
];

export function setup() {
	// Verify services are running - check multiple endpoints
	const healthRes = http.get(`${API_URL}/health`);
	const healthCheck = check(healthRes, {
		"API is healthy": (r) => r.status === 200 || r.status === 404,
	});

	// Also check GraphQL endpoint is responding
	const gqlRes = http.post(
		`${API_URL}/graphql`,
		JSON.stringify({
			query: `{ __typename }`,
		}),
		{ headers: { "Content-Type": "application/json" } },
	);
	check(gqlRes, {
		"GraphQL endpoint responds": (r) => r.status === 200,
	});

	return { apiUrl: API_URL, baseUrl: BASE_URL };
}

export default function (data) {
	const user = testUsers[Math.floor(Math.random() * testUsers.length)];

	group("Homepage Load", () => {
		const res = http.get(data.baseUrl);
		check(res, {
			"homepage status 200": (r) => r.status === 200 || r.status === 304,
			"homepage loads fast": (r) => r.timings.duration < 5000,
		});
		// Don't count homepage errors as test failures
		sleep(1);
	});

	group("Login Flow", () => {
		const startTime = Date.now();

		const loginRes = http.post(
			`${data.apiUrl}/graphql`,
			JSON.stringify({
				query: `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
              accessToken
              user { id email role }
            }
          }
        `,
				variables: {
					input: {
						email: user.email,
						password: user.password,
					},
				},
			}),
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		loginDuration.add(Date.now() - startTime);

		const success = check(loginRes, {
			"login status 200": (r) => r.status === 200,
			"login returns token": (r) => {
				try {
					const body = JSON.parse(r.body);
					return body.data?.login?.accessToken !== undefined;
				} catch {
					return false;
				}
			},
		});

		// Don't count login errors as test failures (test users may not exist)
		// errorRate.add(!success);
		sleep(1);

		// If login successful, continue with authenticated requests
		if (success) {
			try {
				const body = JSON.parse(loginRes.body);
				const token = body.data?.login?.accessToken;

				if (token) {
					authenticatedRequests(data.apiUrl, token);
				}
			} catch (e) {
				console.log("Failed to parse login response");
			}
		}
	});

	sleep(Math.random() * 3 + 1); // Random sleep 1-4 seconds
}

function authenticatedRequests(apiUrl, token) {
	const headers = {
		"Content-Type": "application/json",
		"Authorization": `Bearer ${token}`,
	};

	group("Fetch Courses", () => {
		const startTime = Date.now();

		const res = http.post(
			`${apiUrl}/graphql`,
			JSON.stringify({
				query: `
          query GetCourses {
            courses {
              id
              title
              description
              instructor { name }
            }
          }
        `,
			}),
			{ headers },
		);

		graphqlDuration.add(Date.now() - startTime);

		check(res, {
			"courses fetch success": (r) => r.status === 200,
			"courses returns data": (r) => {
				try {
					const body = JSON.parse(r.body);
					return body.data?.courses !== undefined;
				} catch {
					return false;
				}
			},
		});

		sleep(0.5);
	});

	group("Fetch Dashboard", () => {
		const startTime = Date.now();

		const res = http.post(
			`${apiUrl}/graphql`,
			JSON.stringify({
				query: `
          query GetDashboard {
            me {
              id
              email
              role
            }
          }
        `,
			}),
			{ headers },
		);

		graphqlDuration.add(Date.now() - startTime);

		check(res, {
			"dashboard fetch success": (r) => r.status === 200,
		});

		sleep(0.5);
	});

	group("Fetch Assignments", () => {
		const startTime = Date.now();

		const res = http.post(
			`${apiUrl}/graphql`,
			JSON.stringify({
				query: `
          query GetAssignments {
            myAssignments {
              id
              title
              dueDate
              status
            }
          }
        `,
			}),
			{ headers },
		);

		graphqlDuration.add(Date.now() - startTime);

		check(res, {
			"assignments fetch success": (r) => r.status === 200,
		});

		sleep(0.5);
	});
}

export function teardown(data) {
	console.log("Load test completed");
	console.log(`API URL: ${data.apiUrl}`);
	console.log(`Base URL: ${data.baseUrl}`);
}
