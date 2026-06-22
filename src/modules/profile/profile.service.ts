import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  CompleteProfileDto,
  UpdateProfileFieldsDto,
  UpdateEmailDto,
  EnableEmailLoginDto,
  UpdatePasswordDto,
  VerifyEmailForLoginDto,
  ResendEmailVerificationDto,
  ProfileCompletionStatusDto,
  ProfileDetailsDto,
  EnableEmailLoginResponseDto,
  ProfileUpdateResponseDto,
  EmailUpdateResponseDto,
  PasswordUpdateResponseDto,
  UpsertFcmTokenDto,
} from './dto/profile.dto';

const REQUIRED_PROFILE_FIELDS = ['name', 'state', 'city'];
const ALL_PROFILE_FIELDS = [
  'name',
  'state',
  'city',
  'email',
  'gender',
  'category',
  'dob',
  'country',
];

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * 📋 COMPLETE PROFILE - Onboarding step
   * User provides required information during onboarding
   */
  async completeProfile(
    userId: string,
    data: CompleteProfileDto,
  ): Promise<ProfileUpdateResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update profile fields
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) {
      // Check if email already exists for another user
      if (data.email !== user.email) {
        const existingEmail = await this.prisma.user.findUnique({
          where: { email: data.email },
        });
        if (existingEmail && existingEmail.id !== userId) {
          throw new ConflictException('Email already in use');
        }
      }
      updateData.email = data.email;
    }
    if (data.state !== undefined) updateData.state = data.state;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.gender !== undefined) updateData.Gender = data.gender;
    if (data.category !== undefined) updateData.Category = data.category;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.profilePic !== undefined) updateData.profilePic = data.profilePic;
    if (data.alternatePhone !== undefined)
      updateData.alternatePhone = data.alternatePhone;
    if (data.theme !== undefined) updateData.Theme = data.theme;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Check if profile is now complete
    const isComplete = this.isProfileComplete(updatedUser);

    if (isComplete && !updatedUser.isProfileComplete) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isProfileComplete: true },
      });
    }

    return {
      message: 'Profile completed successfully',
      profile: this.formatProfileResponse(updatedUser),
      profileComplete: isComplete,
    };
  }

  /**
   * 👤 GET PROFILE - Retrieve current user profile
   */
  async getProfile(userId: string): Promise<ProfileDetailsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatProfileResponse(user);
  }

  /**
   * ✏️ UPDATE PROFILE FIELDS - Update individual or multiple fields
   */
  async updateProfileFields(
    userId: string,
    data: UpdateProfileFieldsDto,
  ): Promise<ProfileUpdateResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.profilePic !== undefined) updateData.profilePic = data.profilePic;
    if (data.alternatePhone !== undefined)
      updateData.alternatePhone = data.alternatePhone;
    if (data.gender !== undefined) updateData.Gender = data.gender;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.category !== undefined) updateData.Category = data.category;
    if (data.theme !== undefined) updateData.Theme = data.theme;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Auto-check if profile is now complete
    const isComplete = this.isProfileComplete(updatedUser);
    if (isComplete && !updatedUser.isProfileComplete) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isProfileComplete: true },
      });
    }

    return {
      message: 'Profile updated successfully',
      profile: this.formatProfileResponse(updatedUser),
      profileComplete: isComplete,
    };
  }

  /**
   * 📊 GET PROFILE COMPLETION STATUS
   */
  async getProfileCompletionStatus(
    userId: string,
  ): Promise<ProfileCompletionStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const completedFields = ALL_PROFILE_FIELDS.filter((field) => {
      const value =
        user[
          field === 'category'
            ? 'Category'
            : field === 'gender'
              ? 'Gender'
              : field
        ];
      return value && value !== 'N/A';
    });

    const missingFields = ALL_PROFILE_FIELDS.filter(
      (field) => !completedFields.includes(field),
    );

    const completionPercentage = Math.round(
      (completedFields.length / ALL_PROFILE_FIELDS.length) * 100,
    );

    return {
      isComplete: this.isProfileComplete(user),
      completionPercentage,
      completedFields,
      missingFields,
      requiredFields: REQUIRED_PROFILE_FIELDS,
    };
  }

  /**
   * 📧 UPDATE EMAIL - Change user email
   */
  async updateEmail(
    userId: string,
    { newEmail }: UpdateEmailDto,
  ): Promise<EmailUpdateResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if email already in use
    if (newEmail !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: newEmail },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    // Generate OTP for new email
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP
    await (this.prisma as any).$executeRaw`
      DELETE FROM "EmailVerificationCode" WHERE "userId" = ${userId}
    `;

    await (this.prisma as any).$executeRaw`
      INSERT INTO "EmailVerificationCode" ("id", "userId", "email", "code", "expiresAt", "isUsed", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${newEmail}, ${code}, ${expiresAt}, false, NOW())
    `;

    // TODO: Send OTP to new email
    console.log(`📧 Email verification OTP for ${newEmail}: ${code}`);

    return {
      message: 'Verification OTP sent to new email',
      email: newEmail,
      emailVerified: false,
      verificationSent: true,
    };
  }

  /**
   * ✅ VERIFY EMAIL - Confirm new email with OTP
   */
  async verifyEmail(
    userId: string,
    email: string,
    code: string,
  ): Promise<EmailUpdateResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!code || code.length !== 6) {
      throw new BadRequestException('Invalid OTP format');
    }

    // Update user with new email
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email,
        emailVerified: true,
        isEmailCodeSent: false,
      },
    });

    return {
      message: 'Email verified successfully',
      email: updatedUser.email || '',
      emailVerified: updatedUser.emailVerified,
      verificationSent: false,
    };
  }

  /**
   * 🔓 ENABLE EMAIL LOGIN - Allow user to login with email/password
   */
  async enableEmailLogin(
    userId: string,
    { email, password }: EnableEmailLoginDto,
  ): Promise<EnableEmailLoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Check if email already in use
    if (email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email,
        enableEmailLogin: true,
        emailLoginVerified: false,
        passwordHash,
      },
    });

    // Generate OTP for email verification
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await (this.prisma as any).$executeRaw`
      INSERT INTO "EmailVerificationCode" ("id", "userId", "email", "code", "expiresAt", "isUsed", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${email}, ${code}, ${expiresAt}, false, NOW())
    `;

    // TODO: Send OTP to email
    console.log(`📧 Email login verification OTP for ${email}: ${code}`);

    return {
      message: 'Email login enabled. Verification OTP sent to email.',
      enableEmailLogin: true,
      email,
      verificationRequired: true,
    };
  }

  /**
   * ✅ VERIFY EMAIL FOR LOGIN - Confirm email for login purpose
   */
  async verifyEmailForLogin(
    userId: string,
    { email, code }: VerifyEmailForLoginDto,
  ): Promise<EnableEmailLoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!code || code.length !== 6) {
      throw new BadRequestException('Invalid OTP format');
    }

    // Update user - mark email login as verified
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailLoginVerified: true,
      },
    });

    return {
      message: 'Email verified for login successfully',
      enableEmailLogin: updatedUser.enableEmailLogin,
      email: updatedUser.email || '',
      verificationRequired: false,
    };
  }

  /**
   * 🔄 RESEND EMAIL VERIFICATION - Resend OTP to email
   */
  async resendEmailVerification(
    userId: string,
    { email }: ResendEmailVerificationDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old OTP and create new one
    await (this.prisma as any).$executeRaw`
      DELETE FROM "EmailVerificationCode" WHERE "userId" = ${userId} AND "email" = ${email}
    `;

    await (this.prisma as any).$executeRaw`
      INSERT INTO "EmailVerificationCode" ("id", "userId", "email", "code", "expiresAt", "isUsed", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${email}, ${code}, ${expiresAt}, false, NOW())
    `;

    // TODO: Send OTP to email
    console.log(`📧 Resent verification OTP for ${email}: ${code}`);

    return {
      message: 'Verification OTP resent successfully',
      email,
    };
  }

  /**
   * 🔐 UPDATE PASSWORD - Change password for email login
   */
  async updatePassword(
    userId: string,
    { currentPassword, newPassword }: UpdatePasswordDto,
  ): Promise<PasswordUpdateResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.enableEmailLogin || !user.passwordHash) {
      throw new BadRequestException('Email login not enabled for this user');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters',
      );
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException(
        'New password cannot be same as current password',
      );
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return {
      message: 'Password updated successfully',
      timestamp: new Date(),
    };
  }

  /**
   * 🔓 DISABLE EMAIL LOGIN - Turn off email login
   */
  async disableEmailLogin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        enableEmailLogin: false,
        emailLoginVerified: false,
        passwordHash: null,
      },
    });

    return {
      message: 'Email login disabled successfully',
      enableEmailLogin: updatedUser.enableEmailLogin,
    };
  }

  // ========== HELPER METHODS ==========

  /**
   * Check if profile is complete
   */
  private isProfileComplete(user: any): boolean {
    return REQUIRED_PROFILE_FIELDS.every((field) => {
      const value =
        user[
          field === 'category'
            ? 'Category'
            : field === 'gender'
              ? 'Gender'
              : field
        ];
      return !!value && value !== 'N/A';
    });
  }

  /**
   * Format user profile for response
   */
  private formatProfileResponse(user: any): ProfileDetailsDto {
    return {
      id: user.id,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      state: user.state,
      city: user.city,
      country: user.country,
      gender: user.Gender,
      category: user.Category,
      dob: user.dob,
      profilePic: user.profilePic,
      alternatePhone: user.alternatePhone,
      theme: user.Theme,
      enableEmailLogin: user.enableEmailLogin,
      emailLoginVerified: user.emailLoginVerified,
      isProfileComplete: user.isProfileComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * 📲 REGISTER / UPDATE FCM TOKEN
   * Registers a new FCM token or updates its association/metadata.
   * If a deviceId is provided, clears any other tokens associated with that deviceId.
   */
  async upsertFcmToken(userId: string, data: UpsertFcmTokenDto) {
    if (!data.token) {
      throw new BadRequestException('FCM token is required');
    }

    if (data.deviceId) {
      // Clear out other tokens registered for the same deviceId
      await (this.prisma as any).fcmToken.deleteMany({
        where: {
          deviceId: data.deviceId,
          token: { not: data.token },
        },
      });
    }

    const fcmToken = await (this.prisma as any).fcmToken.upsert({
      where: { token: data.token },
      update: {
        userId,
        deviceType: data.deviceType ?? null,
        deviceName: data.deviceName ?? null,
        deviceId: data.deviceId ?? null,
      },
      create: {
        token: data.token,
        userId,
        deviceType: data.deviceType ?? null,
        deviceName: data.deviceName ?? null,
        deviceId: data.deviceId ?? null,
      },
    });

    return {
      message: 'FCM token registered successfully',
      fcmToken,
    };
  }

  /**
   * 📲 REMOVE FCM TOKEN
   * Deletes an FCM token from the database.
   */
  async deleteFcmToken(userId: string, token: string) {
    if (!token) {
      throw new BadRequestException('FCM token is required');
    }

    const existingToken = await (this.prisma as any).fcmToken.findUnique({
      where: { token },
    });

    if (!existingToken) {
      throw new BadRequestException('FCM token not found');
    }

    if (existingToken.userId !== userId) {
      throw new UnauthorizedException('Not authorized to delete this token');
    }

    await (this.prisma as any).fcmToken.delete({
      where: { token },
    });

    return {
      message: 'FCM token removed successfully',
    };
  }
}

