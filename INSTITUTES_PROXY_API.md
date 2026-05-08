# Institute Proxy API Documentation

## Overview
The Institute Proxy API acts as a gateway to the external Zynerd API. It proxies requests to `https://open.zynerd.com/public` and returns responses back to the client. This module provides a unified interface for institute-related data.

## Base URL
```
http://localhost:3000/institutes
```

## Features
- ✅ Transparent proxy to Zynerd API
- ✅ Query parameter validation
- ✅ Comprehensive error handling
- ✅ Request logging for debugging
- ✅ Timeout protection (30 seconds)
- ✅ Public access (no authentication required)

---

## Endpoints

### 1. Get Filter Data ✅ PUBLIC
**GET** `/institutes/filter-data`

Returns filter options for institutes (states, institute types, etc.).

**Response:**
```json
{
  "data": {
    "states": [...],
    "institute_types": [...],
    "universities": [...]
  }
}
```

**Status Code:** `200 OK`

**Example:**
```bash
curl http://localhost:3000/institutes/filter-data
```

---

### 2. Get Institutes List ✅ PUBLIC
**GET** `/institutes`

Get a list of institutes with optional filters and pagination.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| states | string | No | - | Filter by state(s) |
| institute_type | string | No | - | Filter by institute type |
| university_id | number | No | - | Filter by university ID |
| page | number | No | 1 | Pagination page number (min: 1) |

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Institute Name",
      "state": "Maharashtra",
      "institute_type": "Medical College",
      "university_id": 1
    }
  ],
  "total": 100,
  "page": 1
}
```

**Status Code:** `200 OK`

**Examples:**

Get all institutes (default page 1):
```bash
curl http://localhost:3000/institutes
```

Get institutes from page 2:
```bash
curl http://localhost:3000/institutes?page=2
```

Filter by state:
```bash
curl http://localhost:3000/institutes?states=maharashtra&page=1
```

Filter by institute type:
```bash
curl http://localhost:3000/institutes?institute_type=medical_college&page=1
```

Filter by university:
```bash
curl http://localhost:3000/institutes?university_id=1&page=1
```

Combine filters:
```bash
curl "http://localhost:3000/institutes?states=maharashtra&institute_type=medical_college&page=1"
```

---

### 3. Get Institute Details ✅ PUBLIC
**GET** `/institutes/:id`

Get detailed information about a specific institute.

**Path Parameters:**
- `id` (number, required) - Institute ID

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Institute Name",
    "state": "Maharashtra",
    "city": "Mumbai",
    "institute_type": "Medical College",
    "university_id": 1,
    "address": "...",
    "phone": "...",
    "email": "...",
    "website": "...",
    "courses": [...],
    "seats": [...]
  }
}
```

**Status Code:** `200 OK` or `404 Not Found`

**Examples:**

Get details for institute ID 1:
```bash
curl http://localhost:3000/institutes/1
```

Get details for institute ID 42:
```bash
curl http://localhost:3000/institutes/42
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid institute ID",
  "error": "Bad Request"
}
```

### 404 Not Found
Institute does not exist or is not found.
```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```

### 503 Service Unavailable
External API is not responding.
```json
{
  "statusCode": 503,
  "message": "External service unavailable",
  "error": "No response from external API"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Failed to fetch institutes",
  "error": "Internal error details"
}
```

---

## HTTP Status Codes

| Code | Meaning | When it Occurs |
|------|---------|----------------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid parameters or ID |
| 404 | Not Found | Institute not found |
| 503 | Service Unavailable | External API unreachable |
| 500 | Internal Server Error | Server-side error |

---

## Request/Response Examples

### JavaScript Fetch

```javascript
// Get filter data
fetch('http://localhost:3000/institutes/filter-data')
  .then(res => res.json())
  .then(data => console.log(data));

// Get institutes list
fetch('http://localhost:3000/institutes?page=1')
  .then(res => res.json())
  .then(data => console.log(data));

// Get institutes with filters
fetch('http://localhost:3000/institutes?states=maharashtra&institute_type=medical&page=1')
  .then(res => res.json())
  .then(data => console.log(data));

// Get institute details
fetch('http://localhost:3000/institutes/42')
  .then(res => res.json())
  .then(data => console.log(data));
```

### PowerShell

```powershell
# Get filter data
$response = Invoke-WebRequest -Uri "http://localhost:3000/institutes/filter-data" -Method Get
$response.Content | ConvertFrom-Json

# Get institutes list
$response = Invoke-WebRequest -Uri "http://localhost:3000/institutes?page=1" -Method Get
$response.Content | ConvertFrom-Json | Format-List

# Get institute details
$response = Invoke-WebRequest -Uri "http://localhost:3000/institutes/42" -Method Get
$response.Content | ConvertFrom-Json | Format-List
```

