import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentsService } from "../src/payments/payments.service";
import { PrismaService } from "../src/prisma.service";

// Mock Stripe
jest.mock("stripe", () => {
	return jest.fn().mockImplementation(() => ({
		paymentIntents: {
			create: jest.fn(),
			retrieve: jest.fn(),
		},
		customers: {
			create: jest.fn(),
			retrieve: jest.fn(),
		},
		subscriptions: {
			create: jest.fn(),
			update: jest.fn(),
			cancel: jest.fn(),
		},
		products: {
			create: jest.fn(),
			update: jest.fn(),
		},
		prices: {
			create: jest.fn(),
		},
		checkout: {
			sessions: {
				create: jest.fn(),
			},
		},
	}));
});

describe("PaymentsService", () => {
	let service: PaymentsService;
	let prismaService: jest.Mocked<PrismaService>;
	let configService: jest.Mocked<ConfigService>;

	const mockUser = {
		id: "user-123",
		email: "user@example.com",
		name: "Test User",
		stripeCustomerId: "cus_test123",
	};

	const mockDonation = {
		id: "donation-123",
		email: "donor@example.com",
		name: "Test Donor",
		amount: 5000,
		currency: "usd",
		stripePaymentId: "pi_test123",
		message: "Great platform!",
		isAnonymous: false,
		userId: null,
		status: "PENDING",
		createdAt: new Date(),
	};

	const mockPlan = {
		id: "plan-123",
		name: "Premium Plan",
		description: "Full access to all features",
		tier: 2,
		priceMonthly: 2900,
		priceYearly: 29000,
		stripeProductId: "prod_test123",
		features: JSON.stringify(["Feature 1", "Feature 2"]),
		maxTemplates: 100,
		maxSheetsPerMonth: 10000,
		maxModelsPerTemplate: 10,
		maxStorageMB: 5000,
		hasAdvancedAnalytics: true,
		hasAPIAccess: true,
		hasPrioritySupport: true,
		hasCustomBranding: false,
		hasTeamFeatures: false,
		discountPercentYearly: 17,
		trialDays: 14,
		priority: 1,
		isActive: true,
		isPublic: true,
	};

	const mockSubscription = {
		id: "subscription-123",
		userId: mockUser.id,
		planId: mockPlan.id,
		stripeSubscriptionId: "sub_test123",
		status: "ACTIVE",
		currentPeriodStart: new Date(),
		currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		billingInterval: "MONTHLY",
		user: mockUser,
		plan: mockPlan,
	};

	beforeEach(async () => {
		const mockPrismaService = {
			donation: {
				create: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn(),
				update: jest.fn(),
			},
			subscriptionPlan: {
				create: jest.fn(),
				findUnique: jest.fn(),
				findMany: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
			},
			subscription: {
				create: jest.fn(),
				findUnique: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn(),
				update: jest.fn(),
			},
			user: {
				findUnique: jest.fn(),
				update: jest.fn(),
			},
		};

		const mockConfigService = {
			get: jest.fn().mockImplementation((key: string) => {
				const config: { [key: string]: string } = {
					"stripe.secretKey": "sk_test_123",
					"stripe.webhookSecret": "whsec_test123",
					"frontend.url": "http://localhost:3000",
				};
				return config[key];
			}),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PaymentsService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: ConfigService, useValue: mockConfigService },
			],
		}).compile();

		service = module.get<PaymentsService>(PaymentsService);
		prismaService = module.get(PrismaService);
		configService = module.get(ConfigService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("createDonationPaymentIntent", () => {
		const donationInput = {
			email: "donor@example.com",
			name: "Test Donor",
			amount: 5000,
			currency: "usd",
			message: "Keep up the good work!",
			isAnonymous: false,
		};

		it("should create a donation payment intent", async () => {
			prismaService.donation.create = jest.fn().mockResolvedValue(mockDonation);

			const result = await service.createDonationPaymentIntent(donationInput);

			expect(result.amount).toBe(donationInput.amount);
			expect(result.currency).toBe(donationInput.currency);
			expect(result.clientSecret).toBeDefined();
		});

		it("should create donation record in database", async () => {
			prismaService.donation.create = jest.fn().mockResolvedValue(mockDonation);

			await service.createDonationPaymentIntent(donationInput, mockUser.id);

			expect(prismaService.donation.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					email: donationInput.email,
					amount: donationInput.amount,
					status: "PENDING",
					userId: mockUser.id,
				}),
			});
		});
	});

	describe("confirmDonation", () => {
		it("should confirm a donation", async () => {
			prismaService.donation.findFirst = jest
				.fn()
				.mockResolvedValue(mockDonation);
			prismaService.donation.update = jest.fn().mockResolvedValue({
				...mockDonation,
				status: "COMPLETED",
				completedAt: new Date(),
			});

			const result = await service.confirmDonation(
				mockDonation.stripePaymentId,
			);

			expect(result.status).toBe("COMPLETED");
			expect(prismaService.donation.update).toHaveBeenCalledWith({
				where: { id: mockDonation.id },
				data: expect.objectContaining({
					status: "COMPLETED",
					completedAt: expect.any(Date),
				}),
			});
		});

		it("should throw NotFoundException for non-existent donation", async () => {
			prismaService.donation.findFirst = jest.fn().mockResolvedValue(null);

			await expect(service.confirmDonation("pi_invalid")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("getDonations", () => {
		it("should return completed donations", async () => {
			const donations = [{ ...mockDonation, status: "COMPLETED" }];
			prismaService.donation.findMany = jest.fn().mockResolvedValue(donations);

			const result = await service.getDonations();

			expect(result).toEqual(donations);
			expect(prismaService.donation.findMany).toHaveBeenCalledWith({
				where: { status: "COMPLETED" },
				orderBy: { createdAt: "desc" },
				take: 50,
			});
		});
	});

	describe("getDonationStats", () => {
		it("should return donation statistics", async () => {
			const donations = [{ amount: 5000 }, { amount: 10000 }];
			prismaService.donation.findMany = jest
				.fn()
				.mockResolvedValueOnce(donations)
				.mockResolvedValueOnce([{ amount: 5000 }]);

			const stats = await service.getDonationStats();

			expect(stats.totalDonations).toBe(2);
			expect(stats.totalAmount).toBe(150);
			expect(stats.donationsThisMonth).toBe(1);
			expect(stats.amountThisMonth).toBe(50);
		});
	});

	describe("createSubscriptionPlan", () => {
		const planInput = {
			name: "New Plan",
			description: "A new subscription plan",
			tier: 1,
			priceMonthly: 1900,
			priceYearly: 19000,
			features: ["Feature A", "Feature B"],
			maxTemplates: 50,
			maxSheetsPerMonth: 5000,
			maxModelsPerTemplate: 5,
			maxStorageMB: 2000,
			hasAdvancedAnalytics: false,
			hasAPIAccess: false,
			hasPrioritySupport: false,
			hasCustomBranding: false,
			hasTeamFeatures: false,
			discountPercentYearly: 17,
			trialDays: 7,
			priority: 2,
			isPublic: true,
		};

		it("should create a subscription plan", async () => {
			prismaService.subscriptionPlan.create = jest
				.fn()
				.mockResolvedValue(mockPlan);

			const result = await service.createSubscriptionPlan(planInput);

			expect(result.name).toBe(mockPlan.name);
			expect(prismaService.subscriptionPlan.create).toHaveBeenCalled();
		});
	});

	describe("updateSubscriptionPlan", () => {
		it("should update a subscription plan", async () => {
			prismaService.subscriptionPlan.findUnique = jest
				.fn()
				.mockResolvedValue(mockPlan);
			prismaService.subscriptionPlan.update = jest.fn().mockResolvedValue({
				...mockPlan,
				name: "Updated Plan",
			});

			const result = await service.updateSubscriptionPlan(mockPlan.id, {
				name: "Updated Plan",
			});

			expect(result.name).toBe("Updated Plan");
		});

		it("should throw NotFoundException for non-existent plan", async () => {
			prismaService.subscriptionPlan.findUnique = jest
				.fn()
				.mockResolvedValue(null);

			await expect(
				service.updateSubscriptionPlan("invalid-id", { name: "Test" }),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("deleteSubscriptionPlan", () => {
		it("should delete a plan with no active subscriptions", async () => {
			prismaService.subscriptionPlan.findUnique = jest.fn().mockResolvedValue({
				...mockPlan,
				subscriptions: [],
			});
			prismaService.subscriptionPlan.delete = jest
				.fn()
				.mockResolvedValue(mockPlan);

			const result = await service.deleteSubscriptionPlan(mockPlan.id);

			expect(result.id).toBe(mockPlan.id);
		});

		it("should throw BadRequestException if plan has active subscriptions", async () => {
			prismaService.subscriptionPlan.findUnique = jest.fn().mockResolvedValue({
				...mockPlan,
				subscriptions: [mockSubscription],
			});

			await expect(service.deleteSubscriptionPlan(mockPlan.id)).rejects.toThrow(
				BadRequestException,
			);
		});

		it("should throw NotFoundException for non-existent plan", async () => {
			prismaService.subscriptionPlan.findUnique = jest
				.fn()
				.mockResolvedValue(null);

			await expect(
				service.deleteSubscriptionPlan("invalid-id"),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("getSubscriptionPlans", () => {
		it("should return active public plans by default", async () => {
			const plans = [mockPlan];
			prismaService.subscriptionPlan.findMany = jest
				.fn()
				.mockResolvedValue(plans);

			const result = await service.getSubscriptionPlans();

			expect(result).toHaveLength(1);
			expect(result[0].features).toEqual(["Feature 1", "Feature 2"]);
			expect(prismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
				where: {
					isActive: true,
					isPublic: true,
				},
				orderBy: [{ tier: "asc" }, { priority: "asc" }],
			});
		});

		it("should include inactive plans when requested", async () => {
			prismaService.subscriptionPlan.findMany = jest
				.fn()
				.mockResolvedValue([mockPlan]);

			await service.getSubscriptionPlans(true, false);

			expect(prismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
				where: {},
				orderBy: [{ tier: "asc" }, { priority: "asc" }],
			});
		});
	});

	describe("getSubscriptionPlan", () => {
		it("should return a subscription plan by ID", async () => {
			prismaService.subscriptionPlan.findUnique = jest
				.fn()
				.mockResolvedValue(mockPlan);

			const result = await service.getSubscriptionPlan(mockPlan.id);

			expect(result.id).toBe(mockPlan.id);
			expect(result.features).toEqual(["Feature 1", "Feature 2"]);
		});

		it("should throw NotFoundException for non-existent plan", async () => {
			prismaService.subscriptionPlan.findUnique = jest
				.fn()
				.mockResolvedValue(null);

			await expect(service.getSubscriptionPlan("invalid-id")).rejects.toThrow(
				NotFoundException,
			);
		});
	});
});
