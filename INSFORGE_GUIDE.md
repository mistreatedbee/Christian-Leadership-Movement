# InsForge Platform Guide

## What is InsForge?

InsForge is a **Backend-as-a-Service (BaaS)** platform that provides:

- ✅ **PostgreSQL Database** with PostgREST API
- ✅ **Authentication** (Email/password + OAuth)
- ✅ **File Storage** (upload/download)
- ✅ **AI Integration** (Chat completions, image generation)
- ✅ **Serverless Functions** (Edge functions)

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

## Authentication Setup

### For React + Vite (Your Current Setup)

```tsx
// App.tsx
import { InsforgeProvider } from '@insforge/react';

export function App() {
  return (
    <InsforgeProvider
      baseUrl={import.meta.env.VITE_INSFORGE_BASE_URL}
      anonKey={import.meta.env.VITE_INSFORGE_ANON_KEY}
    >
      {/* Your app */}
    </InsforgeProvider>
  );
}
```

### Available Hooks

```tsx
import { useAuth, useUser } from '@insforge/react';

// Check auth state
const { isSignedIn, isLoaded } = useAuth();

// Get current user
const { user, isLoaded } = useUser();
// user.id, user.email, user.name, user.avatarUrl

// Sign in/out
const { signIn, signUp, signOut } = useAuth();
```

### Sign In/Up Functions

```tsx
// Sign in
const result = await signIn(email, password);
// Returns: { user } or { error }

// Sign up
const result = await signUp(email, password);
// Returns: { user } or { error }

// Sign out
await signOut();
```

## Database Operations

### Create Client

```typescript
import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_BASE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});
```

### CRUD Operations

#### SELECT (Read)

```typescript
// Get all records
const { data, error } = await insforge.database
  .from('users')
  .select();

// Get specific columns
const { data } = await insforge.database
  .from('users')
  .select('id, name, email');

// With relationships
const { data } = await insforge.database
  .from('posts')
  .select('*, users(nickname, avatar_url)');

// Single record
const { data } = await insforge.database
  .from('users')
  .select()
  .eq('id', userId)
  .single();
```

#### INSERT (Create)

```typescript
// Single insert
const { data, error } = await insforge.database
  .from('users')
  .insert({ name: 'John', email: 'john@example.com' })
  .select();

// Bulk insert
const { data, error } = await insforge.database
  .from('users')
  .insert([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
  ])
  .select();
```

#### UPDATE

```typescript
// Always use filters!
const { data, error } = await insforge.database
  .from('users')
  .update({ name: 'Jane Doe' })
  .eq('id', userId)
  .select();
```

#### DELETE

```typescript
// Always use filters!
const { error } = await insforge.database
  .from('posts')
  .delete()
  .eq('id', postId);
```

### Filters

```typescript
.eq('status', 'active')        // Equals
.neq('status', 'banned')       // Not equals
.gt('age', 18)                 // Greater than
.gte('price', 100)             // Greater than or equal
.lt('stock', 10)               // Less than
.lte('priority', 3)            // Less than or equal
.like('name', '%Widget%')       // Case-sensitive pattern
.ilike('email', '%@gmail.com') // Case-insensitive pattern
.in('status', ['pending', 'active']) // Value in array
.is('deleted_at', null)        // Exactly equals (for null)
```

### Modifiers

```typescript
.order('created_at', { ascending: false })  // Sort
.limit(10)                                  // Limit rows
.range(0, 9)                                // Pagination
.single()                                   // Return object (throws if multiple)
.maybeSingle()                              // Return object or null
```

### Example: Pagination

```typescript
const page = 1;
const pageSize = 10;
const from = (page - 1) * pageSize;
const to = from + pageSize - 1;

const { data, count } = await insforge.database
  .from('posts')
  .select('*', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false });
```

## File Storage

### Upload File

```typescript
const { data, error } = await insforge.storage
  .from('bucket-name')
  .upload('path/to/file.jpg', file);

// Returns: { url, key }
// url: Public URL (if bucket is public)
// key: Storage key for future operations
```

### Download/Get Public URL

```typescript
// For public buckets, construct URL:
const publicUrl = `${baseUrl}/api/storage/buckets/${bucketName}/objects/${key}`;

// Or use the URL returned from upload
```

### Delete File

```typescript
await insforge.storage
  .from('bucket-name')
  .remove(fileKey);
```

### Storage Buckets

**Create buckets via MCP tool or dashboard:**
- `applications` - Private (application documents)
- `courses` - Private (course materials)
- `gallery` - Public (gallery images)
- `avatars` - Public (user profile images)

## Row Level Security (RLS)

InsForge uses PostgreSQL Row Level Security to control data access.

### Policy Types

1. **Public Read**: Anyone can read
2. **User-Specific**: Users can only see their own data
3. **Admin Access**: Admins can see/manage all data

### Example Policies

```sql
-- Users see own profile
CREATE POLICY "Users see own profile" ON user_profiles
  FOR SELECT USING (user_id = get_current_user_id());

-- Public can read events
CREATE POLICY "Public can read events" ON events
  FOR SELECT USING (true);

-- Admins manage all
CREATE POLICY "Admins manage all" ON applications
  FOR ALL TO project_admin USING (true) WITH CHECK (true);
```

## Common Patterns

### User-Specific Data

```typescript
// Get current user
const { user } = useUser();

// Fetch user's data
const { data } = await insforge.database
  .from('applications')
  .select()
  .eq('user_id', user.id);
```

### Error Handling

```typescript
const { data, error } = await insforge.database
  .from('users')
  .select();

if (error) {
  console.error('Database error:', error);
  // Handle error
  return;
}

// Use data
console.log(data);
```

### Loading States

```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await insforge.database
      .from('table')
      .select();
    
    if (!error) setData(data);
    setLoading(false);
  };
  
  fetchData();
}, []);
```

## Environment Variables

```env
VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key-here
```

**Important:** 
- Restart dev server after changing `.env`
- Never commit `.env` to git
- Use different keys for dev/prod

## Troubleshooting

### "Waiting for Connection"
- Check `.env` file has correct credentials
- Restart dev server after updating `.env`
- Verify InsForge project is active (not paused)

### Authentication Errors
- Verify `anonKey` is set in `InsforgeProvider`
- Check user exists in database
- Verify RLS policies allow access

### Database Errors
- Check table exists
- Verify RLS policies
- Check column names match
- Use `.maybeSingle()` instead of `.single()` if record might not exist

### Storage Errors
- Verify bucket exists
- Check bucket permissions (public/private)
- Ensure file size is within limits
- Check file format is allowed

## Best Practices

1. **Always check `isLoaded`** before using `user` from hooks
2. **Always use filters** with UPDATE and DELETE
3. **Handle errors** from all SDK operations
4. **Use `.maybeSingle()`** when record might not exist
5. **Chain `.select()`** after `.insert()` to get inserted data
6. **Use RLS policies** for security, not just application logic
7. **Store file keys** in database, construct URLs when needed
8. **Restart dev server** after changing environment variables

## Next Steps

1. ✅ Set up your new InsForge account
2. ✅ Run `COMPLETE_DATABASE_SETUP.sql` to create tables
3. ✅ Create storage buckets
4. ✅ Update `.env` with new credentials
5. ✅ Test authentication and database operations

---

**Your application is already set up correctly!** Just update the `.env` file with your new InsForge credentials and restart the server.

