# CVSubmission System

A modern CV submission and ranking system built with Next.js, replacing the previous Google Sheets-based workflow.

## Features

- 📝 **CV Submission** - Web-based CV upload with job selection
- 📊 **AI-Powered Ranking** - Automated CV evaluation using Ollama/LLM
- 🗄️ **PostgreSQL Database** - Scalable data storage with Neon
- 📁 **File Storage** - CV files stored in Vercel Blob
- 🎯 **Vacancy Management** - Job postings with descriptions
- 🔄 **Referral Processing** - Handle referral applications
- 📱 **Responsive UI** - Modern interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Neon PostgreSQL
- **Storage**: Vercel Blob
- **Validation**: Zod schemas
- **AI Integration**: Existing Python ranking system

## Quick Setup

### 1. Environment Configuration

Copy `.env.local` and add your credentials:

```bash
# Neon PostgreSQL connection string
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"

# Vercel Blob storage access key  
BLOB_READ_WRITE_TOKEN="your_vercel_blob_token_here"

# Internal API security
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: Initialize with sample data
# (Connect to your Neon database and run database-init.sql)
```

### 3. Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

## Database Schema

### Tables Structure:
- **`vacancies`** - Job postings with descriptions and URLs
- **`applications`** - CV submissions linked to vacancies  
- **`cv_rankings`** - AI evaluation results with detailed scoring
- **`referrals`** - Referral applications processing queue

### Key Relationships:
```
vacancies (1) → (many) applications (1) → (1) cv_rankings
```

## API Endpoints

```
GET    /api/vacancies              # List job vacancies
POST   /api/vacancies              # Create vacancy
GET    /api/applications           # List applications (with filters)
POST   /api/applications           # Submit CV application
GET    /api/applications/[id]      # Get application details
PUT    /api/applications/[id]      # Update application
GET    /api/rankings/[appId]       # Get ranking results
POST   /api/rankings               # Save ranking results
POST   /api/upload                 # Handle file uploads
GET    /api/referrals              # List referrals
POST   /api/referrals              # Process referrals
```

## Data Migration

### From Google Sheets:

1. **Export Google Sheets to CSV**:
   - `applications.csv` (Applications sheet)
   - `rankings.csv` (Ranks sheet)  
   - `referrals.csv` (Referral sheet)
   - `vacancies.csv` (JD sheet or create manually)

2. **Place CSV files in `./migration-data/`**

3. **Run migration**:
   ```bash
   # Install csv-parser for migration script
   npm install csv-parser
   
   # Run migration
   node migrate-data.js
   ```

## Project Structure

```
/src/
  /app/
    /api/                   # API routes
      /applications/        # Application CRUD
      /vacancies/          # Vacancy management  
      /rankings/           # Ranking operations
      /upload/             # File upload
    /dashboard/            # Admin dashboard
    /applications/         # Application management
    /submit/              # CV submission form
  /lib/
    prisma.ts            # Database connection
  /components/           # React components
/prisma/
  schema.prisma         # Database schema
/migration-data/        # CSV files for migration
database-init.sql      # Database initialization
migrate-data.js        # Data migration script
```

## Key Changes from Google Sheets

| Feature | Google Sheets | New System |
|---------|---------------|------------|
| **Database** | Google Sheets | Neon PostgreSQL |
| **File Storage** | Google Drive | Vercel Blob |
| **API** | Apps Script | Next.js API Routes |
| **UI** | Google Sheets | React/Tailwind |
| **Gmail Sync** | Automated | ❌ Removed |
| **Referrals** | Manual copying | Processing interface |
| **Ranking** | External Python | Integrated workflow |

## Development

```bash
# Install dependencies
npm install

# Start development server  
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database operations
npx prisma studio          # Database GUI
npx prisma db push         # Push schema changes
npx prisma generate        # Update Prisma client
```

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## Migration Checklist

- [ ] Set up Neon PostgreSQL database
- [ ] Configure Vercel Blob storage  
- [ ] Export Google Sheets data to CSV
- [ ] Run database initialization
- [ ] Execute data migration script
- [ ] Test API endpoints
- [ ] Verify file upload/download
- [ ] Test ranking integration
- [ ] Deploy to production

## Support

See `MIGRATION_PLAN.md` for detailed migration strategy and architecture decisions.