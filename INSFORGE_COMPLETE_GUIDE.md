# InsForge Complete Guide for Christian Leadership Movement

## What is InsForge?

InsForge is a **Backend-as-a-Service (BaaS)** platform that provides:

- ✅ **PostgreSQL Database** with PostgREST API (automatic REST API)
- ✅ **Authentication** - Email/password + OAuth (Google, GitHub)
- ✅ **File Storage** - Upload/download files to buckets
- ✅ **AI Integration** - Chat completions and image generation (OpenAI-compatible)
- ✅ **Serverless Functions** - Deploy and run edge functions (Deno runtime)

## Key Concepts

### 1. Base URL & Anon Key

Every InsForge project has:
- **Base URL**: Your project's API endpoint (e.g., `https://xxxxx.insforge.app`)
- **Anon Key**: Anonymous access key for public operations (JWT token)

**Where to find:**
- Base URL: Project Settings → API URL
- Anon Key: API Keys section → Anonymous Key

### 2. SDK vs MCP Tools

**Use SDK for Application Logic:**
- Authentication (register, login, logout)
- Database CRUD operations
- File storage operations
- AI operations
- Serverless function calls

**Use MCP Tools for Infrastructure:**
- Database schema management
- Storage bucket creation
- Serverless function deployment
- Backend metadata queries

## Installation & Setup

### Step 1: Install SDK

```bash
npm install @insforge/sdk@latest
npm install @insforge/react@latest  # For React apps
```

### Step 2: Create SDK Client

```javascript
// src/lib/insforge.ts
import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL || 'https://your-project.insforge.app';
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || '';

export const insforge = createClient({
  baseUrl,
  anonKey,
});
```

### Step 3: Setup React Provider

```tsx
// src/App.tsx or src/main.tsx
import { InsforgeProvider } from '@insforge/react';

export function App() {
  return (
    <InsforgeProvider
      baseUrl={import.meta.env.VITE_INSFORGE_BASE_URL || 'https://your-project.insforge.app'}
      anonKey={import.meta.env.VITE_INSFORGE_ANON_KEY || ''}
    >
      {/* Your app */}
    </InsforgeProvider>
  );
}
```

## Database Operations

### Insert Records

```javascript
// Single insert
const { data, error } = await insforge.database
  .from('donations')
  .insert({
    user_id: user.id,
    amount: 100.00,
    campaign_name: 'Leadership Development',
    anonymous: false
  })
  .select()
  .single();

// Bulk insert
const { data, error } = await insforge.database
  .from('users')
  .insert([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
  ])
  .select();
```

### Update Records

```javascript
// Always use filters!
const { data, error } = await insforge.database
  .from('payments')
  .update({ status: 'confirmed' })
  .eq('id', paymentId)
  .select();
```

### Delete Records

```javascript
// Always use filters!
const { error } = await insforge.database
  .from('notifications')
  .delete()
  .eq('id', notificationId);
```

### Query Records

```javascript
// Get all
const { data, error } = await insforge.database
  .from('events')
  .select();

// Get specific columns
const { data, error } = await insforge.database
  .from('users')
  .select('id, email, nickname');

// With relationships
const { data, error } = await insforge.database
  .from('applications')
  .select('*, users(email, nickname), programs(name)');

// With filters
const { data, error } = await insforge.database
  .from('payments')
  .select()
  .eq('user_id', userId)
  .eq('status', 'confirmed')
  .order('created_at', { ascending: false })
  .limit(10);

// Pagination
const page = 1;
const pageSize = 10;
const from = (page - 1) * pageSize;
const to = from + pageSize - 1;

const { data, count } = await insforge.database
  .from('applications')
  .select('*', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false });
```

### Available Filters

| Filter | Description | Example |
|--------|-------------|---------|
| `.eq(column, value)` | Equals | `.eq('status', 'active')` |
| `.neq(column, value)` | Not equals | `.neq('status', 'banned')` |
| `.gt(column, value)` | Greater than | `.gt('amount', 100)` |
| `.gte(column, value)` | Greater than or equal | `.gte('amount', 100)` |
| `.lt(column, value)` | Less than | `.lt('amount', 1000)` |
| `.lte(column, value)` | Less than or equal | `.lte('amount', 1000)` |
| `.like(column, pattern)` | Case-sensitive pattern | `.like('name', '%John%')` |
| `.ilike(column, pattern)` | Case-insensitive pattern | `.ilike('email', '%@gmail.com')` |
| `.in(column, array)` | Value in array | `.in('status', ['pending', 'active'])` |
| `.is(column, value)` | Exactly equals (for null) | `.is('deleted_at', null)` |

### Modifiers

| Modifier | Description | Example |
|----------|-------------|---------|
| `.order(column, options)` | Sort results | `.order('created_at', { ascending: false })` |
| `.limit(count)` | Limit rows | `.limit(10)` |
| `.range(from, to)` | Pagination | `.range(0, 9)` |
| `.single()` | Return object (throws if multiple) | `.single()` |
| `.maybeSingle()` | Return object or null | `.maybeSingle()` |

