# How to Update .env File for New InsForge Account

## Current Problem
Your app is trying to connect to the OLD paused InsForge project, which is why you see "Waiting for Connection".

## Solution: Update .env File

### Step 1: Get Your New InsForge Credentials

1. **Log into your NEW InsForge account**
2. **Go to your project dashboard**
3. **Find these two values:**
   - **Base URL**: Look in Project Settings → API URL
     - Example: `https://abc123.insforge.app`
   - **Anon Key**: Look in API Keys section → Anonymous Key
     - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 2: Update .env File

Open your `.env` file in the project root and replace the values:

**BEFORE (Old/Paused Project):**
```env
VITE_INSFORGE_BASE_URL=https://as2p524g.us-east.insforge.app
VITE_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**AFTER (Your New Project):**
```env
VITE_INSFORGE_BASE_URL=https://your-new-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-new-anon-key-here
```

### Step 3: Restart Dev Server

**IMPORTANT:** After updating .env, you MUST restart your dev server:

1. **Stop the server**: Press `Ctrl+C` in the terminal
2. **Start it again**: Run `npm run dev` or `vite`

### Step 4: Verify Connection

1. Open browser console (F12)
2. Check for errors - should see connection to your new URL
3. Try registering a new user
4. The "Waiting for Connection" message should disappear

## Quick Checklist

- [ ] Created new InsForge account
- [ ] Created new project in InsForge
- [ ] Got new Base URL from project settings
- [ ] Got new Anon Key from API Keys section
- [ ] Updated .env file with new credentials
- [ ] **RESTARTED dev server** (very important!)
- [ ] Checked browser console for errors

## If You Haven't Created New Account Yet

1. Go to https://insforge.dev
2. Sign up for a new account
3. Create a new project
4. Run the `COMPLETE_DATABASE_SETUP.sql` script
5. Create storage buckets
6. Then update .env file

## Troubleshooting

**Still seeing "Waiting for Connection"?**
- Make sure you restarted the dev server after updating .env
- Check that the new InsForge project is active (not paused)
- Verify the Base URL and Anon Key are correct
- Check browser console for specific error messages

**Getting connection errors?**
- Double-check the Base URL format (should start with https://)
- Verify the Anon Key is complete (it's a long JWT token)
- Make sure there are no extra spaces in .env file
- Ensure the new InsForge project is not paused

