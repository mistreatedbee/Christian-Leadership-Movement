# Complete Setup Guide for New InsForge Account

## Step-by-Step Instructions

### Step 1: Create InsForge Account

1. Go to https://insforge.dev
2. Sign up for a new account
3. Verify your email address
4. Log into your dashboard

### Step 2: Create New Project

1. Click "Create New Project"
2. Give it a name: **Christian Leadership Movement**
3. Choose a region (closest to South Africa if available)
4. Wait for project to be created

### Step 3: Get Your Credentials

1. Go to **Project Settings** → **API**
2. Copy your **Base URL** (e.g., `https://xxxxx.insforge.app`)
3. Go to **API Keys** section
4. Copy your **Anonymous Key** (starts with `eyJhbGci...`)

### Step 4: Run Database Setup Script

1. Go to **Database** → **SQL Editor** in your InsForge dashboard
2. Open the file `COMPLETE_DATABASE_SETUP_NEW.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **Run** or **Execute**
6. Wait for completion (should see "Success" message)

### Step 5: Create Storage Buckets

You need to create these storage buckets:

1. **applications** - For ID copies, certificates, documents
2. **courses** - For course images and materials
3. **gallery** - For gallery images
4. **avatars** - For user profile pictures
5. **certificates** - For generated certificate PDFs

**How to create buckets:**
- Go to **Storage** in your InsForge dashboard
- Click **Create Bucket**
- Enter bucket name (e.g., "applications")
- Choose **Public** or **Private**:
  - **Public**: applications, courses, gallery, avatars
  - **Private**: certificates (optional, can be public too)
- Click **Create**
- Repeat for all buckets

### Step 6: Update Environment Variables

1. Open your project's `.env` file
2. Add/update these variables:

```env
VITE_INSFORGE_BASE_URL=https://your-project-id.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key-here

# Payment Gateway Credentials (add after signing up)
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_PASSPHRASE=your_passphrase
VITE_PAYFAST_MODE=sandbox

VITE_OZOW_SITE_CODE=your_site_code
VITE_OZOW_API_KEY=your_api_key
VITE_OZOW_PRIVATE_KEY=your_private_key
VITE_OZOW_MODE=sandbox
```

3. **Restart your dev server** after updating `.env`

### Step 7: Test the Setup

1. **Test Registration:**
   - Go to `/register`
   - Create a test account
   - Verify it works

2. **Test Login:**
   - Log in with your test account
   - Should redirect to dashboard

3. **Test Database Access:**
   - Try creating a donation
   - Try submitting an application
   - Check that data appears in InsForge dashboard

### Step 8: Create Admin User

To make a user an admin:

1. Go to InsForge dashboard → **Database** → **Tables** → **user_profiles**
2. Find the user you want to make admin
3. Edit the `role` field
4. Change from `user` to `admin`
5. Save

Or run this SQL (replace `user-email@example.com`):

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'user-email@example.com'
);
```

### Step 9: Set Up Payment Gateways (Optional but Recommended)

See `PAYMENT_GATEWAY_SETUP.md` for detailed instructions on:
- Signing up with PayFast
- Signing up with Ozow
- Getting credentials
- Adding to `.env` file

### Step 10: Verify Everything Works

Checklist:
- [ ] Database tables created
- [ ] Storage buckets created
- [ ] Environment variables updated
- [ ] Dev server restarted
- [ ] User registration works
- [ ] User login works
- [ ] Admin login works
- [ ] Donations page works
- [ ] Application forms work
- [ ] Payment page loads (even without gateway credentials)

## Troubleshooting

### Issue: "Table does not exist"
- **Solution**: Make sure you ran the complete SQL script
- Check that all tables were created in Database → Tables

### Issue: "RLS policy violation"
- **Solution**: Make sure all RLS policies were created
- Re-run the RLS policy sections from the SQL script

### Issue: "Storage bucket not found"
- **Solution**: Create the missing storage bucket
- Go to Storage → Create Bucket

### Issue: "Authentication failed"
- **Solution**: Check your Base URL and Anon Key in `.env`
- Make sure dev server was restarted after updating `.env`

### Issue: "Cannot connect to database"
- **Solution**: Verify your InsForge project is active (not paused)
- Check your Base URL is correct
- Verify your Anon Key is correct

## What's Included in the Database Setup

✅ **All Tables:**
- users, user_profiles
- programs, applications, application_drafts
- payments, fee_settings
- courses, course_lessons, course_enrollments, user_course_progress
- events, event_registrations
- donations (with anonymous and message columns)
- notifications
- gallery
- content_sections
- strategic_objectives, past_work, upcoming_work, objective_gallery
- certificates

✅ **All Indexes:**
- Performance indexes on all foreign keys and frequently queried columns

✅ **All RLS Policies:**
- User access policies
- Admin access policies
- Public read policies
- INSERT/UPDATE/SELECT policies for all tables

✅ **Helper Functions:**
- get_current_user_id() for RLS policies

✅ **Initial Data:**
- Default programs (Bible School, Short Courses, Membership)
- Default fee settings

## Next Steps After Setup

1. **Add Content:**
   - Add strategic objectives
   - Upload gallery images
   - Create courses
   - Add events

2. **Configure Settings:**
   - Update admin settings
   - Configure fee amounts
   - Set up email notifications

3. **Test Features:**
   - Test donation flow
   - Test application submission
   - Test payment processing
   - Test admin features

4. **Go Live:**
   - Set up payment gateways
   - Switch to production mode
   - Deploy your application

## Support

If you encounter any issues:
1. Check the InsForge dashboard for error logs
2. Check browser console for frontend errors
3. Verify all SQL scripts ran successfully
4. Ensure all storage buckets are created
5. Verify environment variables are correct

Your database is now ready! 🎉

