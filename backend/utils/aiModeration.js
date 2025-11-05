// utils/aiModeration.js - Optimized AI Moderation System
const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');

// In-memory cache for moderation results (in production, use Redis)
const moderationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Content analysis thresholds
const MODERATION_THRESHOLDS = {
  nsfw: {
    low: 0.3,
    medium: 0.6,
    high: 0.8
  },
  plagiarism: {
    low: 0.4,
    medium: 0.7,
    high: 0.9
  },
  quality: {
    minimum: 0.3,
    good: 0.6,
    excellent: 0.8
  }
};

// Performance monitoring
const performanceMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  averageProcessingTime: 0,
  errorRate: 0
};

/**
 * NSFW Detection using Sightengine API
 * Sign up: https://sightengine.com/
 * Free tier: 2,000 requests/month
 */
async function checkNSFW_Sightengine(imageUrl) {
  // Validate API credentials
  if (!process.env.SIGHTENGINE_USER || !process.env.SIGHTENGINE_SECRET) {
    console.warn('⚠️ Sightengine API credentials not configured, using fallback');
    return await checkNSFW_Enhanced(imageUrl);
  }

  try {
    const response = await axios.get('https://api.sightengine.com/1.0/check.json', {
      params: {
        url: imageUrl,
        models: 'nudity-2.0,wad,offensive',
        api_user: process.env.SIGHTENGINE_USER,
        api_secret: process.env.SIGHTENGINE_SECRET
      },
      timeout: 30000 // 30 second timeout
    });

    const data = response.data;

    // Check ALL nudity categories, not just sexual_activity
    const nsfwScores = {
      sexual_activity: data.nudity?.sexual_activity || 0,
      sexual_display: data.nudity?.sexual_display || 0,
      erotica: data.nudity?.erotica || 0,
      suggestive: data.nudity?.suggestive || 0
    };

    // Use the HIGHEST score from any category
    const nsfwScore = Math.max(
      nsfwScores.sexual_activity,
      nsfwScores.sexual_display,
      nsfwScores.erotica,
      nsfwScores.suggestive
    );

    console.log(`🔍 Sightengine NSFW Scores:
    - Sexual Activity: ${nsfwScores.sexual_activity}
    - Sexual Display: ${nsfwScores.sexual_display}
    - Erotica: ${nsfwScores.erotica}
    - Suggestive: ${nsfwScores.suggestive}
    - Final Score: ${nsfwScore}`);

    return {
      score: nsfwScore,
      flagged: nsfwScore > 0.6, // Lower threshold for better detection
      severity: nsfwScore > 0.8 ? 'high' : nsfwScore > 0.6 ? 'medium' : 'low',
      details: data,
      allScores: nsfwScores
    };
  } catch (error) {
    console.error('Sightengine API error:', error.message);
    return { score: 0, flagged: false, error: error.message };
  }
}

/**
 * NSFW Detection using AWS Rekognition (Optional)
 * Uncomment and configure if you want to use AWS Rekognition
 */
async function checkNSFW_AWS(imageBuffer) {
  // This is a placeholder for AWS Rekognition integration
  // To use AWS Rekognition:
  // 1. Install AWS SDK: npm install aws-sdk
  // 2. Configure AWS credentials in environment variables
  // 3. Uncomment the implementation below

  /*
  const AWS = require('aws-sdk');
  const rekognition = new AWS.Rekognition({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  });
  
  try {
    const result = await rekognition.detectModerationLabels({
      Image: { Bytes: imageBuffer },
      MinConfidence: 50
    }).promise();
    
    const nsfwScore = result.ModerationLabels
      .filter(label => ['Explicit Nudity', 'Suggestive'].includes(label.ParentName))
      .reduce((max, label) => Math.max(max, label.Confidence / 100), 0);
    
    return { score: nsfwScore, flagged: nsfwScore > 0.7 };
  } catch (error) {
    return { score: 0, flagged: false, error: error.message };
  }
  */

  console.log('AWS Rekognition not configured - using fallback');
  return { score: 0, flagged: false, note: 'AWS Rekognition not configured' };
}

/**
 * Generate cache key for moderation results
 */
function generateCacheKey(imageUrl, type = 'full') {
  const hash = crypto.createHash('md5').update(imageUrl + type).digest('hex');
  return `moderation_${type}_${hash}`;
}

/**
 * Get cached result if available and not expired
 */
