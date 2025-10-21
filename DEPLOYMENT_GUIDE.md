# 🚀 Vercel Deployment Guide

## 📋 **Environment Variables for Production**

When deploying to Vercel, add these environment variables in your Vercel dashboard:

### **Database & Storage**
```
DATABASE_URL=postgresql://neondb_owner:npg_7TnLKrj9FGaR@ep-divine-smoke-abl4h0fu-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_9sV2nO7zc9Zig2xf_E2MMPBs1DfsOuuDUkz0BJ1v9W7GAeo
```

### **Admin Authentication** 
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=1millionCats
# Optional HR credentials (grant HR access to admin panel)
HR_USER_NAME=hr@intervest.lk
HR_USER_PW=hrInterVest_7^x
```

### **NextJS Configuration**
```
NEXTAUTH_SECRET=your-super-secret-key-for-production-change-this
NEXTAUTH_URL=https://your-app-name.vercel.app
```

## 🔒 **Security Features Implemented**

### **1. Admin Route Protection**
- ✅ **Middleware**: Protects all `/admin/*` routes
- ✅ **Authentication**: Username/password from environment variables
- ✅ **Session Management**: Secure HTTP-only cookies
- ✅ **Auto-redirect**: Unauthenticated users redirected to login

### **2. API Security**
- ✅ **Admin APIs**: `/api/admin/*` endpoints require authentication
- ✅ **Legacy API**: Still uses the same API key (`761025-77adoiu-6897987-a6a8wn34-abcd32`)
- ✅ **Rate limiting**: Basic protection against abuse
- ✅ **Input validation**: Zod schemas for data validation

### **3. Protected Areas**
- 🔒 `/admin` - Main dashboard
- 🔒 `/admin/blobs` - File browser
- 🔒 `/api/admin/blobs` - Blob listing API
- 🔒 Future admin endpoints

## 🌐 **Deployment Steps**

### **1. Push to GitHub**
```bash
git add .
git commit -m "Add admin authentication and security"
git push origin main
```

### **2. Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables in project settings
4. Deploy!

### **3. Update Client App URLs**
After deployment, update your client webapp:

**Local Development:**
```
GOOGLE_APPS_SCRIPT_URL=http://localhost:3000/api/upload/legacy
```

**Production:**
```
GOOGLE_APPS_SCRIPT_URL=https://your-app-name.vercel.app/api/upload/legacy
```

## 🔐 **Admin Access**

### **Login Credentials**
```
Username: admin
Password: 1millionCats

Optional HR login:
Username: hr@intervest.lk
Password: hrInterVest_7^x
```

### **Admin URLs**
- **Login**: `https://your-app.vercel.app/admin/login`
- **Dashboard**: `https://your-app.vercel.app/admin`
- **File Browser**: `https://your-app.vercel.app/admin/blobs`

## 🛡️ **Security Best Practices**

### **For Production:**
1. **Change default password** after first login
2. **Use strong NEXTAUTH_SECRET** (random 32+ characters)
3. **Enable HTTPS** (Vercel does this automatically)
4. **Monitor access logs** through Vercel dashboard
5. **Regular password rotation** (update env vars)

### **Environment Security:**
```bash
# Generate a strong secret
openssl rand -base64 32

# Example strong secret
NEXTAUTH_SECRET=8f3a4b2c7d1e9f6a8b2c5d7e9f1a3b5c7d8e9f2a4b6c8d1e3f5a7b9c2d4e6f8a1
```

## 📊 **Monitoring & Logs**

### **Vercel Dashboard**
- **Function Logs**: Monitor API requests and errors
- **Analytics**: Track admin access patterns  
- **Performance**: Database query performance
- **Usage**: Blob storage usage and costs

### **Security Events to Monitor**
- Failed login attempts
- API key usage (legacy endpoint)
- Large file uploads
- Unusual access patterns

## 🚀 **Post-Deployment Checklist**

- [ ] Environment variables configured
- [ ] Admin login working
- [ ] Blob storage accessible
- [ ] Legacy API endpoint working
- [ ] Client webapp updated with new URL
- [ ] Database connection verified
- [ ] File uploads working
- [ ] Admin logout working
- [ ] Middleware protecting admin routes

## 🔧 **Troubleshooting**

### **Common Issues:**

**"Unauthorized" when accessing admin:**
- Check environment variables are set
- Clear browser cookies and try again
- Verify username/password spelling

**Legacy API not working:**
- Ensure API key matches exactly
- Check client app URL configuration
- Verify Vercel function deployment

**Database connection issues:**
- Verify DATABASE_URL is correct
- Check Neon database is running
- Test with `npx prisma studio`

**File upload failures:**
- Verify BLOB_READ_WRITE_TOKEN is set
- Check file size limits
- Monitor Vercel function logs

Your system is now production-ready with proper authentication! 🎉