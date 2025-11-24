# GitHub Pages Setup Guide

## Quick Setup (5 minutes)

### Step 1: Initialize Git Repository (if not already done)

```bash
# In your project directory
git init
git add .
git commit -m "Initial commit - Gantt chart application"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `gantt-chart-app`)
3. **Don't** initialize with README (you already have files)
4. Choose **Private** if you want password protection (see note below)

### Step 3: Push to GitHub

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR-USERNAME/gantt-chart-app.git

# Push your code
git branch -M main
git push -u origin main
```

### Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Click **Pages** (left sidebar)
4. Under "Source":
   - Select branch: **main**
   - Select folder: **/ (root)**
5. Click **Save**

### Step 5: Access Your Site

After 1-2 minutes, your site will be live at:
```
https://YOUR-USERNAME.github.io/gantt-chart-app/
```

## Important Notes

### ⚠️ Authentication Limitation
GitHub Pages **does not support** HTTP basic authentication or password protection for public repositories.

**Options for password protection:**

1. **Make Repository Private** (GitHub Pro/Teams required)
   - Private repos can use GitHub Pages
   - Only people with repo access can view
   - Requires GitHub Pro ($4/month) or Teams

2. **Use Client-Side Password** (Simple but not secure)
   - Add a simple JavaScript password prompt
   - See `add-password-protection.html` below

3. **Use Cloudflare Pages** (Free alternative)
   - Supports password protection
   - Free tier available
   - See Cloudflare setup guide

### Your Data is Safe
- All data is stored in **browser localStorage**
- Nothing is sent to servers
- Data stays on the user's computer

## Client-Side Password Protection (Optional)

If you want basic password protection, I can add a simple JavaScript prompt that checks a password before showing the app. It's not super secure (password is in the code) but prevents casual access.

Would you like me to add this?

## Updating Your Site

Whenever you make changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

Changes appear on GitHub Pages within 1-2 minutes.

## Custom Domain (Optional)

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. In GitHub repo Settings → Pages → Custom domain
3. Enter your domain (e.g., `gantt.yourdomain.com`)
4. Add DNS records at your domain provider:
   ```
   Type: CNAME
   Name: gantt (or @)
   Value: YOUR-USERNAME.github.io
   ```

## Troubleshooting

**Site not loading?**
- Wait 2-3 minutes after enabling Pages
- Check Settings → Pages for the green checkmark
- Clear browser cache

**404 error?**
- Make sure `index.html` is in the root directory
- Check the branch and folder settings in Pages

**Changes not showing?**
- Wait 1-2 minutes for GitHub to rebuild
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check Actions tab for build status
