# Institute Proxy API - Quick Start Guide

## 🚀 Getting Started (30 seconds)

### Prerequisites
- Server running: `npm run start:dev`
- Node.js 18+
- Postman or cURL (for testing)

### Installation
```bash
# Dependencies are already installed
# @nestjs/axios was added when setting up institutes module
npm install
```

### Start the Server
```bash
npm run start:dev
```

The server starts on `http://localhost:3000`

---

## 🧪 Test Endpoints Immediately

### 1. Get Filter Data
```bash
curl http://localhost:3000/institutes/filter-data
```

**Expected Response:** ✅ 200 OK with filter data

### 2. Get All Institutes
```bash
curl http://localhost:3000/institutes
```

**Expected Response:** ✅ 200 OK with list of institutes

### 3. Get Institute by ID
```bash
curl http://localhost:3000/institutes/1
```

**Expected Response:** ✅ 200 OK with institute details

### 4. Test Pagination
```bash
curl "http://localhost:3000/institutes?page=2"
```

### 5. Test Filters
```bash
curl "http://localhost:3000/institutes?states=maharashtra&page=1"
```

---

## 📋 Available Query Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `states` | string | maharashtra | Filter by state |
| `institute_type` | string | medical_college | Filter by type |
| `university_id` | number | 1 | Filter by university |
| `page` | number | 1 | Page number (default: 1) |

### Combine Parameters
```bash
curl "http://localhost:3000/institutes?states=maharashtra&institute_type=medical_college&page=1"
```

---

## 🔍 Understanding Responses

### Success Response (200)
```json
{
  "data": [
    {
      "id": 1,
      "name": "Institute Name",
      "state": "State",
      "institute_type": "Type"
    }
  ],
  "total": 50,
  "page": 1
}
```

### Error Response (404)
```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```

### Error Response (400)
```json
{
  "statusCode": 400,
  "message": "Invalid institute ID"
}
```

---

## 🧑‍💻 Code Examples

### JavaScript/Node.js
```javascript
// Get filter data
async function getFilterData() {
  const response = await fetch('http://localhost:3000/institutes/filter-data');
  const data = await response.json();
  console.log(data);
}

// Get institutes
async function getInstitutes(page = 1) {
  const response = await fetch(`http://localhost:3000/institutes?page=${page}`);
  const data = await response.json();
  console.log(data);
}

// Get institute details
async function getInstituteDetails(id) {
  const response = await fetch(`http://localhost:3000/institutes/${id}`);
  const data = await response.json();
  console.log(data);
}
```

### React
```jsx
import { useEffect, useState } from 'react';

function Institutes() {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:3000/institutes?page=1')
      .then(res => res.json())
      .then(data => setInstitutes(data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading && <p>Loading...</p>}
      <ul>
        {institutes.map(inst => (
          <li key={inst.id}>{inst.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### PowerShell
```powershell
# Get filter data
$response = Invoke-WebRequest -Uri "http://localhost:3000/institutes/filter-data"
$response.Content | ConvertFrom-Json

# Get institutes
$response = Invoke-WebRequest -Uri "http://localhost:3000/institutes?page=1"
$response.Content | ConvertFrom-Json | Format-Table

# Get institute details
$response = Invoke-WebRequest -Uri "http://localhost:3000/institutes/1"
$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty data
```

---

## 🛠️ Common Tasks

### Task 1: Get All Medical Colleges in Maharashtra
```bash
curl "http://localhost:3000/institutes?states=maharashtra&institute_type=medical_college"
```

### Task 2: Paginate Through Results
```bash
# Page 1
curl "http://localhost:3000/institutes?page=1"

# Page 2
curl "http://localhost:3000/institutes?page=2"

# Page 3
curl "http://localhost:3000/institutes?page=3"
```

### Task 3: Check Specific Institute
```bash
curl "http://localhost:3000/institutes/42"
```

### Task 4: Get Available Filters
```bash
curl "http://localhost:3000/institutes/filter-data"
```

---

## ⚠️ Common Issues & Solutions

### Issue: Connection Refused
**Error:** `Connection refused at localhost:3000`

**Solution:**
- Ensure server is running: `npm run start:dev`
- Check if port 3000 is in use

### Issue: 404 Not Found
**Error:** `Cannot GET /institutes`

**Solution:**
- Verify endpoint URL is correct
- Ensure server is running
- Check for typos in URL

### Issue: 400 Bad Request
**Error:** `Invalid institute ID`

**Solution:**
- Use valid numeric ID for institute ID
- Example: `/institutes/1` not `/institutes/abc`

### Issue: 503 Service Unavailable
**Error:** `External service unavailable`

**Solution:**
- Zynerd API may be down
- Check: `https://open.zynerd.com/public/institutes/filter_data`
- Try again in a few moments

### Issue: Timeout
**Error:** `Request timeout`

**Solution:**
- Request took more than 30 seconds
- Try with simpler query (fewer results)
- Reduce page size if possible

---

## 📱 Using Postman

### Step 1: Create Collection
- Click "New" → "Collection"
- Name: "Institutes API"

### Step 2: Create Requests

**Request 1 - Filter Data**
- Method: GET
- URL: `http://localhost:3000/institutes/filter-data`
- Click Send

**Request 2 - List Institutes**
- Method: GET
- URL: `http://localhost:3000/institutes`
- Params tab:
  - Key: `page`, Value: `1`
- Click Send

**Request 3 - Institutes with Filters**
- Method: GET
- URL: `http://localhost:3000/institutes`
- Params tab:
  - Key: `states`, Value: `maharashtra`
  - Key: `page`, Value: `1`
- Click Send

**Request 4 - Institute Details**
- Method: GET
- URL: `http://localhost:3000/institutes/1`
- Click Send

---

## 📊 Understanding Filter Data

Response from `/institutes/filter-data` contains:
```json
{
  "states": [
    "maharashtra",
    "delhi",
    "karnataka",
    ...
  ],
  "institute_types": [
    "medical_college",
    "dental_college",
    "ayush",
    ...
  ],
  "universities": [
    {
      "id": 1,
      "name": "University Name"
    },
    ...
  ]
}
```

Use these values for filtering!

---

## 🔗 API Endpoints Summary

```
GET /institutes/filter-data
  → Get available filters

GET /institutes
  → Get list of institutes
  → Optional: ?page=1&states=...&institute_type=...

GET /institutes/:id
  → Get specific institute details
  → Example: /institutes/42
```

---

## ✅ Testing Checklist

- [ ] Server is running on http://localhost:3000
- [ ] Can reach `/institutes/filter-data`
- [ ] Can fetch `/institutes` (page 1)
- [ ] Can fetch with filters `?states=...`
- [ ] Can get details for `/institutes/1`
- [ ] Error handling works (invalid ID returns 400)
- [ ] Pagination works (`?page=2`)

---

## 🚦 Next Steps

1. ✅ Test all endpoints (see above)
2. ✅ Review response structure
3. ✅ Integrate into your frontend
4. ✅ Add caching if needed
5. ✅ Implement error boundaries in UI

---

## 📚 For More Details

- Full API Reference: See `INSTITUTES_PROXY_API.md`
- Code Location: `src/modules/institutes/`
- Test File: `src/modules/institutes/institutes.controller.spec.ts`

---

## 🎉 You're Ready!

Your institutes proxy API is up and running. Start making requests! 🚀

**Quick Test:**
```bash
curl http://localhost:3000/institutes
```

If you see JSON data, you're good to go! ✅

---

**Status:** ✅ Ready to Use  
**Last Updated:** April 28, 2026
