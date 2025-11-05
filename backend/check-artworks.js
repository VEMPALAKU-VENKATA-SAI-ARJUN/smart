const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function checkArtworks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const Artwork = require('./models/Artwork');
    
    // Get all artworks with their moderation status
    const artworks = await Artwork.find({}).select('title status moderationStatus createdAt').lean();
    
    console.log('\n=== ALL ARTWORKS ===');
    artworks.forEach((artwork, index) => {
      console.log(`${index + 1}. ${artwork.title}`);
      console.log(`   Status: ${artwork.status}`);
      console.log(`   AI Checked: ${artwork.moderationStatus?.aiChecked || false}`);
      console.log(`   Created: ${artwork.createdAt}`);
      console.log(`   Flagged Reasons: ${artwork.moderationStatus?.flaggedReasons?.length || 0}`);
      console.log('');
    });
    
    // Get stats like the API does
    const days = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const statsArtworks = await Artwork.find({
      createdAt: { $gte: startDate },
      'moderationStatus.aiChecked': true
    }).lean();
    
    console.log('\n=== AI STATS CALCULATION ===');
    console.log(`Date range: ${startDate.toISOString()} to ${new Date().toISOString()}`);
    console.log(`Total with aiChecked=true: ${statsArtworks.length}`);
    
    const stats = {
      totalProcessed: statsArtworks.length,
      autoApproved: statsArtworks.filter(a => a.status === 'approved' && a.moderationStatus.reviewedAt && !a.moderationStatus.reviewedBy).length,
      flaggedForReview: statsArtworks.filter(a => a.moderationStatus.flaggedReasons.length > 0).length,
      rejected: statsArtworks.filter(a => a.status === 'rejected').length,
    };
    
    console.log('Stats:', stats);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkArtworks();