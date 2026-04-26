// firebase.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { readFile, readFileSync } from 'fs';
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
  async verifyToken(token: string): Promise<DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
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
  getUid(decoded: DecodedIdToken): string {
    return decoded.uid;
  }
  getPhone(decoded: DecodedIdToken): string | null {
    return decoded.phone_number ?? null;
  }
  getEmail(decoded: DecodedIdToken): string | null {
    return decoded.email ?? null;
  }
  isEmailVerified(decoded: DecodedIdToken): boolean {
    return decoded.email_verified ?? false;
  }
  async getUserFromAuthHeader(authHeader?: string) {
    const token = this.extractTokenFromHeader(authHeader);
    const decoded = await this.verifyToken(token);

    return {
      uid: this.getUid(decoded),
      phone: this.getPhone(decoded),
      email: this.getEmail(decoded),
      emailVerified: this.isEmailVerified(decoded),
      raw: decoded,
    };
  }
  async revokeUser(uid: string) {
    await admin.auth().revokeRefreshTokens(uid);
  }
  async getFirebaseUser(uid: string) {
    return admin.auth().getUser(uid);
  }
}