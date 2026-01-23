import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../types";

export const ROLES_KEY = "roles";

/**
 * Decorator to specify which roles are allowed to access a route/resolver.
 * As per Specification Section 2A, supports:
 * - STUDENT: Course access, assignments, grades viewing
 * - FACULTY: Course creation, grading, exam setting, model training
 * - ADMIN: User management, system configuration, reports
 * - SUPPORT_STAFF: Technical support, ticket handling
 * - PARENT: Student progress viewing
 * - ALUMNI: Alumni resources, continuing education
 * - GUEST: Public catalog browsing
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Convenience decorators for common role combinations
export const StudentOnly = () => Roles(UserRole.STUDENT);
export const FacultyOnly = () => Roles(UserRole.FACULTY);
export const AdminOnly = () => Roles(UserRole.ADMIN);
export const SupportStaffOnly = () => Roles(UserRole.SUPPORT_STAFF);
export const ParentOnly = () => Roles(UserRole.PARENT);

// Combined role decorators
export const FacultyOrAdmin = () => Roles(UserRole.FACULTY, UserRole.ADMIN);
export const StudentOrParent = () => Roles(UserRole.STUDENT, UserRole.PARENT);
export const AcademicStaff = () =>
	Roles(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPPORT_STAFF);
export const AllAuthenticated = () =>
	Roles(
		UserRole.STUDENT,
		UserRole.FACULTY,
		UserRole.ADMIN,
		UserRole.SUPPORT_STAFF,
		UserRole.PARENT,
		UserRole.ALUMNI,
	);