## Authentication

### React Hooks

```tsx
import { useAuth, useUser } from '@insforge/react';

function MyComponent() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  if (!isLoaded || !userLoaded) return <div>Loading...</div>;
  if (!isSignedIn || !user) return <div>Not signed in</div>;

  return <div>Welcome, {user.email}!</div>;
}
```

### Sign Up

```javascript
import { useAuth } from '@insforge/react';

const { signUp } = useAuth();

const result = await signUp(email, password);
// Returns: { user } or { error }
```

### Sign In

```javascript
const { signIn } = useAuth();

const result = await signIn(email, password);
// Returns: { user } or { error }
```

### Sign Out

```javascript
const { signOut } = useAuth();

await signOut();
```

### User Object

```javascript
const { user } = useUser();
// user.id - UUID
// user.email - Email address
// user.name - Display name
// user.avatarUrl - Avatar image URL
```

## File Storage

### Upload File

```javascript
// Upload with specific path
const { data, error } = await insforge.storage
  .from('applications')
  .upload(`user-${userId}/id-copy.pdf`, fileObject);

// Save BOTH url and key to database
await insforge.database
  .from('applications')
  .update({
    id_passport_url: data.url,
    id_passport_key: data.key  // Important: Save key for download/delete
  })
  .eq('id', applicationId);

// Upload with auto-generated key
const { data, error } = await insforge.storage
  .from('gallery')
  .uploadAuto(imageFile);

await insforge.database
  .from('gallery')
  .insert([{
    image_url: data.url,
    image_key: data.key
  }]);
```

### Download File

```javascript
// 1. Get key from database
const { data: user } = await insforge.database
  .from('users')
  .select('avatar_key')
  .eq('id', userId)
  .single();

// 2. Download using key
const { data: blob, error } = await insforge.storage
  .from('avatars')
  .download(user.avatar_key);

// 3. Use the blob
const url = URL.createObjectURL(blob);
img.src = url;
```

### Delete File

```javascript
// 1. Get key from database
const { data: user } = await insforge.database
  .from('users')
  .select('avatar_key')
  .eq('id', userId)
  .single();

// 2. Delete from storage
const { data, error } = await insforge.storage
  .from('avatars')
  .remove(user.avatar_key);

// 3. Clear database reference
await insforge.database
  .from('users')
  .update({ avatar_url: null, avatar_key: null })
  .eq('id', userId);
```

## Serverless Functions

### Invoke Function

```javascript
// POST with body
const { data, error } = await insforge.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome!',
    message: 'Thank you for joining!'
  }
});

// GET request
const { data, error } = await insforge.functions.invoke('get-stats', {
  method: 'GET'
});

// With custom headers
const { data, error } = await insforge.functions.invoke('api-endpoint', {
  method: 'PUT',
  body: { id: '123', status: 'active' },
  headers: { 'X-Custom-Header': 'value' }
});
```

### Create Function (Using MCP Tool)

```javascript
// functions/send-email.js
module.exports = async function(request) {
  const { to, subject, message } = await request.json();
  
  // Your function logic here
  // Access database, send emails, etc.
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Row Level Security (RLS)

InsForge uses PostgreSQL Row Level Security to control data access:

- **Users can only see their own data** (based on `user_id`)
- **Admins can see all data** (via `project_admin` role)
- **Public tables** can be read by anyone

### Helper Function

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
```

### RLS Policy Example

```sql
-- Users can only see their own payments
CREATE POLICY "Users see own payments" ON public.payments
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Users can create their own payments
CREATE POLICY "Users create own payments" ON public.payments
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- Admins can manage all payments
CREATE POLICY "Admins manage all payments" ON public.payments
  FOR ALL TO project_admin USING (true) WITH CHECK (true);
```

## Error Handling

### Always Check for Errors

```javascript
const { data, error } = await insforge.database
  .from('users')
  .select()
  .eq('id', userId)
  .single();

if (error) {
  console.error('Database error:', error);
  // Handle error (show message, retry, etc.)
  return;
}

// Use data safely
console.log('User:', data);
```

### Common Error Patterns

```javascript
try {
  const { data, error } = await insforge.database
    .from('payments')
    .insert([{ user_id: userId, amount: 100 }])
    .select();

  if (error) throw error;
  
  // Success
  console.log('Payment created:', data);
} catch (err) {
  // Handle error
  if (err.code === '23505') {
    // Unique constraint violation
    console.error('Duplicate entry');
  } else if (err.code === '23503') {
    // Foreign key violation
    console.error('Invalid reference');
  } else {
    console.error('Unknown error:', err);
  }
}
```

## Best Practices

### 1. Always Use Filters for Updates/Deletes

