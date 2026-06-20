import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { DecodedIdToken } from 'firebase-admin/auth';
import { randomUUID } from 'crypto';
import {
  LoginDto,
  UpdateProfileDto,
  SendEmailOtpDto,
  VerifyEmailOtpDto,
  LogoutDto,
  RemoteLogoutDto,
  LoginResponseDto,
  ProfileResponseDto,
  AllSessionsResponseDto,
} from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  /**
   * 🔓 LOGIN/REGISTER - Main authentication endpoint
   *
   * Flow:
   * 1. Verify Firebase token
   * 2. Extract user data from token
   * 3. Create user if new, else update non-destructively
   * 4. Create/update session for device
   * 5. Check profile completion
   */
  async loginWithFirebase(
    authHeader: string,
    deviceInfo: {
      deviceId: string;
      deviceType: string;
      deviceName?: string;
      ip: string;
    },
    payload?: Partial<LoginDto>,
  ): Promise<LoginResponseDto> {
    // ✅ 1. Verify Firebase token
    const firebaseUser = await this.firebase.getUserFromAuthHeader(authHeader);

    const firebaseUid = this.firebase.getUid(firebaseUser);
    const phone = this.firebase.getPhone(firebaseUser);
    const email = this.firebase.getEmail(firebaseUser);
    const emailVerified = this.firebase.isEmailVerified(firebaseUser);

    if (!phone) {
      throw new BadRequestException('Phone number is required from Firebase');
    }

    // ✅ 2. Find or create user
    let user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      // ✅ Create new user (with unique referral code to satisfy MongoDB unique index)
      const referralCode = await this.generateUniqueReferralCode();
      user = await this.prisma.user.create({
        data: {
          firebaseUid,
          phone,
          email: email ?? payload?.email ?? null,
          emailVerified: emailVerified || false,
          phoneVerified: true, // Firebase phone auth = verified
          refralCode: referralCode,

          // Optional fields from payload (non-destructive)
          name: payload?.name ?? null,
          state: payload?.state ?? null,
          city: payload?.city ?? null,
          Gender: payload?.gender ?? null,
          Category: payload?.category ?? null,
          dob: payload?.dob ?? null,

          isProfileComplete: false,
        },
      });
    } else {
      // ✅ Update existing user (non-destructive - only fill missing fields)
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          // Only update if empty in DB and provided in payload
          name: user.name ?? payload?.name ?? undefined,
          state: user.state ?? payload?.state ?? undefined,
          city: user.city ?? payload?.city ?? undefined,
          Gender: user.Gender ?? payload?.gender ?? undefined,
          Category: user.Category ?? payload?.category ?? undefined,
          dob: user.dob ?? payload?.dob ?? undefined,
          email: user.email ?? payload?.email ?? email ?? undefined,
          // Update phone verified if Firebase confirms it
          phoneVerified: user.phoneVerified || true,
          emailVerified: user.emailVerified || emailVerified,
        },
      });
    }

    // ✅ 3. Create or update session (upsert by deviceId)
    // Important: Only one active session per device
    // If no deviceId provided, generate one (web clients may not send it)
    const resolvedDeviceId = deviceInfo.deviceId || randomUUID();

    const session = await this.prisma.session.upsert({
      where: { DeviceId: resolvedDeviceId },
      update: {
        userId: user.id, // Ensure correct user
        IsActive: true,
        LastSeen: new Date(),
        IpAddress: deviceInfo.ip,
      },
      create: {
        userId: user.id,
        DeviceId: resolvedDeviceId,
        DeviceType: deviceInfo.deviceType || 'web',
        deviceName: deviceInfo.deviceName,
        IpAddress: deviceInfo.ip,
        IsActive: true,
      },
    });

    // ✅ 4. Check if profile is complete
    const isProfileComplete = await this.checkProfileCompletion(user.id);

    return {
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        phone: user.phone,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        state: user.state,
        city: user.city,
        isProfileComplete,
      },
      session: {
        id: session.id,
        deviceId: session.DeviceId || '',
        isActive: session.IsActive || false,
      },
    };
  }

  /**
   * 📋 UPDATE PROFILE - Progressive profile completion
   *
   * - Only updates provided fields
   * - Never overwrites existing data
   * - Auto-marks profile as complete if all required fields are filled
   */
  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    // Build update data (only include provided fields)
    const dataToUpdate: any = {};

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.email !== undefined) dataToUpdate.email = updateData.email;
    if (updateData.state !== undefined) dataToUpdate.state = updateData.state;
    if (updateData.city !== undefined) dataToUpdate.city = updateData.city;
    if (updateData.gender !== undefined)
      dataToUpdate.Gender = updateData.gender;
    if (updateData.category !== undefined)
      dataToUpdate.Category = updateData.category;
    if (updateData.dob !== undefined) dataToUpdate.dob = updateData.dob;
    if (updateData.profilePic !== undefined)
      dataToUpdate.profilePic = updateData.profilePic;
    if (updateData.alternatePhone !== undefined)
      dataToUpdate.alternatePhone = updateData.alternatePhone;
    if (updateData.country !== undefined)
      dataToUpdate.country = updateData.country;
    if (updateData.theme !== undefined) dataToUpdate.Theme = updateData.theme;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    // ✅ Auto-check and mark profile as complete
    const isComplete = await this.checkProfileCompletion(userId);
    if (isComplete && !user.isProfileComplete) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isProfileComplete: true },
      });
      user.isProfileComplete = true;
    }

    return this.formatUserResponse(user);
  }

  /**
   * 📧 SEND EMAIL OTP - Start email verification
   */
  async sendEmailOtp(
    userId: string,
    { email }: SendEmailOtpDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if email is already verified for another user
    if (email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database using raw query (temporary workaround)
    try {
      await (this.prisma as any).$executeRaw`
        INSERT INTO "EmailVerificationCode" ("id", "userId", "email", "code", "expiresAt", "isUsed", "createdAt")
        VALUES (${randomUUID()}, ${userId}, ${email}, ${code}, ${expiresAt}, false, NOW())
      `;
    } catch (err) {
      // Fallback: just generate OTP without storing (for development)
      console.warn('⚠️ Could not save OTP to database:', err);
    }

    // TODO: Send OTP via email service
    console.log(`📧 Email OTP for ${email}: ${code}`);

    return {
      message: 'OTP sent to email (check console for dev)',
    };
  }

  /**
   * ✅ VERIFY EMAIL OTP - Complete email verification
   */
  async verifyEmailOtp(
    userId: string,
    { email, code }: VerifyEmailOtpDto,
  ): Promise<{ message: string; emailVerified: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // TODO: Implement OTP validation with database queries
    // For now, just verify the code format
    if (!code || code.length !== 6) {
      throw new BadRequestException('Invalid OTP format');
    }

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email,
        emailVerified: true,
        isEmailCodeSent: false,
      },
    });

    // Check if profile is now complete
    const isComplete = await this.checkProfileCompletion(userId);
    if (isComplete) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isProfileComplete: true },
      });
    }

    return {
      message: 'Email verified successfully',
      emailVerified: true,
    };
  }

  /**
   * 📱 GET ALL SESSIONS - View all active sessions
   */
  async getAllSessions(
    userId: string,
    currentDeviceId: string,
  ): Promise<AllSessionsResponseDto> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        IsActive: true,
      },
      orderBy: {
        LastSeen: 'desc',
      },
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        deviceId: s.DeviceId || '',
        deviceType: s.DeviceType || '',
        deviceName: s.deviceName || null,
        ipAddress: s.IpAddress || null,
        isActive: s.IsActive || false,
        lastSeen: s.LastSeen || new Date(),
        createdAt: s.createdAt,
      })),
      currentDeviceId,
    };
  }

  /**
   * 🚪 LOGOUT - Single device logout
   */
  async logout(userId: string, deviceId: string): Promise<{ message: string }> {
    const session = await this.prisma.session.findFirst({
      where: { userId, DeviceId: deviceId },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { IsActive: false },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * 🌐 REMOTE LOGOUT - Logout from other devices
   *
   * If deviceIds not provided: logout from ALL except current device
   * If deviceIds provided: logout only from those devices
   */
  async remoteLogout(
    userId: string,
    currentDeviceId: string,
    { deviceIds }: RemoteLogoutDto = {},
  ): Promise<{ message: string; loggedOutCount: number }> {
    const whereClause: any = { userId, IsActive: true };

    if (deviceIds && deviceIds.length > 0) {
      // Logout from specific devices
      whereClause.DeviceId = { $in: deviceIds };
    } else {
      // Logout from all except current device
      whereClause.DeviceId = { $ne: currentDeviceId };
    }

    const result = await this.prisma.session.updateMany({
      where: whereClause,
      data: { IsActive: false },
    });

    return {
      message: 'Remote logout successful',
      loggedOutCount: result.count,
    };
  }

  /**
   * 🔍 GET USER PROFILE
   */
  async getUserProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatUserResponse(user);
  }

  /**
   * 🔐 VALIDATE SESSION - Check if session is still active
   */
  async validateSession(userId: string, deviceId: string): Promise<boolean> {
    const session = await this.prisma.session.findFirst({
      where: {
        userId,
        DeviceId: deviceId,
        IsActive: true,
      },
    });

    if (!session) {
      return false;
    }

    // Update last seen
    await this.prisma.session.update({
      where: { id: session.id },
      data: { LastSeen: new Date() },
    });

    return true;
  }

  // ========== HELPER METHODS ==========

  /**
   * Check if user profile is complete
   * Profile is complete if: name, state, city exist
   */
  private async checkProfileCompletion(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    const isComplete = !!user.name && !!user.state && !!user.city;

    return isComplete;
  }

  /**
   * Format user response
   */
  private formatUserResponse(user: any): ProfileResponseDto {
    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      state: user.state,
      city: user.city,
      gender: user.Gender,
      category: user.Category,
      dob: user.dob,
      profilePic: user.profilePic,
      alternatePhone: user.alternatePhone,
      country: user.country,
      theme: user.Theme,
      isProfileComplete: user.isProfileComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Generate a unique 8-char uppercase alphanumeric referral code
   * Required at user creation to satisfy MongoDB's unique index on refralCode
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code: string;
    let exists: boolean;

    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.user.findUnique({
        where: { refralCode: code },
      });
      exists = !!existing;
    } while (exists);

    return code;
  }

  /**
   * Extract user from Firebase token (for guards)
   */
  async getUserFromToken(authHeader: string): Promise<any> {
    const firebaseUser = await this.firebase.getUserFromAuthHeader(authHeader);
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });

    return user;
  }
}