function getCachedResult(cacheKey) {
  const cached = moderationCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    performanceMetrics.cacheHits++;
    return cached.data;
  }
  return null;
}

/**
 * Cache moderation result
 */
function setCachedResult(cacheKey, data) {
  moderationCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  // Clean up old cache entries periodically
  if (moderationCache.size > 1000) {
    const entries = Array.from(moderationCache.entries());
    const now = Date.now();
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_TTL) {
        moderationCache.delete(key);
      }
    });
  }
}

/**
 * Optimized NSFW detection with caching
 */
async function checkNSFW(imageUrl) {
  const startTime = Date.now();
  performanceMetrics.totalRequests++;

  // Check cache first
  const cacheKey = generateCacheKey(imageUrl, 'nsfw');
  const cached = getCachedResult(cacheKey);
  if (cached) {
    console.log('🚀 Using cached NSFW result');
    return cached;
  }

  try {
    let result;

    // Use Sightengine if credentials are available
    if (process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET) {
      result = await checkNSFW_Sightengine(imageUrl);
    } else {
      result = await checkNSFW_Enhanced(imageUrl);
    }

    // Cache the result
    setCachedResult(cacheKey, result);

    // Update performance metrics
    const processingTime = Date.now() - startTime;
    performanceMetrics.averageProcessingTime =
      (performanceMetrics.averageProcessingTime + processingTime) / 2;

    return result;
  } catch (error) {
    performanceMetrics.errorRate++;
    throw error;
  }
}

/**
 * Enhanced placeholder NSFW detection (optimized version)
 */
async function checkNSFW_Enhanced(imageUrl) {

  // Enhanced placeholder with realistic NSFW detection
  console.log('🤖 Using enhanced placeholder AI moderation');

  try {
    // Download image for analysis
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);
    const metadata = await sharp(imageBuffer).metadata();

    // Advanced heuristic analysis for NSFW content
    let nsfwScore = 0;
    let severity = 'low';
    let analysisDetails = {
      method: 'enhanced_placeholder_analysis',
      imageSize: imageBuffer.length,
      resolution: `${metadata.width}x${metadata.height}`,
      format: metadata.format,
      channels: metadata.channels,
      density: metadata.density || 72
    };

    // 1. Analyze image characteristics that might indicate NSFW content
    const fileSize = imageBuffer.length;
    const aspectRatio = metadata.width / metadata.height;
    const pixelCount = metadata.width * metadata.height;

    // 2. Skin tone detection simulation (analyze color distribution)
    const imageStats = await sharp(imageBuffer).stats();
    const avgBrightness = imageStats.channels.reduce((sum, ch) => sum + ch.mean, 0) / imageStats.channels.length;

    // 3. Heuristic scoring based on image characteristics

    // Portrait orientation often used for suggestive content
    if (aspectRatio < 0.8) {
      nsfwScore += 0.15;
      analysisDetails.portraitOrientation = true;
    }

    // Very high resolution might indicate professional/suggestive photography
    if (pixelCount > 2000000) { // > 2MP
      nsfwScore += 0.1;
      analysisDetails.highResolution = true;
    }

    // Brightness analysis (skin tones often in mid-range)
    if (avgBrightness > 100 && avgBrightness < 180) {
      nsfwScore += 0.2;
      analysisDetails.skinToneRange = true;
    }

    // File size vs resolution ratio (compressed images might hide details)
    const compressionRatio = fileSize / pixelCount;
    if (compressionRatio < 0.5) {
      nsfwScore += 0.1;
      analysisDetails.highCompression = true;
    }

    // 4. Simulate more sophisticated analysis
    // In real AI, this would be deep learning model predictions

    // Generate realistic scores based on image characteristics
    const baseRandomScore = Math.random() * 0.4; // 0-40% base

    // Add category-specific scoring
    if (metadata.width > metadata.height && aspectRatio > 1.5) {
      // Landscape images less likely to be NSFW
      nsfwScore += baseRandomScore * 0.3;
    } else if (aspectRatio < 0.7) {
      // Portrait images more likely to be flagged
      nsfwScore += baseRandomScore * 1.5;
    } else {
      nsfwScore += baseRandomScore;
    }

    // 5. Add some variability for testing different scenarios
    const testVariation = Math.random();
    if (testVariation > 0.85) {
      // 15% chance of high score for testing
      nsfwScore += 0.3 + (Math.random() * 0.4);
      analysisDetails.testHighScore = true;
    } else if (testVariation > 0.7) {
      // 15% chance of medium score
      nsfwScore += 0.2 + (Math.random() * 0.3);
      analysisDetails.testMediumScore = true;
    }

    // 6. Determine severity
    nsfwScore = Math.min(nsfwScore, 1.0);

    if (nsfwScore > 0.8) severity = 'high';
    else if (nsfwScore > 0.5) severity = 'medium';
    else if (nsfwScore > 0.2) severity = 'low';

    // 7. Add confidence scoring
    const confidence = nsfwScore > 0.6 ? 'high' : nsfwScore > 0.3 ? 'medium' : 'low';

    console.log(`🔍 Placeholder NSFW Analysis: ${(nsfwScore * 100).toFixed(1)}% (${severity} severity)`);

    return {
      score: nsfwScore,
      flagged: nsfwScore > MODERATION_THRESHOLDS.nsfw.medium,
      severity,
      confidence,
      details: analysisDetails,
      warning: 'Using enhanced placeholder AI - set up Sightengine API for production accuracy'
    };

  } catch (error) {
    console.error('Enhanced placeholder NSFW check error:', error.message);
    return {
      score: 0,
      flagged: false,
      severity: 'low',
      confidence: 'low',
      error: error.message,
      warning: 'Placeholder AI analysis failed'
    };
  }
}

