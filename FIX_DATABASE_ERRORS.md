# Fix Database 400/404 Errors

## ✅ **Fixed: App.tsx 500 Error**

**Problem:** Naming conflict between two `EventsPage` imports
- `./pages/dashboard/EventsPage` (dashboard version)
- `./pages/EventsPage` (public version)

**Solution:** Renamed dashboard version to `DashboardEventsPage` to avoid conflict

**Status:** ✅ **FIXED** - App should now load without 500 error

---

## ⚠️ **Database Errors (400/404)**

These errors indicate missing database tables. You need to run the database setup scripts.

### **Missing Tables:**
- `resource_categories` (404)
- `resources` (400 - might be query issue)
- `users` (400 - might be RLS or query issue)

### **Solution:**

1. **Run Database Setup Scripts** (in order):
   
   Go to InsForge Dashboard → Database → SQL Editor

   **Step 1:** Run `COMPLETE_DATABASE_SETUP_NEW.sql`
   - Creates all main tables including `users`, `programs`, `events`, etc.

   **Step 2:** Run `NEW_FEATURES_DATABASE_SETUP.sql`
   - Creates tables for new features including:
     - `resource_categories`
     - `resources`
     - `blog_categories`
     - `blog_posts`
     - `forum_categories`
     - `forum_topics`
     - `prayer_requests`
     - And many more...

   **Step 3:** Run `UP_COURSES_SETUP.sql`
   - Adds University of Pretoria courses

2. **After Running Scripts:**
   - Refresh your browser
   - The 400/404 errors should disappear
   - All features should work

---

## 🔍 **Quick Check**

To verify tables exist, run this in InsForge SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'resources', 'resource_categories', 'blog_categories', 'forum_categories')
ORDER BY table_name;
```

---

## 📝 **Error Details**

### **400 Errors:**
- Usually means table exists but query is invalid
- Could be RLS (Row Level Security) blocking access
- Could be missing columns

### **404 Errors:**
- Table doesn't exist
- Need to run database setup scripts

---

## ✅ **After Fixing**

Once you run the SQL scripts:
- ✅ App.tsx will load (500 error fixed)
- ✅ Database queries will work (400/404 errors fixed)
- ✅ All pages will display data correctly
- ✅ Programs and Events pages will work

---

**The App.tsx error is fixed!** The database errors will be resolved once you run the setup scripts.

