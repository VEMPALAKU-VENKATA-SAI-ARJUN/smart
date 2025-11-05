// NSFW Detection Test Script
const axios = require('axios');

const testImages = [
  {
    name: "Safe Landscape",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
    expected: "Very Low (0.001-0.01)"
  },
  {
    name: "Portrait Photography", 
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    expected: "Low-Medium (0.1-0.3)"
  },
  {
    name: "Fashion Model",
    url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b", 
    expected: "Low-Medium (0.2-0.4)"
  },
  {
    name: "Fitness/Athletic",
    url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
    expected: "Low (0.001-0.1)"
  },
  {
    name: "Art/Sculpture",
    url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
    expected: "Variable (0.1-0.5)"
  },
  {
    name: "Wedding/Formal",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552",
    expected: "Very Low (0.001-0.05)"
  }
];

async function testNSFWDetection() {
  console.log('🧪 Starting Comprehensive NSFW Detection Test\n');
  
  for (const image of testImages) {
    try {
      console.log(`Testing: ${image.name}`);
      console.log(`URL: ${image.url}`);
      console.log(`Expected: ${image.expected}`);
      
      const response = await axios.post('http://localhost:5000/api/moderation/test-nsfw', {
        imageUrl: image.url
      });
      
      const result = response.data.data;
      const score = result.score;
      const percentage = (score * 100).toFixed(1);
      
      console.log(`✅ Result: ${score} (${percentage}%)`);
      console.log(`   Flagged: ${result.flagged ? 'YES' : 'NO'}`);
      console.log(`   Severity: ${result.severity}`);
      
      // Determine if result matches expectation
      let status = '✅ Expected';
      if (image.expected.includes('Very Low') && score > 0.05) status = '⚠️ Higher than expected';
      if (image.expected.includes('Low-Medium') && (score < 0.1 || score > 0.4)) status = '⚠️ Outside expected range';
      if (image.expected.includes('Variable')) status = '✅ Within variable range';
      
      console.log(`   Status: ${status}\n`);
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error testing ${image.name}:`, error.message);
      console.log('');
    }
  }
  
  console.log('🎉 NSFW Detection Test Complete!');
  console.log('\n📊 Score Interpretation:');
  console.log('   0.00-0.10: Very Safe Content');
  console.log('   0.10-0.30: Low Risk (portraits, fashion)');
  console.log('   0.30-0.60: Medium Risk (suggestive content)');
  console.log('   0.60-0.80: High Risk (likely inappropriate)');
  console.log('   0.80-1.00: Very High Risk (explicit content)');
}

// Run the test
testNSFWDetection().catch(console.error);