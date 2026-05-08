# 🚀 Authentication System - Implementation Guide

## ✅ What's Been Implemented

### 1. **Database Schema** (`prisma/schema.prisma`)
- ✅ Enhanced `User` model with profile completion tracking
- ✅ `Session` model for device-based session management
- ✅ `EmailVerificationCode` model for OTP-based email verification
- ✅ Proper relationships with cascading deletes
- ✅ MongoDB compatibility with proper field mappings

### 2. **Firebase Service** (`src/firebase/firebase.service.ts`)
- ✅ Firebase token verification
- ✅ Bearer token extraction from Authorization header
- ✅ Combined `getUserFromAuthHeader()` method
- ✅ Token field extraction (UID, phone, email)
- ✅ Email verification status extraction

### 3. **Auth Service** (`src/modules/auth/auth.service.ts`)
- ✅ `loginWithFirebase()` - Login/Register in one call
- ✅ `updateProfile()` - Progressive profile updates (non-destructive)
- ✅ `sendEmailOtp()` - Email verification OTP generation
- ✅ `verifyEmailOtp()` - OTP validation and email verification
- ✅ `getAllSessions()` - List all active sessions
- ✅ `logout()` - Single device logout
- ✅ `remoteLogout()` - Instant remote logout (all devices or specific)
- ✅ `validateSession()` - Session validation with last-seen tracking
- ✅ `getUserProfile()` - Get current user profile

### 4. **Auth Guard** (`src/modules/auth/auth.guard.ts`)
- ✅ Firebase token verification
- ✅ User existence check
- ✅ Optional device session validation
- ✅ Automatic last-seen timestamp update

### 5. **Auth Controller** (`src/modules/auth/auth.controller.ts`)
- ✅ `POST /auth/login` - Login/Register endpoint
- ✅ `POST /auth/logout` - Single device logout
- ✅ `POST /auth/logout-remote` - Remote logout
- ✅ `PATCH /auth/profile` - Profile update
- ✅ `GET /auth/me` - Get current user
- ✅ `GET /auth/sessions` - View all sessions
- ✅ `POST /auth/email/send-otp` - Send email OTP
- ✅ `POST /auth/email/verify-otp` - Verify email OTP

### 6. **DTOs** (`src/modules/auth/dto/login.dto.ts`)
- ✅ Request DTOs: `LoginDto`, `UpdateProfileDto`, `SendEmailOtpDto`, etc.
- ✅ Response DTOs: `LoginResponseDto`, `ProfileResponseDto`, `SessionResponseDto`
- ✅ Proper TypeScript class definitions with `!` assertions

### 7. **Supporting Files**
- ✅ `src/commons/types.ts` - Common types and interfaces
- ✅ `src/commons/email.service.ts` - Email service interface
- ✅ Updated `src/app.module.ts` - All modules imported

---

## 🔧 Setup Steps

### 1. Install Dependencies
No new dependencies needed - already have `firebase-admin`, `@nestjs/common`, `prisma`, etc.

### 2. Update Environment Variables (`.env`)
```env
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/neetall
```

### 3. Firebase Configuration
- Create `fb-service-acc.json` in project root
- Download from Firebase Console > Project Settings > Service Accounts

### 4. Run Prisma Migration
```bash
# Generate Prisma client (you may need admin permissions on Windows)
npm run prisma:generate

# Push schema to database
npm run prisma:push

# (Optional) Open Prisma Studio
npm run prisma:studio
```

If you get file permission errors on Windows, try:
```bash
# Delete cached client
rm -r node_modules/.prisma/client

# Run as administrator or retry generation
npm run prisma:generate
```

### 5. Start Development Server
```bash
npm run start:dev
```

---

## 📱 Frontend Integration Example

### Step 1: User Login with Firebase

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPhoneNumber } from 'firebase/auth';

const auth = getAuth();

// Send OTP
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);

// Verify OTP
const result = await confirmationResult.confirm(otp);
const firebaseIdToken = await result.user.getIdToken();
```

### Step 2: Login with Backend

```typescript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'Content-Type': 'application/json',
    'X-Device-Id': localStorage.getItem('deviceId')
  },
  body: JSON.stringify({
    deviceId: localStorage.getItem('deviceId'),
    deviceType: 'mobile',
    deviceName: 'iPhone 14'
  })
});

const { user, session } = await response.json();

if (!user.isProfileComplete) {
  // Show profile form
  navigate('/onboarding');
} else {
  navigate('/dashboard');
}
```

### Step 3: Complete Profile

```typescript
const response = await fetch('http://localhost:3000/auth/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'X-Device-Id': localStorage.getItem('deviceId')
  },
  body: JSON.stringify({
    name: 'John Doe',
    state: 'California',
    city: 'San Francisco'
  })
});
```

### Step 4: Verify Email (Optional)

```typescript
// Send OTP
await fetch('http://localhost:3000/auth/email/send-otp', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` },
  body: JSON.stringify({ email: 'john@example.com' })
});

// Verify OTP
const response = await fetch('http://localhost:3000/auth/email/verify-otp', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` },
  body: JSON.stringify({
    email: 'john@example.com',
    code: '123456'
  })
});
```

### Step 5: View All Sessions

```typescript
const response = await fetch('http://localhost:3000/auth/sessions', {
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` }
});

const { sessions, currentDeviceId } = await response.json();
console.log('Active sessions:', sessions);
```

### Step 6: Remote Logout

```typescript
// Logout all devices except current
const response = await fetch('http://localhost:3000/auth/logout-remote', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` },
  body: JSON.stringify({})
});

// Or logout specific devices
await fetch('http://localhost:3000/auth/logout-remote', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` },
  body: JSON.stringify({
    deviceIds: ['device-1', 'device-2']
  })
});
```

---

## 🔐 Security Notes

1. **Firebase Token**: Always validate on backend (already done by AuthGuard)
2. **Device ID**: Should be stored securely in localStorage/SecureStorage
3. **Session Validation**: Optional `X-Device-Id` header validates device session
4. **OTP Expiry**: 10 minutes hardcoded (can be made configurable)
5. **Database**: Use MongoDB connection string with proper authentication

---

## 📊 Database Query Examples

### Get User with Sessions
```prisma
const userWithSessions = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    Sessions: {
      where: { IsActive: true }
    }
  }
});
```

### Get Active Sessions
```prisma
const sessions = await prisma.session.findMany({
  where: { userId, IsActive: true },
  orderBy: { LastSeen: 'desc' }
});
```

### Profile Completion Check
```prisma
const user = await prisma.user.findUnique({ where: { id } });
const isComplete = user.name && user.state && user.city;
```

---

## 🚀 Next Steps / Enhancements

### 1. Email Service Integration
- Uncomment email sending in `sendEmailOtp()`
- Implement with Nodemailer, SendGrid, AWS SES, etc.

### 2. Rate Limiting
- Add rate limiting to OTP endpoints
- Implement using express-rate-limit

### 3. Input Validation
- Add class-validator decorators to DTOs
- Example: `@IsEmail()`, `@IsPhoneNumber()`, `@MinLength(3)`

### 4. Logging & Monitoring
- Add Winston or Pino for logging
- Track failed login attempts
- Monitor remote logouts

### 5. Refresh Tokens
- Implement refresh token mechanism if needed
- Use HTTP-only cookies for tokens

### 6. 2FA Support
- Add TOTP (Time-based One-Time Password)
- Add backup codes

### 7. Social Login
- Add Google, GitHub, Apple login
- Merge accounts if email matches

### 8. Profile Picture Upload
- Add file upload handling for profile pictures
- Use S3 or similar for storage

---

## 🧪 Testing

### Manual Testing with cURL

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-1",
    "deviceType": "mobile",
    "name": "John Doe"
  }'

# 2. Update Profile
curl -X PATCH http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "California",
    "city": "San Francisco"
  }'

# 3. Get Current User
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <firebase-id-token>"

# 4. Get All Sessions
curl http://localhost:3000/auth/sessions \
  -H "Authorization: Bearer <firebase-id-token>"
```

---

## 📋 File Structure

```
src/
├── modules/
│   └── auth/
│       ├── auth.controller.ts      ← API endpoints
│       ├── auth.service.ts         ← Business logic
│       ├── auth.guard.ts           ← Request guard
│       ├── auth.module.ts          ← Module definition
│       ├── dto/
│       │   └── login.dto.ts        ← DTOs
│       ├── types/
│       │   └── auth-user.type.ts   ← Types
│       └── profile/                ← (empty, for future)
├── firebase/
│   ├── firebase.service.ts         ← Firebase integration
│   └── firebase.module.ts          ← Firebase module
├── commons/
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── types.ts                    ← Common types
│   └── email.service.ts            ← Email service interface
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── app.module.ts                   ← Updated with all imports
└── main.ts
```

---

## 💡 Key Design Decisions

1. **Login = Register**: No separate signup endpoint
2. **Non-Destructive Updates**: Only fill missing fields, never overwrite
3. **Device-Based Sessions**: One session per device, easily identifiable
4. **Progressive Onboarding**: Users can complete profile in steps
5. **Instant Remote Logout**: Immediate effect across all devices
6. **Firebase + Backend**: Firebase for authentication, backend for business logic
7. **Idempotent Operations**: Safe to retry requests

---

## ❓ FAQ

**Q: How do I handle profile picture uploads?**
A: Add a file upload endpoint that accepts multipart/form-data and uploads to S3 or similar.

**Q: Can I customize profile completion rules?**
A: Yes, update the `checkProfileCompletion()` method in `auth.service.ts`.

**Q: How do I send emails?**
A: Implement the `IEmailService` interface in `src/commons/email.service.ts`.

**Q: What if Prisma client doesn't generate?**
A: Try deleting `node_modules/.prisma` and running `npm run prisma:generate` with admin rights.

**Q: How do I test without Firebase?**
A: Create a mock Firebase service for testing in your test files.

---

## 📞 Support

See `AUTH_SYSTEM.md` for detailed API documentation.

Good luck! 🚀
