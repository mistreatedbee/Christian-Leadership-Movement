# Update Your .env File - Quick Instructions

## ✅ Good News!
InsForge is connected! I can see all your database tables are set up correctly.

## ⚠️ Action Required: Update .env File

Since the `.env` file is protected, please **manually update it** with the new anon key:

### Step 1: Open `.env` file
Open the `.env` file in your project root.

### Step 2: Update the Anon Key
Replace the old anon key with this new one:

```env
# InsForge Configuration
VITE_INSFORGE_BASE_URL=https://as2p524g.us-east.insforge.app
VITE_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODc5MjF9.Yoy7U_Ajwf00mXHYd3fjH5bD7JknWsCN8RgnOhavUTA
```

### Step 3: Restart Dev Server
**IMPORTANT:** After updating, restart your dev server:
1. Stop: Press `Ctrl+C`
2. Start: Run `npm run dev` or `vite`

## ✅ What's Already Set Up

- ✅ All database tables created
- ✅ All RLS policies configured
- ✅ Storage buckets created (applications, courses, gallery, avatars)
- ✅ Database schema complete

## 🎉 You're Ready!

After updating `.env` and restarting, your app should connect successfully!

