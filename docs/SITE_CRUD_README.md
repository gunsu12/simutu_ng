# Site Management CRUD - Setup Instructions

## Overview
This is a fully functional CRUD system for managing hospital sites/locations with:
- PostgreSQL database with Drizzle ORM
- MinIO S3 for file uploads (site logos)
- Full Create, Read, Update, Delete operations
- File upload handling for site logos

## Database Schema

The `sites` table includes:
- `id` (UUID) - Primary key
- `site_code` (TEXT) - Unique site code
- `name` (TEXT) - Site name
- `description` (TEXT) - Optional description
- `address` (TEXT) - Site address
- `email` (TEXT) - Contact email
- `website` (TEXT) - Website URL
- `phone` (TEXT) - Phone number
- `fax` (TEXT) - Fax number
- `site_logo` (TEXT) - Logo URL in S3
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

## Setup Steps

### 1. Configure Environment Variables

Update `.env` file with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/simutu_ng
```

MinIO S3 credentials are already configured:
```env
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=procurement-apps
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_ENDPOINT=http://192.168.1.99:9000/
AWS_URL=http://192.168.1.99:9000/procurement-apps
```

### 2. Generate and Run Migrations

Generate the migration files:
```bash
npx drizzle-kit generate
```

Push the schema to the database:
```bash
npx drizzle-kit push
```

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

All endpoints are located in `server/api/sites/`:

### GET /api/sites
Fetch all sites
- Returns: `{ success: boolean, data: Site[] }`

### GET /api/sites/:id
Fetch a single site by ID
- Returns: `{ success: boolean, data: Site }`

### POST /api/sites
Create a new site
- Content-Type: `multipart/form-data`
- Body: FormData with all site fields + optional `siteLogo` file
- Returns: `{ success: boolean, data: Site, message: string }`

### PUT /api/sites/:id
Update an existing site
- Content-Type: `multipart/form-data`
- Body: FormData with all site fields + optional new `siteLogo` file + `oldSiteLogo` URL
- Returns: `{ success: boolean, data: Site, message: string }`

### DELETE /api/sites/:id
Delete a site (also removes logo from S3)
- Returns: `{ success: boolean, message: string }`

## Frontend Features

Navigate to `/dashboard/master/site` to access:

1. **List View**: See all sites in a table
2. **Search**: Filter by name, code, or address
3. **Create**: Click "Tambah Site" button to open modal
4. **Edit**: Click edit button on any row
5. **Delete**: Click delete button with confirmation
6. **Image Upload**: Upload and preview site logos
7. **Validation**: Required fields are marked

## File Structure

```
server/
├── api/sites/
│   ├── index.get.ts          # List all sites
│   ├── index.post.ts         # Create site
│   ├── [id].get.ts           # Get single site
│   ├── [id].put.ts           # Update site
│   └── [id].delete.ts        # Delete site
├── database/
│   ├── index.ts              # Database connection
│   └── schema.ts             # Sites table schema
└── utils/
    └── s3.ts                 # S3 upload/delete functions

app/pages/dashboard/master/
└── site.vue                  # Frontend CRUD interface
```

## Notes

- Make sure PostgreSQL is running and accessible
- Make sure MinIO is running at the configured endpoint
- The S3 bucket `procurement-apps` should exist in MinIO
- Site logos are stored in `sites/logos/` folder in S3
- When a site is deleted, its logo is automatically removed from S3
- When updating a site with a new logo, the old logo is automatically deleted

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure the database exists

### MinIO/S3 Issues
- Verify MinIO is running at http://192.168.1.99:9000
- Check the bucket `procurement-apps` exists
- Verify AWS credentials in .env

### File Upload Issues
- Check file size (recommended max 2MB)
- Verify file type is image (jpg, png, etc.)
- Check browser console for errors
