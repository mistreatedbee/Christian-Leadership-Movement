# Fixed: Storage Foreign Key Constraint Error in Objectives Management

## Problem
The error `insert or update on table "_storage" violates foreign key constraint "_storage_uploaded_by_fkey"` occurred when uploading images in the Objectives Management page because the uploads were not using the helper function that ensures users exist before upload.

## Solution
Updated `src/pages/admin/ObjectivesManagementPage.tsx` to use the `uploadFileWithUserCheck` helper function for all file uploads.

## Changes Made

### 1. Added Import
```typescript
import { uploadFileWithUserCheck } from '../../lib/uploadHelpers';
```

### 2. Updated All Upload Locations

#### Strategic Objectives Image Upload
**Before:**
```typescript
const { data: uploadData, error: uploadError } = await insforge.storage
  .from('gallery')
  .upload(filePath, imageFile);
if (uploadError) throw uploadError;
```

**After:**
```typescript
const uploadData = await uploadFileWithUserCheck(
  'gallery',
  filePath,
  imageFile,
  user.id,
  user.email || null,
  user.name || null
);
```

#### Past Work Image Upload
- Updated to use `uploadFileWithUserCheck`

#### Upcoming Work Image Upload
- Updated to use `uploadFileWithUserCheck`

#### Objective Gallery Image Upload
- Updated to use `uploadFileWithUserCheck`
- Added user authentication check

## How It Works

The `uploadFileWithUserCheck` function:
1. **Ensures User Exists**: Checks if user exists in `public.users` table
2. **Creates User Record**: If missing, creates the record with ID, email, and nickname
3. **Waits for Commit**: Waits 200ms for database commit
4. **Retries on Error**: If foreign key error occurs, retries with progressive delays
5. **Returns Upload Data**: Returns URL and key for the uploaded file

## Testing

To verify the fix:
1. Go to Admin Dashboard → Objectives Management
2. Try uploading an image for a strategic objective
3. Try uploading images for past work
4. Try uploading images for upcoming work
5. Try uploading images to objective gallery
6. All uploads should work without foreign key errors

## Related Files

- `src/lib/uploadHelpers.ts` - Contains the helper functions
- `src/pages/admin/ObjectivesManagementPage.tsx` - Updated to use helpers
- `FIX_STORAGE_FOREIGN_KEY_TRIGGER.sql` - Database trigger (optional backup)

## Notes

- The helper function handles all edge cases including race conditions
- It automatically retries on foreign key errors
- It ensures database consistency before uploads
- All uploads now follow the same pattern for consistency

