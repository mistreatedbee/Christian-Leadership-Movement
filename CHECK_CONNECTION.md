# How to Check if Connected to New InsForge Account

## Current Status
Your `.env` file still has the OLD InsForge credentials (the paused project).

## Steps to Connect to New Account

### 1. Get Your New InsForge Credentials
From your NEW InsForge project dashboard:
- **Base URL**: Found in your project settings (e.g., `https://xxxxx.insforge.app`)
- **Anon Key**: Found in API Keys section

### 2. Update Your .env File
Replace the values in your `.env` file:

```env
VITE_INSFORGE_BASE_URL=https://your-new-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-new-anon-key-here
```

### 3. Verify Connection
After updating, restart your dev server and check:

1. **Browser Console** - Should show no connection errors
2. **Try Registration** - Should work if database is set up
3. **Try Login** - Should work if you've created a user
4. **Check Network Tab** - API calls should go to your new URL

### 4. Test Database Connection
Open browser console and run:
```javascript
// This will test if you can connect
fetch('YOUR_NEW_BASE_URL/api/database/rest/v1/users?select=count', {
  headers: {
    'apikey': 'YOUR_NEW_ANON_KEY',
    'Authorization': 'Bearer YOUR_NEW_ANON_KEY'
  }
}).then(r => r.json()).then(console.log)
```

## Quick Checklist

- [ ] Created new InsForge account
- [ ] Created new project in InsForge
- [ ] Ran `COMPLETE_DATABASE_SETUP.sql` in new project
- [ ] Created storage buckets (applications, courses, gallery, avatars)
- [ ] Updated `.env` file with new credentials
- [ ] Restarted dev server
- [ ] Tested registration/login

## If Still Not Working

1. **Check .env file is loaded**: Restart your dev server after changing .env
2. **Verify credentials**: Double-check the base URL and anon key
3. **Check InsForge project status**: Make sure new project is active (not paused)
4. **Check browser console**: Look for any error messages

