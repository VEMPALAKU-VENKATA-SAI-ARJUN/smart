// Test script for mini-preview endpoint
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Artwork = require('./models/Artwork');

async function testMiniPreview() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a user with artworks
    console.log('🔍 Finding a user with artworks...');
    const artwork = await Artwork.findOne({ status: 'approved' })
      .populate('artist')
      .lean();

    if (!artwork || !artwork.artist) {
      console.log('❌ No approved artworks found. Please create some test data first.');
      process.exit(1);
    }

    const userId = artwork.artist._id;
    console.log(`✅ Found user: ${artwork.artist.username} (${userId})\n`);

    // Test the query logic
    console.log('📊 Testing mini-preview query logic...');
    
    const user = await User.findById(userId)
      .select('username profile.avatar profile.bio followers following lastLogin')
      .lean();

    console.log('User data:', {
      username: user.username,
      avatar: user.profile?.avatar ? 'Yes' : 'No',
      bio: user.profile?.bio ? user.profile.bio.substring(0, 50) + '...' : 'No bio',
      followers: user.followers?.length || 0
    });

    const artworks = await Artwork.find({
      artist: userId,
      status: 'approved',
      visibility: 'public'
    })
      .select('title thumbnail createdAt')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    console.log(`\n🎨 Found ${artworks.length} artworks:`);
    artworks.forEach((art, i) => {
      console.log(`  ${i + 1}. ${art.title} (${new Date(art.createdAt).toLocaleDateString()})`);
    });

    const stats = {
      followers: user.followers?.length || 0,
      artworks: await Artwork.countDocuments({
        artist: userId,
        status: 'approved',
        visibility: 'public'
      })
    };

    console.log('\n📈 Stats:', stats);

    // Test activity badges
    const now = Date.now();
    const lastActive = user.lastLogin ? new Date(user.lastLogin).getTime() : 0;
    const isOnline = (now - lastActive) < 5 * 60 * 1000;
    const isRecentlyActive = (now - lastActive) < 24 * 60 * 60 * 1000;

    const recentArtwork = artworks.length > 0 ? artworks[0] : null;
    const isRecentlyPosted = recentArtwork && 
      (now - new Date(recentArtwork.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

    console.log('\n🏷️ Badges:');
    console.log('  Online:', isOnline ? '🟢 Yes' : '⚪ No');
    console.log('  Recently Active:', isRecentlyActive ? '✅ Yes' : '❌ No');
    console.log('  Recently Posted:', isRecentlyPosted ? '✅ Yes' : '❌ No');

    console.log('\n✅ Mini-preview endpoint logic test completed successfully!');
    console.log('\n📝 To test the actual endpoint, start the server and make a request to:');
    console.log(`   GET http://localhost:5000/api/users/${userId}/mini-preview`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testMiniPreview();
