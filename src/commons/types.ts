/**
 * Common types and interfaces for the application
 */

export interface IUser {
  id: string;
  firebaseUid: string;
  phone: string;
  email: string | null;
  name: string | null;
  state: string | null;
  city: string | null;
  isProfileComplete: boolean;
}

export interface ISession {
  id: string;
  userId: string;
  deviceId: string;
  isActive: boolean;
  lastSeen: Date;
}

export interface IDeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web';
  deviceName?: string;
  ip?: string;
}

export interface IAuthResponse {
  user: IUser;
  session: ISession;
}

export interface IProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Response types for API endpoints
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp?: Date;
}

/**
 * Constants
 */

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  WEB = 'web',
}

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_LENGTH = 6;

/**
 * Profile completion rules
 */

export interface IProfileCompletionRule {
  requiredFields: string[];
  checkFn: (user: any) => boolean;
}

export const PROFILE_COMPLETION_RULE: IProfileCompletionRule = {
  requiredFields: ['name', 'state', 'city'],
  checkFn: (user) => {
    return !!user.name && !!user.state && !!user.city;
  },
};