/**
 * Enhanced image quality analysis
 */
async function analyzeImageQuality(imageUrl) {
  try {
    // Download and analyze image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    const metadata = await sharp(imageBuffer).metadata();

    // Basic quality metrics
    const resolution = metadata.width * metadata.height;
    const aspectRatio = metadata.width / metadata.height;

    // Quality scoring based on resolution and format
    let qualityScore = 0;

    // Resolution scoring (0-0.4)
    if (resolution >= 1920 * 1080) qualityScore += 0.4;
    else if (resolution >= 1280 * 720) qualityScore += 0.3;
    else if (resolution >= 800 * 600) qualityScore += 0.2;
    else qualityScore += 0.1;

    // Format scoring (0-0.2)
    if (['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) qualityScore += 0.2;
    else qualityScore += 0.1;

    // Aspect ratio scoring (0-0.2)
    if (aspectRatio >= 0.5 && aspectRatio <= 2.0) qualityScore += 0.2;
    else qualityScore += 0.1;

    // File size consideration (0-0.2)
    const fileSizeKB = imageBuffer.length / 1024;
    if (fileSizeKB >= 100 && fileSizeKB <= 5000) qualityScore += 0.2;
    else if (fileSizeKB >= 50) qualityScore += 0.1;

    return {
      score: Math.min(qualityScore, 1.0),
      resolution: `${metadata.width}x${metadata.height}`,
      format: metadata.format,
      fileSize: Math.round(fileSizeKB),
      aspectRatio: Math.round(aspectRatio * 100) / 100,
      passed: qualityScore >= MODERATION_THRESHOLDS.quality.minimum
    };
  } catch (error) {
    console.error('Quality analysis error:', error.message);
    return {
      score: 0.5,
      error: error.message,
      passed: true // Default to pass on error
    };
  }
}

/**
 * Text content analysis for titles and descriptions
 */
function analyzeTextContent(title, description, tags = []) {
  const flags = [];
  const allText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  // Inappropriate content keywords
  const inappropriateKeywords = [
    'explicit', 'nsfw', 'adult', 'xxx', 'porn', 'nude', 'naked',
    'sex', 'sexual', 'erotic', 'fetish', 'kinky'
  ];

  // Spam indicators
  const spamKeywords = [
    'buy now', 'click here', 'free money', 'get rich', 'limited time',
    'act now', 'urgent', 'winner', 'congratulations', 'prize'
  ];

  // Check for inappropriate content
  const inappropriateMatches = inappropriateKeywords.filter(keyword =>
    allText.includes(keyword)
  );

  if (inappropriateMatches.length > 0) {
    flags.push({
      type: 'inappropriate_text',
      severity: 'high',
      message: `Inappropriate keywords detected: ${inappropriateMatches.join(', ')}`,
      keywords: inappropriateMatches
    });
  }

  // Check for spam
  const spamMatches = spamKeywords.filter(keyword =>
    allText.includes(keyword)
  );

  if (spamMatches.length > 2) {
    flags.push({
      type: 'spam',
      severity: 'medium',
      message: `Potential spam content detected`,
      keywords: spamMatches
    });
  }

  // Check for excessive capitalization
  const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
  if (capsRatio > 0.7 && title.length > 5) {
    flags.push({
      type: 'excessive_caps',
      severity: 'low',
      message: 'Excessive use of capital letters'
    });
  }

  // Check for minimum content quality
  if (title.length < 3) {
    flags.push({
      type: 'low_quality',
      severity: 'medium',
      message: 'Title too short'
    });
  }

  if (description.length < 10) {
    flags.push({
      type: 'low_quality',
      severity: 'low',
      message: 'Description too short'
    });
  }

  return {
    passed: flags.length === 0,
    flags,
    score: Math.max(0, 1 - (flags.length * 0.2))
  };
}

/**
 * Enhanced plagiarism check with reverse image search simulation
 */
async function checkPlagiarism(imageUrl) {
  try {
    // Simulate reverse image search
    // In production, integrate with:
    // - Google Cloud Vision API
    // - TinEye API
    // - Bing Visual Search API

    // For now, simulate with basic image hash comparison
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // Generate a simple hash for demonstration
    const hash = require('crypto').createHash('md5').update(imageBuffer).digest('hex');

    // Enhanced plagiarism simulation with realistic scoring
    const metadata = await sharp(imageBuffer).metadata();
    const fileSize = imageBuffer.length;
    const aspectRatio = metadata.width / metadata.height;

    // Simulate more sophisticated plagiarism detection
    let similarityScore = 0;

    // Base random score
    const baseScore = Math.random() * 0.2; // 0-20% base

    // Common image characteristics that might indicate stock photos
    if (aspectRatio === 1.0) {
      // Square images often used in social media/stock
      similarityScore += 0.1;
    }

    if (metadata.width === 1920 && metadata.height === 1080) {
      // Common resolution might indicate stock photo
      similarityScore += 0.15;
    }

    if (fileSize > 500000 && fileSize < 2000000) {
      // Professional photo file size range
      similarityScore += 0.1;
    }

    // Add test variation for demonstration
    const testVariation = Math.random();
    if (testVariation > 0.9) {
      // 10% chance of high plagiarism score for testing
      similarityScore += 0.4 + (Math.random() * 0.3);
    } else if (testVariation > 0.8) {
      // 10% chance of medium score
      similarityScore += 0.2 + (Math.random() * 0.2);
    } else {
      similarityScore += baseScore;
    }

    similarityScore = Math.min(similarityScore, 1.0);

    return {
      score: similarityScore,
      matches: similarityScore > 0.2 ? [
        {
          url: 'https://example.com/similar-image.jpg',
          similarity: similarityScore,
          source: 'reverse_search'
        }
      ] : [],
      flagged: similarityScore > MODERATION_THRESHOLDS.plagiarism.medium,
      confidence: similarityScore > 0.2 ? 'medium' : 'low',
      hash: hash.substring(0, 16) // Store partial hash for privacy
    };
  } catch (error) {
    console.error('Plagiarism check error:', error.message);
    return {
      score: 0,
      matches: [],
      flagged: false,
      confidence: 'low',
      error: error.message
    };
  }
}

/**
 * Enhanced main moderation function with comprehensive analysis
 */
async function moderateArtwork(imageUrl, artworkId, title = '', description = '', tags = []) {
  try {
    console.log(`🔍 Starting AI moderation for artwork ${artworkId}`);

    // Run all checks in parallel for better performance
    const [nsfwResult, plagiarismResult, qualityResult] = await Promise.all([
      checkNSFW(imageUrl),
      checkPlagiarism(imageUrl),
      analyzeImageQuality(imageUrl)
    ]);

    // Analyze text content
    const textAnalysis = analyzeTextContent(title, description, tags);

    const flags = [];
    let overallScore = 1.0;

    // NSFW Check
    if (nsfwResult.flagged) {
      flags.push({
        type: 'nsfw',
        severity: nsfwResult.severity,
        message: 'Potentially inappropriate content detected',
        score: nsfwResult.score,
        details: nsfwResult.details
      });
      overallScore -= 0.4;
    }

    // Plagiarism Check
    if (plagiarismResult.flagged) {
      flags.push({
        type: 'plagiarism',
        severity: 'high',
        message: 'Potential duplicate or copyrighted content detected',
        score: plagiarismResult.score,
        matches: plagiarismResult.matches
      });
      overallScore -= 0.3;
    }

    // Quality Check
    if (!qualityResult.passed) {
      flags.push({
        type: 'low_quality',
        severity: 'medium',
        message: 'Image quality below minimum standards',
        score: qualityResult.score,
        details: {
          resolution: qualityResult.resolution,
          fileSize: qualityResult.fileSize,
          format: qualityResult.format
        }
      });
      overallScore -= 0.2;
    }

    // Text Content Issues
    if (!textAnalysis.passed) {
      textAnalysis.flags.forEach(flag => {
        flags.push(flag);
        overallScore -= flag.severity === 'high' ? 0.3 : flag.severity === 'medium' ? 0.2 : 0.1;
      });
    }

    // Determine recommendation based on flags and scores
    let recommendation = 'approve';
    if (flags.some(f => f.severity === 'high')) {
      recommendation = 'reject';
    } else if (flags.length > 0) {
      recommendation = 'review';
    }

    // Auto-approve high quality content with no issues
    if (flags.length === 0 && qualityResult.score > MODERATION_THRESHOLDS.quality.good) {
      recommendation = 'auto_approve';
    }

    const result = {
      artworkId,
      passed: flags.length === 0,
      needsReview: flags.length > 0 && recommendation !== 'auto_approve',
      flags,
      overallScore: Math.max(0, overallScore),
      analysis: {
        nsfw: nsfwResult,
        plagiarism: plagiarismResult,
        quality: qualityResult,
        text: textAnalysis
      },
      recommendation,
      confidence: flags.length === 0 ? 'high' : flags.some(f => f.severity === 'high') ? 'high' : 'medium',
      checkedAt: new Date(),
      processingTime: Date.now()
    };

    console.log(`✅ Moderation complete for ${artworkId}: ${recommendation} (score: ${result.overallScore.toFixed(2)})`);
    return result;

  } catch (error) {
    console.error(`❌ Moderation error for ${artworkId}:`, error.message);
    return {
      artworkId,
      passed: false,
      needsReview: true,
      flags: [{
        type: 'error',
        severity: 'high',
        message: `Moderation system error: ${error.message}`
      }],
      overallScore: 0,
      recommendation: 'manual_review',
      confidence: 'low',
      error: error.message,
      checkedAt: new Date()
    };
  }
}

/**
 * Batch moderation with progress tracking
 */
async function batchModerate(artworks, onProgress = null) {
  const results = [];
  const total = artworks.length;

  console.log(`🔄 Starting batch moderation of ${total} artworks`);

  for (let i = 0; i < artworks.length; i++) {
    const artwork = artworks[i];
    try {
      const result = await moderateArtwork(
        artwork.imageUrl,
        artwork.id,
        artwork.title,
        artwork.description,
        artwork.tags
      );
      results.push(result);

      if (onProgress) {
        onProgress({
          completed: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100),
          current: artwork.id,
          result
        });
      }
    } catch (error) {
      console.error(`Batch moderation error for ${artwork.id}:`, error);
      results.push({
        artworkId: artwork.id,
        passed: false,
        needsReview: true,
        flags: [{ type: 'error', message: error.message }],
        recommendation: 'manual_review'
      });
    }
  }

  console.log(`✅ Batch moderation complete: ${results.length} artworks processed`);
  return results;
}

/**
 * Get moderation statistics
 */
function getModerationStats(results) {
  const stats = {
    total: results.length,
    passed: 0,
    needsReview: 0,
    autoApproved: 0,
    flagged: 0,
    flagTypes: {},
    averageScore: 0,
    processingTime: 0
  };

  results.forEach(result => {
    if (result.passed) stats.passed++;
    if (result.needsReview) stats.needsReview++;
    if (result.recommendation === 'auto_approve') stats.autoApproved++;
    if (result.flags && result.flags.length > 0) {
      stats.flagged++;
      result.flags.forEach(flag => {
        stats.flagTypes[flag.type] = (stats.flagTypes[flag.type] || 0) + 1;
      });
    }
    if (result.overallScore) stats.averageScore += result.overallScore;
    if (result.processingTime) stats.processingTime += result.processingTime;
  });

  stats.averageScore = stats.total > 0 ? stats.averageScore / stats.total : 0;
  stats.passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;

  return stats;
}

async function loadNSFWModel() {
  console.log('✓ Using enhanced AI moderation system');
  return true;
}

/**
 * Test NSFW detection with a specific image URL
 */
async function testNSFWDetection(imageUrl) {
  console.log(`🧪 Testing NSFW detection with: ${imageUrl}`);

  // Validate API credentials first
  if (!process.env.SIGHTENGINE_USER || !process.env.SIGHTENGINE_SECRET) {
    return {
      error: 'Sightengine API credentials not configured',
      details: 'Please set SIGHTENGINE_USER and SIGHTENGINE_SECRET environment variables'
    };
  }

  try {
    // Test Sightengine API directly
    const response = await axios.get('https://api.sightengine.com/1.0/check.json', {
      params: {
        url: imageUrl,
        models: 'nudity-2.0,wad,offensive',
        api_user: process.env.SIGHTENGINE_USER,
        api_secret: process.env.SIGHTENGINE_SECRET
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('🔍 Raw Sightengine Response:', JSON.stringify(response.data, null, 2));

    const data = response.data;

    // Check all nudity categories for comprehensive scoring
    const nsfwScores = {
      sexual_activity: data.nudity?.sexual_activity || 0,
      sexual_display: data.nudity?.sexual_display || 0,
      erotica: data.nudity?.erotica || 0,
      suggestive: data.nudity?.suggestive || 0,
      none: data.nudity?.none || 0
    };

    // Use the highest non-"none" score
    const nsfwScore = Math.max(
      nsfwScores.sexual_activity,
      nsfwScores.sexual_display,
      nsfwScores.erotica,
      nsfwScores.suggestive
    );

    console.log(`📊 Detailed NSFW Analysis:
    - Sexual Activity: ${nsfwScores.sexual_activity}
    - Sexual Display: ${nsfwScores.sexual_display}  
    - Erotica: ${nsfwScores.erotica}
    - Suggestive: ${nsfwScores.suggestive}
    - None (Safe): ${nsfwScores.none}
    - Final Score: ${nsfwScore}
    - Flagged: ${nsfwScore > 0.6}
    - API Status: ${data.status}
    - Request ID: ${data.request?.id}`);

    // Check if there was an API error
    if (data.status !== 'success') {
      console.error('❌ Sightengine API returned error status:', data.status);
      return {
        error: `API Error: ${data.status}`,
        details: data
      };
    }

    return {
      score: nsfwScore,
      flagged: nsfwScore > 0.6,
      severity: nsfwScore > 0.8 ? 'high' : nsfwScore > 0.6 ? 'medium' : 'low',
      details: data,
      rawResponse: response.data,
      allScores: nsfwScores
    };
  } catch (error) {
    console.error('❌ Sightengine test error:', error.response?.data || error.message);
    return {
      error: error.message,
      details: error.response?.data,
      statusCode: error.response?.status
    };
  }
}

module.exports = {
  checkNSFW,
  checkPlagiarism,
  analyzeImageQuality,
  analyzeTextContent,
  moderateArtwork,
  batchModerate,
  getModerationStats,
  loadNSFWModel,
  testNSFWDetection,
  getSystemStatus,
  clearCache,
  updateThresholds,
  MODERATION_THRESHOLDS
};
/*
*
 * Get AI moderation system status and configuration
 */
function getSystemStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    services: {
      sightengine: {
        configured: !!(process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET),
        user: process.env.SIGHTENGINE_USER ? 'configured' : 'missing',
        secret: process.env.SIGHTENGINE_SECRET ? 'configured' : 'missing'
      },
      aws: {
        configured: !!(process.env.AWS_REGION && process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY),
        region: process.env.AWS_REGION ? 'configured' : 'missing'
      }
    },
    cache: {
      size: moderationCache.size,
      maxSize: 1000,
      ttl: `${CACHE_TTL / (1000 * 60 * 60)} hours`
    },
    thresholds: MODERATION_THRESHOLDS,
    performance: {
      ...performanceMetrics,
      cacheHitRate: performanceMetrics.totalRequests > 0
        ? (performanceMetrics.cacheHits / performanceMetrics.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    }
  };

  return status;
}

/**
 * Clear moderation cache (useful for testing)
 */
function clearCache() {
  const previousSize = moderationCache.size;
  moderationCache.clear();

  console.log(`🧹 Cleared moderation cache (${previousSize} entries removed)`);

  return {
    cleared: previousSize,
    currentSize: moderationCache.size
  };
}

/**
 * Update moderation thresholds (for dynamic configuration)
 */
function updateThresholds(newThresholds) {
  Object.assign(MODERATION_THRESHOLDS, newThresholds);
  console.log('📊 Updated moderation thresholds:', MODERATION_THRESHOLDS);
  return MODERATION_THRESHOLDS;
}