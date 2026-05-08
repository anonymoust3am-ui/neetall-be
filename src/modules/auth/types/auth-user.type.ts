import { User } from '@prisma/client';

export type AuthUser = User & {
  currentDeviceId?: string;
  currentSessionId?: string;
};

export interface DecodedFirebaseToken {
  uid: string;
  phone_number?: string;
  email?: string;
  email_verified?: boolean;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  sub: string;
  auth_time: number;
  user_id: string;
  firebase: {
    identities: Record<string, any>;
    sign_in_provider: string;
  };
}
