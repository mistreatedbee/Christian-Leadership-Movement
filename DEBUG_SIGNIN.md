# Debugging Sign In Error

## Current Status
Your `.env` file has been updated with the new anon key. If you're still getting sign-in errors, follow these steps:

## Step 1: Check Browser Console
1. Open browser console (F12)
2. Try to sign in
3. Look for error messages - they will show the exact issue

## Step 2: Verify You Have an Account
**Important:** You need to REGISTER first before you can sign in!

1. Go to `/register` page
2. Create a new account with your email and password
3. Then try signing in

## Step 3: Check Environment Variables
Make sure your dev server has been restarted after updating `.env`:

1. Stop server: `Ctrl+C`
2. Start server: `npm run dev` or `vite`
3. Try signing in again

## Step 4: Common Issues

### Issue: "Invalid credentials"
- **Solution:** Make sure you've registered first
- Try registering a new account
- Check that email/password are correct

### Issue: "Network error" or "Connection failed"
- **Solution:** Check that InsForge project is active (not paused)
- Verify Base URL in `.env` is correct
- Check browser console for network errors

### Issue: "Unexpected error"
- **Solution:** Check browser console for detailed error
- Verify anon key is correct in `.env`
- Make sure dev server was restarted

## Step 5: Test Registration First
Before trying to sign in, test registration:

1. Go to `/register`
2. Fill out the form
3. Submit
4. Check browser console for any errors
5. If registration works, then try signing in

## Step 6: Check InsForge Dashboard
1. Log into your InsForge dashboard
2. Go to Database → Tables
3. Check if `users` table has any records
4. Check if `user_profiles` table has records

## Quick Test
Open browser console and run:
```javascript
// Check if environment variables are loaded
console.log('Base URL:', import.meta.env.VITE_INSFORGE_BASE_URL);
console.log('Anon Key:', import.meta.env.VITE_INSFORGE_ANON_KEY ? 'Present' : 'Missing');
```

If either shows as undefined, restart your dev server.

