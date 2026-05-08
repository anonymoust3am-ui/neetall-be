import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // Extract Firebase token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Verify Firebase token
    const firebaseUser =
      await this.firebase.getUserFromAuthHeader(authHeader);

    // Get user from database
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Optionally: Validate device session (if deviceId is provided)
    const deviceId = req.headers['x-device-id'] || req.query.deviceId;

    if (deviceId) {
      const session = await this.prisma.session.findFirst({
        where: {
          userId: user.id,
          DeviceId: deviceId,
          IsActive: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session is not active or device is logged out');
      }

      // Update last seen
      await this.prisma.session.update({
        where: { id: session.id },
        data: { LastSeen: new Date() },
      });

      req.session = session;
      req.deviceId = deviceId;
    }

    // Attach user and token to request
    req.user = user;
    req.firebaseUser = firebaseUser;

    return true;
  }
}