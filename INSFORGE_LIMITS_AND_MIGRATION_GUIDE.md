# InsForge Limits & Migration Guide

## Understanding InsForge Usage Limits

### Free Plan Limits (Current)
- **25 MCP calls** per month
- **10 AI credits** per month
- **500 MB database** storage
- **5 GB bandwidth** per month
- **1 GB file storage**
- **2 active projects**
- **Projects pause after 1 week of inactivity**

### What Happens When You Hit Limits?

1. **Project Pauses**: Your InsForge project may be paused
2. **API Calls Stop**: Backend API calls will fail
3. **Database Access Limited**: May not be able to read/write data
4. **Authentication May Fail**: Login/registration may not work

### What Still Works When Paused?

✅ **Your Local Codebase**: All your code files remain intact
✅ **Code Editing**: You can continue writing and editing code
✅ **Frontend Development**: UI/UX work continues normally
✅ **Planning & Design**: You can plan new features
✅ **Git Commits**: Version control works normally

❌ **Backend API Calls**: Will fail (connection errors)
❌ **Database Operations**: Won't work
❌ **Authentication**: May not work
❌ **File Storage**: Uploads/downloads won't work

## Strategy: Continue Development Despite Limits

### Option 1: Continue Frontend Development (Recommended)

**What You Can Do:**
1. ✅ Build all 30 new features in your codebase
2. ✅ Create all components, pages, and UI
3. ✅ Set up routing and navigation
4. ✅ Write all the frontend logic
5. ✅ Mock data for testing UI
6. ✅ Style and polish everything

**How to Test Without Backend:**
```typescript
// Create mock data files
// src/lib/mockData.ts
export const mockUsers = [...];
export const mockDonations = [...];
export const mockApplications = [...];

// Use mock data when backend is unavailable
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';
```

**Benefits:**
- No waiting for limits to reset
- Complete all frontend work
- Ready to connect backend when available
- Can demo UI/UX to stakeholders

### Option 2: Wait for Limit Reset

**Timeline:**
- Limits typically reset monthly
- Check your InsForge dashboard for reset date
- Plan backend integration after reset

**What to Do While Waiting:**
1. Complete all frontend features
2. Write comprehensive documentation
3. Test UI with mock data
4. Plan database schema changes
5. Prepare SQL scripts for new features

### Option 3: Upgrade Plan

**When to Upgrade:**
- If you need continuous backend access
- If limits are too restrictive
- If you're ready for production

**Check Current Pricing:**
- Visit https://insforge.dev/pricing
- Compare plans
- Choose plan that fits your needs

## Migration Strategy: Switching Accounts

### Scenario: Create New Account

**Step 1: Backup Current Setup**
```bash
# Your codebase is already in Git (hopefully)
git add .
git commit -m "Backup before account migration"
git push
```

**Step 2: Document Current Credentials**
- Save current Base URL
- Save current Anon Key
- Note which tables exist
- List all storage buckets

**Step 3: Create New InsForge Account**
1. Go to https://insforge.dev
2. Sign up with new email (or use existing)
3. Create new project
4. Get new Base URL and Anon Key

**Step 4: Recreate Database Schema**
1. Open `COMPLETE_DATABASE_SETUP_NEW.sql`
2. Run in new project's SQL Editor
3. Verify all tables created
4. Add any new tables for new features

**Step 5: Recreate Storage Buckets**
Create these buckets in new project:
- `applications`
- `courses`
- `gallery`
- `avatars`
- `certificates`
- (Add any new buckets for new features)

**Step 6: Update Environment Variables**
```env
# Update .env file
VITE_INSFORGE_BASE_URL=https://new-project.insforge.app
VITE_INSFORGE_ANON_KEY=new-anon-key-here
```

**Step 7: Restart Dev Server**
```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Step 8: Test Connection**
- Try registering a new user
- Test login
- Verify database operations work
- Check file uploads work

**Step 9: Recreate Admin User**
```sql
-- Run in SQL Editor
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'your-email@example.com'
);
```

## Best Practices for Limit Management

### 1. Monitor Your Usage
- Check InsForge dashboard regularly
- Track MCP calls, bandwidth, storage
- Set up alerts if available

### 2. Optimize API Calls
```typescript
// Batch operations when possible
// Instead of multiple calls:
const promises = items.map(item => 
  insforge.database.from('table').insert(item)
);
await Promise.all(promises);

