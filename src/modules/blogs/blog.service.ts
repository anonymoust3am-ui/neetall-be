import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBlogDto,
  UpdateBlogDto,
  BlogQueryDto,
  CreateAuthorDto,
  UpdateAuthorDto,
  CreateFaqDto,
  UpdateFaqDto,
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
  BlogResponseDto,
  BlogListResponseDto,
  PaginatedBlogsResponseDto,
  AuthorResponseDto,
  AuthorWithBlogsResponseDto,
  FaqResponseDto,
  SocialLinkResponseDto,
} from './dto/blog.dto';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // 📝 BLOG CRUD
  // ========================

  /**
   * Create a new blog post with optional inline FAQs
   */
  async createBlog(data: CreateBlogDto): Promise<BlogResponseDto> {
    // Validate author exists
    const author = await this.prisma.author.findUnique({
      where: { id: data.authorId },
    });
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Check slug uniqueness if provided
    if (data.slug) {
      const existingSlug = await this.prisma.blogs.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new ConflictException('Blog with this slug already exists');
      }
    }

    // Auto-generate slug from title if not provided
    const slug = data.slug || this.generateSlug(data.title);

    const blog = await this.prisma.blogs.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        authorId: data.authorId,
        slug,
        imageUrl: data.imageUrl,
        coverImageUrl: data.coverImageUrl,
        tags: data.tags || [],
        faqs: data.faqs?.length
          ? {
              create: data.faqs.map((faq) => ({
                question: faq.question,
                answer: faq.answer,
              })),
            }
          : undefined,
      },
      include: {
        author: { include: { socialLinks: true } },
        faqs: true,
      },
    });

    return this.formatBlogResponse(blog);
  }

  /**
   * Get all blogs with pagination, filtering, and search
   */
  async getAllBlogs(query: BlogQueryDto): Promise<PaginatedBlogsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by tag
    if (query.tag) {
      where.tags = { has: query.tag };
    }

    // Filter by author
    if (query.authorId) {
      where.authorId = query.authorId;
    }

    // Search in title and description
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [blogs, total] = await Promise.all([
      this.prisma.blogs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.blogs.count({ where }),
    ]);

    return {
      blogs: blogs.map((blog) => this.formatBlogListItem(blog)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single blog by slug (public-facing)
   */
  async getBlogBySlug(slug: string): Promise<BlogResponseDto> {
    const blog = await this.prisma.blogs.findUnique({
      where: { slug },
      include: {
        author: { include: { socialLinks: true } },
        faqs: true,
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return this.formatBlogResponse(blog);
  }

  /**
   * Get a single blog by ID
   */
  async getBlogById(id: string): Promise<BlogResponseDto> {
    const blog = await this.prisma.blogs.findUnique({
      where: { id },
      include: {
        author: { include: { socialLinks: true } },
        faqs: true,
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return this.formatBlogResponse(blog);
  }

  /**
   * Update a blog post
   */
  async updateBlog(id: string, data: UpdateBlogDto): Promise<BlogResponseDto> {
    const existing = await this.prisma.blogs.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog not found');
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await this.prisma.blogs.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new ConflictException('Blog with this slug already exists');
      }
    }

    // Validate author if changing
    if (data.authorId) {
      const author = await this.prisma.author.findUnique({
        where: { id: data.authorId },
      });
      if (!author) {
        throw new NotFoundException('Author not found');
      }
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.authorId !== undefined) updateData.authorId = data.authorId;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.coverImageUrl !== undefined)
      updateData.coverImageUrl = data.coverImageUrl;
    if (data.tags !== undefined) updateData.tags = data.tags;

    const blog = await this.prisma.blogs.update({
      where: { id },
      data: updateData,
      include: {
        author: { include: { socialLinks: true } },
        faqs: true,
      },
    });

    return this.formatBlogResponse(blog);
  }

  /**
   * Delete a blog post (cascades to FAQs)
   */
  async deleteBlog(id: string): Promise<{ message: string }> {
    const existing = await this.prisma.blogs.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog not found');
    }

    // Delete FAQs first, then the blog
    await this.prisma.fAQ.deleteMany({ where: { blogId: id } });
    await this.prisma.blogs.delete({ where: { id } });

    return { message: 'Blog deleted successfully' };
  }

  // ========================
  // 👤 AUTHOR CRUD
  // ========================

  /**
   * Create a new author with optional social links
   */
  async createAuthor(data: CreateAuthorDto): Promise<AuthorResponseDto> {
    const author = await this.prisma.author.create({
      data: {
        name: data.name,
        tag: data.tag,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        expertise: data.expertise,
        socialLinks: data.socialLinks?.length
          ? {
              create: data.socialLinks.map((link) => ({
                platform: link.platform,
                url: link.url,
              })),
            }
          : undefined,
      },
      include: { socialLinks: true },
    });

    return this.formatAuthorResponse(author);
  }

  /**
   * Get all authors
   */
  async getAllAuthors(): Promise<AuthorResponseDto[]> {
    const authors = await this.prisma.author.findMany({
      include: { socialLinks: true },
      orderBy: { createdAt: 'desc' },
    });

    return authors.map((a) => this.formatAuthorResponse(a));
  }

  /**
   * Get a single author by ID with their blogs
   */
  async getAuthorById(id: string): Promise<AuthorWithBlogsResponseDto> {
    const author = await this.prisma.author.findUnique({
      where: { id },
      include: {
        socialLinks: true,
        Blogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    return {
      ...this.formatAuthorResponse(author),
      blogs: author.Blogs.map((b) => this.formatBlogListItem(b)),
    };
  }

  /**
   * Update an author
   */
  async updateAuthor(
    id: string,
    data: UpdateAuthorDto,
  ): Promise<AuthorResponseDto> {
    const existing = await this.prisma.author.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Author not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tag !== undefined) updateData.tag = data.tag;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.expertise !== undefined) updateData.expertise = data.expertise;

    const author = await this.prisma.author.update({
      where: { id },
      data: updateData,
      include: { socialLinks: true },
    });

    return this.formatAuthorResponse(author);
  }

  /**
   * Delete an author (only if no blogs reference them)
   */
  async deleteAuthor(id: string): Promise<{ message: string }> {
    const existing = await this.prisma.author.findUnique({
      where: { id },
      include: { _count: { select: { Blogs: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Author not found');
    }

    if (existing._count.Blogs > 0) {
      throw new BadRequestException(
        `Cannot delete author with ${existing._count.Blogs} blog(s). Reassign or delete blogs first.`,
      );
    }

    // Delete social links first, then author
    await this.prisma.socialLink.deleteMany({ where: { authorId: id } });
    await this.prisma.author.delete({ where: { id } });

    return { message: 'Author deleted successfully' };
  }

  // ========================
  // ❓ FAQ CRUD
  // ========================

  /**
   * Add FAQ to a blog
   */
  async addFaq(blogId: string, data: CreateFaqDto): Promise<FaqResponseDto> {
    const blog = await this.prisma.blogs.findUnique({ where: { id: blogId } });
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const faq = await this.prisma.fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        blogId,
      },
    });

    return this.formatFaqResponse(faq);
  }

  /**
   * Update an FAQ
   */
  async updateFaq(faqId: string, data: UpdateFaqDto): Promise<FaqResponseDto> {
    const existing = await this.prisma.fAQ.findUnique({ where: { id: faqId } });
    if (!existing) {
      throw new NotFoundException('FAQ not found');
    }

    const updateData: any = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;

    const faq = await this.prisma.fAQ.update({
      where: { id: faqId },
      data: updateData,
    });

    return this.formatFaqResponse(faq);
  }

  /**
   * Delete an FAQ
   */
  async deleteFaq(faqId: string): Promise<{ message: string }> {
    const existing = await this.prisma.fAQ.findUnique({ where: { id: faqId } });
    if (!existing) {
      throw new NotFoundException('FAQ not found');
    }

    await this.prisma.fAQ.delete({ where: { id: faqId } });

    return { message: 'FAQ deleted successfully' };
  }

  // ========================
  // 🔗 SOCIAL LINK CRUD
  // ========================

  /**
   * Add social link to an author
   */
  async addSocialLink(
    authorId: string,
    data: CreateSocialLinkDto,
  ): Promise<SocialLinkResponseDto> {
    const author = await this.prisma.author.findUnique({
      where: { id: authorId },
    });
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    const link = await this.prisma.socialLink.create({
      data: {
        platform: data.platform,
        url: data.url,
        authorId,
      },
    });

    return this.formatSocialLinkResponse(link);
  }

  /**
   * Update a social link
   */
  async updateSocialLink(
    linkId: string,
    data: UpdateSocialLinkDto,
  ): Promise<SocialLinkResponseDto> {
    const existing = await this.prisma.socialLink.findUnique({
      where: { id: linkId },
    });
    if (!existing) {
      throw new NotFoundException('Social link not found');
    }

    const updateData: any = {};
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.url !== undefined) updateData.url = data.url;

    const link = await this.prisma.socialLink.update({
      where: { id: linkId },
      data: updateData,
    });

    return this.formatSocialLinkResponse(link);
  }

  /**
   * Delete a social link
   */
  async deleteSocialLink(linkId: string): Promise<{ message: string }> {
    const existing = await this.prisma.socialLink.findUnique({
      where: { id: linkId },
    });
    if (!existing) {
      throw new NotFoundException('Social link not found');
    }

    await this.prisma.socialLink.delete({ where: { id: linkId } });

    return { message: 'Social link deleted successfully' };
  }

  // ========================
  // 🛠️ HELPERS
  // ========================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private formatBlogResponse(blog: any): BlogResponseDto {
    return {
      id: blog.id,
      title: blog.title,
      description: blog.description,
      content: blog.content,
      slug: blog.slug,
      imageUrl: blog.imageUrl,
      coverImageUrl: blog.coverImageUrl,
      tags: blog.tags || [],
      author: this.formatAuthorResponse(blog.author),
      faqs: (blog.faqs || []).map((f: any) => this.formatFaqResponse(f)),
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
    };
  }

  private formatBlogListItem(blog: any): BlogListResponseDto {
    return {
      id: blog.id,
      title: blog.title,
      description: blog.description,
      slug: blog.slug,
      imageUrl: blog.imageUrl,
      coverImageUrl: blog.coverImageUrl,
      tags: blog.tags || [],
      author: {
        id: blog.author.id,
        name: blog.author.name,
        avatarUrl: blog.author.avatarUrl,
      },
      createdAt: blog.createdAt,
    };
  }

  private formatAuthorResponse(author: any): AuthorResponseDto {
    return {
      id: author.id,
      name: author.name,
      tag: author.tag,
      bio: author.bio,
      avatarUrl: author.avatarUrl,
      expertise: author.expertise,
      socialLinks: (author.socialLinks || []).map((l: any) =>
        this.formatSocialLinkResponse(l),
      ),
      createdAt: author.createdAt,
      updatedAt: author.updatedAt,
    };
  }

  private formatFaqResponse(faq: any): FaqResponseDto {
    return {
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
    };
  }

  private formatSocialLinkResponse(link: any): SocialLinkResponseDto {
    return {
      id: link.id,
      platform: link.platform,
      url: link.url,
    };
  }
}
