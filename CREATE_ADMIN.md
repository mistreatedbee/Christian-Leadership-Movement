# How to Create an Admin User

## Step-by-Step Instructions

### Option 1: Create Admin from Existing User (Easiest)

1. **Register a regular account**:
   - Go to `http://localhost:5173/register`
   - Fill out the registration form
   - Note the email you used

2. **Make that user an admin**:
   - Use InsForge MCP tool or SQL editor
   - Run this SQL (replace with your email):

```sql
-- Find the user ID by email (check auth.users table)
-- Then update their profile role
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'your-email@example.com'
);
```

### Option 2: Direct SQL (If you know the user ID)

```sql
-- Update a specific user to admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = 'USER_ID_HERE';
```

### Option 3: Check Current Users

To see all users and find one to make admin:

```sql
-- View all user profiles with roles
SELECT 
  up.user_id,
  up.role,
  u.nickname,
  u.email
FROM user_profiles up
JOIN users u ON up.user_id = u.id
ORDER BY up.created_at DESC;
```

## Admin Login

Once you've set a user's role to 'admin':

1. **Login** at `http://localhost:5173/login` with that user's email and password
2. **Access Admin Dashboard** at `http://localhost:5173/admin`

## Default Admin Credentials

**There are no default admin credentials.** You must:
1. Register a new account OR use an existing account
2. Update that account's role to 'admin' using SQL
3. Then login with that account

## Quick Test Admin Setup

If you want to quickly test, you can:

1. Register at `/register` with email: `admin@clm.org` and password: `Admin123!`
2. Then run this SQL to make them admin:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM users WHERE email = 'admin@clm.org'
);
```

3. Login with `admin@clm.org` / `Admin123!`
4. Navigate to `/admin`

## Security Note

- Only users with `role = 'admin'` or `role = 'super_admin'` can access `/admin`
- Regular users will see "Access Denied" if they try to access admin routes
- Admin routes are protected by the `AdminRoute` component

