# 🚀 Quick Start Guide - Site Management CRUD

## Prerequisites

Before you begin, ensure you have:
- ✅ PostgreSQL running
- ✅ MinIO running at `http://192.168.1.99:9000`
- ✅ Node.js and npm installed

## Step-by-Step Setup

### 1️⃣ Configure Database

Edit `.env` file and update your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/simutu_ng
```

Example:
```env
DATABASE_URL=postgresql://postgres:password123@localhost:5432/simutu_ng
```

### 2️⃣ Create Database (if not exists)

```bash
# Using psql
psql -U postgres
CREATE DATABASE simutu_ng;
\q
```

Or use pgAdmin to create the database.

### 3️⃣ Push Database Schema

```bash
npm run db:push
```

You should see:
```
✓ Your SQL migration file applied successfully
```

### 3.5️⃣ (Optional) Seed Sample Data

To populate the database with 5 sample sites for testing:

```bash
npm run db:seed
```

This will create:
- SITE001 - RS Pusat Jakarta
- SITE002 - RS Cabang Bandung
- SITE003 - RS Cabang Surabaya
- SITE004 - Klinik Satelit Tangerang
- SITE005 - RS Cabang Semarang

### 4️⃣ Verify MinIO Setup

1. Open MinIO Console: `http://192.168.1.99:9001`
2. Login with credentials:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Ensure bucket `procurement-apps` exists
4. If not, create it with public read access

### 5️⃣ Start Development Server

```bash
npm run dev
```

Server will start at: `http://localhost:3000`

### 6️⃣ Access Site Management

Navigate to: `http://localhost:3000/dashboard/master/site`

## Testing the CRUD Operations

### Create a Test Site

1. Click **"Tambah Site"** button
2. Fill in the form:
   ```
   Site Code: SITE001
   Name: RS Pusat Jakarta
   Description: Main hospital location
   Address: Jl. Sudirman No. 123, Jakarta Pusat
   Email: info@rspusat.com
   Website: https://www.rspusat.com
   Phone: 021-1234567
   Fax: 021-7654321
   ```
3. Upload a logo image (optional)
4. Click **"Simpan"**

### View Sites

All sites will appear in the table with:
- Site code
- Name and description
- Address
- Contact information
- Logo thumbnail
- Edit and Delete buttons

### Search Sites

Use the search bar to filter by:
- Site name
- Site code
- Address

### Edit a Site

1. Click **"Edit"** button on any row
2. Modify the fields
3. Upload a new logo (replaces old one)
4. Click **"Update"**

### Delete a Site

1. Click **"Hapus"** button
2. Confirm in the dialog
3. Site and logo will be removed

## Troubleshooting

### ❌ Cannot connect to database

**Solution:**
```bash
# Check PostgreSQL status
# Windows (if using Laragon)
- Check Laragon -> Services -> PostgreSQL

# Test connection
psql -U postgres -d simutu_ng
```

### ❌ Migration fails

**Solution:**
```bash
# Reset and try again
npm run db:push
```

### ❌ Cannot upload images

**Solution:**
1. Verify MinIO is running:
   ```bash
   curl http://192.168.1.99:9000/minio/health/live
   ```
2. Check bucket exists in MinIO Console
3. Verify credentials in `.env`

### ❌ API returns 500 error

**Solution:**
1. Check browser console for errors
2. Check terminal for server logs
3. Verify all environment variables are set
4. Check database connection

## Useful Commands

```bash
# View database with Drizzle Studio
npm run db:studio

# Generate migration after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Restart dev server
npm run dev
```

## Default Configuration

The system comes pre-configured with:

- **MinIO Endpoint**: `http://192.168.1.99:9000`
- **S3 Bucket**: `procurement-apps`
- **Logo Storage Path**: `sites/logos/`
- **Supported Image Formats**: JPG, PNG, GIF, WebP
- **Recommended Max File Size**: 2MB

## Next Steps

After successful setup:

1. ✅ Test creating a site
2. ✅ Test uploading a logo
3. ✅ Test editing a site
4. ✅ Test deleting a site
5. ✅ Verify logo appears in MinIO
6. ✅ Verify old logo is deleted on update

## Need Help?

Check these files for detailed documentation:
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `SITE_CRUD_README.md` - Technical documentation
- `server/database/schema.ts` - Database schema
- `server/api/sites/` - API implementation

---

**Ready to go!** 🎉

The site management CRUD is fully functional and ready for production use.
