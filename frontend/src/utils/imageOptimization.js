/**
 * Utility functions for image optimization
 */

/**
 * Generate optimized image URL with size parameters
 * @param {string} url - Original image URL
 * @param {number} width - Desired width
 * @param {number} quality - Image quality (1-100)
 * @returns {string} - Optimized image URL
 */
export function getOptimizedImageUrl(url, width = 400, quality = 80) {
  if (!url) return '';
  
  // If it's a Cloudinary URL, add transformation parameters
  if (url.includes('cloudinary.com')) {
    // Insert transformation parameters before the version or filename
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/w_${width},q_${quality},f_auto/${parts[1]}`;
    }
  }
  
  // For other URLs, return as-is
  return url;
}

/**
 * Generate srcset for responsive images
 * @param {string} url - Original image URL
 * @param {Array<number>} sizes - Array of widths for srcset
 * @returns {string} - srcset string
 */
export function generateSrcSet(url, sizes = [200, 400, 600]) {
  if (!url) return '';
  
  return sizes
    .map(size => `${getOptimizedImageUrl(url, size)} ${size}w`)
    .join(', ');
}

/**
 * Preload critical images
 * @param {string} url - Image URL to preload
 */
export function preloadImage(url) {
  if (!url) return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Lazy load image with intersection observer
 * @param {HTMLImageElement} img - Image element
 * @param {string} src - Image source URL
 */
export function lazyLoadImage(img, src) {
  if (!img || !src) return;
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    
    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = src;
  }
}
