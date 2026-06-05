# ElectroFix — Production Deployment Guide

## Architecture Overview

```
Internet
    │
    ├── yourshop.com          → Customer Website (Next.js → Vercel/VPS)
    ├── admin.yourshop.com    → Admin Panel (React → Vercel/VPS)
    ├── api.yourshop.com      → Backend API (Node.js → Railway/VPS)
    └── Mobile App            → Expo → EAS Build → Play Store
```

---

## Step 1: MongoDB Atlas (Database)

1. **mongodb.com** → Create free account → New Project
2. Build a Database → **M0 Free** → AWS Mumbai (ap-south-1)
3. Create user: username + strong password
4. Network Access → **Add IP Address → 0.0.0.0/0** (allow all)
5. Connect → Drivers → Copy connection string
6. Replace `<password>` with your password

```
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/electrofix
```

---

## Step 2: Cloudinary (Image Storage)

1. **cloudinary.com** → Sign up free
2. Dashboard → Copy: Cloud Name, API Key, API Secret
3. Settings → Upload → Add upload preset (optional)

---

## Step 3: Gmail SMTP (Email / OTP)

1. Gmail account → Settings → Security
2. Enable **2-Step Verification**
3. App Passwords → Select app: Mail → Generate
4. Copy the 16-character password

```
EMAIL_USER=yourshop@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx   (16 char app password)
```

---

## Step 4: Fast2SMS (SMS OTP)

1. **fast2sms.com** → Register → KYC verify
2. API → Copy API Key
3. Recharge wallet (minimum ₹100)

---

## Step 5: Deploy Backend (Railway — Free tier available)

1. **railway.app** → New Project → Deploy from GitHub
2. Or deploy manually:

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

3. Add all `.env` variables in Railway dashboard
4. Set domain: `api.yourshop.com`
5. After deploy, run:
```bash
railway run node utils/createAdmin.js
```

### OR: Deploy on VPS (DigitalOcean/Hostinger)

```bash
# On your VPS
git clone your-repo
cd electrofix-backend
npm install --production
cp .env.example .env
nano .env   # Fill all values

# Install PM2 for process management
npm install -g pm2
pm2 start server.js --name electrofix-api
pm2 save
pm2 startup

# Nginx reverse proxy
sudo nano /etc/nginx/sites-available/api.yourshop.com
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name api.yourshop.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.yourshop.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL with Certbot
sudo certbot --nginx -d api.yourshop.com
```

---

## Step 6: Deploy Customer Website (Vercel — Recommended)

1. **vercel.com** → Import Git Repository
2. Framework: **Next.js** (auto-detected)
3. Add Environment Variables:
```
NEXT_PUBLIC_API_URL=https://api.yourshop.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
NEXT_PUBLIC_SITE_URL=https://yourshop.com
```
4. Deploy → Add custom domain: `yourshop.com`

---

## Step 7: Deploy Admin Panel (Vercel)

1. **vercel.com** → Import admin repo
2. Framework: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add Environment Variables:
```
VITE_API_URL=https://api.yourshop.com/api
VITE_GOOGLE_MAPS_API_KEY=your_key
```
6. Deploy → Add domain: `admin.yourshop.com`

---

## Step 8: Mobile App (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

cd electrofix-app

# Create .env with production values
echo "EXPO_PUBLIC_API_URL=https://api.yourshop.com/api" > .env
echo "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key" >> .env

# Configure EAS
eas build:configure

# Build APK for Android (free tier = ~15 min)
eas build --platform android --profile preview

# Build for Play Store (AAB format)
eas build --platform android --profile production
```

**eas.json** (auto-created, customize if needed):
```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## Step 9: Google Maps API Keys (Production)

### Website key:
- Application restrictions: **HTTP referrers**
- Add: `yourshop.com/*` and `www.yourshop.com/*`

### App key (separate):
- Application restrictions: **Android apps**
- Add your app package: `com.electrofix.app`

---

## Step 10: Post-Deploy Checklist

- [ ] Backend health check: `https://api.yourshop.com/api/health`
- [ ] Admin login works with new credentials
- [ ] Customer can register + receive OTP SMS
- [ ] Booking flow works end-to-end
- [ ] Images upload to Cloudinary
- [ ] Socket.IO notifications working
- [ ] SSL certificates active on all domains

---

## Recommended Free Hosting Stack

| Service | Platform | Free Tier |
|---------|----------|-----------|
| Backend | Railway | 500 hours/month |
| Website | Vercel | Unlimited |
| Admin   | Vercel | Unlimited |
| Database| MongoDB Atlas | 512MB |
| Images  | Cloudinary | 25GB |

**Estimated monthly cost (small business):** ₹0 - ₹500 (only if traffic is high)