// Use pagination
const { data } = await insforge.database
  .from('table')
  .select('*')
  .range(0, 49); // Limit to 50 items
```

### 3. Cache Data When Possible
```typescript
// Cache frequently accessed data
const cacheKey = 'users-list';
const cached = localStorage.getItem(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
// Fetch and cache
const { data } = await insforge.database.from('users').select();
localStorage.setItem(cacheKey, JSON.stringify(data));
```

### 4. Use Mock Data for Development
```typescript
// src/lib/config.ts
export const USE_MOCK_DATA = 
  import.meta.env.VITE_USE_MOCK_DATA === 'true' ||
  import.meta.env.DEV; // Use mocks in development
```

## Feature Development Plan

### Phase 1: Frontend Development (No Backend Needed)
**Can Do Now:**
- ✅ All 30 new features UI
- ✅ Component creation
- ✅ Page routing
- ✅ Form validation
- ✅ UI/UX polish
- ✅ Mock data integration

### Phase 2: Backend Integration (After Limits Reset/Upgrade)
**Need Backend For:**
- Database operations
- Authentication
- File uploads
- Real-time data
- Payment processing

### Phase 3: Testing & Deployment
**Final Steps:**
- End-to-end testing
- Performance optimization
- Production deployment
- Monitoring setup

## Migration Checklist

When switching accounts or resuming after pause:

- [ ] Backup current codebase (Git commit)
- [ ] Document current database schema
- [ ] List all storage buckets
- [ ] Save current credentials (for reference)
- [ ] Create new InsForge account/project
- [ ] Run database setup SQL script
- [ ] Create all storage buckets
- [ ] Update `.env` file
- [ ] Restart dev server
- [ ] Test authentication
- [ ] Test database operations
- [ ] Test file uploads
- [ ] Recreate admin user
- [ ] Verify all features work
- [ ] Test new features integration

## Data Migration (If Needed)

### Exporting Data from Old Account
```sql
-- Export users
COPY (SELECT * FROM users) TO '/tmp/users.csv' CSV HEADER;

-- Export applications
COPY (SELECT * FROM applications) TO '/tmp/applications.csv' CSV HEADER;

-- Export donations
COPY (SELECT * FROM donations) TO '/tmp/donations.csv' CSV HEADER;
```

### Importing to New Account
```sql
-- Import users
COPY users FROM '/tmp/users.csv' CSV HEADER;

-- Import applications
COPY applications FROM '/tmp/applications.csv' CSV HEADER;

-- Import donations
COPY donations FROM '/tmp/donations.csv' CSV HEADER;
```

**Note:** File storage (images, documents) would need to be re-uploaded or migrated separately.

## Recommended Approach

### For Your Situation:

1. **Continue Building Features Now**
   - Build all 30 features in your codebase
   - Use mock data for testing
   - Complete all frontend work

2. **Wait for Limit Reset OR Upgrade**
   - Check when limits reset
   - Or upgrade to paid plan if needed
   - Then integrate backend

3. **Alternative: Use Multiple Accounts Strategically**
   - Use one account for development
   - Use another for testing
   - Switch between them as needed

## Questions to Consider

1. **How much backend access do you need now?**
   - If minimal: Continue frontend work
   - If critical: Consider upgrading

2. **When do you need to go live?**
   - If soon: Upgrade plan
   - If later: Wait for reset

3. **How much data do you have?**
   - If minimal: Easy to recreate
   - If significant: Plan migration carefully

## Support Resources

- **InsForge Documentation**: https://insforge.dev/docs
- **InsForge Pricing**: https://insforge.dev/pricing
- **InsForge Support**: Check dashboard for support options
- **Your SQL Scripts**: `COMPLETE_DATABASE_SETUP_NEW.sql`
- **This Guide**: Reference for migration steps

## Summary

✅ **You CAN continue editing code** - Your codebase is separate from InsForge
✅ **You CAN resume after limits reset** - Everything will work again
✅ **You CAN create new account** - Just need to recreate database and update `.env`
✅ **You WON'T lose progress** - All your code is safe locally

**Best Strategy**: Continue building all features in your codebase now, then integrate backend when limits reset or after upgrading.

---

**Remember**: Your code is your asset. InsForge is just the backend service. You can always switch providers or accounts without losing your codebase!

