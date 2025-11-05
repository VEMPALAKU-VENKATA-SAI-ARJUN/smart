const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email from Google'));
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: profile.displayName || email.split('@')[0],
        email,
        password: Math.random().toString(36).slice(2), // placeholder; user can reset
        role: 'buyer',
        profile: { avatar: profile.photos?.[0]?.value }
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// If you use sessions (optional)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { const u = await User.findById(id); done(null, u); } catch (e) { done(e); }
});