---

## How It Works (Proxy Pattern)

```
Client Request
    ↓
NestJS Controller
    ↓
Institute Service
    ↓
HTTP Client (axios)
    ↓
Zynerd API (https://open.zynerd.com/public)
    ↓
Response forwarded back through layers
    ↓
Client receives response
```

### Request Flow
1. Client sends HTTP request to `/institutes/...`
2. NestJS controller receives and validates request
3. Service builds query parameters
4. HTTP client makes request to Zynerd API
5. Response is received and returned to client

### Features
- ✅ Query parameter validation using DTOs
- ✅ Error handling and logging
- ✅ Timeout protection (30 seconds)
- ✅ Request/response mapping
- ✅ Transparent forwarding

---

## Error Handling

The proxy implements comprehensive error handling:

### 1. Validation Errors
Invalid query parameters are caught before forwarding:
```javascript
// Invalid page number
GET /institutes?page=0
// Returns: 400 Bad Request
```

### 2. Service Unavailable
When Zynerd API is down:
```json
{
  "statusCode": 503,
  "message": "External service unavailable"
}
```

### 3. Timeout Errors
Requests exceeding 30 seconds timeout:
```json
{
  "statusCode": 500,
  "message": "Request timeout"
}
```

### 4. Invalid Parameters
Malformed requests:
```json
{
  "statusCode": 400,
  "message": "Invalid institute ID"
}
```

---

## Implementation Details

### Module Structure
```
src/modules/institutes/
├── institutes.controller.ts       # API endpoints
├── institutes.service.ts          # Proxy logic & HTTP requests
├── institutes.module.ts           # Module definition
├── institutes.controller.spec.ts  # Tests
└── dto/
    ├── get-institutes-query.dto.ts
    └── institute-response.dto.ts
```

### Key Technologies
- **NestJS HttpModule** - For HTTP requests
- **axios** - HTTP client library
- **class-validator** - Query parameter validation
- **RxJS firstValueFrom** - Promise-based async/await

### Configuration
- **Base URL:** `https://open.zynerd.com/public`
- **Timeout:** 30 seconds
- **Public Access:** No authentication required
- **Logging:** Debug logs for all requests

---

## Testing

### Using cURL

```bash
# Test 1: Get filter data
curl -X GET "http://localhost:3000/institutes/filter-data"

# Test 2: Get institutes (page 1)
curl -X GET "http://localhost:3000/institutes?page=1"

# Test 3: Get institutes with filters
curl -X GET "http://localhost:3000/institutes?states=maharashtra&institute_type=medical&page=1"

# Test 4: Get institute details
curl -X GET "http://localhost:3000/institutes/1"

# Test 5: Invalid institute ID
curl -X GET "http://localhost:3000/institutes/invalid"
```

### Using Postman

1. Import the following endpoints:
   - `GET http://localhost:3000/institutes/filter-data`
   - `GET http://localhost:3000/institutes`
   - `GET http://localhost:3000/institutes/:id`

2. For the `/institutes` endpoint, add query parameters in Postman:
   - Key: `page`, Value: `1`
   - Key: `states`, Value: `maharashtra`
   - Key: `institute_type`, Value: `medical`
   - Key: `university_id`, Value: `1`

---

## Debugging

### Enable Logging
Look for debug logs in the console:
```
[InstituteService] Fetching filter data from: https://open.zynerd.com/public/institutes/filter_data
[InstituteService] Filter data fetched successfully
```

### Check Network
```bash
# Test if Zynerd API is accessible
curl -X GET "https://open.zynerd.com/public/institutes/filter_data"
```

### Verify Endpoint
```bash
# Verify local endpoint is working
curl -X GET "http://localhost:3000/institutes"
```

---

## Performance Considerations

1. **Caching** - Consider implementing Redis caching for frequently requested data
2. **Rate Limiting** - Implement rate limiting to prevent abuse
3. **Pagination** - Always use pagination for list endpoints
4. **Timeouts** - Requests timeout after 30 seconds

---

## Security

- ✅ No sensitive data logging (only debug logs)
- ✅ Input validation on all parameters
- ✅ Error messages don't expose internal details
- ✅ Public access controlled (can be restricted if needed)

---

## Notes

- All endpoints are public (no authentication required)
- Responses are forwarded as-is from Zynerd API
- Query parameters are validated before forwarding
- Timeouts are set to 30 seconds to prevent hanging requests
- All requests are logged for debugging purposes

---

**Status:** ✅ Complete  
**Last Updated:** April 28, 2026  
**Version:** 1.0
