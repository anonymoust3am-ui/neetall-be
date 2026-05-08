# 🔗 API Quick Reference

## Authentication Endpoints

### 1. Login/Register
```http
POST /auth/login
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "deviceId": "uuid-here",
  "deviceType": "mobile|tablet|desktop|web",
  "deviceName": "iPhone 14",
  "name": "John Doe",              // optional
  "email": "john@example.com",     // optional
  "state": "California",           // optional
  "city": "San Francisco"          // optional
}

RESPONSE (201):
{
  "user": {
    "id": "user-uuid",
    "firebaseUid": "firebase-uid",
    "phone": "+1-xxx-xxx-xxxx",
    "email": "john@example.com",
    "emailVerified": false,
    "name": "John Doe",
    "state": "California",
    "city": "San Francisco",
    "isProfileComplete": false
  },
  "session": {
    "id": "session-uuid",
    "deviceId": "uuid-here",
    "isActive": true
  }
}
```

---

### 2. Get Current User
```http
GET /auth/me
Authorization: Bearer <firebase-id-token>

RESPONSE (200):
{
  "id": "user-uuid",
  "firebaseUid": "firebase-uid",
  "phone": "+1-xxx-xxx-xxxx",
  "email": "john@example.com",
  "emailVerified": false,
  "name": "John Doe",
  "state": "California",
  "city": "San Francisco",
  "gender": "M",
  "category": "general",
  "dob": "1990-01-01",
  "profilePic": "https://...",
  "alternatePhone": "+1-xxx-xxx-xxxx",
  "country": "US",
  "theme": "light",
  "isProfileComplete": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

### 3. Update Profile
```http
PATCH /auth/profile
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "name": "John Doe",
  "state": "California",
  "city": "San Francisco",
  "gender": "M",
  "category": "general",
  "dob": "1990-01-01",
  "profilePic": "https://...",
  "alternatePhone": "+1-xxx-xxx-xxxx",
  "country": "US",
  "theme": "light"
}

RESPONSE (200):
{
  "id": "user-uuid",
  "name": "John Doe",
  "state": "California",
  "city": "San Francisco",
  "isProfileComplete": true,
  // ... full user object
}
```

---

## Email Verification

### 4. Send Email OTP
```http
POST /auth/email/send-otp
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "email": "john@example.com"
}

RESPONSE (201):
{
  "message": "OTP sent to email (check console for dev)"
}
```

---

### 5. Verify Email OTP
```http
POST /auth/email/verify-otp
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "email": "john@example.com",
  "code": "123456"
}

RESPONSE (200):
{
  "message": "Email verified successfully",
  "emailVerified": true
}
```

---

## Session Management

### 6. Get All Sessions
```http
GET /auth/sessions
Authorization: Bearer <firebase-id-token>

RESPONSE (200):
{
  "sessions": [
    {
      "id": "session-1",
      "userId": "user-uuid",
      "deviceId": "device-uuid-1",
      "deviceType": "mobile",
      "deviceName": "iPhone 14",
      "ipAddress": "192.168.1.1",
      "isActive": true,
      "lastSeen": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-10T08:00:00Z"
    },
    {
      "id": "session-2",
      "userId": "user-uuid",
      "deviceId": "device-uuid-2",
      "deviceType": "desktop",
      "deviceName": "MacBook Pro",
      "ipAddress": "192.168.1.2",
      "isActive": true,
      "lastSeen": "2024-01-15T09:00:00Z",
      "createdAt": "2024-01-12T08:00:00Z"
    }
  ],
  "currentDeviceId": "device-uuid-1"
}
```

---

## Logout

### 7. Logout (Single Device)
```http
POST /auth/logout
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "deviceId": "device-uuid-1"
}

RESPONSE (200):
{
  "message": "Logged out successfully"
}
```

---

### 8. Remote Logout (Other Devices)
```http
POST /auth/logout-remote
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

// Option 1: Logout all except current device
{}

// Option 2: Logout specific devices
{
  "deviceIds": ["device-uuid-2", "device-uuid-3"]
}

RESPONSE (200):
{
  "message": "Remote logout successful",
  "loggedOutCount": 2
}
```

---

## Error Responses

### Unauthorized (401)
```json
{
  "message": "Invalid Firebase token",
  "statusCode": 401
}
```

### Bad Request (400)
```json
{
  "message": "Invalid OTP",
  "statusCode": 400
}
```

### Conflict (409)
```json
{
  "message": "Email already in use",
  "statusCode": 409
}
```

### Not Found (404)
```json
{
  "message": "User not found",
  "statusCode": 404
}
```

---

## Headers

### Always Required
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

### Optional (for session validation)
```
X-Device-Id: <device-id>
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 409  | Conflict |
| 404  | Not Found |
| 500  | Server Error |

---

## Workflow

### New User Onboarding
```
1. Firebase Phone OTP → Get ID token
2. POST /auth/login → Create user in DB
3. Check: isProfileComplete === false?
4. PATCH /auth/profile → Complete profile
5. POST /auth/email/send-otp → Optional email verification
6. POST /auth/email/verify-otp → Verify email
7. GET /auth/me → Confirm profile complete
8. Navigate to dashboard
```

### Returning User
```
1. Firebase Phone OTP → Get ID token
2. POST /auth/login → Update session
3. Check: isProfileComplete === true?
4. Navigate to dashboard
```

### Multi-Device Logout
```
1. GET /auth/sessions → View all sessions
2. POST /auth/logout-remote → Logout other devices
3. Those devices get IsActive=false instantly
4. Next API call from those devices → 401 Unauthorized
5. User must login again
```

---

## Testing

### Using Thunder Client / Postman

1. **Set environment variable:**
   - `firebase_token` = <firebase-id-token>
   - `device_id` = <uuid>

2. **Login:**
   ```
   POST {{BASE_URL}}/auth/login
   Headers:
     Authorization: Bearer {{firebase_token}}
     Content-Type: application/json
   Body:
     {
       "deviceId": "{{device_id}}",
       "deviceType": "mobile",
       "name": "Test User"
     }
   ```

3. **Update Profile:**
   ```
   PATCH {{BASE_URL}}/auth/profile
   Headers:
     Authorization: Bearer {{firebase_token}}
   Body:
     {
       "state": "California",
       "city": "San Francisco"
     }
   ```

4. **Check Sessions:**
   ```
   GET {{BASE_URL}}/auth/sessions
   Headers:
     Authorization: Bearer {{firebase_token}}
   ```

---

## Notes

- ✅ All endpoints require `Authorization: Bearer <token>`
- ✅ Firebase token must be valid and non-expired
- ✅ Device IDs must be unique per device
- ✅ OTP codes expire in 10 minutes
- ✅ Profile update is non-destructive (only fills empty fields)
- ✅ Remote logout is instant (isActive=false)
- ✅ Session validation automatically updates lastSeen
- ✅ Profile is auto-marked complete when all required fields are filled
