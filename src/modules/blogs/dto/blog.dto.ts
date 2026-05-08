/**
 * Blog Management DTOs
 */

// ========== REQUEST DTOs ==========

// --- Blog ---
export class CreateBlogDto {
  title!: string;
  description?: string;
  content?: string;
  authorId!: string;
  slug?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  tags?: string[];
  faqs?: CreateFaqDto[];
}

export class UpdateBlogDto {
  title?: string;
  description?: string;
  content?: string;
  authorId?: string;
  slug?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  tags?: string[];
}

export class BlogQueryDto {
  page?: number;
  limit?: number;
  tag?: string;
  authorId?: string;
  search?: string;
}

// --- Author ---
export class CreateAuthorDto {
  name!: string;
  tag?: string;
  bio?: string;
  avatarUrl?: string;
  expertise?: string;
  socialLinks?: CreateSocialLinkDto[];
}

export class UpdateAuthorDto {
  name?: string;
  tag?: string;
  bio?: string;
  avatarUrl?: string;
  expertise?: string;
}

// --- FAQ ---
export class CreateFaqDto {
  question!: string;
  answer!: string;
}

export class UpdateFaqDto {
  question?: string;
  answer?: string;
}

// --- Social Link ---
export class CreateSocialLinkDto {
  platform!: string;
  url!: string;
}

export class UpdateSocialLinkDto {
  platform?: string;
  url?: string;
}

// ========== RESPONSE DTOs ==========

export class SocialLinkResponseDto {
  id!: string;
  platform!: string;
  url!: string;
}

export class AuthorResponseDto {
  id!: string;
  name!: string;
  tag!: string | null;
  bio!: string | null;
  avatarUrl!: string | null;
  expertise!: string | null;
  socialLinks!: SocialLinkResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class FaqResponseDto {
  id!: string;
  question!: string;
  answer!: string;
}

export class BlogResponseDto {
  id!: string;
  title!: string;
  description!: string | null;
  content!: string | null;
  slug!: string | null;
  imageUrl!: string | null;
  coverImageUrl!: string | null;
  tags!: string[];
  author!: AuthorResponseDto;
  faqs!: FaqResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class BlogListResponseDto {
  id!: string;
  title!: string;
  description!: string | null;
  slug!: string | null;
  imageUrl!: string | null;
  coverImageUrl!: string | null;
  tags!: string[];
  author!: { id: string; name: string; avatarUrl: string | null };
  createdAt!: Date;
}

export class PaginatedBlogsResponseDto {
  blogs!: BlogListResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class AuthorWithBlogsResponseDto extends AuthorResponseDto {
  blogs!: BlogListResponseDto[];
}
