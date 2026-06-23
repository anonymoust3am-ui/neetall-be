/**
 * Profile Management DTOs
 */

// Request DTOs
export class CompleteProfileDto {
  name?: string;
  email?: string;
  state?: string;
  city?: string;
  country?: string;
  gender?: string;
  category?: string;
  dob?: string;
  profilePic?: string;
  alternatePhone?: string;
  theme?: 'light' | 'dark';
  prefExam?: string;
  rank?: number;
  score?: number;
}

export class UpdateProfileFieldsDto {
  name?: string;
  profilePic?: string;
  alternatePhone?: string;
  gender?: string;
  dob?: string;
  country?: string;
  state?: string;
  city?: string;
  category?: string;
  theme?: 'light' | 'dark';
  prefExam?: string;
  rank?: number;
  score?: number;
}

export class UpdateEmailDto {
  newEmail!: string;
}

export class EnableEmailLoginDto {
  email!: string;
  password!: string;
}

export class UpdatePasswordDto {
  currentPassword!: string;
  newPassword!: string;
}

export class VerifyEmailForLoginDto {
  email!: string;
  code!: string;
}

export class ResendEmailVerificationDto {
  email!: string;
}

export class GetProfileCompletionStatusDto {}

// Response DTOs
export class ProfileCompletionStatusDto {
  isComplete!: boolean;
  completionPercentage!: number;
  completedFields!: string[];
  missingFields!: string[];
  requiredFields!: string[];
}

export class ProfileDetailsDto {
  id!: string;
  phone!: string;
  phoneVerified!: boolean;
  email!: string | null;
  emailVerified!: boolean;
  name!: string | null;
  state!: string | null;
  city!: string | null;
  country!: string | null;
  gender!: string | null;
  category!: string | null;
  dob!: string | null;
  profilePic!: string | null;
  alternatePhone!: string | null;
  theme!: string | null;
  prefExam!: string | null;
  rank!: number | null;
  score!: number | null;

  // Email login fields
  enableEmailLogin!: boolean;
  emailLoginVerified!: boolean;

  isProfileComplete!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class EnableEmailLoginResponseDto {
  message!: string;
  enableEmailLogin!: boolean;
  email!: string;
  verificationRequired!: boolean;
}

export class ProfileUpdateResponseDto {
  message!: string;
  profile!: ProfileDetailsDto;
  profileComplete!: boolean;
}

export class EmailUpdateResponseDto {
  message!: string;
  email!: string;
  emailVerified!: boolean;
  verificationSent!: boolean;
}

export class PasswordUpdateResponseDto {
  message!: string;
  timestamp!: Date;
}

export class UpsertFcmTokenDto {
  token!: string;
  deviceType?: string;
  deviceName?: string;
  deviceId?: string;
}

export class DeleteFcmTokenDto {
  token!: string;
}

