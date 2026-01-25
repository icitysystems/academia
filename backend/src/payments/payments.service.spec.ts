import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma.service";
import { ConfigService } from "@nestjs/config";
import { BadRequestException, NotFoundException } from "@nestjs/common";

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
			retrieve: jest.fn(),
			cancel: jest.fn(),
			update: jest.fn(),
		},
		products: {
			create: jest.fn(),
		},
		prices: {
			create: jest.fn(),
		},
		webhooks: {
			constructEvent: jest.fn(),
		},
	}));
});

describe("PaymentsService", () => {
	let service: PaymentsService;
	let prisma: PrismaService;

	const mockPrismaService = {
		donation: {
			create: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
		},
		subscription: {
			create: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
		},
		subscriptionPlan: {
			create: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
		},
		user: {
			findUnique: jest.fn(),
			update: jest.fn(),
		},
	};

	const mockConfigService = {
		get: jest.fn((key: string) => {
			const config: Record<string, any> = {
				"stripe.secretKey": "sk_test_mock_key",
				"stripe.webhookSecret": "whsec_mock_secret",
			};
			return config[key];
		}),
	};

	const mockUserId = "user-123";

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PaymentsService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: ConfigService, useValue: mockConfigService },
			],
		}).compile();

		service = module.get<PaymentsService>(PaymentsService);
		prisma = module.get<PrismaService>(PrismaService);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("createDonationPaymentIntent", () => {
		const donationInput = {
			amount: 5000, // $50.00
			currency: "usd",
			email: "donor@example.com",
			name: "Test Donor",
			message: "Great work!",
			isAnonymous: false,
		};

		it("should create a donation payment intent", async () => {
			const mockPaymentIntent = {
				id: "pi_test_123",
				client_secret: "pi_test_123_secret",
			};

			// Access the mocked stripe instance
			const stripeInstance = (service as any).stripe;
			stripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

			mockPrismaService.donation.create.mockResolvedValue({
				id: "donation-123",
				...donationInput,
				stripePaymentId: mockPaymentIntent.id,
				status: "PENDING",
			});

			const result = await service.createDonationPaymentIntent(
				donationInput,
				mockUserId,
			);

			expect(result.clientSecret).toBe(mockPaymentIntent.client_secret);
			expect(result.paymentIntentId).toBe(mockPaymentIntent.id);
			expect(result.amount).toBe(donationInput.amount);
			expect(mockPrismaService.donation.create).toHaveBeenCalled();
		});
	});

	describe("getDonations", () => {
		it("should return all donations for admin", async () => {
			const mockDonations = [
				{
					id: "donation-1",
					amount: 5000,
					email: "donor1@example.com",
					status: "COMPLETED",
				},
				{
					id: "donation-2",
					amount: 10000,
					email: "donor2@example.com",
					status: "COMPLETED",
				},
			];

			mockPrismaService.donation.findMany.mockResolvedValue(mockDonations);

			const result = await service.getDonations();

			expect(result).toHaveLength(2);
			expect(mockPrismaService.donation.findMany).toHaveBeenCalled();
		});
	});

	describe("getSubscriptionPlans", () => {
		it("should return all active subscription plans", async () => {
			const mockPlans = [
				{
					id: "plan-1",
					name: "Basic",
					priceMonthly: 999,
					tier: 1,
					isActive: true,
				},
				{
					id: "plan-2",
					name: "Pro",
					priceMonthly: 2999,
					tier: 2,
					isActive: true,
				},
			];

			mockPrismaService.subscriptionPlan.findMany.mockResolvedValue(mockPlans);

			const result = await service.getSubscriptionPlans();

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Basic");
		});
	});

	describe("getUserSubscription", () => {
		it("should return active subscription for a user", async () => {
			const mockSubscription = {
				id: "sub-123",
				userId: mockUserId,
				planId: "plan-1",
				status: "ACTIVE",
				currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				plan: {
					id: "plan-1",
					name: "Pro",
					priceMonthly: 2999,
				},
			};

			mockPrismaService.subscription.findFirst.mockResolvedValue(
				mockSubscription,
			);

			const result = await service.getUserSubscription(mockUserId);

			expect(result.id).toBe("sub-123");
			expect(result.status).toBe("ACTIVE");
		});

		it("should return null if user has no subscription", async () => {
			mockPrismaService.subscription.findFirst.mockResolvedValue(null);

			const result = await service.getUserSubscription(mockUserId);

			expect(result).toBeNull();
		});
	});

	describe("cancelSubscription", () => {
		it("should cancel an active subscription", async () => {
			const mockSubscription = {
				id: "sub-123",
				userId: mockUserId,
				stripeSubscriptionId: "sub_stripe_123",
				status: "ACTIVE",
			};

			mockPrismaService.subscription.findFirst.mockResolvedValue(
				mockSubscription,
			);

			const stripeInstance = (service as any).stripe;
			stripeInstance.subscriptions.update.mockResolvedValue({
				id: "sub_stripe_123",
				cancel_at_period_end: true,
			});

			mockPrismaService.subscription.update.mockResolvedValue({
				...mockSubscription,
				cancelAtPeriodEnd: true,
			});

			const result = await service.cancelSubscription(mockUserId, {
				subscriptionId: "sub-123",
				cancelAtPeriodEnd: true,
			});

			expect(result.cancelAtPeriodEnd).toBe(true);
		});

		it("should throw NotFoundException if subscription not found", async () => {
			mockPrismaService.subscription.findFirst.mockResolvedValue(null);

			await expect(
				service.cancelSubscription(mockUserId, {
					subscriptionId: "non-existent",
					cancelAtPeriodEnd: true,
				}),
			).rejects.toThrow(NotFoundException);
		});
	});
});
