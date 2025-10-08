# CV File Management Implementation

## 📁 **File Naming Convention**

CV files are now saved using the **application UUID** as the filename:

```
Original file: "john_doe_resume.pdf"
Saved as: "57103c51-7adf-46cd-a10e-45a7f1eb7cd8.pdf"
```

## 🔄 **Updated API Flow**

### **POST /api/applications**

1. **Validate form data** (email, phone, job_title, etc.)
2. **Create application record** → Gets UUID from database
3. **Upload CV file** using UUID as filename: `{uuid}.{extension}`
4. **Update application** with file URL
5. **Return complete application** with CV URL

### **Error Handling**
- If file validation fails → Delete application record
- If file upload fails → Delete application record  
- Ensures no orphaned database records

## 📂 **File Storage Structure**

```
Vercel Blob Storage:
├── 57103c51-7adf-46cd-a10e-45a7f1eb7cd8.pdf
├── fe76e3e3-b2ae-4240-a6ef-0030b2eb6dad.docx
├── 8dda3ca6-2fd9-440b-b72f-b7efb1715e19.pdf
└── ...
```

## 🛠️ **Utility Functions Created**

- `deleteCVFile(url)` - Delete CV from blob storage
- `getCVFilename(uuid, original)` - Generate UUID-based filename
- `extractUUIDFromFilename(filename)` - Parse UUID from filename
- `isValidCVFileType(mimeType)` - Validate file types
- `getFileExtensionFromMimeType(mime)` - Convert MIME to extension

## ✅ **Supported File Types**

- **PDF**: `application/pdf` → `.pdf`
- **Word (old)**: `application/msword` → `.doc`  
- **Word (new)**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → `.docx`

## 🧪 **Testing the API**

```bash
# Start development server
npm run dev

# Submit CV (filename will be auto-generated with UUID)
curl -X POST http://localhost:3000/api/applications \
  -F "email=john@example.com" \
  -F "phone=+94771234567" \
  -F "job_title=Software Engineer-Java" \
  -F "vacancy_id=1" \
  -F "cv_file=@/path/to/resume.pdf"

# Response includes the file URL with UUID filename
{
  "id": "57103c51-7adf-46cd-a10e-45a7f1eb7cd8",
  "email": "john@example.com",
  "cv_file_url": "https://blob.vercel-storage.com/57103c51-7adf-46cd-a10e-45a7f1eb7cd8.pdf",
  ...
}
```

## 🔍 **Database Schema Updates**

Both `applications` and `referrals` tables now use:
- `cv_file_url TEXT` (instead of separate url/path fields)
- Consistent naming across tables
- File URLs point to UUID-named files in blob storage

This matches your original Google Drive system where files were named with UUIDs!