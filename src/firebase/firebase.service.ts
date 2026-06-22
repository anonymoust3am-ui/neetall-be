// firebase.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(
        readFileSync(join(process.cwd(), 'fb-service-acc.json'), 'utf-8'),
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyToken(token: string): Promise<DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  /**
   * Extract bearer token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string {
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    return token;
  }

  /**
   * Get user from Authorization header (extract + verify)
   */
  async getUserFromAuthHeader(authHeader: string): Promise<DecodedIdToken> {
    const token = this.extractTokenFromHeader(authHeader);
    return this.verifyToken(token);
  }

  /**
   * Extract UID from decoded token
   */
  getUid(decoded: DecodedIdToken): string {
    return decoded.uid;
  }

  /**
   * Extract phone from decoded token
   */
  getPhone(decoded: DecodedIdToken): string | null {
    return decoded.phone_number ?? null;
  }

  /**
   * Extract email from decoded token
   */
  getEmail(decoded: DecodedIdToken): string | null {
    return decoded.email ?? null;
  }

  /**
   * Extract email verified status from decoded token
   */
  isEmailVerified(decoded: DecodedIdToken): boolean {
    return decoded.email_verified ?? false;
  }

  /**
   * Delete user by Firebase UID
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      console.error(`Failed to delete Firebase user ${uid}:`, error);
    }
  }
}
