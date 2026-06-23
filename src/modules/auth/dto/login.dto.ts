/**
 * Request DTOs
 */

export class DeviceInfoDto {
  deviceId!: string;
  deviceType!: 'mobile' | 'tablet' | 'desktop' | 'web';
  deviceName?: string;
}

export class LoginDto extends DeviceInfoDto {
  name?: string;
  email?: string;
  state?: string;
  city?: string;
  gender?: string;
  category?: string;
  dob?: string;
}

export class UpdateProfileDto {
  name?: string;
  email?: string;
  state?: string;
  city?: string;
  gender?: string;
  category?: string;
  dob?: string;
  profilePic?: string;
  alternatePhone?: string;
  country?: string;
  theme?: 'light' | 'dark';
}

export class SendEmailOtpDto {
  email!: string;
}

export class VerifyEmailOtpDto {
  email!: string;
  code!: string;
}

export class LogoutDto {
  deviceId!: string;
}

export class RemoteLogoutDto {
  deviceIds?: string[];
}

/**
 * Response DTOs
 */

export class LoginResponseDto {
  user!: {
    id: string;
    firebaseUid: string;
    phone: string;
    email: string | null;
    emailVerified: boolean;
    name: string | null;
    state: string | null;
    city: string | null;
    isProfileComplete: boolean;
  };
  session!: {
    id: string;
    deviceId: string;
    isActive: boolean;
  };
}

export class ProfileResponseDto {
  id!: string;
  firebaseUid!: string;
  phone!: string;
  phoneVerified!: boolean;
  email!: string | null;
  emailVerified!: boolean;
  name!: string | null;
  state!: string | null;
  city!: string | null;
  gender!: string | null;
  category!: string | null;
  dob!: string | null;
  profilePic!: string | null;
  alternatePhone!: string | null;
  country!: string | null;
  theme!: string | null;
  prefExam!: string | null;
  rank!: number | null;
  score!: number | null;
  isProfileComplete!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  enableEmailLogin!: boolean;
  emailLoginVerified!: boolean;
  aiCredits!: number;
  aiCreditLimit!: number;
  aiUserSummurry!: string;
  isAiEnabled!: boolean;
  isAiCreditSystem!: boolean;
  userPackages!: string[];
}

export class SessionResponseDto {
  id!: string;
  userId!: string;
  deviceId!: string;
  deviceType!: string;
  deviceName!: string | null;
  ipAddress!: string | null;
  isActive!: boolean;
  lastSeen!: Date;
  createdAt!: Date;
}

export class AllSessionsResponseDto {
  sessions!: SessionResponseDto[];
  currentDeviceId!: string;
}
