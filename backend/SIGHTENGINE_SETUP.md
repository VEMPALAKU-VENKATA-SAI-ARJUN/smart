# Quick Sightengine AI Setup (Free Tier)

## Get Real NSFW Detection in 5 Minutes! 🚀

### Step 1: Sign Up (Free)
1. Go to [sightengine.com](https://sightengine.com/)
2. Click "Sign Up" 
3. Choose the **FREE plan** (2,000 requests/month)
4. Verify your email

### Step 2: Get API Credentials
1. Login to your Sightengine dashboard
2. Go to "API" section
3. Copy your:
   - **API User** (looks like: `your_username`)
   - **API Secret** (looks like: `abc123def456...`)

### Step 3: Add to Environment
Add these lines to your `backend/.env` file:

```env
# Sightengine AI Moderation
SIGHTENGINE_USER=your_api_user_here
SIGHTENGINE_SECRET=your_api_secret_here
```

### Step 4: Restart Server
```bash
npm start
```

### That's it! 🎉

Your AI moderation will now use **real AI** instead of placeholder analysis!

## What You Get:
- ✅ **Real NSFW Detection**: Nudity, sexual content, suggestive poses
- ✅ **Violence Detection**: Weapons, blood, fighting
- ✅ **Offensive Content**: Hate symbols, inappropriate gestures
- ✅ **2,000 Free Requests/Month**: Perfect for testing and small sites

## Test It:
Upload an image and check the moderation queue - you'll see real AI scores!

## Upgrade Later:
- **Starter**: $19/month (10,000 requests)
- **Pro**: $99/month (100,000 requests)
- **Enterprise**: Custom pricing

## Alternative: Keep Enhanced Placeholder
The enhanced placeholder system now provides:
- ✅ **Realistic scoring** based on image characteristics
- ✅ **Portrait detection** (higher NSFW scores for portrait orientation)
- ✅ **Skin tone analysis** (brightness-based heuristics)
- ✅ **Professional photo detection** (high resolution = higher scores)
- ✅ **Test variation** (15% chance of high scores for testing)

Perfect for development and testing! 🔧