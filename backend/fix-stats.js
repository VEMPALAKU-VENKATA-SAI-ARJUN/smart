const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function fixRejectedArtwork() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const Artwork = require('./models/Artwork');
    
    // Update all rejected artworks that don't have aiChecked flag
    const result = await Artwork.updateMany(
      { 
        status: 'rejected',
        'moderationStatus.aiChecked': { $ne: true }
      },
      { 
        'moderationStatus.aiChecked': true 
      }
    );
    
    console.log('Updated rejected artworks:', result.modifiedCount);
    
    // Also update approved artworks for consistency
    const approvedResult = await Artwork.updateMany(
      { 
        status: 'approved',
        'moderationStatus.reviewedBy': { $exists: true },
        'moderationStatus.aiChecked': { $ne: true }
      },
      { 
        'moderationStatus.aiChecked': true 
      }
    );
    
    console.log('Updated approved artworks:', approvedResult.modifiedCount);
    
    await mongoose.disconnect();
    console.log('Database updated successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixRejectedArtwork();