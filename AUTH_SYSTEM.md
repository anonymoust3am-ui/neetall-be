# 🔐 Authentication & Profile System Documentation

## Overview

This is a complete Firebase Phone OTP + NestJS + Prisma + MongoDB authentication system with:
- ✅ Firebase phone authentication (OTP-based)
- ✅ Progressive profile completion
- ✅ Optional email verification
- ✅ Device-based session management
- ✅ Instant remote logout across devices
- ✅ Idempotent login/register
- ✅ Non-destructive profile updates

---

## 🔄 Complete Flow

### Step 1: Phone Authentication (Frontend)
1. User enters phone number
2. Firebase sends OTP
3. User verifies OTP
4. Firebase returns ID token

### Step 2: Login/Register (Backend)

**Endpoint:** `POST /auth/login`

**Headers:**
```
Authorization: Bearer <firebase-id-token>
X-Device-Id: <device-id> (recommended for session validation)
```

**Body:**
```json
{
  "deviceId": "device-uuid-12345",
  "deviceType": "mobile|tablet|desktop|web",
  "deviceName": "iPhone 14",
  "name": "John Doe",
  "email": "john@example.com",
  "state": "California",
  "city": "San Francisco"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "firebaseUid": "firebase-uid",
    "phone": "+91-xxxx-xxx-xxx",
    "email": "john@example.com",
    "emailVerified": false,
    "name": "John Doe",
    "state": "California",
    "city": "San Francisco",
    "isProfileComplete": false
  },
  "session": {
    "id": "session-uuid",
    "deviceId": "device-uuid-12345",
    "isActive": true
  }
}
```

**Logic:**
- ✅ Verify Firebase token
- ✅ Extract: uid, phone, email
- ✅ If user exists: non-destructive update (only fill missing fields)
- ✅ If new user: create with provided data
- ✅ Create/update session (one per device)
- ✅ Check if profile is complete

### Step 3: Frontend Decision

```javascript
if (user.isProfileComplete === false) {
  // Redirect to onboarding
  navigate('/onboarding');
} else {
  // Redirect to dashboard
  navigate('/dashboard');
}
```

### Step 4: Progressive Profile Completion

**Endpoint:** `PATCH /auth/profile`

**Headers:**
```
Authorization: Bearer <firebase-id-token>
X-Device-Id: <device-id>
```

**Body:** (send only fields to update)
```json
{
  "name": "John Doe",
  "state": "California",
  "city": "San Francisco"
}
```

**Important:**
- ✅ Only provided fields are updated
- ✅ Existing data is never overwritten
- ✅ Auto-marks profile complete when name, state, city are filled

### Step 5: Email Verification (Optional)

#### Send OTP
**Endpoint:** `POST /auth/email/send-otp`

**Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to email"
}
```

#### Verify OTP
**Endpoint:** `POST /auth/email/verify-otp`

**Body:**
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "emailVerified": true
}
```

### Step 6: Session Management

#### Get All Sessions
**Endpoint:** `GET /auth/sessions`

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "deviceId": "device-1",
      "deviceType": "mobile",
      "deviceName": "iPhone 14",
      "ipAddress": "192.168.1.1",
      "isActive": true,
      "lastSeen": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ],
  "currentDeviceId": "device-1"
}
```

#### Logout from Current Device
**Endpoint:** `POST /auth/logout`

**Body:**
```json
{
  "deviceId": "device-1"
}
```

#### Remote Logout (Logout other devices)
**Endpoint:** `POST /auth/logout-remote`

**Body (Option 1 - Logout all except current):**
```json
{}
```

**Body (Option 2 - Logout specific devices):**
```json
{
  "deviceIds": ["device-2", "device-3"]
}
```

**Response:**
```json
{
  "message": "Remote logout successful",
  "loggedOutCount": 2
}
```

---

## 🔐 Security Features

### Session Validation
- Every request with `X-Device-Id` header validates:
  - ✅ User exists
  - ✅ Session exists for that device
  - ✅ Session is active
  - ✅ Updates last seen timestamp

### Firebase Token Verification
- ✅ Token must be valid and non-expired
- ✅ Bearer token format required
- ✅ All protected endpoints require auth guard

### Idempotent Login
- ✅ Multiple logins from same device: updates existing session
- ✅ Multiple logins from different devices: creates new sessions
- ✅ No duplicate users created

### Non-Destructive Updates
- ✅ Profile update never overwrites existing data
- ✅ Only updates fields that are in the request
- ✅ Previous data is preserved

---

## 📱 Device Detection (Frontend)

Generate unique `deviceId` on client:

```typescript
// Generate UUID
function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Store in localStorage
localStorage.setItem('deviceId', generateDeviceId());

