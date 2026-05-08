# Counselling Management API Documentation

## Overview
The Counselling Management API provides access to medical exam counselling options and their associated counselling bodies (states, quotas, etc.). The API follows a **public read, private write** access model.

## Base URL
```
http://localhost:3000/counselling
```

## Authentication
- **Read operations (GET)**: No authentication required (PUBLIC)
- **Write operations (POST, PATCH, DELETE)**: Authentication required via `Authorization: Bearer <token>` header (PRIVATE)

---

## Endpoints

### 1. Get All Counselling Options ✅ PUBLIC
**GET** `/counselling`

Returns all available counselling options with their associated bodies.

**Response:**
```json
[
  {
    "id": "66a8b3c0d5e9f2a1b2c3d4e5",
    "value": "neet-ug",
    "label": "NEET UG",
    "desc": "MBBS / BDS / BAMS",
    "icon": "Stethoscope",
    "bodies": [
      {
        "id": "66a8b3c0d5e9f2a1b2c3d4f6",
        "key": "ai-md",
        "name": "All India UG – Medical & Dental",
        "quota": "All India"
      },
      {
        "id": "66a8b3c0d5e9f2a1b2c3d4f7",
        "key": "afms",
        "name": "AFMS (through MCC) – UG Medical",
        "quota": "AFMS"
      }
      // ... more bodies
    ]
  },
  // ... more counselling options
]
```

**Status Code:** `200 OK`

---

### 2. Get Counselling Option by ID ✅ PUBLIC
**GET** `/counselling/:id`

Get a specific counselling option by its MongoDB ID.

**Parameters:**
- `id` (path): MongoDB ObjectId of the counselling option

**Response:**
```json
{
  "id": "66a8b3c0d5e9f2a1b2c3d4e5",
  "value": "neet-ug",
  "label": "NEET UG",
  "desc": "MBBS / BDS / BAMS",
  "icon": "Stethoscope",
  "bodies": [...]
}
```

**Status Code:** `200 OK` or `404 Not Found`

---

### 3. Get Counselling Option by Value ✅ PUBLIC
**GET** `/counselling/value/:value`

Get a counselling option by its unique value identifier.

**Parameters:**
- `value` (path): Unique value identifier (e.g., `neet-ug`, `neet-pg`, `neet-ss`, `aiapget`)

**Example:**
```
GET /counselling/value/neet-ug
```

**Response:**
```json
{
  "id": "66a8b3c0d5e9f2a1b2c3d4e5",
  "value": "neet-ug",
  "label": "NEET UG",
  "desc": "MBBS / BDS / BAMS",
  "icon": "Stethoscope",
  "bodies": [...]
}
```

**Status Code:** `200 OK` or `404 Not Found`

---

### 4. Create Counselling Option 🔒 PRIVATE
**POST** `/counselling`

Create a new counselling option with bodies (Admin only).

**Headers:**
```
Authorization: Bearer <auth_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "value": "neet-ss",
  "label": "NEET SS",
  "desc": "Super Speciality",
  "icon": "Microscope",
  "bodies": [
    {
      "key": "ss-ai",
      "name": "All India SS Medical",
      "quota": "All India"
    },
    {
      "key": "ss-delhi",
      "name": "Delhi – SS Medical",
      "quota": "Government Quota"
    }
  ]
}
```

**Response:**
```json
{
  "id": "66a8b3c0d5e9f2a1b2c3d4e5",
  "value": "neet-ss",
  "label": "NEET SS",
  "desc": "Super Speciality",
  "icon": "Microscope",
  "bodies": [...]
}
```

**Status Code:** `201 Created` or `401 Unauthorized` or `400 Bad Request`

---

### 5. Update Counselling Option 🔒 PRIVATE
**PATCH** `/counselling/:id`

Update an existing counselling option (Admin only).

**Headers:**
```
Authorization: Bearer <auth_token>
Content-Type: application/json
```

**Parameters:**
- `id` (path): MongoDB ObjectId of the counselling option

**Request Body (all fields optional):**
```json
{
  "label": "NEET Super Specialty",
  "desc": "Advanced Super Specialty Programs",
  "bodies": [
    {
      "key": "ss-ai",
      "name": "All India SS Medical (Updated)",
      "quota": "All India"
    }
  ]
}
```

**Response:**
```json
{
  "id": "66a8b3c0d5e9f2a1b2c3d4e5",
  "value": "neet-ss",
  "label": "NEET Super Specialty",
  "desc": "Advanced Super Specialty Programs",
  "icon": "Microscope",
  "bodies": [...]
}
```

**Status Code:** `200 OK` or `401 Unauthorized` or `404 Not Found`

---

### 6. Delete Counselling Option 🔒 PRIVATE
**DELETE** `/counselling/:id`

Delete a counselling option and all its associated bodies (Admin only).

**Headers:**
```
Authorization: Bearer <auth_token>
```

**Parameters:**
- `id` (path): MongoDB ObjectId of the counselling option

**Response:**
```json
{
  "id": "66a8b3c0d5e9f2a1b2c3d4e5",
  "value": "neet-ss",
  "label": "NEET SS",
  "desc": "Super Speciality",
  "icon": "Microscope"
}
```

**Status Code:** `200 OK` or `401 Unauthorized` or `404 Not Found`

---

## Available Counselling Options (Pre-seeded)

### 1. NEET UG (Undergraduate)
- **Value:** `neet-ug`
- **Label:** NEET UG
- **Description:** MBBS / BDS / BAMS
- **Bodies:** 44 states/quotas

### 2. NEET PG (Postgraduate)
- **Value:** `neet-pg`
- **Label:** NEET PG
- **Description:** MD / MS / Diploma
- **Bodies:** 7 bodies

### 3. NEET SS (Super Specialty)
- **Value:** `neet-ss`
- **Label:** NEET SS
- **Description:** Super Speciality
- **Bodies:** 3 bodies

### 4. AIAPGET (Ayush)
- **Value:** `aiapget`
- **Label:** AIAPGET
- **Description:** Ayush PG Entrance
- **Bodies:** 5 bodies

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["value must be a string", "label must be a string"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Cannot find counselling option",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Example Usage

### Using cURL (Public Read)
```bash
# Get all counselling options
curl http://localhost:3000/counselling

# Get NEET UG option
curl http://localhost:3000/counselling/value/neet-ug
```

### Using JavaScript/Fetch (Public Read)
```javascript
// Get all options
const response = await fetch('http://localhost:3000/counselling');
const data = await response.json();
console.log(data);

// Get specific option by value
const response = await fetch('http://localhost:3000/counselling/value/neet-ug');
const neetUg = await response.json();
console.log(neetUg.bodies);
```

### Using JavaScript/Fetch (Private Write)
```javascript
// Create new counselling option
const token = 'your_auth_token_here';
const response = await fetch('http://localhost:3000/counselling', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    value: 'new-exam',
    label: 'New Exam Type',
    desc: 'Description here',
    icon: 'SomeIcon',
    bodies: [
      {
        key: 'body-1',
        name: 'Body Name',
        quota: 'Quota Type'
      }
    ]
  })
});
const data = await response.json();
console.log(data);
```

---

## Data Schema

### CounsellingOption
```typescript
{
  id: string;           // MongoDB ObjectId
  value: string;        // Unique identifier (e.g., "neet-ug")
  label: string;        // Display name (e.g., "NEET UG")
  desc?: string;        // Optional description
  icon?: string;        // Optional icon identifier
  bodies: Body[];       // Array of associated bodies
}
```

### Body
```typescript
{
  id: string;           // MongoDB ObjectId
  key: string;          // Unique key within option
  name: string;         // Display name of body/state/quota
  quota: string;        // Quota type
  optionId: string;     // Reference to parent CounsellingOption
}
```

---

## Access Control

| Operation | Authentication | User Role | Status |
|-----------|----------------|-----------|--------|
| GET /counselling | No | Any | ✅ Public |
| GET /counselling/:id | No | Any | ✅ Public |
| GET /counselling/value/:value | No | Any | ✅ Public |
| POST /counselling | Yes | Admin | 🔒 Private |
| PATCH /counselling/:id | Yes | Admin | 🔒 Private |
| DELETE /counselling/:id | Yes | Admin | 🔒 Private |

---

## Notes
- All timestamps are UTC
- MongoDB ObjectIds are used for internal IDs
- The `value` field must be unique across all counselling options
- Write operations require valid Firebase authentication token
- The API uses NestJS with Prisma ORM for MongoDB
