# Fix "Failed to Fetch" Error

## What "Failed to Fetch" Means
This is a network error that occurs when the browser cannot reach the InsForge API endpoint.

## Common Causes & Solutions

### 1. Dev Server Not Restarted ⚠️ MOST COMMON
**Problem:** Environment variables are only loaded when the dev server starts.

**Solution:**
1. **Stop your dev server**: Press `Ctrl+C` in the terminal
2. **Start it again**: Run `npm run dev` or `vite`
3. **Try again**: The new .env values will be loaded

### 2. Wrong Base URL
**Problem:** The base URL in `.env` doesn't match your InsForge project.

**Check:**
- Open your InsForge dashboard
- Go to Project Settings
- Copy the exact API URL
- Make sure it matches your `.env` file

### 3. InsForge Project Paused
**Problem:** If your InsForge project is paused, all API calls will fail.

**Solution:**
- Check your InsForge dashboard
- Make sure the project is active (not paused)
- If paused, upgrade or unpause the project

### 4. CORS Issues
**Problem:** Browser blocking cross-origin requests.

**Solution:**
- InsForge should handle CORS automatically
- Check browser console for CORS errors
- Try a different browser or clear cache

### 5. Network/Firewall Issues
**Problem:** Your network or firewall is blocking the connection.

**Solution:**
- Check your internet connection
- Try a different network
- Disable VPN if using one
- Check firewall settings

## Quick Diagnostic Steps

### Step 1: Verify Environment Variables
Open browser console (F12) and run:
```javascript
console.log('Base URL:', import.meta.env.VITE_INSFORGE_BASE_URL);
console.log('Anon Key:', import.meta.env.VITE_INSFORGE_ANON_KEY ? 'Present' : 'Missing');
```

**Expected:**
- Base URL should show your InsForge URL
- Anon Key should show "Present"

**If either is undefined:**
- Restart your dev server
- Check .env file is in project root
- Check .env file has no syntax errors

### Step 2: Test API Connection
Open browser console and run:
```javascript
fetch('https://as2p524g.us-east.insforge.app/api/database/rest/v1/users?select=count', {
  headers: {
    'apikey': 'YOUR_ANON_KEY_HERE',
    'Authorization': 'Bearer YOUR_ANON_KEY_HERE'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Replace `YOUR_ANON_KEY_HERE` with your actual anon key from `.env`.

**If this works:** The API is reachable, issue is in the app code.
**If this fails:** The API endpoint is not accessible (paused, wrong URL, network issue).

### Step 3: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to sign in
4. Look for failed requests
5. Click on the failed request to see details:
   - Status code
   - Error message
   - Request URL
   - Response headers

## Current Status
✅ InsForge backend is accessible (MCP tool can connect)
✅ All database tables exist
✅ All storage buckets created
✅ .env file has been updated

**Most likely issue:** Dev server needs to be restarted to load new .env values.

## Action Items
1. ✅ **RESTART YOUR DEV SERVER** (Stop with Ctrl+C, then start again)
2. ✅ Check browser console for detailed error messages
3. ✅ Verify the base URL in .env matches your InsForge project
4. ✅ Try the API test in browser console

