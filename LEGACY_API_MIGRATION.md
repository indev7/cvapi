# Legacy API Migration Guide

## 🔄 **Easy Migration from Google Apps Script**

Your old client webapp can work with minimal changes!

### **Old Configuration:**
```javascript
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzzTsyKxy5FVh42HZr-smRedCXqqeGkGG4SPBYbnKPKxzqjzXcvuq1YEBZNxiZMV502fh/exec
UPLOAD_API_KEY=761025-77adoiu-6897987-a6a8wn34-abcd32
```

### **New Configuration:**
```javascript
GOOGLE_APPS_SCRIPT_URL=http://localhost:3000/api/upload/legacy
UPLOAD_API_KEY=761025-77adoiu-6897987-a6a8wn34-abcd32
```

## ✅ **What Works Exactly the Same:**

1. **API Key**: Same key `761025-77adoiu-6897987-a6a8wn34-abcd32`
2. **Request Format**: Same POST with `api_key` and `job_title` parameters
3. **File Upload**: Same base64 encoding in POST body
4. **Response Format**: Same JSON structure with `status`, `fileId`, `fileName`, etc.

## 🔧 **API Endpoint Compatibility**

### **Request Format (Unchanged):**
```javascript
POST /api/upload/legacy?api_key=761025-77adoiu-6897987-a6a8wn34-abcd32&job_title=Software Engineer
Content-Type: application/octet-stream

[base64 encoded file content]
```

### **Response Format (Same as before):**
```json
{
  "status": "success",
  "fileId": "57103c51-7adf-46cd-a10e-45a7f1eb7cd8",
  "fileName": "57103c51-7adf-46cd-a10e-45a7f1eb7cd8.pdf",
  "fileUrl": "https://blob.vercel-storage.com/57103c51-7adf-46cd-a10e-45a7f1eb7cd8.pdf",
  "jobTitle": "Software Engineer"
}
```

## 🚀 **Migration Steps:**

### **1. Update Environment Variables**
In your client webapp, change only the URL:
```diff
- GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec  
+ GOOGLE_APPS_SCRIPT_URL=http://localhost:3000/api/upload/legacy
  UPLOAD_API_KEY=761025-77adoiu-6897987-a6a8wn34-abcd32
```

### **2. No Code Changes Needed**
Your existing JavaScript/form submission code should work as-is!

### **3. For Production**
Replace `localhost:3000` with your deployed Next.js URL:
```javascript
GOOGLE_APPS_SCRIPT_URL=https://your-app.vercel.app/api/upload/legacy
```

## 🔍 **Testing the Migration**

### **Test with curl:**
```bash
# Test the legacy endpoint
curl -X POST "http://localhost:3000/api/upload/legacy?api_key=761025-77adoiu-6897987-a6a8wn34-abcd32&job_title=Software Engineer" \
  --data-binary "@test.pdf" \
  -H "Content-Type: application/octet-stream"
```

### **Expected Response:**
```json
{
  "status": "success",
  "fileId": "uuid-here",
  "fileName": "uuid-here.pdf",
  "fileUrl": "https://blob.vercel-storage.com/uuid-here.pdf",
  "jobTitle": "Software Engineer"
}
```

## 📋 **What Happens Behind the Scenes:**

1. **Legacy endpoint** receives your old format request
2. **Creates application** in PostgreSQL (gets UUID)
3. **Uploads file** to Vercel Blob with UUID filename
4. **Returns response** in old Google Apps Script format
5. **Your client** receives same response structure as before

## ⚡ **Benefits of Migration:**

- ✅ **No client code changes** needed
- ✅ **Same API key** works
- ✅ **Same request/response** format
- ✅ **Better performance** (no Google Sheets bottleneck)
- ✅ **Proper database** instead of spreadsheets
- ✅ **File storage** in Vercel Blob instead of Google Drive
- ✅ **UUID-based filenames** maintained

## 🛠️ **If You Want Modern API Later:**

The legacy endpoint is for easy migration. When ready, you can upgrade to the modern `/api/applications` endpoint which offers:
- Better validation
- Support for email/phone fields
- Proper FormData handling  
- More robust error handling

**Your migration is just a URL change away!** 🎉