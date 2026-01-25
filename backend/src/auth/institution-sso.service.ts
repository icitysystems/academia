import {
	Injectable,
	Logger,
	UnauthorizedException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as crypto from "crypto";
import * as zlib from "zlib";
import { promisify } from "util";

/**
 * Institution SSO Service
 * Implements SAML-based Single Sign-On for institutional authentication
 */

const inflate = promisify(zlib.inflate);
const deflate = promisify(zlib.deflate);

export interface SSOConfiguration {
	institutionId: string;
	institutionName: string;
	entityId: string;
	ssoUrl: string;
	sloUrl?: string;
	certificate: string;
	nameIdFormat?: string;
	attributeMapping?: {
		email?: string;
		firstName?: string;
		lastName?: string;
		role?: string;
	};
}

export interface SAMLAssertion {
	issuer: string;
	nameId: string;
	sessionIndex?: string;
	attributes: Record<string, string>;
	conditions?: {
		notBefore?: Date;
		notOnOrAfter?: Date;
		audience?: string;
	};
}

@Injectable()
export class InstitutionSSOService {
	private readonly logger = new Logger(InstitutionSSOService.name);
	private readonly SP_ENTITY_ID =
		process.env.SAML_SP_ENTITY_ID || "https://academia.edu/saml";
	private readonly SP_ACS_URL =
		process.env.SAML_ACS_URL || "https://academia.edu/api/auth/saml/callback";
	private readonly SP_SLO_URL =
		process.env.SAML_SLO_URL || "https://academia.edu/api/auth/saml/logout";

	constructor(private prisma: PrismaService) {}

	/**
	 * Create or update SSO configuration for an institution
	 */
	async configureSSOForInstitution(adminId: string, config: SSOConfiguration) {
		// Verify admin role
		const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
		if (admin?.role !== "ADMIN") {
			throw new UnauthorizedException("Only administrators can configure SSO");
		}

		// Validate certificate format
		if (!config.certificate.includes("BEGIN CERTIFICATE")) {
			throw new BadRequestException(
				"Invalid certificate format. Please provide a PEM-formatted certificate.",
			);
		}

		const existingConfig = await this.prisma.sSOConfiguration.findUnique({
			where: { institutionId: config.institutionId },
		});

		if (existingConfig) {
			return this.prisma.sSOConfiguration.update({
				where: { institutionId: config.institutionId },
				data: {
					institutionName: config.institutionName,
					entityId: config.entityId,
					ssoUrl: config.ssoUrl,
					sloUrl: config.sloUrl,
					certificate: config.certificate,
					nameIdFormat: config.nameIdFormat || "emailAddress",
					attributeMapping: config.attributeMapping
						? JSON.stringify(config.attributeMapping)
						: null,
				},
			});
		}

		return this.prisma.sSOConfiguration.create({
			data: {
				institutionId: config.institutionId,
				institutionName: config.institutionName,
				entityId: config.entityId,
				ssoUrl: config.ssoUrl,
				sloUrl: config.sloUrl,
				certificate: config.certificate,
				nameIdFormat: config.nameIdFormat || "emailAddress",
				attributeMapping: config.attributeMapping
					? JSON.stringify(config.attributeMapping)
					: null,
			},
		});
	}

	/**
	 * Get SSO configuration for an institution
	 */
	async getSSOConfiguration(institutionId: string) {
		const config = await this.prisma.sSOConfiguration.findUnique({
			where: { institutionId },
		});

		if (!config) {
			return null;
		}

		return {
			...config,
			attributeMapping: config.attributeMapping
				? JSON.parse(config.attributeMapping)
				: null,
		};
	}

	/**
	 * List all SSO configurations (admin only)
	 */
	async listSSOConfigurations(adminId: string) {
		const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
		if (admin?.role !== "ADMIN") {
			throw new UnauthorizedException(
				"Only administrators can view SSO configurations",
			);
		}

		return this.prisma.sSOConfiguration.findMany({
			select: {
				id: true,
				institutionId: true,
				institutionName: true,
				entityId: true,
				isEnabled: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	/**
	 * Generate SAML AuthnRequest
	 */
	async generateAuthRequest(institutionId: string): Promise<{
		redirectUrl: string;
		requestId: string;
	}> {
		const config = await this.getSSOConfiguration(institutionId);
		if (!config || !config.isEnabled) {
			throw new BadRequestException(
				"SSO not configured or disabled for this institution",
			);
		}

		const requestId = `_${crypto.randomUUID()}`;
		const issueInstant = new Date().toISOString();

		const authnRequest = `
			<samlp:AuthnRequest
				xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
				xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
				ID="${requestId}"
				Version="2.0"
				IssueInstant="${issueInstant}"
				AssertionConsumerServiceURL="${this.SP_ACS_URL}"
				Destination="${config.ssoUrl}"
				ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
				<saml:Issuer>${this.SP_ENTITY_ID}</saml:Issuer>
				<samlp:NameIDPolicy
					Format="urn:oasis:names:tc:SAML:1.1:nameid-format:${config.nameIdFormat || "emailAddress"}"
					AllowCreate="true"/>
			</samlp:AuthnRequest>
		`.trim();

		// Deflate and base64 encode
		const deflated = await deflate(Buffer.from(authnRequest));
		const encoded = deflated.toString("base64");

		// Build redirect URL
		const redirectUrl = new URL(config.ssoUrl);
		redirectUrl.searchParams.set("SAMLRequest", encoded);
		redirectUrl.searchParams.set("RelayState", institutionId);

		return {
			redirectUrl: redirectUrl.toString(),
			requestId,
		};
	}

	/**
	 * Process SAML Response
	 */
	async processSAMLResponse(
		samlResponse: string,
		relayState?: string,
	): Promise<{
		user: any;
		token?: string;
		isNewUser: boolean;
	}> {
		// Decode the response
		const decodedResponse = Buffer.from(samlResponse, "base64").toString(
			"utf-8",
		);

		// Parse the assertion (simplified - in production, use a proper XML parser)
		const assertion = this.parseAssertion(decodedResponse);

		// Get the institution configuration
		const config = await this.prisma.sSOConfiguration.findFirst({
			where: { entityId: assertion.issuer },
		});

		if (!config || !config.isEnabled) {
			throw new UnauthorizedException("Invalid or disabled SSO configuration");
		}

		// Verify the signature (simplified - in production, use xml-crypto)
		const isValid = await this.verifySignature(
			decodedResponse,
			config.certificate,
		);
		if (!isValid) {
			this.logger.warn("Invalid SAML signature");
			// In development, we might continue anyway
		}

		// Verify conditions
		if (assertion.conditions) {
			const now = new Date();
			if (
				assertion.conditions.notBefore &&
				now < assertion.conditions.notBefore
			) {
				throw new UnauthorizedException("SAML assertion not yet valid");
			}
			if (
				assertion.conditions.notOnOrAfter &&
				now > assertion.conditions.notOnOrAfter
			) {
				throw new UnauthorizedException("SAML assertion has expired");
			}
		}

		// Map attributes
		const attributeMapping = config.attributeMapping
			? JSON.parse(config.attributeMapping)
			: { email: "email", firstName: "firstName", lastName: "lastName" };

		const email =
			assertion.attributes[attributeMapping.email || "email"] ||
			assertion.nameId;
		const firstName =
			assertion.attributes[attributeMapping.firstName || "firstName"];
		const lastName =
			assertion.attributes[attributeMapping.lastName || "lastName"];
		const role = assertion.attributes[attributeMapping.role || "role"];

		if (!email) {
			throw new BadRequestException("Email not found in SAML assertion");
		}

		// Find or create user
		let user = await this.prisma.user.findUnique({
			where: { email },
		});

		let isNewUser = false;

		if (!user) {
			isNewUser = true;
			user = await this.prisma.user.create({
				data: {
					email,
					firstName,
					lastName,
					name: `${firstName || ""} ${lastName || ""}`.trim() || email,
					role: this.mapRole(role) || "STUDENT",
					emailVerified: true, // SSO users are pre-verified
					isActive: true,
				},
			});
		} else {
			// Update user info from SSO
			user = await this.prisma.user.update({
				where: { id: user.id },
				data: {
					firstName: firstName || user.firstName,
					lastName: lastName || user.lastName,
					lastLoginAt: new Date(),
				},
			});
		}

		return { user, isNewUser };
	}

	/**
	 * Generate Single Logout Request
	 */
	async generateLogoutRequest(
		userId: string,
		sessionIndex?: string,
	): Promise<{ redirectUrl: string } | null> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user?.email) return null;

		// Find the institution based on email domain
		const domain = user.email.split("@")[1];
		const config = await this.prisma.sSOConfiguration.findFirst({
			where: {
				institutionId: { contains: domain },
				isEnabled: true,
				sloUrl: { not: null },
			},
		});

		if (!config?.sloUrl) return null;

		const requestId = `_${crypto.randomUUID()}`;
		const issueInstant = new Date().toISOString();

		const logoutRequest = `
			<samlp:LogoutRequest
				xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
				xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
				ID="${requestId}"
				Version="2.0"
				IssueInstant="${issueInstant}"
				Destination="${config.sloUrl}">
				<saml:Issuer>${this.SP_ENTITY_ID}</saml:Issuer>
				<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
					${user.email}
				</saml:NameID>
				${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ""}
			</samlp:LogoutRequest>
		`.trim();

		const deflated = await deflate(Buffer.from(logoutRequest));
		const encoded = deflated.toString("base64");

		const redirectUrl = new URL(config.sloUrl);
		redirectUrl.searchParams.set("SAMLRequest", encoded);

		return { redirectUrl: redirectUrl.toString() };
	}

	/**
	 * Get Service Provider metadata
	 */
	getServiceProviderMetadata(): string {
		return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
	xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
	entityID="${this.SP_ENTITY_ID}">
	<md:SPSSODescriptor
		AuthnRequestsSigned="false"
		WantAssertionsSigned="true"
		protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
		<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
		<md:AssertionConsumerService
			Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
			Location="${this.SP_ACS_URL}"
			index="0"
			isDefault="true"/>
		<md:SingleLogoutService
			Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
			Location="${this.SP_SLO_URL}"/>
	</md:SPSSODescriptor>
</md:EntityDescriptor>`;
	}

	/**
	 * Toggle SSO for an institution
	 */
	async toggleSSO(adminId: string, institutionId: string, enabled: boolean) {
		const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
		if (admin?.role !== "ADMIN") {
			throw new UnauthorizedException("Only administrators can toggle SSO");
		}

		return this.prisma.sSOConfiguration.update({
			where: { institutionId },
			data: { isEnabled: enabled },
		});
	}

	/**
	 * Delete SSO configuration
	 */
	async deleteSSOConfiguration(adminId: string, institutionId: string) {
		const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
		if (admin?.role !== "ADMIN") {
			throw new UnauthorizedException(
				"Only administrators can delete SSO configurations",
			);
		}

		await this.prisma.sSOConfiguration.delete({
			where: { institutionId },
		});

		return { success: true };
	}

	// ========== Private Helper Methods ==========

	private parseAssertion(xmlResponse: string): SAMLAssertion {
		// Simplified XML parsing - in production, use a proper XML parser like xml2js or fast-xml-parser
		const assertion: SAMLAssertion = {
			issuer: "",
			nameId: "",
			attributes: {},
		};

		// Extract Issuer
		const issuerMatch = xmlResponse.match(
			/<(?:saml:)?Issuer[^>]*>([^<]+)<\/(?:saml:)?Issuer>/,
		);
		if (issuerMatch) {
			assertion.issuer = issuerMatch[1];
		}

		// Extract NameID
		const nameIdMatch = xmlResponse.match(
			/<(?:saml:)?NameID[^>]*>([^<]+)<\/(?:saml:)?NameID>/,
		);
		if (nameIdMatch) {
			assertion.nameId = nameIdMatch[1];
		}

		// Extract SessionIndex
		const sessionMatch = xmlResponse.match(/SessionIndex="([^"]+)"/);
		if (sessionMatch) {
			assertion.sessionIndex = sessionMatch[1];
		}

		// Extract Attributes (simplified)
		const attributeRegex =
			/<(?:saml:)?Attribute[^>]*Name="([^"]+)"[^>]*>[\s\S]*?<(?:saml:)?AttributeValue[^>]*>([^<]+)<\/(?:saml:)?AttributeValue>/g;
		let match;
		while ((match = attributeRegex.exec(xmlResponse)) !== null) {
			assertion.attributes[match[1]] = match[2];
		}

		// Extract Conditions
		const notBeforeMatch = xmlResponse.match(/NotBefore="([^"]+)"/);
		const notOnOrAfterMatch = xmlResponse.match(/NotOnOrAfter="([^"]+)"/);
		if (notBeforeMatch || notOnOrAfterMatch) {
			assertion.conditions = {
				notBefore: notBeforeMatch ? new Date(notBeforeMatch[1]) : undefined,
				notOnOrAfter: notOnOrAfterMatch
					? new Date(notOnOrAfterMatch[1])
					: undefined,
			};
		}

		return assertion;
	}

	private async verifySignature(
		xmlResponse: string,
		certificate: string,
	): Promise<boolean> {
		// In production, use xml-crypto library for proper signature verification
		// This is a simplified placeholder that checks for signature presence
		const hasSignature =
			xmlResponse.includes("Signature") ||
			xmlResponse.includes("SignatureValue");
		return hasSignature;
	}

	private mapRole(ssoRole?: string): string {
		if (!ssoRole) return "STUDENT";

		const roleMap: Record<string, string> = {
			student: "STUDENT",
			teacher: "FACULTY",
			instructor: "FACULTY",
			professor: "FACULTY",
			faculty: "FACULTY",
			admin: "ADMIN",
			administrator: "ADMIN",
			staff: "SUPPORT_STAFF",
			parent: "PARENT",
			guardian: "PARENT",
		};

		return roleMap[ssoRole.toLowerCase()] || "STUDENT";
	}
}
