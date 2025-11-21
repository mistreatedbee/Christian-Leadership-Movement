# Deployment Guide for Christian Leadership Movement

## Pre-Deployment Checklist

### 1. Environment Variables
Make sure your `.env` file has all required variables:
```env
VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key-here
```

### 2. Logo File
Ensure `hero.jpeg` exists at:
```
public/assets/images/hero.jpeg
```

### 3. Build Test
Test the build locally:
```bash
npm run build
npm run preview
```

## Deploying to Vercel

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No** (for first deployment)
   - Project name? **christian-leadership-movement** (or your preferred name)
   - Directory? **./** (current directory)
   - Override settings? **No**

4. **Add Environment Variables**:
   ```bash
   vercel env add VITE_INSFORGE_BASE_URL
   vercel env add VITE_INSFORGE_ANON_KEY
   ```
   
   Enter the values when prompted.

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Option 2: Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)** and sign in

2. **Import Project**:
   - Click "Add New" → "Project"
   - Import your Git repository (GitHub, GitLab, or Bitbucket)
   - Or drag and drop your project folder

3. **Configure Project**:
   - Framework Preset: **Vite**
   - Root Directory: **./**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add:
     - `VITE_INSFORGE_BASE_URL` = your InsForge base URL
     - `VITE_INSFORGE_ANON_KEY` = your InsForge anon key
   - Select environments: Production, Preview, Development

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Your site will be live at `your-project.vercel.app`

## Post-Deployment

### 1. Verify Deployment
- Check that the site loads correctly
- Test authentication (register/login)
- Verify database connections work
- Check that logo appears in:
  - Navigation bar
  - Browser tab (favicon)
  - Homepage hero section

### 2. Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### 3. Monitor
- Check Vercel dashboard for build logs
- Monitor error logs in Vercel dashboard
- Set up error tracking if needed

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### Environment Variables Not Working
- Make sure variables start with `VITE_`
- Redeploy after adding environment variables
- Check that variables are set for the correct environment (Production/Preview)

### Logo Not Showing
- Verify `hero.jpeg` exists in `public/assets/images/`
- Check that path is `/assets/images/hero.jpeg` (not `/public/assets/...`)
- Clear browser cache

### Database Connection Issues
- Verify InsForge project is active (not paused)
- Check that base URL and anon key are correct
- Ensure CORS is enabled in InsForge (should be automatic)

## Quick Deploy Commands

```bash
# Build locally to test
npm run build

# Deploy to Vercel (first time)
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List deployments
vercel ls
```

## File Structure for Deployment

```
christian-leadership-movement/
├── public/
│   └── assets/
│       └── images/
│           └── hero.jpeg          # Logo file
├── src/
├── index.html                      # Updated with favicon
├── vercel.json                     # Vercel configuration
├── package.json
├── .env                            # Local only (not deployed)
└── .gitignore                      # Should include .env
```

## Important Notes

- ✅ `.env` file is NOT deployed (it's in `.gitignore`)
- ✅ Environment variables must be set in Vercel dashboard
- ✅ Logo path is `/assets/images/hero.jpeg` (Vite serves from `public/`)
- ✅ All API calls use environment variables
- ✅ Build output goes to `dist/` folder

Your site is now ready for deployment! 🚀

