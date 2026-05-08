# Counselling API - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB running on `localhost:27017`
- NestJS CLI (optional but recommended)

### Installation
```bash
# Install dependencies
npm install

# Run database migration
npm run prisma:push

# Seed the database with counselling data
npm run seed

# Build the project
npm run build

# Start development server
npm run start:dev
```

---

## 📌 API Endpoints Quick Reference

### Public Read (No Auth Required)
```
GET /counselling                          # Get all options
GET /counselling/:id                      # Get by ID
GET /counselling/value/neet-ug            # Get by value
GET /counselling/value/neet-pg            # Get NEET PG
GET /counselling/value/neet-ss            # Get NEET SS
GET /counselling/value/aiapget            # Get AIAPGET
```

### Private Write (Auth Required)
```
POST /counselling                         # Create option
PATCH /counselling/:id                    # Update option
DELETE /counselling/:id                   # Delete option
```

---

## 🧪 Testing the API

### Using PowerShell/Terminal

#### 1. Test Public Read - Get All Options
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/counselling" -Method Get
$response.Content | ConvertFrom-Json | Format-List
```

#### 2. Test Public Read - Get NEET UG
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/counselling/value/neet-ug" -Method Get
$neetUg = $response.Content | ConvertFrom-Json
$neetUg | Format-List
$neetUg.bodies | Format-Table
```

#### 3. Test Public Read - Get NEET PG
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/counselling/value/neet-pg" -Method Get
$response.Content | ConvertFrom-Json | Format-List
```

#### 4. Test Private Write - Create (Will fail without auth)
```powershell
$body = @{
    value = "test-exam"
    label = "Test Exam"
    desc = "Test Description"
    bodies = @(
        @{
            key = "test-body"
            name = "Test Body"
            quota = "All India"
        }
    )
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/counselling" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

# Expected: 401 Unauthorized
```

#### 5. Test With Valid Auth Token
```powershell
# First, get your Firebase auth token from your auth endpoint
$token = "YOUR_FIREBASE_AUTH_TOKEN_HERE"

$body = @{
    value = "new-exam"
    label = "New Exam"
    desc = "New exam description"
    bodies = @(
        @{
            key = "body1"
            name = "Body 1"
            quota = "All India"
        }
    )
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$response = Invoke-WebRequest -Uri "http://localhost:3000/counselling" `
    -Method Post `
    -Headers $headers `
    -Body $body

$response.Content | ConvertFrom-Json | Format-List
```

---

## 🌐 Using cURL or Postman

### Get All Options
```bash
curl http://localhost:3000/counselling
```

### Get NEET UG
```bash
curl http://localhost:3000/counselling/value/neet-ug
```

### Create New Option (with auth)
```bash
curl -X POST http://localhost:3000/counselling \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "new-exam",
    "label": "New Exam",
    "desc": "Description",
    "icon": "Icon",
    "bodies": [
      {
        "key": "body1",
        "name": "Body Name",
        "quota": "All India"
      }
    ]
  }'
```

---

## 📊 Database Data

### Seeded Counselling Options

#### 1. NEET UG
- **ID:** Check database or call API
- **Value:** `neet-ug`
- **Bodies:** 44 (all Indian states + quotas)

#### 2. NEET PG
- **Value:** `neet-pg`
- **Bodies:** 7

#### 3. NEET SS
- **Value:** `neet-ss`
- **Bodies:** 3

#### 4. AIAPGET
- **Value:** `aiapget`
- **Bodies:** 5

---

## 🔍 Debugging

### Check if Server is Running
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

### Check MongoDB Connection
```powershell
# In your MongoDB shell or MongoDBCompass
db.CounsellingOption.count()
db.Body.count()
```

### View All Counselling Options in DB
```bash
# Using MongoDB CLI
mongo localhost:27017/neetall_db
> db.CounsellingOption.find().pretty()
> db.Body.find().pretty()
```

### Check Request Logs
The development server logs all requests. Look for:
- HTTP method and endpoint
- Status code
- Response time

---

## 🎯 Common Issues & Solutions

### Issue: 401 Unauthorized on Write Endpoints
**Solution:** 
- Ensure you have a valid Firebase auth token
- Check the `Authorization: Bearer <token>` header is correctly set
- Verify the token hasn't expired

### Issue: 404 Not Found
**Solution:**
- Check the endpoint URL spelling
- Verify the counselling option value is correct (case-sensitive)
- Ensure data has been seeded with `npm run seed`

### Issue: Connection to MongoDB Failed
**Solution:**
- Ensure MongoDB is running on `localhost:27017`
- Check `DATABASE_URL` in `.env` file
- Verify MongoDB service is not blocked by firewall

### Issue: TypeScript Compilation Error
**Solution:**
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules: `rm -r node_modules && npm install`
- Run `npm run build` to rebuild

---

## 📱 Response Format

### Success Response (200/201)
```json
{
  "id": "MongoDB ObjectId",
  "value": "neet-ug",
  "label": "NEET UG",
  "desc": "MBBS / BDS / BAMS",
  "icon": "Stethoscope",
  "bodies": [
    {
      "id": "MongoDB ObjectId",
      "key": "ai-md",
      "name": "All India UG – Medical & Dental",
      "quota": "All India"
    }
  ]
}
```

### Error Response (4xx/5xx)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 🚦 Expected Behavior

### GET Requests
- ✅ Should return 200 with data
- ✅ Should work without authentication
- ✅ Should handle invalid IDs gracefully

### POST/PATCH/DELETE Requests
- ✅ Should return 401 without authentication
- ✅ Should return 201/200 with valid auth and data
- ✅ Should validate input and return 400 on invalid data

---

## 📞 Support Resources

1. **API Documentation:** See `COUNSELLING_API.md`
2. **Implementation Details:** See `COUNSELLING_IMPLEMENTATION.md`
3. **Code Examples:** See `src/modules/counselling/`
4. **Tests:** See `src/modules/counselling/counselling.controller.spec.ts`

---

## ✅ Deployment Checklist

- [ ] All dependencies installed
- [ ] Database migrations run
- [ ] Data seeded successfully
- [ ] Project builds without errors
- [ ] All public endpoints accessible
- [ ] Auth token mechanism working
- [ ] Private endpoints protected
- [ ] Error handling working
- [ ] Tests passing
- [ ] Documentation reviewed

---

## 🎓 Learning Resources

- **NestJS Docs:** https://docs.nestjs.com
- **Prisma Docs:** https://www.prisma.io/docs
- **MongoDB Docs:** https://docs.mongodb.com

---

**Status:** ✅ Ready to Use  
**Last Updated:** April 28, 2026
