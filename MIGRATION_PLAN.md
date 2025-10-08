# CVSubmission Migration Plan - Updated

## Overview
Migration from Google Sheets/AppScript system to Next.js + Neon PostgreSQL, **excluding Gmail synchronization**.

## Database Schema (Simplified)

### Tables Structure:

1. **`vacancies`** - Job postings with descriptions
2. **`applications`** - CV submissions linked to vacancies
3. **`cv_rankings`** - AI-powered CV evaluation results
4. **`referrals`** - Referral applications processing queue

### Key Changes from Original Plan:
- ❌ Removed `sync_status` table (no Gmail sync needed)
- ❌ Removed Gmail-related functionality
- ✅ Merged JD data into `vacancies` table
- ✅ Added proper foreign key relationships
- ✅ Simplified source tracking (`web`, `referral`, `manual`)

## API Endpoints Architecture

### Core APIs:
```
GET    /api/vacancies              - List all job vacancies
POST   /api/vacancies              - Create new vacancy
GET    /api/vacancies/[id]         - Get specific vacancy

GET    /api/applications           - List applications (filtered)
POST   /api/applications           - Submit new CV application
GET    /api/applications/[id]      - Get application details
PUT    /api/applications/[id]      - Update application
DELETE /api/applications/[id]      - Remove application

GET    /api/rankings/[applicationId] - Get ranking for application
POST   /api/rankings               - Save ranking results
PUT    /api/rankings/[applicationId] - Update ranking

POST   /api/upload                 - Handle CV file uploads

GET    /api/referrals              - List pending referrals
POST   /api/referrals              - Process referral applications
PUT    /api/referrals/[id]         - Mark referral as processed
```

## Frontend Pages Structure

```
/                          - Landing/submission page
/dashboard                 - Overview statistics
/applications              - Applications management
/applications/[id]         - Application details & ranking
/vacancies                 - Job postings management
/referrals                 - Referrals processing
/submit                    - CV submission form
/rank/[applicationId]      - Ranking interface
```

## Migration Steps

### Phase 1: Environment Setup
1. ✅ Create `.env.local` with Neon connection string
2. ✅ Add Vercel Blob storage configuration
3. ✅ Update package.json dependencies
4. ✅ Create Prisma schema

### Phase 2: Database Migration
```bash
# Install dependencies
npm install

# Initialize Prisma
npx prisma generate
npx prisma db push

# Import existing data from Google Sheets exports
```

### Phase 3: API Development
- Implement CRUD operations for all entities
- File upload handling with Vercel Blob
- Integration with existing Python ranking system
- Data validation with Zod schemas

### Phase 4: Frontend Development  
- Dashboard with application statistics
- Applications management interface
- CV upload form with job selection
- Ranking results display
- Referrals processing interface

### Phase 5: Data Migration
1. Export data from Google Sheets
2. Transform data format for PostgreSQL
3. Import applications, rankings, and referrals
4. Verify data integrity

### Phase 6: Integration & Testing
- Test all API endpoints
- Verify file upload/download
- Test ranking system integration
- Performance optimization

## Technical Stack

- **Database**: Neon PostgreSQL + Prisma ORM  
- **Storage**: Vercel Blob for CV files
- **Authentication**: NextAuth.js (if needed)
- **Validation**: Zod schemas
- **UI**: Tailwind CSS + Headless UI
- **Forms**: React Hook Form
- **State**: React Query for server state

## Data Flow Changes

### Original (Google Sheets):
```
Gmail → AppScript → Google Sheets → Python Scripts → Google Drive
```

### New (Next.js):
```
Web Form → Next.js API → PostgreSQL → Python Ranking → Blob Storage
Referrals → Processing Interface → PostgreSQL
```

## Benefits of New Architecture

1. **Better Performance**: PostgreSQL vs Google Sheets
2. **Improved UX**: Modern React interface
3. **Scalability**: Proper database relationships
4. **Security**: Controlled access patterns
5. **Maintainability**: Standard web development stack
6. **Flexibility**: Easy to add new features

## Files to Create/Migrate

### Database:
- ✅ `/prisma/schema.prisma`
- ✅ `.env.local`

### API Routes:
- `/src/app/api/vacancies/route.ts`
- `/src/app/api/applications/route.ts`
- `/src/app/api/rankings/route.ts`
- `/src/app/api/upload/route.ts`
- `/src/app/api/referrals/route.ts`

### Components:
- Dashboard components
- Application management
- CV upload form
- Ranking display
- Referrals interface

### Utils:
- Database connection
- File handling utilities
- Validation schemas
- Python ranking integration

This simplified architecture removes complexity while maintaining all essential functionality for CV submission and ranking.