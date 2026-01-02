# Indicator Entry Management - Implementation Guide

## Overview
This implementation adds a complete indicator entry management system with the following features:
- Create, edit, and delete indicator entries
- Automatically generate entry codes in format: `NM/YYYYMMDD/00001`
- Dynamic indicator loading based on unit assignment
- Support for daily and monthly entry frequencies
- Full transactional flow for managing indicator values

## Database Schema

Two new tables have been added:

### `indicator_entries`
- `id` (UUID) - Primary key
- `entry_code` (TEXT) - Unique human-readable code (format: NM/YYYYMMDD/00001)
- `unit_id` (UUID) - References units.id
- `entry_date` (TIMESTAMP) - Date of entry
- `entry_frequency` (TEXT) - 'daily' or 'monthly'
- `notes` (TEXT) - Optional notes
- `status` (TEXT) - 'proposed', 'checked', 'pending', or 'finish'
- `created_by` (UUID) - References users.id
- `updated_by` (UUID) - References users.id
- `auditor_notes` (TEXT) - Notes from auditor
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMP)

### `indicator_entry_items`
- `id` (UUID) - Primary key
- `indicator_entry_id` (UUID) - References indicator_entries.id
- `indicator_id` (UUID) - References indicators.id
- `numerator_value` (NUMERIC) - Numerator value
- `denominator_value` (NUMERIC) - Denominator value
- `skor` (NUMERIC) - Score value
- `numerator_denominator_result` (NUMERIC) - Calculated result
- `is_already_checked` (BOOLEAN) - Whether item is checked
- `is_need_pdca` (BOOLEAN) - Whether PDCA is needed
- `notes` (TEXT) - Item-specific notes
- `created_at`, `updated_at` (TIMESTAMP)

## Setup Instructions

### 1. Configure Database Connection

Make sure your `.env` file has the correct database connection string:
```
DATABASE_URL=postgresql://username:password@localhost:5432/your_database
```

### 2. Run Migration Script

Execute the migration script to create the tables:
```bash
npx tsx server/scripts/create-indicator-entries-tables.ts
```

Or use Drizzle migrations:
```bash
npm run db:push
```

## API Endpoints Created

### Indicator Entries

1. **GET /api/indicator-entries**
   - Fetches all indicator entries with their items
   - Returns entries with unit and indicator details

2. **GET /api/indicator-entries/[id]**
   - Fetches a single indicator entry by ID
   - Includes all items and related data

3. **POST /api/indicator-entries**
   - Creates a new indicator entry
   - Auto-generates entry code
   - Payload:
     ```json
     {
       "unitId": "uuid",
       "entryDate": "2026-01-02",
       "entryFrequency": "monthly",
       "notes": "Optional notes",
       "items": [
         {
           "indicatorId": "uuid",
           "numeratorValue": 85,
           "denominatorValue": 100,
           "skor": 85,
           "notes": "Item notes"
         }
       ]
     }
     ```

4. **PUT /api/indicator-entries/[id]**
   - Updates an existing indicator entry
   - Can update entry details and items

5. **DELETE /api/indicator-entries/[id]**
   - Soft deletes an indicator entry (sets deletedAt)

### Unit Indicators

6. **GET /api/indicator-entries/unit/[unitId]**
   - Fetches available indicators for a specific unit
   - Query params: `?entryFrequency=monthly` (optional)
   - Looks up indicators from `indicator_units` pivot table

## Frontend Page

The page is located at: `/dashboard/mutu/nilai-unit`

### Features:
1. **Table View**
   - Displays all indicator entries
   - Shows entry code, date, frequency, status, and item count
   - Search functionality
   - Edit and delete actions

2. **Add Entry Modal**
   - Select entry date
   - Choose frequency (daily/monthly)
   - Automatically loads available indicators for the unit
   - Input fields for numerator, denominator, and skor
   - Notes field for each indicator

3. **Edit Entry Modal**
   - Pre-populates with existing data
   - Allows updating values
   - Frequency cannot be changed after creation

