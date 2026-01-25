import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole } from "../common/types";

/**
 * Discussion Forums Service
 * Implements student participation features as per Specification Section 2A.1
 *
 * Students can:
 * - Participate in discussion forums, chats, or group workspaces
 * - Communicate with instructors and peers
 */
@Injectable()
export class DiscussionsService {
	private readonly logger = new Logger(DiscussionsService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// Thread Management
	// ============================

	/**
	 * Create a discussion thread
	 * Students, Faculty can create threads in their enrolled/taught courses
	 */
	async createThread(input: CreateThreadInput, userId: string) {
		// Verify user has access to the course or class subject
		if (input.courseId) {
			await this.verifyCourseAccess(userId, input.courseId);
		}
		if (input.classSubjectId) {
			await this.verifyClassSubjectAccess(userId, input.classSubjectId);
		}

		return this.prisma.discussionThread.create({
			data: {
				title: input.title,
				content: input.content,
				authorId: userId,
				courseId: input.courseId,
				classSubjectId: input.classSubjectId,
			},
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true, role: true },
				},
				course: { select: { id: true, title: true } },
				classSubject: {
					select: { id: true, subject: { select: { name: true } } },
				},
				_count: { select: { posts: true } },
			},
		});
	}

	/**
	 * Get threads for a course
	 */
	async getCourseThreads(
		courseId: string,
		userId: string,
		options?: { search?: string; skip?: number; take?: number },
	) {
		await this.verifyCourseAccess(userId, courseId);

		const where: any = { courseId };
		if (options?.search) {
			where.OR = [
				{ title: { contains: options.search } },
				{ content: { contains: options.search } },
			];
		}

		const [threads, total] = await Promise.all([
			this.prisma.discussionThread.findMany({
				where,
				include: {
					author: {
						select: { id: true, name: true, avatarUrl: true, role: true },
					},
					_count: { select: { posts: true } },
				},
				orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
				skip: options?.skip || 0,
				take: options?.take || 20,
			}),
			this.prisma.discussionThread.count({ where }),
		]);

		return { threads, total };
	}

	/**
	 * Get thread with posts
	 */
	async getThread(threadId: string, userId: string) {
		const thread = await this.prisma.discussionThread.findUnique({
			where: { id: threadId },
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true, role: true },
				},
				course: { select: { id: true, title: true } },
				classSubject: {
					select: { id: true, subject: { select: { name: true } } },
				},
				posts: {
					where: { parentId: null }, // Only top-level posts
					include: {
						author: {
							select: { id: true, name: true, avatarUrl: true, role: true },
						},
						replies: {
							include: {
								author: {
									select: { id: true, name: true, avatarUrl: true, role: true },
								},
							},
							orderBy: { createdAt: "asc" },
						},
					},
					orderBy: [
						{ isAnswer: "desc" },
						{ upvotes: "desc" },
						{ createdAt: "asc" },
					],
				},
			},
		});

		if (!thread) {
			throw new NotFoundException("Thread not found");
		}

		// Verify access
		if (thread.courseId) {
			await this.verifyCourseAccess(userId, thread.courseId);
		}
		if (thread.classSubjectId) {
			await this.verifyClassSubjectAccess(userId, thread.classSubjectId);
		}

		// Increment view count
		await this.prisma.discussionThread.update({
			where: { id: threadId },
			data: { viewCount: { increment: 1 } },
		});

		return thread;
	}

	/**
	 * Update thread - Author or Faculty/Admin only
	 */
	async updateThread(
		threadId: string,
		input: UpdateThreadInput,
		userId: string,
	) {
		const thread = await this.prisma.discussionThread.findUnique({
			where: { id: threadId },
		});

		if (!thread) {
			throw new NotFoundException("Thread not found");
		}

		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		const isAuthorOrAdmin =
			thread.authorId === userId ||
			user?.role === UserRole.ADMIN ||
			user?.role === UserRole.FACULTY;

		if (!isAuthorOrAdmin) {
			throw new ForbiddenException("Not authorized to update this thread");
		}

		return this.prisma.discussionThread.update({
			where: { id: threadId },
			data: {
				title: input.title,
				content: input.content,
			},
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true, role: true },
				},
			},
		});
	}

	/**
	 * Delete thread - Author or Faculty/Admin only
	 */
	async deleteThread(threadId: string, userId: string) {
		const thread = await this.prisma.discussionThread.findUnique({
			where: { id: threadId },
		});

		if (!thread) {
			throw new NotFoundException("Thread not found");
		}

		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		const isAuthorOrAdmin =
			thread.authorId === userId ||
			user?.role === UserRole.ADMIN ||
			user?.role === UserRole.FACULTY;

		if (!isAuthorOrAdmin) {
			throw new ForbiddenException("Not authorized to delete this thread");
		}

		await this.prisma.discussionThread.delete({ where: { id: threadId } });
		return true;
	}

	/**
	 * Pin/Unpin thread - Faculty/Admin only
	 */
	async togglePinThread(threadId: string, userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.FACULTY) {
			throw new ForbiddenException("Only faculty and admins can pin threads");
		}

		const thread = await this.prisma.discussionThread.findUnique({
			where: { id: threadId },
		});

		if (!thread) {
			throw new NotFoundException("Thread not found");
		}

		return this.prisma.discussionThread.update({
			where: { id: threadId },
			data: { isPinned: !thread.isPinned },
		});
	}

	/**
	 * Lock/Unlock thread - Faculty/Admin only
	 */
	async toggleLockThread(threadId: string, userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.FACULTY) {
			throw new ForbiddenException("Only faculty and admins can lock threads");
		}

		const thread = await this.prisma.discussionThread.findUnique({
			where: { id: threadId },
		});

		if (!thread) {
			throw new NotFoundException("Thread not found");
		}

		return this.prisma.discussionThread.update({
			where: { id: threadId },
			data: { isLocked: !thread.isLocked },
		});
	}

	// ============================
	// Post Management
	// ============================

	/**
	 * Create a post (reply) in a thread
	 */
	async createPost(input: CreatePostInput, userId: string) {
		const thread = await this.prisma.discussionThread.findUnique({
			where: { id: input.threadId },
		});

		if (!thread) {
			throw new NotFoundException("Thread not found");
		}

		if (thread.isLocked) {
			throw new BadRequestException("This thread is locked");
		}

		// Verify access
		if (thread.courseId) {
			await this.verifyCourseAccess(userId, thread.courseId);
		}
		if (thread.classSubjectId) {
			await this.verifyClassSubjectAccess(userId, thread.classSubjectId);
		}

		// Verify parent post exists if replying
		if (input.parentId) {
			const parentPost = await this.prisma.discussionPost.findUnique({
				where: { id: input.parentId },
			});
			if (!parentPost || parentPost.threadId !== input.threadId) {
				throw new BadRequestException("Invalid parent post");
			}
		}

		return this.prisma.discussionPost.create({
			data: {
				threadId: input.threadId,
				parentId: input.parentId,
				content: input.content,
				authorId: userId,
			},
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true, role: true },
				},
				parent: {
					select: { id: true, content: true },
				},
			},
		});
	}

	/**
	 * Update a post - Author only
	 */
	async updatePost(postId: string, content: string, userId: string) {
		const post = await this.prisma.discussionPost.findUnique({
			where: { id: postId },
		});

		if (!post) {
			throw new NotFoundException("Post not found");
		}

		if (post.authorId !== userId) {
			throw new ForbiddenException("Not authorized to update this post");
		}

		return this.prisma.discussionPost.update({
			where: { id: postId },
			data: { content },
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true, role: true },
				},
			},
		});
	}

	/**
	 * Delete a post - Author or Faculty/Admin
	 */
	async deletePost(postId: string, userId: string) {
		const post = await this.prisma.discussionPost.findUnique({
			where: { id: postId },
		});

		if (!post) {
			throw new NotFoundException("Post not found");
		}

		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		const isAuthorOrAdmin =
			post.authorId === userId ||
			user?.role === UserRole.ADMIN ||
			user?.role === UserRole.FACULTY;

		if (!isAuthorOrAdmin) {
			throw new ForbiddenException("Not authorized to delete this post");
		}

		await this.prisma.discussionPost.delete({ where: { id: postId } });
		return true;
	}

	/**
	 * Upvote a post - prevents duplicate upvotes
	 */
	async upvotePost(postId: string, userId: string) {
		const post = await this.prisma.discussionPost.findUnique({
			where: { id: postId },
		});

		if (!post) {
			throw new NotFoundException("Post not found");
		}

		// Check if user already upvoted this post
		const existingUpvote = await this.prisma.postUpvote.findUnique({
			where: {
				postId_userId: { postId, userId },
			},
		});

		if (existingUpvote) {
			// Remove upvote (toggle off)
			await this.prisma.postUpvote.delete({
				where: { id: existingUpvote.id },
			});
			return this.prisma.discussionPost.update({
				where: { id: postId },
				data: { upvotes: { decrement: 1 } },
				include: {
					author: {
						select: { id: true, name: true, avatarUrl: true, role: true },
					},
					upvotedBy: { select: { userId: true } },
				},
			});
		}

		// Create new upvote
		await this.prisma.postUpvote.create({
			data: { postId, userId },
		});

		return this.prisma.discussionPost.update({
			where: { id: postId },
			data: { upvotes: { increment: 1 } },
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true, role: true },
				},
				upvotedBy: { select: { userId: true } },
			},
		});
	}

	/**
	 * Check if user has upvoted a post
	 */
	async hasUserUpvoted(postId: string, userId: string): Promise<boolean> {
		const upvote = await this.prisma.postUpvote.findUnique({
			where: {
				postId_userId: { postId, userId },
			},
		});
		return !!upvote;
	}

	/**
	 * Mark post as answer - Thread author or Faculty/Admin
	 */
	async markAsAnswer(postId: string, userId: string) {
		const post = await this.prisma.discussionPost.findUnique({
			where: { id: postId },
			include: { thread: true },
		});

		if (!post) {
			throw new NotFoundException("Post not found");
		}

		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		const canMark =
			post.thread.authorId === userId ||
			user?.role === UserRole.ADMIN ||
			user?.role === UserRole.FACULTY;

		if (!canMark) {
			throw new ForbiddenException("Not authorized to mark answers");
		}

		// Unmark any existing answers in this thread
		await this.prisma.discussionPost.updateMany({
			where: { threadId: post.threadId, isAnswer: true },
			data: { isAnswer: false },
		});

		return this.prisma.discussionPost.update({
			where: { id: postId },
			data: { isAnswer: true },
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true, role: true },
				},
			},
		});
	}

	// ============================
	// User's Discussion Activity
	// ============================

	/**
	 * Get user's threads
	 */
	async getUserThreads(
		userId: string,
		options?: { skip?: number; take?: number },
	) {
		const [threads, total] = await Promise.all([
			this.prisma.discussionThread.findMany({
				where: { authorId: userId },
				include: {
					course: { select: { id: true, title: true } },
					classSubject: {
						select: { id: true, subject: { select: { name: true } } },
					},
					_count: { select: { posts: true } },
				},
				orderBy: { createdAt: "desc" },
				skip: options?.skip || 0,
				take: options?.take || 20,
			}),
			this.prisma.discussionThread.count({ where: { authorId: userId } }),
		]);

		return { threads, total };
	}

	/**
	 * Get user's posts
	 */
	async getUserPosts(
		userId: string,
		options?: { skip?: number; take?: number },
	) {
		const [posts, total] = await Promise.all([
			this.prisma.discussionPost.findMany({
				where: { authorId: userId },
				include: {
					thread: { select: { id: true, title: true } },
				},
				orderBy: { createdAt: "desc" },
				skip: options?.skip || 0,
				take: options?.take || 20,
			}),
			this.prisma.discussionPost.count({ where: { authorId: userId } }),
		]);

		return { posts, total };
	}

	/**
	 * Get discussion statistics for a user
	 */
	async getUserDiscussionStats(userId: string) {
		const [threadsCreated, postsCreated, answersMarked, totalUpvotes] =
			await Promise.all([
				this.prisma.discussionThread.count({ where: { authorId: userId } }),
				this.prisma.discussionPost.count({ where: { authorId: userId } }),
				this.prisma.discussionPost.count({
					where: { authorId: userId, isAnswer: true },
				}),
				this.prisma.discussionPost.aggregate({
					where: { authorId: userId },
					_sum: { upvotes: true },
				}),
			]);

		return {
			threadsCreated,
			postsCreated,
			answersMarked,
			totalUpvotes: totalUpvotes._sum.upvotes || 0,
		};
	}

	// ============================
	// Helper Methods
	// ============================

	private async verifyCourseAccess(userId: string, courseId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });

		// Admin and Faculty have access to all
		if (user?.role === UserRole.ADMIN) return true;

		// Check if instructor
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});
		if (course?.instructorId === userId) return true;

		// Check if enrolled
		const enrollment = await this.prisma.enrollment.findUnique({
			where: {
				courseId_studentId: { courseId, studentId: userId },
			},
		});

		if (!enrollment) {
			throw new ForbiddenException("Not enrolled in this course");
		}

		return true;
	}

	private async verifyClassSubjectAccess(
		userId: string,
		classSubjectId: string,
	) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });

		// Admin has access to all
		if (user?.role === UserRole.ADMIN) return true;

		// Check if teacher
		const classSubject = await this.prisma.classSubject.findUnique({
			where: { id: classSubjectId },
		});
		if (classSubject?.teacherId === userId) return true;

		// For students, would need enrollment tracking
		throw new ForbiddenException("Not authorized for this class subject");
	}
}

// Input types
interface CreateThreadInput {
	title: string;
	content: string;
	courseId?: string;
	classSubjectId?: string;
}

interface UpdateThreadInput {
	title?: string;
	content?: string;
}

interface CreatePostInput {
	threadId: string;
	parentId?: string;
	content: string;
}