```javascript
// ✅ Good - Uses filter
await insforge.database
  .from('payments')
  .update({ status: 'confirmed' })
  .eq('id', paymentId);

// ❌ Bad - No filter (will update ALL rows!)
await insforge.database
  .from('payments')
  .update({ status: 'confirmed' });
```

### 2. Save Both URL and Key for Storage

```javascript
// ✅ Good - Saves both
await insforge.database
  .from('users')
  .update({
    avatar_url: data.url,    // For display
    avatar_key: data.key     // For download/delete
  });

// ❌ Bad - Only saves URL
await insforge.database
  .from('users')
  .update({ avatar_url: data.url });
```

### 3. Check isLoaded Before Using User

```javascript
// ✅ Good
const { user, isLoaded } = useUser();
if (!isLoaded) return <div>Loading...</div>;
if (!user) return <div>Not signed in</div>;

// ❌ Bad - May access user before loaded
const { user } = useUser();
console.log(user.email); // May be undefined!
```

### 4. Parse Amount Values from Database

```javascript
// ✅ Good - Parses DECIMAL as number
const amount = parseFloat(payment.amount.toString()) || 0;
const formatted = amount.toFixed(2);

// ❌ Bad - May fail if amount is string
const formatted = payment.amount.toFixed(2); // Error if string!
```

### 5. Handle RLS Policies

```javascript
// Always ensure RLS policies allow the operation
// Check that:
// - INSERT policies exist for user-created records
// - UPDATE policies exist for user-updated records
// - SELECT policies allow reading the data
```

## Storage Buckets Needed

Create these buckets in your InsForge dashboard:

1. **applications** - ID copies, certificates, documents (Public)
2. **courses** - Course images and materials (Public)
3. **gallery** - Gallery images (Public)
4. **avatars** - User profile pictures (Public)
5. **certificates** - Generated certificate PDFs (Public or Private)

## Environment Variables

```env
# Required
VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key-here

# Payment Gateways (Optional)
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_PASSPHRASE=your_passphrase
VITE_PAYFAST_MODE=sandbox

VITE_OZOW_SITE_CODE=your_site_code
VITE_OZOW_API_KEY=your_api_key
VITE_OZOW_PRIVATE_KEY=your_private_key
VITE_OZOW_MODE=sandbox
```

## Common Patterns for This Project

### Create Donation with Payment

```javascript
// 1. Create donation
const { data: donation } = await insforge.database
  .from('donations')
  .insert([{
    user_id: user.id,
    amount: parseFloat(formData.amount),
    campaign_name: formData.campaign,
    message: formData.message,
    anonymous: formData.anonymous,
    status: 'pending'
  }])
  .select()
  .single();

// 2. Create payment
const { data: payment } = await insforge.database
  .from('payments')
  .insert([{
    user_id: user.id,
    amount: parseFloat(formData.amount),
    currency: 'ZAR',
    payment_type: 'donation',
    status: 'pending'
  }])
  .select()
  .single();

// 3. Link donation to payment
await insforge.database
  .from('donations')
  .update({ payment_id: payment.id })
  .eq('id', donation.id);
```

### Upload File and Save Reference

```javascript
// 1. Upload file
const { data: uploadData, error: uploadError } = await insforge.storage
  .from('applications')
  .upload(`user-${userId}/id-${Date.now()}.pdf`, file);

if (uploadError) throw uploadError;

// 2. Save to database
await insforge.database
  .from('applications')
  .update({
    id_passport_url: uploadData.url,
    id_passport_key: uploadData.key
  })
  .eq('id', applicationId);
```

### Fetch User-Specific Data

```javascript
const { user } = useUser();

const { data: applications } = await insforge.database
  .from('applications')
  .select('*, programs(name)')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

## Troubleshooting

### "RLS policy violation"
- **Solution**: Check that INSERT/UPDATE policies exist for the table
- Run the RLS policy creation SQL from `COMPLETE_DATABASE_SETUP_NEW.sql`

### "Table does not exist"
- **Solution**: Run the complete database setup script
- Check Database → Tables in InsForge dashboard

### "Storage bucket not found"
- **Solution**: Create the bucket in Storage section
- Make sure bucket name matches exactly

### "Authentication failed"
- **Solution**: Check Base URL and Anon Key in `.env`
- Restart dev server after updating `.env`

### "toFixed is not a function"
- **Solution**: Parse DECIMAL values as numbers first
- Use: `parseFloat(value.toString()).toFixed(2)`

## Next Steps

1. ✅ Run `COMPLETE_DATABASE_SETUP_NEW.sql` in your InsForge project
2. ✅ Create storage buckets
3. ✅ Update `.env` with your credentials
4. ✅ Test authentication
5. ✅ Test database operations
6. ✅ Test file uploads
7. ✅ Set up payment gateways (optional)

Your InsForge backend is now ready! 🚀

