const passport = require('passport');
const User = require('../models/User');

// If you use sessions (optional)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { const u = await User.findById(id); done(null, u); } catch (e) { done(e); }
});