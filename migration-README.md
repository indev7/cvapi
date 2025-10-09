Migration scripts README

This project includes two helper scripts to migrate legacy applicants and CV files into the current Neon + Vercel Blob setup.

Files added
- `scripts/migrate-applicants.js` - reads `migration-data/applicants.xlsx` or `migration-data/applicants.csv` and inserts/updates rows in the `applications` table via Prisma.
- `scripts/upload-cvs.js` - uploads files from `migration-cvs/` to Vercel Blob and updates `application.cv_file_url` with the blob URL.

Preparation
1. Install dependencies (project root):

```bash
npm install
```

2. Ensure environment variables are set (example):

- `DATABASE_URL` - Neon/Postgres connection string (required by Prisma)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob read/write token (if you have one)

You can export them in your shell or use a `.env` file with a tool like `direnv` or `dotenv` when running scripts.

3. Prepare input files:

- For applicant rows place `applicants.xlsx` (or `applicants.csv`) in `migration-data/`.
  - Supported column headers: `ID`, `Email`, `Phone`, `Job_Title`/`Job Title`, `CV File`/`CV File URL`, `Source`, `Status`.
  - If `ID` is present and matches an existing application id, the script will attempt to update that row.

- For CV files place them in `migration-cvs/`.
  - Naming heuristics used when matching a file to an application:
    1. Filename is the application UUID (e.g. `b3e1...-...-....pdf`)
    2. `migration-data/file_map.json` maps filenames to application id or email
    3. Filename contains a sanitized form of the applicant's email

Optional mapping file
- `migration-data/file_map.json` example:

```json
{
  "john_doe_cv.pdf": "a3f2e8...-uuid...",
  "jane-resume.docx": "jane.smith@example.com"
}
```

Run the scripts

- Migrate applicants (creates/updates database rows):

```bash
npm run migrate:applicants
```

- Upload CVs and update application.cv_file_url:

```bash
npm run upload:cvs
```

Notes and assumptions
- The scripts use the project's Prisma setup; run `npx prisma generate` if needed.
- The `@vercel/blob` library is used for uploads; ensure your Vercel Blob token is available via environment variables or the library's configuration.
- These scripts are intentionally conservative: they perform minimal validation and expect you to backup your database before running in production.

Troubleshooting
- If you get "Cannot find module 'xlsx'", run `npm install` to install dependencies.
- If uploads fail, verify `BLOB_READ_WRITE_TOKEN` and network connectivity.
- Review logs printed to the console for per-row/file errors.

If you'd like, I can:
- Add a dry-run flag to both scripts
- Add a unit test or small integration test to validate the mapping heuristics
- Add progress logging or concurrency for uploads