// Or detect real device type
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'web' {
  const ua = navigator.userAgent;
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/win|mac/i.test(ua)) return 'desktop';
  return 'web';
}
```

---

## 🧠 Profile Completion Rules

A profile is considered **complete** when:
- ✅ `name` exists
- ✅ `state` exists
- ✅ `city` exists

(Email verification is optional unless you update the rule)

---

## 🚀 Usage Example (Frontend)

```typescript
// 1. Login/Register
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'Content-Type': 'application/json',
    'X-Device-Id': deviceId
  },
  body: JSON.stringify({
    deviceId: deviceId,
    deviceType: 'mobile',
    deviceName: 'iPhone 14'
  })
});

const { user, session } = await response.json();

if (!user.isProfileComplete) {
  // 2. Show profile form
} else {
  // Go to dashboard
}

// 3. Complete profile
await fetch('http://localhost:3000/auth/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'X-Device-Id': deviceId
  },
  body: JSON.stringify({
    name: 'John Doe',
    state: 'California',
    city: 'San Francisco'
  })
});

// 4. Verify email (optional)
await fetch('http://localhost:3000/auth/email/send-otp', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` },
  body: JSON.stringify({ email: 'john@example.com' })
});

// 5. View all sessions
const sessions = await fetch('http://localhost:3000/auth/sessions', {
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` }
});

// 6. Logout from other devices
await fetch('http://localhost:3000/auth/logout-remote', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${firebaseIdToken}` },
  body: JSON.stringify({}) // logout all except current
});
```

---

## 🛠️ Backend Architecture

### Database Models

**User**
- `id`: UUID
- `firebaseUid`: unique Firebase UID
- `phone`: unique phone number
- `email`: optional, unique email
- `name`, `state`, `city`: profile fields
- `isProfileComplete`: boolean
- `createdAt`, `updatedAt`: timestamps

**Session**
- `id`: UUID
- `userId`: foreign key to User
- `deviceId`: unique device identifier
- `deviceType`: mobile|tablet|desktop|web
- `isActive`: boolean
- `lastSeen`: timestamp

**EmailVerificationCode**
- `id`: UUID
- `userId`: foreign key to User
- `email`: email to verify
- `code`: 6-digit OTP
- `expiresAt`: 10 minutes expiry
- `isUsed`: boolean

### Services

**FirebaseService**
- `verifyToken()`: Verify Firebase ID token
- `extractTokenFromHeader()`: Parse Authorization header
- `getUserFromAuthHeader()`: Combined verify + extract
- `getUid()`, `getPhone()`, `getEmail()`: Extract fields

**AuthService**
- `loginWithFirebase()`: Main login/register
- `updateProfile()`: Progressive profile update
- `sendEmailOtp()`: Generate and send OTP
- `verifyEmailOtp()`: Validate OTP
- `getAllSessions()`: List user sessions
- `logout()`: Logout from device
- `remoteLogout()`: Logout from other devices
- `validateSession()`: Check if session is active

### Guards

**AuthGuard**
- Verifies Firebase token
- Validates user exists
- Optionally validates device session
- Attaches user to request

---

## 🔧 Configuration

### Environment Variables

Create `.env`:
```env
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/neetall
FIREBASE_PROJECT_ID=your-project-id
```

### Firebase Service Account

Create `fb-service-acc.json` in project root (from Firebase Console).

---

## 📝 Next Steps

1. ✅ Implement email service (send OTP via email)
2. ✅ Add rate limiting for OTP endpoints
3. ✅ Add input validation (class-validator)
4. ✅ Add logging and monitoring
5. ✅ Add refresh token mechanism (if needed)
6. ✅ Add 2FA support
7. ✅ Add social login (Google, GitHub)

---

## 🎯 Key Features Implemented

✅ Firebase Phone OTP Authentication
✅ Automatic User Creation on First Login
✅ Progressive Profile Completion
✅ Non-Destructive Profile Updates
✅ Device-Based Session Management
✅ Multi-Device Support
✅ Remote Logout (Instant across devices)
✅ Email Verification with OTP
✅ Session Validation
✅ Idempotent Operations
✅ Security: Token verification, Session validation
✅ Scalable & Clean Architecture
