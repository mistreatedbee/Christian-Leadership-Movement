# Admin Login Setup Guide

## How Admin Access Works

Admin access is determined by the `role` field in the `user_profiles` table. Users with `role = 'admin'` or `role = 'super_admin'` can access the admin dashboard.

## Creating an Admin User

### Method 1: Using SQL (Recommended)

1. **First, register a regular user account** through the registration page (`/register`)
2. **Then, update their role to admin** using this SQL:

```sql
-- Replace 'user@example.com' with the email of the user you want to make admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM users WHERE email = 'user@example.com'
);
```

### Method 2: Direct SQL Insert (If user doesn't exist)

```sql
-- First create the user account (you'll need to use InsForge auth or the registration form)
-- Then update the profile:
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = 'USER_ID_HERE';
```

### Method 3: Check Existing Users

To see all users and their roles:

```sql
SELECT 
  u.id,
  u.email,
  u.nickname,
  up.role
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
ORDER BY u.created_at DESC;
```

## Admin Login Process

1. **Register/Login**: Use the regular login page (`/login`) with your email and password
2. **Role Check**: The system checks if your `user_profiles.role` is 'admin' or 'super_admin'
3. **Access**: If you have admin role, you can access `/admin` routes
4. **Dashboard**: Navigate to `/admin` to access the admin dashboard

## Available Admin Roles

- `'user'` - Regular user (default)
- `'admin'` - Admin access
- `'super_admin'` - Super admin access (same as admin for now)

## Admin Features

Once logged in as admin, you can access:
- `/admin` - Dashboard overview
- `/admin/users` - User management
- `/admin/applications` - Application management
- `/admin/courses` - Course management
- `/admin/events` - Event management
- `/admin/fees` - Fee management
- `/admin/content` - Content management
- `/admin/analytics` - Analytics
- `/admin/communication` - Communication tools
- `/admin/settings` - Settings

## Security Notes

- Admin routes are protected by `AdminRoute` component
- Only users with `role = 'admin'` or `role = 'super_admin'` can access
- Regular users will see "Access Denied" if they try to access `/admin`
- Admin access is checked on every route navigation

## Quick Setup Steps

1. Start the application: `npm run dev`
2. Register a new account at `/register`
3. Note the email you used
4. Run this SQL in InsForge (replace email):

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE'
);
```

5. Log in with that account
6. Navigate to `/admin` - you should now have access!

