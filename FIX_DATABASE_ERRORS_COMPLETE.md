# Fix Database Errors - Complete Guide

## ✅ **FIXED: ProgramsPage.tsx 500 Error**

**Problem:** Duplicate variable declaration
- Line 41: `const showUpCoursesOnly = ...`
- Line 42: `const [showUpCoursesOnly, setShowUpCoursesOnly] = ...`

**Solution:** Removed the duplicate `useState` declaration
- Now using: `const showUpCoursesOnly = searchParams.get('up_courses') === 'true';`

**Status:** ✅ **FIXED** - Page should now load without 500 error

---

## ⚠️ **Database Errors (400/404)**

These errors indicate missing database tables. You need to run the database setup scripts.

### **Missing Tables:**

#### **400 Errors (Table exists but query issue or RLS):**
- `users` - Query issue or RLS blocking access
- `volunteer_shifts` - Table might exist but query failing
- `volunteers` - Table might exist but query failing
- `attendance` - Table might exist but query failing
- `mentorship_matches` - Table might exist but query failing
- `mentors` - Table might exist but query failing

#### **404 Errors (Table doesn't exist):**
- `user_security_settings` - **MISSING**
- `mentorship_programs` - **MISSING**
- `mentors` - **MISSING** (or RLS issue)

---

## 🔧 **Solution: Run Database Setup Scripts**

### **Step 1: Run Main Database Setup**

Go to **InsForge Dashboard → Database → SQL Editor**

Run: `COMPLETE_DATABASE_SETUP_NEW.sql`
- Creates all main tables including `users`, `programs`, `events`, `courses`, etc.

### **Step 2: Run New Features Setup**

Run: `NEW_FEATURES_DATABASE_SETUP.sql`
- Creates tables for new features including:
  - `volunteers`
  - `volunteer_shifts`
  - `volunteer_roles`
  - `attendance`
  - `mentorship_programs`
  - `mentors`
  - `mentees`
  - `mentorship_matches`
  - `user_security_settings`
  - And many more...

### **Step 3: Run UP Courses Setup**

Run: `UP_COURSES_SETUP.sql`
- Adds University of Pretoria courses

---

## 📋 **Quick Check Script**

Run this in InsForge SQL Editor to check which tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users',
  'volunteers',
  'volunteer_shifts',
  'volunteer_roles',
  'attendance',
  'mentorship_programs',
  'mentors',
  'mentees',
  'mentorship_matches',
  'user_security_settings'
)
ORDER BY table_name;
```

---

## 🔍 **Error Details**

### **400 Errors:**
- Usually means:
  - Table exists but query is invalid
  - RLS (Row Level Security) is blocking access
  - Missing columns in the table
  - Foreign key constraint issues

### **404 Errors:**
- Table doesn't exist
- Need to run database setup scripts

---

## ✅ **After Running Scripts**

Once you run the SQL scripts:
- ✅ ProgramsPage will load (500 error fixed)
- ✅ Database queries will work (400/404 errors fixed)
- ✅ All pages will display data correctly
- ✅ Volunteer, Attendance, Mentorship features will work
- ✅ Security settings will work

---

## 🚨 **Important Notes**

1. **Run scripts in order:**
   - First: `COMPLETE_DATABASE_SETUP_NEW.sql`
   - Second: `NEW_FEATURES_DATABASE_SETUP.sql`
   - Third: `UP_COURSES_SETUP.sql`

2. **Check for errors:**
   - If a script fails, check the error message
   - Some tables might already exist (that's okay)
   - Use `IF NOT EXISTS` in SQL to avoid conflicts

3. **RLS Policies:**
   - The setup scripts should create RLS policies
   - If queries still fail after creating tables, check RLS policies

---

**The ProgramsPage syntax error is fixed!** The database errors will be resolved once you run the setup scripts.