## How It Works

### User Flow:

1. **User clicks "Add Entry"**
   - Modal opens with entry form

2. **User selects entry frequency**
   - System fetches indicators assigned to the user's unit from `indicator_units` table
   - Only shows indicators matching the selected frequency

3. **User inputs values**
   - Enter numerator, denominator, and skor for each indicator
   - Add optional notes

4. **User clicks "Create Entry"**
   - System generates unique entry code (NM/YYYYMMDD/00001)
   - Creates entry record
   - Creates item records for each indicator
   - Calculates numerator_denominator_result

5. **Entry appears in table**
   - User can edit or delete
   - Status starts as "proposed"

### Entry Code Generation:

Format: `NM/YYYYMMDD/00001`
- `NM` = Nilai Mutu (constant prefix)
- `YYYYMMDD` = Entry date (e.g., 20260102)
- `00001` = Incremental number for that date (5 digits, zero-padded)

The system automatically finds the last entry code for the given date and increments it.

## Important Notes

### Unit ID Resolution

The current implementation needs the user's unit ID. This should come from:
- User's employee record (employeeId → employee.unitId)
- Or directly from user.unitId if added to users table

You may need to update the session endpoint to include this information:

```typescript
// In server/api/auth/session.get.ts
// Fetch employee data with unit information
const employee = await db
  .select()
  .from(employees)
  .where(eq(employees.id, user.employeeId))
  .limit(1)

return {
  user: {
    ...user,
    unitId: employee[0]?.unitId
  }
}
```

### Middleware

The page uses the 'auth' middleware, so users must be logged in.

### Indicator Assignment

Make sure indicators are properly assigned to units via the `indicator_units` table for the system to work correctly.

## Testing Steps

1. **Setup Database**
   - Run migration script
   - Ensure users, units, indicators, and indicator_units tables are populated

2. **Login as a Unit User**
   - User must have an employee record with a unitId

3. **Assign Indicators to Unit**
   - Use the indicator management interface to assign indicators to the unit
   - Ensure indicators have the correct entry_frequency set

4. **Create Entry**
   - Go to `/dashboard/mutu/nilai-unit`
   - Click "Add Entry"
   - Select frequency
   - Verify indicators appear
   - Fill in values
   - Save

5. **Verify**
   - Entry appears in table with generated code
   - Click edit to verify data persists
   - Test delete functionality

## Files Modified/Created

### Database:
- `server/database/schema.ts` - Added new table definitions
- `server/scripts/create-indicator-entries-tables.ts` - Migration script

### API:
- `server/api/indicator-entries/index.get.ts`
- `server/api/indicator-entries/index.post.ts`
- `server/api/indicator-entries/[id].get.ts`
- `server/api/indicator-entries/[id].put.ts`
- `server/api/indicator-entries/[id].delete.ts`
- `server/api/indicator-entries/unit/[unitId].get.ts`

### Frontend:
- `app/pages/dashboard/mutu/nilai-unit.vue` - Complete page rewrite

## Next Steps

1. Fix database authentication issues in your environment
2. Run the migration script
3. Ensure users have proper unit assignments
4. Assign indicators to units
5. Test the complete flow

## Troubleshooting

### Database Connection Error
- Check `.env` file for correct DATABASE_URL
- Verify PostgreSQL is running
- Confirm database user has proper permissions

### No Indicators Loading
- Check if indicators are assigned to the unit in `indicator_units` table
- Verify user has a valid unitId
- Check indicator `entryFrequency` matches selection

### Entry Code Not Generating
- Ensure database has proper sequence support
- Check for unique constraint violations
- Verify date format is correct

## Future Enhancements

- Add validation rules for numerator/denominator values
- Implement status workflow (proposed → checked → finish)
- Add approval system with auditor notes
- Export entries to Excel/PDF
- Dashboard charts for indicator trends
- Bulk entry creation for multiple indicators
- PDCA workflow integration
