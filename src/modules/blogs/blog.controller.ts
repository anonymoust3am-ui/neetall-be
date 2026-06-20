import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { AuthGuard } from '../auth/auth.guard';
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
} from './dto/blog.dto';

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ========================
  // 📝 BLOG ENDPOINTS
  // ========================

  /**
   * GET /blogs
   * List all blogs with pagination, filtering, and search
   * Public — no auth required
   */
  @Get()
  async getAllBlogs(@Query() query: BlogQueryDto) {
    return this.blogService.getAllBlogs(query);
  }

  /**
   * GET /blogs/by-slug/:slug
   * Get a single blog by slug (public-facing)
   */
  @Get('by-slug/:slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    return this.blogService.getBlogBySlug(slug);
  }

  /**
   * GET /blogs/:id
   * Get a single blog by ID
   */
  @Get(':id')
  async getBlogById(@Param('id') id: string) {
    return this.blogService.getBlogById(id);
  }

  /**
   * POST /blogs
   * Create a new blog post (auth required)
   */
  @Post()
  @UseGuards(AuthGuard)
  async createBlog(@Body() body: CreateBlogDto) {
    return this.blogService.createBlog(body);
  }

  /**
   * PATCH /blogs/:id
   * Update a blog post (auth required)
   */
  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateBlog(@Param('id') id: string, @Body() body: UpdateBlogDto) {
    return this.blogService.updateBlog(id, body);
  }

  /**
   * DELETE /blogs/:id
   * Delete a blog post (auth required)
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteBlog(@Param('id') id: string) {
    return this.blogService.deleteBlog(id);
  }

  // ========================
  // ❓ FAQ ENDPOINTS (nested under blogs)
  // ========================

  /**
   * POST /blogs/:blogId/faqs
   * Add a FAQ to a blog (auth required)
   */
  @Post(':blogId/faqs')
  @UseGuards(AuthGuard)
  async addFaq(@Param('blogId') blogId: string, @Body() body: CreateFaqDto) {
    return this.blogService.addFaq(blogId, body);
  }

  /**
   * PATCH /blogs/faqs/:faqId
   * Update a FAQ (auth required)
   */
  @Patch('faqs/:faqId')
  @UseGuards(AuthGuard)
  async updateFaq(@Param('faqId') faqId: string, @Body() body: UpdateFaqDto) {
    return this.blogService.updateFaq(faqId, body);
  }

  /**
   * DELETE /blogs/faqs/:faqId
   * Delete a FAQ (auth required)
   */
  @Delete('faqs/:faqId')
  @UseGuards(AuthGuard)
  async deleteFaq(@Param('faqId') faqId: string) {
    return this.blogService.deleteFaq(faqId);
  }
}

@Controller('authors')
export class AuthorController {
  constructor(private readonly blogService: BlogService) {}

  // ========================
  // 👤 AUTHOR ENDPOINTS
  // ========================

  /**
   * GET /authors
   * List all authors (public)
   */
  @Get()
  async getAllAuthors() {
    return this.blogService.getAllAuthors();
  }

  /**
   * GET /authors/:id
   * Get author by ID with their blogs (public)
   */
  @Get(':id')
  async getAuthorById(@Param('id') id: string) {
    return this.blogService.getAuthorById(id);
  }

  /**
   * POST /authors
   * Create a new author (auth required)
   */
  @Post()
  @UseGuards(AuthGuard)
  async createAuthor(@Body() body: CreateAuthorDto) {
    return this.blogService.createAuthor(body);
  }

  /**
   * PATCH /authors/:id
   * Update an author (auth required)
   */
  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateAuthor(@Param('id') id: string, @Body() body: UpdateAuthorDto) {
    return this.blogService.updateAuthor(id, body);
  }

  /**
   * DELETE /authors/:id
   * Delete an author (auth required, fails if author has blogs)
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteAuthor(@Param('id') id: string) {
    return this.blogService.deleteAuthor(id);
  }

  // ========================
  // 🔗 SOCIAL LINK ENDPOINTS (nested under authors)
  // ========================

  /**
   * POST /authors/:authorId/social-links
   * Add a social link to an author (auth required)
   */
  @Post(':authorId/social-links')
  @UseGuards(AuthGuard)
  async addSocialLink(
    @Param('authorId') authorId: string,
    @Body() body: CreateSocialLinkDto,
  ) {
    return this.blogService.addSocialLink(authorId, body);
  }

  /**
   * PATCH /authors/social-links/:linkId
   * Update a social link (auth required)
   */
  @Patch('social-links/:linkId')
  @UseGuards(AuthGuard)
  async updateSocialLink(
    @Param('linkId') linkId: string,
    @Body() body: UpdateSocialLinkDto,
  ) {
    return this.blogService.updateSocialLink(linkId, body);
  }

  /**
   * DELETE /authors/social-links/:linkId
   * Delete a social link (auth required)
   */
  @Delete('social-links/:linkId')
  @UseGuards(AuthGuard)
  async deleteSocialLink(@Param('linkId') linkId: string) {
    return this.blogService.deleteSocialLink(linkId);
  }
}
