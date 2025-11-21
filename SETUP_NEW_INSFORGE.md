# Setting Up New InsForge Account - Complete Guide

## Step-by-Step Instructions

### 1. Create New InsForge Account
1. Go to [InsForge.dev](https://insforge.dev)
2. Sign up for a new account (use a different email if needed)
3. Create a new project
4. Note your project URL and API keys

### 2. Run Database Setup Script
1. In your new InsForge project dashboard, go to **Database** → **SQL Editor**
2. Copy the entire contents of `COMPLETE_DATABASE_SETUP.sql`
3. Paste it into the SQL editor
4. Click **Run** or **Execute**
5. Wait for all tables to be created (should take a few seconds)

### 3. Create Storage Buckets
In your InsForge dashboard, go to **Storage** and create these buckets:

- **`applications`** - Private bucket (for application documents)
- **`courses`** - Private bucket (for course materials)
- **`gallery`** - Public bucket (for gallery images)
- **`avatars`** - Public bucket (for user profile images)

### 4. Update Environment Variables
Update your `.env` file with the new credentials:

```env
VITE_INSFORGE_BASE_URL=https://your-new-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-new-anon-key-here
```

### 5. Test the Setup
1. Restart your development server
2. Try registering a new user
3. Try logging in
4. Check if data is being saved to the database

### 6. Create Admin User
After registering your first user, run this SQL in the InsForge SQL editor:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'your-email@example.com'
);
```

### 7. Verify Everything Works
- ✅ User registration works
- ✅ User login works
- ✅ Admin dashboard accessible
- ✅ Database queries work
- ✅ File uploads work
- ✅ All features function properly

## What's Included in the Setup

The SQL script creates:

### Tables (20+ tables):
- Users & User Profiles
- Programs & Applications
- Payments & Fee Settings
- Courses & Lessons
- Events & Registrations
- Donations
- Notifications
- Gallery
- Content Sections
- Strategic Objectives (with Past Work, Upcoming Work, Gallery)

### Security:
- Row Level Security (RLS) enabled on all tables
- Policies for public read access where needed
- User-specific access policies
- Admin access policies

### Functions:
- `get_current_user_id()` - Helper function for RLS policies

### Indexes:
- Optimized indexes on foreign keys and frequently queried columns

### Initial Data:
- 3 default programs (Bible School, Short Courses, Membership)
- 3 default fee settings

## Troubleshooting

### If you get errors:
1. **Check InsForge project is active** - Make sure it's not paused
2. **Verify API keys** - Ensure `.env` file has correct credentials
3. **Check browser console** - Look for any error messages
4. **Verify storage buckets** - Make sure all 4 buckets are created
5. **Check RLS policies** - Ensure policies are created correctly

### Common Issues:

**"Permission denied" errors:**
- RLS policies might not be set up correctly
- Re-run the RLS policy sections of the SQL script

**"Table does not exist" errors:**
- Tables might not have been created
- Re-run the CREATE TABLE sections

**Authentication errors:**
- Check that `anonKey` is set in `.env`
- Verify the key is correct in InsForge dashboard

## Next Steps After Setup

1. **Seed Strategic Objectives** (optional):
   - Go to `/admin/objectives`
   - Add the 7 strategic objectives manually, OR
   - Use the admin panel to import them

2. **Add Content Sections**:
   - Go to `/admin/content`
   - Add Vision, Mission, Strategic Objectives content

3. **Upload Gallery Images**:
   - Go to `/admin/content`
   - Upload images to the gallery

4. **Set Up Events**:
   - Go to `/admin/events`
   - Create your first event

## Support

If you encounter any issues:
1. Check the InsForge dashboard for error logs
2. Review the browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure all storage buckets are created and have correct permissions

---

**Your database is now ready!** All the tables, relationships, and security policies are set up exactly as they were in your previous project.

