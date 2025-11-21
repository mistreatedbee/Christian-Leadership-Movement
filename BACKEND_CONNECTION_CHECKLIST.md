# Backend Connection Checklist

## ✅ What's Connected

### 1. Database Operations
- ✅ All database queries use `insforge.database` from `src/lib/insforge.ts`
- ✅ All tables accessible via SDK
- ✅ RLS policies configured correctly
- ✅ Connection uses environment variables

### 2. Authentication
- ✅ Sign up/Sign in use `@insforge/react` hooks
- ✅ Password reset uses InsForge auth API
- ✅ Session persistence enabled
- ✅ Admin role checking works

### 3. File Storage
- ✅ All uploads use `insforge.storage`
- ✅ Storage URLs use connection utility
- ✅ All buckets accessible

### 4. Configuration
- ✅ Base URL from `VITE_INSFORGE_BASE_URL`
- ✅ Anon Key from `VITE_INSFORGE_ANON_KEY`
- ✅ Consistent across all files via `src/lib/connection.ts`
- ✅ No hardcoded URLs (except fallbacks)

## 🔧 Files Updated

1. **`src/lib/connection.ts`** (NEW)
   - Centralized connection utilities
   - `getInsForgeBaseUrl()` - Gets base URL
   - `getInsForgeAnonKey()` - Gets anon key
   - `getStorageUrl()` - Gets storage URLs
   - `verifyConnection()` - Tests connection
   - `logConnectionInfo()` - Logs connection info

2. **`src/lib/insforge.ts`**
   - Now uses connection utilities
   - Consistent configuration

3. **`src/App.tsx`**
   - Uses connection utilities for InsforgeProvider

4. **`src/pages/dashboard/ProfilePage.tsx`**
   - Fixed hardcoded URL
   - Uses `getStorageUrl()` utility

5. **`src/pages/auth/ForgotPasswordPage.tsx`**
   - Uses connection utilities

6. **`src/pages/auth/ResetPasswordPage.tsx`**
   - Uses connection utilities

## 📋 Verification Steps

### Step 1: Check Environment Variables

Create/update `.env` file in project root:

```env
VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key-here
```

### Step 2: Restart Dev Server

**CRITICAL:** After updating `.env`, restart your dev server:

```bash
# Stop server (Ctrl+C)
# Then start again
npm run dev
```

### Step 3: Check Browser Console

When app loads, you should see:

```
🔌 InsForge Connection Info: {
  baseUrl: "https://your-project.insforge.app",
  hasAnonKey: true,
  anonKeyLength: 200+,
  envBaseUrl: "Set",
  envAnonKey: "Set"
}
```

### Step 4: Test Connection

Open browser console (F12) and run:

```javascript
// Test connection
import { verifyConnection } from './src/lib/connection';
verifyConnection().then(connected => {
  console.log(connected ? '✅ Connected' : '❌ Failed');
});
```

### Step 5: Test Features

1. **Registration:**
   - Go to `/register`
   - Create account
   - Should work without errors

2. **Login:**
   - Go to `/login`
   - Sign in
   - Should redirect to dashboard

3. **Database:**
   - Go to dashboard
   - View profile
   - Create donation
   - Check data appears in InsForge dashboard

4. **File Upload:**
   - Upload profile picture
   - Should save to storage bucket

## 🔍 How to Verify Everything is Connected

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to register/login
4. Look for API calls:
   - Should go to your InsForge base URL
   - Should have `apikey` and `Authorization` headers
   - Should return 200 status codes

### Check InsForge Dashboard

1. Log into InsForge dashboard
2. Go to Database → Tables
3. Check that data appears:
   - Users table has new users
   - Applications table has applications
   - Payments table has payments
   - Donations table has donations

### Check Storage

1. Go to Storage in InsForge dashboard
2. Check buckets have files:
   - avatars bucket has profile pictures
   - applications bucket has documents
   - gallery bucket has images

## 🚨 Common Issues

### Issue: "Base URL is undefined"
**Solution:**
1. Check `.env` file exists
2. Variable name is `VITE_INSFORGE_BASE_URL` (not `INSFORGE_BASE_URL`)
3. Restart dev server

### Issue: "Anon Key is missing"
**Solution:**
1. Check `.env` has `VITE_INSFORGE_ANON_KEY`
2. Get key from InsForge dashboard → API Keys
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
3. Check user is authenticated

## ✅ Final Checklist

- [ ] `.env` file exists with correct variables
- [ ] Dev server restarted after `.env` changes
- [ ] Browser console shows connection info
- [ ] Database connection test passes
- [ ] Registration works
- [ ] Login works
- [ ] Profile loads
- [ ] Donations work
- [ ] Applications work
- [ ] File uploads work
- [ ] Admin features work
- [ ] Data appears in InsForge dashboard

## 🎯 All Connected!

Once all checks pass, your entire application is connected to your InsForge backend and database! 🎉

