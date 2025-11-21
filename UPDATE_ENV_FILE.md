# How to Update Your .env File

## Current .env File

Your current `.env` file has:
```
VITE_INSFORGE_BASE_URL=https://75x5aysj.us-east.insforge.app
VITE_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## To Update Your .env File

### Option 1: Manual Update (Recommended)

1. Open `.env` file in your project root
2. Update the values:

```env
# InsForge Configuration
# Get your anon key from your InsForge dashboard or use the MCP tool
VITE_INSFORGE_BASE_URL=https://YOUR-NEW-URL.insforge.app
VITE_INSFORGE_ANON_KEY=YOUR-ANON-KEY-HERE
```

3. **IMPORTANT:** Restart your dev server after updating:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Option 2: Using PowerShell

If you want to update via command line, you can use:

```powershell
# Update Base URL
(Get-Content .env) -replace 'VITE_INSFORGE_BASE_URL=.*', 'VITE_INSFORGE_BASE_URL=https://your-new-url.insforge.app' | Set-Content .env

# Update Anon Key
(Get-Content .env) -replace 'VITE_INSFORGE_ANON_KEY=.*', 'VITE_INSFORGE_ANON_KEY=your-new-anon-key' | Set-Content .env
```

## Complete .env Template

Here's a complete template with all optional variables:

```env
# InsForge Configuration
# ======================
# REQUIRED: Get these from your InsForge Dashboard
VITE_INSFORGE_BASE_URL=https://your-project-id.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key-here

# Payment Gateway Configuration (Optional)
# ========================================
# PayFast Configuration
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_PASSPHRASE=your_passphrase
VITE_PAYFAST_MODE=sandbox

# Ozow Configuration
VITE_OZOW_SITE_CODE=your_site_code
VITE_OZOW_API_KEY=your_api_key
VITE_OZOW_PRIVATE_KEY=your_private_key
VITE_OZOW_MODE=sandbox
```

## Where to Get Your Credentials

### Base URL
1. Log into InsForge Dashboard
2. Go to your project
3. Navigate to **Project Settings** → **API URL**
4. Copy the URL (e.g., `https://xxxxx.insforge.app`)

### Anon Key
1. In InsForge Dashboard
2. Go to **API Keys** section
3. Copy the **Anonymous Key** (long JWT token)

## Verify Your .env File

After updating, verify it's correct:

```powershell
# Check .env file contents
Get-Content .env
```

You should see:
- ✅ `VITE_INSFORGE_BASE_URL` with your URL
- ✅ `VITE_INSFORGE_ANON_KEY` with your key

## After Updating

1. **Restart Dev Server** (CRITICAL!)
   ```bash
   # Stop: Ctrl+C
   # Start: npm run dev
   ```

2. **Check Browser Console**
   - Open browser (F12)
   - Look for connection info:
   ```
   🔌 InsForge Connection Info: {
     baseUrl: "https://your-url.insforge.app",
     hasAnonKey: true,
     ...
   }
   ```

3. **Test Connection**
   - Try to register a new user
   - Try to login
   - Check that data appears in InsForge dashboard

## Troubleshooting

### Issue: Changes not taking effect
**Solution:** Restart your dev server! Environment variables are only loaded when the server starts.

### Issue: "Base URL is undefined"
**Solution:** 
- Check `.env` file exists in project root
- Check variable name is exactly `VITE_INSFORGE_BASE_URL`
- Restart dev server

### Issue: "Anon Key is missing"
**Solution:**
- Check `.env` has `VITE_INSFORGE_ANON_KEY`
- Get key from InsForge dashboard
- Restart dev server

