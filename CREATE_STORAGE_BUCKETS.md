# How to Create Storage Buckets in InsForge

## 🚨 **Error: Bucket "avatars" does not exist**

You need to create storage buckets in your InsForge dashboard. Here's how:

---

## 📋 **Step-by-Step Instructions**

### **Method 1: Using InsForge Dashboard (Easiest)**

1. **Go to InsForge Dashboard:**
   - Visit [https://insforge.dev](https://insforge.dev)
   - Log in to your account
   - Select your project

2. **Navigate to Storage:**
   - Click on **"Storage"** in the left sidebar
   - Or go to: **Storage** → **Buckets**

3. **Create the "avatars" Bucket:**
   - Click **"Create Bucket"** or **"New Bucket"** button
   - Enter bucket name: **`avatars`**
   - Select **Public** (so profile images can be accessed)
   - Click **"Create"** or **"Save"**

4. **Create Other Required Buckets:**
   Repeat the process for these buckets:

   | Bucket Name | Type | Purpose |
   |------------|------|---------|
   | `avatars` | **Public** | User profile images |
   | `applications` | **Private** | Application documents (ID copies, certificates) |
   | `courses` | **Private** | Course materials, videos, resources |
   | `gallery` | **Public** | Gallery images for homepage |
   | `certificates` | **Public** or **Private** | Generated certificate PDFs |
   | `resources` | **Public** | Resource library files |
   | `blog` | **Public** | Blog post images |

---

## 🔧 **Method 2: Using MCP Tools (If Available)**

If you have MCP tools configured, you can use:

```bash
# Create avatars bucket (public)
mcp_insforge_create-bucket bucketName="avatars" isPublic=true

# Create applications bucket (private)
mcp_insforge_create-bucket bucketName="applications" isPublic=false

# Create courses bucket (private)
mcp_insforge_create-bucket bucketName="courses" isPublic=false

# Create gallery bucket (public)
mcp_insforge_create-bucket bucketName="gallery" isPublic=true
```

---

## ✅ **Required Buckets Checklist**

Create these buckets in your InsForge project:

- [ ] **`avatars`** - Public (for user profile images)
- [ ] **`applications`** - Private (for application documents)
- [ ] **`courses`** - Private (for course materials)
- [ ] **`gallery`** - Public (for gallery images)
- [ ] **`certificates`** - Public or Private (for certificates)
- [ ] **`resources`** - Public (for resource library)
- [ ] **`blog`** - Public (for blog images)

---

## 🎯 **Quick Fix for Current Error**

**To fix the avatar upload error right now:**

1. Go to InsForge Dashboard → **Storage**
2. Click **"Create Bucket"**
3. Name: **`avatars`**
4. Type: **Public** ✅
5. Click **"Create"**
6. Try uploading your avatar again!

---

## 📝 **Bucket Types Explained**

### **Public Buckets:**
- Files are accessible via public URLs
- Good for: avatars, gallery images, blog images, resources
- Users can view files without authentication

### **Private Buckets:**
- Files require authentication to access
- Good for: application documents, course materials, certificates
- More secure for sensitive content

---

## 🔍 **Verify Buckets Are Created**

After creating buckets, you can verify:

1. **In Dashboard:**
   - Go to Storage → Buckets
   - You should see all your buckets listed

2. **Via Code:**
   ```typescript
   // List all buckets
   const { data } = await insforge.storage.listBuckets();
   console.log('Buckets:', data);
   ```

---

## 🚀 **After Creating Buckets**

1. **Refresh your browser** (to clear any cached errors)
2. **Try uploading avatar again** - it should work now!
3. **Test other file uploads:**
   - Application documents
   - Course materials
   - Gallery images

---

## ⚠️ **Common Issues**

### **"Bucket already exists"**
- The bucket might already be created
- Check the Storage section to see if it's there
- If it exists, you're good to go!

### **"Permission denied"**
- Make sure you're logged in as project owner/admin
- Check your InsForge account permissions

### **"Bucket name invalid"**
- Bucket names must be lowercase
- No spaces or special characters (except hyphens)
- Use: `avatars`, `applications`, `courses` (not `Avatars`, `My Bucket`)

---

## 📚 **Additional Resources**

- **InsForge Storage Docs**: Check InsForge documentation for more details
- **Bucket Naming**: Keep names simple and descriptive
- **Permissions**: Public for images, Private for documents

---

## ✅ **Once Complete**

After creating the `avatars` bucket:
- ✅ Avatar uploads will work
- ✅ Profile images will display correctly
- ✅ No more "bucket does not exist" errors

**Go create that bucket now and try uploading your avatar again!** 🎉

