# Verify Backend and Database Connection

## Quick Verification Steps

### Step 1: Check Environment Variables

Open your browser console (F12) and run:

```javascript
console.log('Base URL:', import.meta.env.VITE_INSFORGE_BASE_URL);
console.log('Anon Key:', import.meta.env.VITE_INSFORGE_ANON_KEY ? 'Present' : 'Missing');
```

**Expected:**
- Base URL should show your InsForge project URL
- Anon Key should show "Present"

**If either is undefined:**
1. Check your `.env` file exists in project root
2. Make sure variables start with `VITE_`
3. **Restart your dev server** (Ctrl+C, then `npm run dev`)

### Step 2: Check Connection Logs

When the app loads, you should see in the console:

```
🔌 InsForge Connection Info: {
  baseUrl: "https://your-project.insforge.app",
  hasAnonKey: true,
  anonKeyLength: 200+,
  envBaseUrl: "Set" or "Not set (using fallback)",
  envAnonKey: "Set" or "Not set"
}
```

### Step 3: Test Database Connection

Open browser console and run:

```javascript
// Import the connection utility
import { verifyConnection } from './src/lib/connection';

// Test connection
verifyConnection().then(connected => {
  console.log('Connection status:', connected ? '✅ Connected' : '❌ Failed');
});
```

Or test directly:

```javascript
const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

fetch(`${baseUrl}/api/database/rest/v1/users?select=count`, {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
})
.then(r => r.json())
.then(data => console.log('✅ Database connected:', data))
.catch(err => console.error('❌ Connection failed:', err));
```

### Step 4: Test Authentication

1. Go to `/register`
2. Try to create an account
3. Check browser console for errors
4. Check Network tab to see API calls

**Expected:**
- API calls should go to your InsForge base URL
- No CORS errors
- Registration should succeed

### Step 5: Test Database Operations

1. Log in to your account
2. Go to Dashboard
3. Try to view your profile
4. Try to create a donation
5. Check that data appears in InsForge dashboard

## What's Connected

### ✅ Database Operations
All database operations use `insforge.database` from `src/lib/insforge.ts`:
- ✅ User registration/login
- ✅ Profile management
- ✅ Applications
- ✅ Payments
- ✅ Donations
- ✅ Events
- ✅ Courses
- ✅ Notifications
- ✅ All admin operations

### ✅ File Storage
All file uploads use `insforge.storage`:
- ✅ Profile avatars
- ✅ Application documents
- ✅ Course materials
- ✅ Gallery images
- ✅ Certificates

### ✅ Authentication
All auth operations use `@insforge/react`:
- ✅ Sign up
- ✅ Sign in
- ✅ Sign out
- ✅ Password reset
- ✅ Session persistence

### ✅ Configuration
All configuration uses environment variables:
- ✅ Base URL from `VITE_INSFORGE_BASE_URL`
- ✅ Anon Key from `VITE_INSFORGE_ANON_KEY`
- ✅ Consistent across all files via `src/lib/connection.ts`

## Common Issues

### Issue: "Base URL is undefined"
**Solution:**
1. Check `.env` file exists in project root
2. Make sure variable is `VITE_INSFORGE_BASE_URL` (not `INSFORGE_BASE_URL`)
3. Restart dev server

### Issue: "Anon Key is missing"
**Solution:**
1. Check `.env` file has `VITE_INSFORGE_ANON_KEY`
2. Get anon key from InsForge dashboard → API Keys
3. Restart dev server

### Issue: "Failed to fetch"
**Solution:**
1. Check InsForge project is active (not paused)
2. Verify base URL is correct
3. Check network connection
4. Restart dev server

### Issue: "RLS policy violation"
**Solution:**
1. Run `COMPLETE_DATABASE_SETUP_NEW.sql` in InsForge SQL Editor
2. Make sure all RLS policies are created
3. Check that user is authenticated

## Connection Status Checklist

- [ ] `.env` file exists with `VITE_INSFORGE_BASE_URL`
- [ ] `.env` file has `VITE_INSFORGE_ANON_KEY`
- [ ] Dev server restarted after `.env` changes
- [ ] Browser console shows connection info
- [ ] Database connection test passes
- [ ] Authentication works (register/login)
- [ ] Database operations work (create/view data)
- [ ] File uploads work
- [ ] All API calls go to your InsForge URL (check Network tab)

## Files That Handle Connection

1. **`src/lib/insforge.ts`** - Main SDK client
2. **`src/lib/connection.ts`** - Connection utilities (NEW)
3. **`src/App.tsx`** - InsforgeProvider setup
4. **All pages** - Use `insforge` client from `src/lib/insforge.ts`

## Next Steps

Once connection is verified:
1. ✅ Test user registration
2. ✅ Test login
3. ✅ Test creating a donation
4. ✅ Test submitting an application
5. ✅ Test admin features
6. ✅ Verify data appears in InsForge dashboard

Your backend is now properly connected! 🎉

