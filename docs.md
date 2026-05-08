# Neetall Backend — API Documentation

> **Base URL:** `http://localhost:8080/api`  
> **Global Prefix:** All routes are prefixed with `/api`  
> **Auth:** Endpoints marked 🔒 require `Authorization: Bearer <firebase-id-token>` header  
> **Optional:** `x-device-id` header for session validation

---

## Table of Contents

### Auth (`/api/auth`)
1. [Login / Register](#1-login--register)
2. [Logout](#2-logout)
3. [Remote Logout](#3-remote-logout)
4. [Get Current User (me)](#4-get-current-user)
5. [Update Profile (Auth)](#5-update-profile-auth)
6. [Get Sessions](#6-get-sessions)
7. [Send Email OTP](#7-send-email-otp)
8. [Verify Email OTP](#8-verify-email-otp)

### Profile (`/api/profile`)
9. [Complete Profile (Onboarding)](#9-complete-profile-onboarding)
10. [Get Profile](#10-get-profile)
11. [Update Profile Fields](#11-update-profile-fields)
12. [Profile Completion Status](#12-profile-completion-status)
13. [Update Email](#13-update-email)
14. [Verify Email](#14-verify-email)
15. [Enable Email Login](#15-enable-email-login)
16. [Verify Email For Login](#16-verify-email-for-login)
17. [Resend Email Verification](#17-resend-email-verification)
18. [Update Password](#18-update-password)
19. [Disable Email Login](#19-disable-email-login)

### Blogs (`/api/blogs`)
20. [List All Blogs](#20-list-all-blogs)
21. [Get Blog by Slug](#21-get-blog-by-slug)
22. [Get Blog by ID](#22-get-blog-by-id)
23. [Create Blog](#23-create-blog)
24. [Update Blog](#24-update-blog)
25. [Delete Blog](#25-delete-blog)
26. [Add FAQ to Blog](#26-add-faq-to-blog)
27. [Update FAQ](#27-update-faq)
28. [Delete FAQ](#28-delete-faq)

### Authors (`/api/authors`)
29. [List All Authors](#29-list-all-authors)
30. [Get Author by ID](#30-get-author-by-id)
31. [Create Author](#31-create-author)
32. [Update Author](#32-update-author)
33. [Delete Author](#33-delete-author)
34. [Add Social Link](#34-add-social-link)
35. [Update Social Link](#35-update-social-link)
36. [Delete Social Link](#36-delete-social-link)

### Choice Lists (`/api/choice-lists`)
37. [Create Choice List](#37-create-choice-list)
38. [List User's Choice Lists](#38-list-users-choice-lists)
39. [Get Choice List by ID](#39-get-choice-list-by-id)
40. [Update Choice List](#40-update-choice-list)
41. [Delete Choice List](#41-delete-choice-list)
42. [Add Detail to Choice List](#42-add-detail-to-choice-list)
43. [Update Detail](#43-update-detail)
44. [Delete Detail](#44-delete-detail)
45. [Reorder Details](#45-reorder-details)

### Referral (`/api/referral`)
46. [Get My Referral Code](#46-get-my-referral-code)
47. [Apply Referral Code](#47-apply-referral-code)
48. [Get My Referrals](#48-get-my-referrals)
49. [Get Referral Stats](#49-get-referral-stats)
50. [Get My Referrer](#50-get-my-referrer)

### Packages (`/api/packages`)
51. [List Packages](#51-list-packages)
52. [Get Package by ID](#52-get-package-by-id)
53. [Create Package](#53-create-package)
54. [Update Package](#54-update-package)
55. [Delete Package](#55-delete-package)

### Coverages & Items
56. [Create Coverage](#56-create-coverage)
57. [List Coverages](#57-list-coverages)
58. [Create Feature](#58-create-feature) / [List Features](#58-list-features)
59. [Create Tool](#59-create-tool) / [List Tools](#59-list-tools)
60. [Create Insight](#60-create-insight) / [List Insights](#60-list-insights)
61. [Create Explore](#61-create-explore) / [List Explores](#61-list-explores)

### Coupons (`/api/coupons`)
62. [Create Coupon](#62-create-coupon)
63. [List Coupons](#63-list-coupons)
64. [Validate Coupon](#64-validate-coupon)
65. [Update Coupon](#65-update-coupon)
66. [Delete Coupon](#66-delete-coupon)

### Payments (`/api/payments`)
67. [Create Razorpay Order](#67-create-razorpay-order)
68. [Verify Payment](#68-verify-payment)
69. [Payment History](#69-payment-history)
70. [My Purchased Packages](#70-my-purchased-packages)

### Predictor (`/api/predictor`)
71. [Get Available Filters (Unified)](#71-get-available-filters-unified)
72. [Predict Colleges](#72-predict-colleges)

---

# Auth API (`/api/auth`)

## 1. Login / Register

Login or register with Firebase phone OTP. Creates user if new, creates/updates device session.

**`POST /api/auth/login`**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-uuid-123",
    "deviceType": "mobile",
    "deviceName": "iPhone 15",
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "state": "Maharashtra",
    "city": "Mumbai"
  }'
```

**Response — 200:**
```json
{
  "user": {
    "id": "uuid",
    "firebaseUid": "firebase-uid",
    "phone": "+919123456789",
    "email": "rahul@example.com",
    "emailVerified": false,
    "name": "Rahul Sharma",
    "state": "Maharashtra",
    "city": "Mumbai",
    "isProfileComplete": true
  },
  "session": {
    "id": "session-uuid",
    "deviceId": "device-uuid-123",
    "isActive": true
  }
}
```

---

## 2. Logout

🔒 Logout from a specific device.

**`POST /api/auth/logout`**

```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "deviceId": "device-uuid-123" }'
```

**Response:** `{ "message": "Logged out successfully" }`

---

## 3. Remote Logout

🔒 Logout from other devices. If `deviceIds` omitted, logs out ALL except current.

**`POST /api/auth/logout-remote`**

```bash
curl -X POST http://localhost:8080/api/auth/logout-remote \
  -H "Authorization: Bearer <firebase-token>" \
  -H "x-device-id: current-device-id" \
  -H "Content-Type: application/json" \
  -d '{ "deviceIds": ["other-device-1", "other-device-2"] }'
```

**Response:** `{ "message": "Remote logout successful", "loggedOutCount": 2 }`

---

## 4. Get Current User

🔒 Get current authenticated user's profile.

**`GET /api/auth/me`**

```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:** Full profile object with all fields.

---

## 5. Update Profile (Auth)

🔒 Progressive profile update — only updates provided fields, never overwrites existing.

**`PATCH /api/auth/profile`**

```bash
curl -X PATCH http://localhost:8080/api/auth/profile \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Rahul S.", "city": "Pune", "theme": "dark" }'
```

---

## 6. Get Sessions

🔒 Get all active sessions for the user.

**`GET /api/auth/sessions`**

```bash
curl -X GET http://localhost:8080/api/auth/sessions \
  -H "Authorization: Bearer <firebase-token>" \
  -H "x-device-id: current-device-id"
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid", "userId": "user-uuid",
      "deviceId": "device-123", "deviceType": "mobile",
      "deviceName": "iPhone 15", "ipAddress": "::1",
      "isActive": true, "lastSeen": "2026-04-27T00:00:00.000Z",
      "createdAt": "2026-04-26T18:00:00.000Z"
    }
  ],
  "currentDeviceId": "current-device-id"
}
```

---

## 7. Send Email OTP

🔒 Send verification OTP to an email address.

**`POST /api/auth/email/send-otp`**

```bash
curl -X POST http://localhost:8080/api/auth/email/send-otp \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul@example.com" }'
```

**Response:** `{ "message": "OTP sent to email (check console for dev)" }`

---

## 8. Verify Email OTP

🔒 Verify email with 6-digit OTP.

**`POST /api/auth/email/verify-otp`**

```bash
curl -X POST http://localhost:8080/api/auth/email/verify-otp \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul@example.com", "code": "482917" }'
```

**Response:** `{ "message": "Email verified successfully", "emailVerified": true }`

---

# Profile API (`/api/profile`)

> All endpoints 🔒 require auth.

## 9. Complete Profile (Onboarding)

Fill required profile fields during onboarding. Profile is "complete" when `name`, `state`, `city` are set.

**`POST /api/profile/complete`** 🔒

```bash
curl -X POST http://localhost:8080/api/profile/complete \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "state": "Maharashtra",
    "city": "Mumbai",
    "country": "IN",
    "gender": "Male",
    "category": "general",
    "dob": "2000-05-15",
    "profilePic": "https://cdn.example.com/avatar.jpg",
    "alternatePhone": "+919876543210",
    "theme": "dark"
  }'
```

**Response:** `{ "message": "Profile completed successfully", "profile": {...}, "profileComplete": true }`

---

## 10. Get Profile

**`GET /api/profile`** 🔒

```bash
curl -X GET http://localhost:8080/api/profile \
  -H "Authorization: Bearer <firebase-token>"
```

---

## 11. Update Profile Fields

**`PATCH /api/profile/update`** 🔒

Updatable: `name`, `profilePic`, `alternatePhone`, `gender`, `dob`, `country`, `state`, `city`, `category`, `theme`

```bash
curl -X PATCH http://localhost:8080/api/profile/update \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Rahul S.", "city": "Pune", "theme": "light" }'
```

---

## 12. Profile Completion Status

**`GET /api/profile/completion-status`** 🔒

```bash
curl -X GET http://localhost:8080/api/profile/completion-status \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:**
```json
{
  "isComplete": false,
  "completionPercentage": 38,
  "completedFields": ["name", "email", "country"],
  "missingFields": ["state", "city", "gender", "category", "dob"],
  "requiredFields": ["name", "state", "city"]
}
```

---

## 13. Update Email

Sends OTP to new email for verification.

**`POST /api/profile/email/update`** 🔒

```bash
curl -X POST http://localhost:8080/api/profile/email/update \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "newEmail": "rahul.new@example.com" }'
```

**Response:** `{ "message": "Verification OTP sent to new email", "email": "...", "emailVerified": false, "verificationSent": true }`

---

## 14. Verify Email

Verify new email with 6-digit OTP.

**`POST /api/profile/email/verify`** 🔒

```bash
curl -X POST http://localhost:8080/api/profile/email/verify \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul.new@example.com", "code": "482917" }'
```

---

## 15. Enable Email Login

Set up email+password login. Sends verification OTP to email.

**`POST /api/profile/email-login/enable`** 🔒

```bash
curl -X POST http://localhost:8080/api/profile/email-login/enable \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul@example.com", "password": "MySecureP@ss123" }'
```

**Response:** `{ "message": "Email login enabled. Verification OTP sent to email.", "enableEmailLogin": true, "email": "...", "verificationRequired": true }`

---

## 16. Verify Email For Login

Confirm email for login with OTP (after enabling email login).

**`POST /api/profile/email-login/verify`** 🔒

```bash
curl -X POST http://localhost:8080/api/profile/email-login/verify \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul@example.com", "code": "739215" }'
```

---

## 17. Resend Email Verification

**`POST /api/profile/email/resend-verification`** 🔒

```bash
curl -X POST http://localhost:8080/api/profile/email/resend-verification \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "rahul@example.com" }'
```

---

## 18. Update Password

Change password for email login. Requires current password.

**`POST /api/profile/password/update`** 🔒

```bash
curl -X POST http://localhost:8080/api/profile/password/update \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "currentPassword": "MySecureP@ss123", "newPassword": "EvenMoreSecure@456" }'
```

---

## 19. Disable Email Login

Remove email login and password. Reverts to phone-only auth.

**`DELETE /api/profile/email-login/disable`** 🔒

```bash
curl -X DELETE http://localhost:8080/api/profile/email-login/disable \
  -H "Authorization: Bearer <firebase-token>"
```

---

# Blog API (`/api/blogs`)

> GET endpoints are **public**. POST/PATCH/DELETE require 🔒 auth.

## 20. List All Blogs

Paginated list with tag filter, author filter, and text search.

**`GET /api/blogs`**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 50) |
| `tag` | string | — | Filter by tag |
| `authorId` | string | — | Filter by author |
| `search` | string | — | Search title & description |

```bash
curl -X GET "http://localhost:8080/api/blogs?page=1&limit=5&tag=NEET"
```

**Response:**
```json
{
  "blogs": [{
    "id": "uuid", "title": "...", "description": "...",
    "slug": "...", "imageUrl": "...", "coverImageUrl": "...",
    "tags": ["NEET", "Exam Tips"],
    "author": { "id": "uuid", "name": "Dr. Priya", "avatarUrl": "..." },
    "createdAt": "2026-04-25T10:00:00.000Z"
  }],
  "total": 42, "page": 1, "limit": 5, "totalPages": 9
}
```

---

## 21. Get Blog by Slug

**`GET /api/blogs/by-slug/:slug`**

```bash
curl -X GET http://localhost:8080/api/blogs/by-slug/top-10-neet-pg-tips
```

**Response:** Full blog with `content`, `author` (with socialLinks), and `faqs` array.

---

## 22. Get Blog by ID

**`GET /api/blogs/:id`**

```bash
curl -X GET http://localhost:8080/api/blogs/b1234-uuid
```

---

## 23. Create Blog

🔒 Create blog with optional inline FAQs. Auto-generates slug if not provided.

**`POST /api/blogs`**

```bash
curl -X POST http://localhost:8080/api/blogs \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "NEET PG 2026 Changes",
    "description": "Everything about the new pattern",
    "content": "<h2>Key Changes</h2><p>...</p>",
    "authorId": "author-uuid",
    "slug": "neet-pg-2026-changes",
    "imageUrl": "https://cdn.example.com/img.jpg",
    "coverImageUrl": "https://cdn.example.com/cover.jpg",
    "tags": ["NEET", "2026"],
    "faqs": [
      { "question": "When effective?", "answer": "May 2026." },
      { "question": "Syllabus change?", "answer": "No." }
    ]
  }'
```

**Errors:** `404` Author not found · `409` Slug already exists

---

## 24. Update Blog

🔒 Update blog fields. Only provided fields are changed.

**`PATCH /api/blogs/:id`**

```bash
curl -X PATCH http://localhost:8080/api/blogs/blog-uuid \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Updated Title", "tags": ["NEET", "2026"] }'
```

Updatable: `title`, `description`, `content`, `authorId`, `slug`, `imageUrl`, `coverImageUrl`, `tags`

---

## 25. Delete Blog

🔒 Deletes blog and all its FAQs.

**`DELETE /api/blogs/:id`**

```bash
curl -X DELETE http://localhost:8080/api/blogs/blog-uuid \
  -H "Authorization: Bearer <firebase-token>"
```

---

## 26. Add FAQ to Blog

🔒 **`POST /api/blogs/:blogId/faqs`**

```bash
curl -X POST http://localhost:8080/api/blogs/blog-uuid/faqs \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "question": "Is coaching needed?", "answer": "Not necessarily." }'
```

---

## 27. Update FAQ

🔒 **`PATCH /api/blogs/faqs/:faqId`**

```bash
curl -X PATCH http://localhost:8080/api/blogs/faqs/faq-uuid \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "answer": "Updated answer text." }'
```

---

## 28. Delete FAQ

🔒 **`DELETE /api/blogs/faqs/:faqId`**

```bash
curl -X DELETE http://localhost:8080/api/blogs/faqs/faq-uuid \
  -H "Authorization: Bearer <firebase-token>"
```

---

# Author API (`/api/authors`)

> GET endpoints are **public**. POST/PATCH/DELETE require 🔒 auth.

## 29. List All Authors

**`GET /api/authors`**

```bash
curl -X GET http://localhost:8080/api/authors
```

**Response:** Array of authors with `socialLinks`.

---

## 30. Get Author by ID

Returns author with socialLinks and all their blogs.

**`GET /api/authors/:id`**

```bash
curl -X GET http://localhost:8080/api/authors/author-uuid
```

---

## 31. Create Author

🔒 Create author with optional inline social links.

**`POST /api/authors`**

```bash
curl -X POST http://localhost:8080/api/authors \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Amit Verma",
    "tag": "Surgery Specialist",
    "bio": "Practicing surgeon and NEET PG mentor",
    "avatarUrl": "https://cdn.example.com/amit.jpg",
    "expertise": "Surgery & Anatomy",
    "socialLinks": [
      { "platform": "linkedin", "url": "https://linkedin.com/in/dramit" }
    ]
  }'
```

---

## 32. Update Author

🔒 **`PATCH /api/authors/:id`**

Updatable: `name`, `tag`, `bio`, `avatarUrl`, `expertise`

```bash
curl -X PATCH http://localhost:8080/api/authors/author-uuid \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "bio": "Updated bio text", "tag": "Senior Expert" }'
```

---

## 33. Delete Author

🔒 Fails if author still has blog posts.

**`DELETE /api/authors/:id`**

```bash
curl -X DELETE http://localhost:8080/api/authors/author-uuid \
  -H "Authorization: Bearer <firebase-token>"
```

**Error 400:** `"Cannot delete author with 3 blog(s). Reassign or delete blogs first."`

---

## 34. Add Social Link

🔒 **`POST /api/authors/:authorId/social-links`**

Platforms: `linkedin` | `twitter` | `facebook` | `youtube` | `instagram`

```bash
curl -X POST http://localhost:8080/api/authors/author-uuid/social-links \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "platform": "instagram", "url": "https://instagram.com/drpriya" }'
```

---

## 35. Update Social Link

🔒 **`PATCH /api/authors/social-links/:linkId`**

```bash
curl -X PATCH http://localhost:8080/api/authors/social-links/link-uuid \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://instagram.com/dr.priya.official" }'
```

---

## 36. Delete Social Link

🔒 **`DELETE /api/authors/social-links/:linkId`**

```bash
curl -X DELETE http://localhost:8080/api/authors/social-links/link-uuid \
  -H "Authorization: Bearer <firebase-token>"
```

---

# Choice List API (`/api/choice-lists`)

> All endpoints 🔒 require auth. Choice lists are **user-scoped** — users can only access their own.

## 37. Create Choice List

🔒 Create a choice list with optional inline detail entries.

**`POST /api/choice-lists`**

```bash
curl -X POST http://localhost:8080/api/choice-lists \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My NEET PG 2026 Choices",
    "caunselling": "MCC AIQ",
    "details": [
      {
        "name": "AIIMS New Delhi - MD Medicine",
        "caunselling": "MCC AIQ",
        "institute": "AIIMS New Delhi",
        "course": "MD Medicine",
        "quota": "AIQ",
        "catagory": "General",
        "insertAt": 0
      },
      {
        "name": "JIPMER - MD Pediatrics",
        "caunselling": "MCC AIQ",
        "institute": "JIPMER Puducherry",
        "course": "MD Pediatrics",
        "quota": "AIQ",
        "catagory": "General",
        "insertAt": 1
      }
    ]
  }'
```

**Response — 201:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "name": "My NEET PG 2026 Choices",
  "caunselling": "MCC AIQ",
  "details": [
    {
      "id": "uuid", "name": "AIIMS New Delhi - MD Medicine",
      "caunselling": "MCC AIQ", "institute": "AIIMS New Delhi",
      "course": "MD Medicine", "quota": "AIQ", "catagory": "General",
      "insertAt": 0, "createdAt": "...", "updatedAt": "..."
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Errors:** `409` Name already exists

---

## 38. List User's Choice Lists

🔒 Paginated list of the authenticated user's choice lists.

**`GET /api/choice-lists`**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 50) |
| `search` | string | — | Search name & caunselling |

```bash
curl -X GET "http://localhost:8080/api/choice-lists?page=1&limit=10&search=NEET" \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:**
```json
{
  "choiceLists": [
    {
      "id": "uuid",
      "name": "My NEET PG 2026 Choices",
      "caunselling": "MCC AIQ",
      "detailsCount": 5,
      "createdAt": "2026-04-27T00:00:00.000Z"
    }
  ],
  "total": 3, "page": 1, "limit": 10, "totalPages": 1
}
```

---

## 39. Get Choice List by ID

🔒 Get a single choice list with all its detail entries, ordered by `insertAt`.

**`GET /api/choice-lists/:id`**

```bash
curl -X GET http://localhost:8080/api/choice-lists/choicelist-uuid \
  -H "Authorization: Bearer <firebase-token>"
```

**Errors:** `404` Not found · `403` Not your choice list

---

## 40. Update Choice List

🔒 Update choice list name or caunselling.

**`PATCH /api/choice-lists/:id`**

```bash
curl -X PATCH http://localhost:8080/api/choice-lists/choicelist-uuid \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Renamed List", "caunselling": "State Counselling" }'
```

Updatable: `name`, `caunselling`

**Errors:** `404` Not found · `403` Not yours · `409` Name conflict

---

## 41. Delete Choice List

🔒 Delete a choice list and all its detail entries.

**`DELETE /api/choice-lists/:id`**

```bash
curl -X DELETE http://localhost:8080/api/choice-lists/choicelist-uuid \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:** `{ "message": "Choice list deleted successfully" }`

---

## 42. Add Detail to Choice List

🔒 Add a new detail entry to an existing choice list.

**`POST /api/choice-lists/:choiceListId/details`**

```bash
curl -X POST http://localhost:8080/api/choice-lists/choicelist-uuid/details \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "KMC Manipal - MD Dermatology",
    "caunselling": "MCC AIQ",
    "institute": "KMC Manipal",
    "course": "MD Dermatology",
    "quota": "Management",
    "catagory": "General",
    "insertAt": 2
  }'
```

**Errors:** `404` Choice list not found · `403` Not yours · `409` Detail name exists

---

## 43. Update Detail

🔒 Update a detail entry. Only provided fields are changed.

**`PATCH /api/choice-lists/details/:detailId`**

```bash
curl -X PATCH http://localhost:8080/api/choice-lists/details/detail-uuid \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "course": "MS Orthopaedics", "insertAt": 0 }'
```

Updatable: `name`, `caunselling`, `institute`, `course`, `quota`, `catagory`, `insertAt`

---

## 44. Delete Detail

🔒 **`DELETE /api/choice-lists/details/:detailId`**

```bash
curl -X DELETE http://localhost:8080/api/choice-lists/details/detail-uuid \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:** `{ "message": "Choice list detail deleted successfully" }`

---

## 45. Reorder Details

🔒 Bulk update the `insertAt` ordering of all details in a choice list.

**`PATCH /api/choice-lists/:choiceListId/reorder`**

```bash
curl -X PATCH http://localhost:8080/api/choice-lists/choicelist-uuid/reorder \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "orderedIds": ["detail-uuid-3", "detail-uuid-1", "detail-uuid-2"] }'
```

Each detail's `insertAt` is set to its index in the `orderedIds` array (0, 1, 2, ...).

**Response:** `{ "message": "Details reordered successfully" }`

---

# Referral API (`/api/referral`)

> All endpoints 🔒 require auth.

## 46. Get My Referral Code

🔒 Get or auto-generate the authenticated user's unique 8-character referral code.

**`GET /api/referral/my-code`**

```bash
curl -X GET http://localhost:8080/api/referral/my-code \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:**
```json
{
  "referralCode": "NEET4K7P",
  "referralLink": "https://neetall.com/refer/NEET4K7P"
}
```

---

## 47. Apply Referral Code

🔒 Apply someone else's referral code. Can only be used once per user.

**`POST /api/referral/apply`**

```bash
curl -X POST http://localhost:8080/api/referral/apply \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "NEET4K7P" }'
```

**Response:**
```json
{
  "message": "Referral code applied successfully",
  "referredBy": "Rahul Sharma"
}
```

**Errors:**
- `400` Self-referral attempt
- `404` Invalid referral code
- `409` Already used a referral code

---

## 48. Get My Referrals

🔒 List all users you've referred, with stats summary.

**`GET /api/referral/my-referrals`**

```bash
curl -X GET http://localhost:8080/api/referral/my-referrals \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:**
```json
{
  "referrals": [
    {
      "id": "uuid",
      "referredName": "Priya M.",
      "referredPhone": "+91****6789",
      "isRewarded": false,
      "createdAt": "2026-04-27T10:00:00.000Z"
    }
  ],
  "total": 5,
  "stats": {
    "referralCode": "NEET4K7P",
    "totalReferrals": 5,
    "rewardedReferrals": 2,
    "pendingReferrals": 3
  }
}
```

---

## 49. Get Referral Stats

🔒 Lightweight stats without the full referral list.

**`GET /api/referral/stats`**

```bash
curl -X GET http://localhost:8080/api/referral/stats \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:**
```json
{
  "referralCode": "NEET4K7P",
  "totalReferrals": 5,
  "rewardedReferrals": 2,
  "pendingReferrals": 3
}
```

---

## 50. Get My Referrer

🔒 Check who referred you (if anyone).

**`GET /api/referral/my-referrer`**

```bash
curl -X GET http://localhost:8080/api/referral/my-referrer \
  -H "Authorization: Bearer <firebase-token>"
```

**Response (referred):**
```json
{
  "referredBy": "Rahul Sharma",
  "appliedAt": "2026-04-27T09:30:00.000Z"
}
```

**Response (not referred):**
```json
{
  "referredBy": null,
  "appliedAt": null
}
```

---

# Package API (`/api/packages`)

> GET endpoints are **public**. POST/PATCH/DELETE require 🔒 auth.

## 51. List Packages

**`GET /api/packages`** — List all available packages (public)

```bash
curl -X GET http://localhost:8080/api/packages
```

**Response:**
```json
[
  {
    "id": "uuid", "name": "NEET PG 2026 Pro",
    "tier": "PRO", "price": 4499, "currency": "INR",
    "validTill": "2026-12-31T...", "availability": "AVAILABLE",
    "coverageType": "ALL_INDIA_AND_STATES", "featureCount": 8
  }
]
```

---

## 52. Get Package by ID

**`GET /api/packages/:id`** — Full details with features, tools, insights, explores

```bash
curl -X GET http://localhost:8080/api/packages/pkg-uuid
```

---

## 53. Create Package

🔒 **`POST /api/packages`**

```bash
curl -X POST http://localhost:8080/api/packages \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NEET PG 2026 Pro",
    "tier": "PRO",
    "price": 4499,
    "validTill": "2026-12-31T23:59:59Z",
    "availability": "AVAILABLE",
    "coverageId": "coverage-uuid",
    "features": ["feature-id-1", "feature-id-2"],
    "tools": ["tool-id-1"],
    "insights": ["insight-id-1"],
    "explores": ["explore-id-1"]
  }'
```

---

## 54. Update Package

🔒 **`PATCH /api/packages/:id`** — Updatable: `name`, `tier`, `price`, `validTill`, `availability`, `coverageId`, `couponCode`

---

## 55. Delete Package

🔒 **`DELETE /api/packages/:id`** — Fails if package has active subscriptions.

---

# Coverages & Items

## 56. Create Coverage

🔒 **`POST /api/coverages`** — `{ "type": "ALL_INDIA" | "ALL_INDIA_AND_STATES", "description": "..." }`

## 57. List Coverages

**`GET /api/coverages`**

## 58. Features

- 🔒 **`POST /api/features`** — `{ "name": "College Predictor" }`
- **`GET /api/features`** — List all

## 59. Tools

- 🔒 **`POST /api/tools`** — `{ "name": "Rank Estimator" }`
- **`GET /api/tools`** — List all

## 60. Insights

- 🔒 **`POST /api/insights`** — `{ "name": "Cutoff Trends" }`
- **`GET /api/insights`** — List all

## 61. Explores

- 🔒 **`POST /api/explores`** — `{ "name": "College Comparator" }`
- **`GET /api/explores`** — List all

---

# Coupon API (`/api/coupons`)

## 62. Create Coupon

🔒 **`POST /api/coupons`**

```bash
curl -X POST http://localhost:8080/api/coupons \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NEET20",
    "description": "20% off on all packages",
    "discount": 20,
    "validTill": "2026-06-30T23:59:59Z"
  }'
```

---

## 63. List Coupons

🔒 **`GET /api/coupons`**

---

## 64. Validate Coupon

**`POST /api/coupons/validate`** — Check if a coupon is valid for a package (public)

```bash
curl -X POST http://localhost:8080/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{ "code": "NEET20", "packageId": "pkg-uuid" }'
```

**Response:**
```json
{
  "valid": true,
  "discount": 20,
  "originalPrice": 4499,
  "discountedPrice": 3599,
  "savings": 900,
  "message": "20% discount applied! You save ₹900"
}
```

---

## 65. Update Coupon

🔒 **`PATCH /api/coupons/:id`** — Updatable: `description`, `discount`, `validTill`

---

## 66. Delete Coupon

🔒 **`DELETE /api/coupons/:id`**

---

# Payment API (`/api/payments`) — Razorpay Integration

> All endpoints 🔒 require auth.

## 67. Create Razorpay Order

🔒 Initiate a payment. Returns Razorpay `order_id` to open the checkout on frontend.

**`POST /api/payments/create-order`**

```bash
curl -X POST http://localhost:8080/api/payments/create-order \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "packageId": "pkg-uuid", "couponCode": "NEET20" }'
```

**Response:**
```json
{
  "orderId": "order_XXXXXXXXXX",
  "razorpayOrderId": "order_XXXXXXXXXX",
  "amount": 359900,
  "currency": "INR",
  "packageName": "NEET PG 2026 Pro",
  "couponApplied": true,
  "discountAmount": 90000,
  "razorpayKeyId": "rzp_test_XXXX"
}
```

**Errors:** `404` Package not found · `400` Unavailable · `409` Already subscribed

---

## 68. Verify Payment

🔒 After Razorpay checkout completes on frontend, verify the payment and activate the package.

**`POST /api/payments/verify`**

```bash
curl -X POST http://localhost:8080/api/payments/verify \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpayOrderId": "order_XXXXXXXXXX",
    "razorpayPaymentId": "pay_XXXXXXXXXX",
    "razorpaySignature": "hmac_sha256_signature_hex"
  }'
```

**Response (success):**
```json
{
  "success": true,
  "message": "Payment verified and package activated",
  "userPackage": {
    "id": "uuid",
    "packageName": "NEET PG 2026 Pro",
    "packageTier": "PRO",
    "expiresAt": "2026-12-31T...",
    "isActive": true,
    "purchasedAt": "2026-04-27T..."
  }
}
```

**Errors:** `400` Invalid signature · `404` Payment not found · `409` Already verified

---

## 69. Payment History

🔒 **`GET /api/payments/history`** — All payment records for the user.

---

## 70. My Purchased Packages

🔒 **`GET /api/payments/my-packages`** — Active and expired subscriptions.

```bash
curl -X GET http://localhost:8080/api/payments/my-packages \
  -H "Authorization: Bearer <firebase-token>"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "packageName": "NEET PG 2026 Pro",
    "packageTier": "PRO",
    "expiresAt": "2026-12-31T...",
    "isActive": true,
    "purchasedAt": "2026-04-27T..."
  }
]
```

---

# Quick Reference — All Routes

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/auth/login` | ❌ | Login/Register with Firebase |
| 2 | POST | `/api/auth/logout` | 🔒 | Logout device |
| 3 | POST | `/api/auth/logout-remote` | 🔒 | Logout other devices |
| 4 | GET | `/api/auth/me` | 🔒 | Get current user |
| 5 | PATCH | `/api/auth/profile` | 🔒 | Update profile (progressive) |
| 6 | GET | `/api/auth/sessions` | 🔒 | List sessions |
| 7 | POST | `/api/auth/email/send-otp` | 🔒 | Send email OTP |
| 8 | POST | `/api/auth/email/verify-otp` | 🔒 | Verify email OTP |
| 9 | POST | `/api/profile/complete` | 🔒 | Complete profile (onboarding) |
| 10 | GET | `/api/profile` | 🔒 | Get profile |
| 11 | PATCH | `/api/profile/update` | 🔒 | Update profile fields |
| 12 | GET | `/api/profile/completion-status` | 🔒 | Completion % |
| 13 | POST | `/api/profile/email/update` | 🔒 | Update email |
| 14 | POST | `/api/profile/email/verify` | 🔒 | Verify email |
| 15 | POST | `/api/profile/email-login/enable` | 🔒 | Enable email login |
| 16 | POST | `/api/profile/email-login/verify` | 🔒 | Verify email for login |
| 17 | POST | `/api/profile/email/resend-verification` | 🔒 | Resend OTP |
| 18 | POST | `/api/profile/password/update` | 🔒 | Change password |
| 19 | DELETE | `/api/profile/email-login/disable` | 🔒 | Disable email login |
| 20 | GET | `/api/blogs` | ❌ | List blogs |
| 21 | GET | `/api/blogs/by-slug/:slug` | ❌ | Blog by slug |
| 22 | GET | `/api/blogs/:id` | ❌ | Blog by ID |
| 23 | POST | `/api/blogs` | 🔒 | Create blog |
| 24 | PATCH | `/api/blogs/:id` | 🔒 | Update blog |
| 25 | DELETE | `/api/blogs/:id` | 🔒 | Delete blog |
| 26 | POST | `/api/blogs/:blogId/faqs` | 🔒 | Add FAQ |
| 27 | PATCH | `/api/blogs/faqs/:faqId` | 🔒 | Update FAQ |
| 28 | DELETE | `/api/blogs/faqs/:faqId` | 🔒 | Delete FAQ |
| 29 | GET | `/api/authors` | ❌ | List authors |
| 30 | GET | `/api/authors/:id` | ❌ | Author + blogs |
| 31 | POST | `/api/authors` | 🔒 | Create author |
| 32 | PATCH | `/api/authors/:id` | 🔒 | Update author |
| 33 | DELETE | `/api/authors/:id` | 🔒 | Delete author |
| 34 | POST | `/api/authors/:authorId/social-links` | 🔒 | Add social link |
| 35 | PATCH | `/api/authors/social-links/:linkId` | 🔒 | Update social link |
| 36 | DELETE | `/api/authors/social-links/:linkId` | 🔒 | Delete social link |
| 37 | POST | `/api/choice-lists` | 🔒 | Create choice list |
| 38 | GET | `/api/choice-lists` | 🔒 | List user's choice lists |
| 39 | GET | `/api/choice-lists/:id` | 🔒 | Get choice list + details |
| 40 | PATCH | `/api/choice-lists/:id` | 🔒 | Update choice list |
| 41 | DELETE | `/api/choice-lists/:id` | 🔒 | Delete choice list |
| 42 | POST | `/api/choice-lists/:id/details` | 🔒 | Add detail entry |
| 43 | PATCH | `/api/choice-lists/details/:detailId` | 🔒 | Update detail |
| 44 | DELETE | `/api/choice-lists/details/:detailId` | 🔒 | Delete detail |
| 45 | PATCH | `/api/choice-lists/:id/reorder` | 🔒 | Reorder details |
| 46 | GET | `/api/referral/my-code` | 🔒 | Get/generate referral code |
| 47 | POST | `/api/referral/apply` | 🔒 | Apply referral code |
| 48 | GET | `/api/referral/my-referrals` | 🔒 | List my referrals + stats |
| 49 | GET | `/api/referral/stats` | 🔒 | Referral stats (lightweight) |
| 50 | GET | `/api/referral/my-referrer` | 🔒 | Who referred me |
| 51 | GET | `/api/packages` | ❌ | List packages |
| 52 | GET | `/api/packages/:id` | ❌ | Package details |
| 53 | POST | `/api/packages` | 🔒 | Create package |
| 54 | PATCH | `/api/packages/:id` | 🔒 | Update package |
| 55 | DELETE | `/api/packages/:id` | 🔒 | Delete package |
| 56 | POST | `/api/coverages` | 🔒 | Create coverage |
| 57 | GET | `/api/coverages` | ❌ | List coverages |
| 58 | POST/GET | `/api/features` | 🔒/❌ | Create/List features |
| 59 | POST/GET | `/api/tools` | 🔒/❌ | Create/List tools |
| 60 | POST/GET | `/api/insights` | 🔒/❌ | Create/List insights |
| 61 | POST/GET | `/api/explores` | 🔒/❌ | Create/List explores |
| 62 | POST | `/api/coupons` | 🔒 | Create coupon |
| 63 | GET | `/api/coupons` | 🔒 | List coupons |
| 64 | POST | `/api/coupons/validate` | ❌ | Validate coupon |
| 65 | PATCH | `/api/coupons/:id` | 🔒 | Update coupon |
| 66 | DELETE | `/api/coupons/:id` | 🔒 | Delete coupon |
| 67 | POST | `/api/payments/create-order` | 🔒 | Create Razorpay order |
| 68 | POST | `/api/payments/verify` | 🔒 | Verify payment |
| 69 | GET | `/api/payments/history` | 🔒 | Payment history |
| 70 | GET | `/api/payments/my-packages` | 🔒 | My purchased packages |

---

# Error Codes

| Code | Error | When |
|------|-------|------|
| `400` | Bad Request | Invalid OTP, weak password, author has blogs, self-referral, invalid signature, unavailable package |
| `401` | Unauthorized | Missing/invalid token, user not found |
| `403` | Forbidden | Accessing another user's choice list |
| `404` | Not Found | Blog/author/FAQ/link/choice list/referral code/package/coupon not found |
| `409` | Conflict | Duplicate email, slug, choice list name, already referred, already subscribed, already verified |

---

# Notes

- **Port:** `8080` (configurable via `PORT` env var)
- **Global prefix:** `/api` on all routes
- **OTP Expiry:** 10 minutes
- **Password:** Min 8 chars, bcrypt hashed (salt=10)
- **Blog Slugs:** Auto-generated from title if not provided, must be unique
- **Author Deletion:** Protected — cannot delete if author has blogs
- **Blog Deletion:** Cascades to FAQs
- **Choice List Deletion:** Cascades to all detail entries
- **Choice Lists:** User-scoped — each user sees only their own
- **Referral Codes:** 8-char unique alphanumeric (no I/O/0/1), auto-generated on first request
- **Referrals:** One-time use — each user can only apply one referral code
- **Phone Masking:** Referred user phones displayed as `+91****6789` for privacy
- **Razorpay:** Amounts in paise (₹4499 = 449900 paise). Signature verified via HMAC SHA256
- **Coupons:** Percentage-based discount, validated against package price
- **Package Deletion:** Protected — cannot delete if active subscriptions exist
- **Payment Flow:** Create order → Frontend checkout → Verify signature → Activate package
- **Pagination:** Default 10/page, max 50, newest first
- **Dev OTPs:** Logged to server console

---

# Predictor API (`/api/predictor`)

> The Predictor API provides dynamic dropdowns and predictive counselling algorithms based on the unified MongoDB allotments collection. GET endpoints are public. POST endpoints are public (but can be protected later).

## 71. Get Available Filters (Unified)

Fetch dynamic dropdown filters directly from the database based on the selected counselling state. Available states: `ai`, `mh`, `gj`, `up`.

**`GET /api/options/:state`**

```bash
# Example: Get All India MCC options
curl -X GET "http://localhost:8080/api/options/ai"

# Example: Get UP options
curl -X GET "http://localhost:8080/api/options/up"
```

**Response (Example `ai`):**
```json
{
  "success": true,
  "data": {
    "rounds": [{"round_no": 1, "label": "Round 1"}],
    "courses": [{"course_code": "MBBS"}],
    "categories": [{"candidate_category_code": "UR"}],
    "quotas": [{"quota_code": "AIQ"}]
  }
}
```

---

## 72. Predict Colleges

Predicts available colleges based on NEET rank or marks for a specific state. Uses MongoDB `$aggregateRaw` to calculate `rankDist` and fetches nearby candidates as evidence.

**`POST /api/:state/predict`**

Valid states: `ai`, `mh`, `gj`, `up`.

```bash
# Example: Predict All India MCC
curl -X POST http://localhost:8080/api/ai/predict \
  -H "Content-Type: application/json" \
  -d '{
    "rank": 45000,
    "limit": 30,
    "nearby_range": 25000
  }'
```

**Response:**
```json
{
  "success": true,
  "mode": "ai",
  "summary": {
    "userRank": 45000,
    "totalCards": 30,
    "safe": 12,
    "target": 10,
    "dream": 8
  },
  "data": [
    {
      "name": "AIIMS New Delhi",
      "shortName": "AIIMS New Delhi",
      "openingRank": 1,
      "closingRank": 50,
      "rankGap": -44950,
      "bucket": "dream",
      "similarCandidates": [...]
    }
  ]
}
```
