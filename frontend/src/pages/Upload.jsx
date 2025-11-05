// src/pages/Upload.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, X, Image as ImageIcon, Plus } from 'lucide-react';
import axios from 'axios';
import '../styles/Upload.css';

// Use Vite env or fallback to localhost backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Popular tags by category
const POPULAR_TAGS = {
  sketch: ['pencil-sketch', 'charcoal-sketch', 'digital-sketch', 'ink-sketch', 'watercolor-sketch'],
  digital: ['digital-art', 'concept-art', 'character-design', 'illustration', 'fantasy', 'sci-fi', 'cyberpunk', 'anime', 'game-art', 'matte-painting'],
  painting: ['oil-painting', 'watercolor', 'acrylic', 'canvas', 'portrait', 'landscape', 'still-life', 'abstract', 'impressionism', 'realism'],
  photography: ['portrait', 'landscape', 'street-photography', 'macro', 'nature', 'black-and-white', 'urban', 'wildlife', 'architecture', 'sunset'],
  sculpture: ['clay', 'bronze', 'marble', 'wood', 'metal', 'ceramic', 'stone', 'abstract-sculpture', 'figurative', 'modern-sculpture'],
  '3d': ['3d-modeling', 'blender', 'maya', 'cinema4d', 'zbrush', 'rendering', 'animation', 'low-poly', 'photorealistic', 'stylized'],
  illustration: ['vector', 'children-book', 'editorial', 'comic', 'manga', 'cartoon', 'logo-design', 'character-illustration', 'book-cover', 'poster'],
  'mixed-media': ['collage', 'mixed-media', 'experimental', 'texture', 'layered', 'multimedia', 'assemblage', 'found-objects', 'recycled-art', 'contemporary'],
  other: ['handmade', 'craft', 'textile', 'jewelry', 'ceramics', 'glass-art', 'printmaking', 'calligraphy', 'folk-art', 'installation']
};

// Common style and mood tags
const COMMON_TAGS = [
  // Styles
  'abstract', 'realistic', 'minimalist', 'vintage', 'modern', 'contemporary', 'surreal', 'pop-art', 'grunge', 'retro',
  // Colors
  'colorful', 'monochrome', 'black-and-white', 'vibrant', 'pastel', 'dark', 'bright', 'neon', 'earth-tones', 'blue-tones',
  // Moods
  'peaceful', 'energetic', 'dramatic', 'calm', 'mysterious', 'joyful', 'melancholic', 'romantic', 'powerful', 'serene',
  // Subjects
  'nature', 'animals', 'people', 'flowers', 'trees', 'ocean', 'mountains', 'city', 'space', 'fantasy-creatures',
  // Techniques
  'detailed', 'sketch', 'painterly', 'photorealistic', 'stylized', 'geometric', 'organic', 'textured', 'smooth', 'rough'
];

// Religious & Spiritual Tags
const RELIGIOUS_TAGS = [
  // Hindu Gods & Goddesses
  'krishna', 'rama', 'shiva', 'vishnu', 'ganesha', 'hanuman', 'durga', 'lakshmi', 'saraswati', 'kali',
  'brahma', 'indra', 'surya', 'chandra', 'radha', 'sita', 'parvati', 'rukmini', 'arjuna', 'bhima',
  // Other Religious Figures
  'buddha', 'jesus', 'mary', 'moses', 'muhammad', 'guru-nanak', 'mahavira', 'zoroaster',
  // Religious Themes
  'divine', 'spiritual', 'sacred', 'holy', 'blessed', 'devotional', 'prayer', 'meditation', 'temple', 'church',
  'mosque', 'gurudwara', 'monastery', 'pilgrimage', 'festival', 'ritual', 'ceremony', 'worship', 'faith', 'enlightenment'
];

// Celebrity & Entertainment Tags
const CELEBRITY_TAGS = [
  // Bollywood Actors
  'shah-rukh-khan', 'salman-khan', 'aamir-khan', 'akshay-kumar', 'hrithik-roshan', 'ranbir-kapoor', 'ranveer-singh',
  'deepika-padukone', 'priyanka-chopra', 'kareena-kapoor', 'katrina-kaif', 'alia-bhatt', 'anushka-sharma', 'sonam-kapoor',
  'amitabh-bachchan', 'rajinikanth', 'kamal-haasan', 'mahesh-babu', 'prabhas', 'allu-arjun', 'vijay', 'ajith',
  // Hollywood Actors
  'leonardo-dicaprio', 'brad-pitt', 'tom-cruise', 'will-smith', 'robert-downey-jr', 'chris-evans', 'scarlett-johansson',
  'jennifer-lawrence', 'angelina-jolie', 'johnny-depp', 'dwayne-johnson', 'ryan-reynolds', 'emma-stone', 'margot-robbie',
  // Musicians & Artists
  'michael-jackson', 'elvis-presley', 'madonna', 'beyonce', 'taylor-swift', 'ed-sheeran', 'adele', 'justin-bieber',
  'ar-rahman', 'lata-mangeshkar', 'kishore-kumar', 'mohammad-rafi', 'asha-bhosle', 'shreya-ghoshal', 'arijit-singh',
  // Sports Personalities
  'virat-kohli', 'ms-dhoni', 'sachin-tendulkar', 'lionel-messi', 'cristiano-ronaldo', 'lebron-james', 'serena-williams',
  // Entertainment Categories
  'bollywood', 'hollywood', 'tollywood', 'kollywood', 'celebrity-portrait', 'fan-art', 'movie-poster', 'album-cover',
  'concert', 'red-carpet', 'awards-show', 'premiere', 'behind-the-scenes', 'paparazzi-style'
];

// Historical & Mythological Tags
const HISTORICAL_TAGS = [
  // Indian Historical Figures
  'mahatma-gandhi', 'nehru', 'subhas-chandra-bose', 'bhagat-singh', 'rani-laxmibai', 'shivaji', 'akbar', 'ashoka',
  'chandragupta', 'harsha', 'tipu-sultan', 'maharana-pratap', 'chhatrapati-shivaji', 'rani-padmini', 'jhansi-ki-rani',
  // World Historical Figures
  'napoleon', 'cleopatra', 'julius-caesar', 'alexander-the-great', 'winston-churchill', 'abraham-lincoln', 'nelson-mandela',
  // Mythological Characters
  'hercules', 'thor', 'loki', 'zeus', 'athena', 'apollo', 'artemis', 'poseidon', 'hades', 'aphrodite',
  'odin', 'freya', 'balder', 'heimdall', 'valkyrie', 'dragon', 'phoenix', 'unicorn', 'griffin', 'pegasus',
  // Historical Themes
  'ancient', 'medieval', 'renaissance', 'baroque', 'victorian', 'art-deco', 'mythology', 'legend', 'folklore', 'epic'
];

// Expanded Common Tags with new categories
const EXPANDED_COMMON_TAGS = [
  ...COMMON_TAGS,
  ...RELIGIOUS_TAGS.slice(0, 15), // Add some religious tags to common
  ...CELEBRITY_TAGS.slice(0, 10), // Add some celebrity tags to common
  ...HISTORICAL_TAGS.slice(0, 10)  // Add some historical tags to common
];

export default function Upload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    price: '',
    status: 'pending'
  });

  // Enhanced tag system state
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const tagInputRef = useRef(null);

  // Success/Error state
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedArtwork, setUploadedArtwork] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get all available tags based on category
  const getAllTags = () => {
    const categoryTags = formData.category ? POPULAR_TAGS[formData.category] || [] : [];
    return [...new Set([...categoryTags, ...EXPANDED_COMMON_TAGS, ...RELIGIOUS_TAGS, ...CELEBRITY_TAGS, ...HISTORICAL_TAGS])];
  };

  // Filter suggestions based on input
  useEffect(() => {
    if (tagInput.trim()) {
      const allTags = getAllTags();
      const filtered = allTags.filter(tag =>
        tag.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTags.includes(tag)
      ).slice(0, 10);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [tagInput, selectedTags, formData.category]);

  // Update formData.tags when selectedTags changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      tags: selectedTags.join(', ')
    }));
  }, [selectedTags]);

  // Tag management functions
  const addTag = (tag) => {
    if (tag && !selectedTags.includes(tag) && selectedTags.length < 10) {
      setSelectedTags([...selectedTags, tag]);
      setTagInput('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput.trim());
      }
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const getPopularTagsForCategory = () => {
    if (formData.category) {
      return POPULAR_TAGS[formData.category] || [];
    }
    // When no category is selected, show a mix of popular tags from different categories
    return [
      ...COMMON_TAGS.slice(0, 4),
      ...RELIGIOUS_TAGS.slice(0, 2), // krishna, rama
      ...CELEBRITY_TAGS.slice(0, 2), // shah-rukh-khan, salman-khan
      ...HISTORICAL_TAGS.slice(0, 2)  // mahatma-gandhi, nehru
    ];
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    // Create preview URLs
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));

    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
  };

  const removeImage = (index) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      tags: '',
      price: '',
      status: 'pending'
    });
    setSelectedTags([]);
    setPreviews([]);
    setUploadSuccess(false);
    setUploadError('');
    setUploadedArtwork(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e, submitStatus = null) => {
    e.preventDefault();

    // Clear previous messages
    setUploadSuccess(false);
    setUploadError('');

    if (previews.length === 0) {
      setUploadError('Please upload at least one image');
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUploadError('Please log in to upload artwork');
      setTimeout(() => navigate('/auth'), 2000);
      return;
    }

    // Set the status based on which button was clicked
    const statusToSubmit = submitStatus || formData.status;

    // Update formData status for loading state
    setFormData(prev => ({ ...prev, status: statusToSubmit }));

    try {
      setLoading(true);
      setUploadProgress(10);

      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('tags', formData.tags);
      data.append('price', formData.price);
      data.append('status', statusToSubmit);

      previews.forEach(preview => {
        data.append('images', preview.file);
      });

      setUploadProgress(30);

      const res = await axios.post(`${API_URL}/api/artworks`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(30 + (progress * 0.6)); // 30-90% for upload
        }
      });

      setUploadProgress(100);

      // Show success message and stay on page
      setUploadSuccess(true);
      setUploadedArtwork(res.data.data);
      setUploadError('');

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.status === 401) {
        setUploadError('Please log in to upload artwork');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setTimeout(() => navigate('/auth'), 2000);
      } else {
        setUploadError(error.response?.data?.message || 'Upload failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
  <div className="container">
        {/* Header */}
        <div className="upload-header">
          <h1>Upload Your Artwork</h1>
          <p>
            Share your creativity with the world. Our AI-powered moderation ensures quality and safety.
          </p>
        </div>

        {/* Upload Progress */}
        {loading && (
          <div className="upload-progress">
            <div>
              <div>
                <svg className="upload-icon icon-small" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                </svg>
              </div>
              <div>
                <h3>
                  {formData.status === 'draft' ? 'Saving draft...' : 'Uploading artwork...'}
                </h3>
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p>
                    {uploadProgress < 30 ? 'Preparing upload...' :
                      uploadProgress < 90 ? 'Uploading images...' :
                        'Processing and analyzing...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Success Message */}
        {uploadSuccess && (
          <div className="upload-success">
            <div>
              <div>
                <div>
                  <svg className="icon-small icon-success" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3>
                  🎉 Artwork uploaded successfully!
                </h3>
                <div>
                  <p>
                    Your artwork "<strong>{uploadedArtwork?.title}</strong>" has been uploaded and is now {uploadedArtwork?.status === 'pending' ? 'pending review' : 'saved as draft'}.
                  </p>

                  {uploadedArtwork?.status === 'pending' && (
                    <div>
                      <div>
                        <svg className="icon-small icon-spacing" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>You will be notified once it's approved and goes live!</span>
                      </div>
                      <div>
                        🤖 AI moderation completed • Content analysis passed
                      </div>
                    </div>
                  )}

                  {uploadedArtwork?.status === 'draft' && (
                    <div>
                      <div>
                        <svg className="icon-small icon-spacing" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Draft saved! You can edit and submit it later from your dashboard.</span>
                      </div>
                    </div>
                  )}

                  {/* Artwork Preview */}
                  {uploadedArtwork?.thumbnail && (
                    <div>
                      <p className="preview-label">Preview:</p>
                      <div className="success-preview">
                        <img
                          src={uploadedArtwork.thumbnail}
                          alt={uploadedArtwork.title}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="submit-buttons">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-success"
                    >
                      <svg className="icon-small icon-spacing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Upload Another Artwork
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="btn btn-success-outline"
                    >
                      <svg className="icon-small icon-spacing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                      </svg>
                      Go to Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/gallery')}
                      className="btn btn-secondary"
                    >
                      <svg className="icon-small icon-spacing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Browse Gallery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="upload-error">
            <div>
              <div>
                <svg className="icon-medium icon-spacing" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3>
                  Upload Failed
                </h3>
                <div>
                  <p>{uploadError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Only show form if upload is not successful */}
        {!uploadSuccess && (
      <form onSubmit={handleSubmit} className="upload-form">
        {/* Image Upload */}
        <div className="form-section">
              <label className="form-label">
                Images (Max 5)
              </label>

              <div className="image-upload-zone">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="file-input-hidden"
                  id="image-upload"
                  disabled={previews.length >= 5}
                />
                <label htmlFor="image-upload" className="upload-click-area">
                  <UploadIcon className="upload-icon icon-medium icon-spacing" />
                  <p>
                    Click to upload or drag and drop
                  </p>
                  <p>
                    PNG, JPG, GIF up to 10MB
                  </p>
                </label>
              </div>

              {/* Image Previews */}
              {previews.length > 0 && (
                <div className="image-preview-grid">
                  {previews.map((preview, index) => (
                    <div key={index} className="image-preview-item">
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-image-btn"
                      >
                        <X className="icon-small" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="form-section">
              <label className="form-label">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-input"
                placeholder="Give your artwork a title"
              />
            </div>

            {/* Description */}
            <div className="form-section">
              <label className="form-label">
                Description *
              </label>
              <textarea
                required
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-textarea"
                placeholder="Describe your artwork..."
              />
            </div>

            <div className="two-column-row form-section">
              {/* Category */}
              <div>
                <label className="form-label">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select a category</option>
                  <option value="sketch">Sketch</option>
                  <option value="digital">Digital</option>
                  <option value="painting">Painting</option>
                  <option value="photography">Photography</option>
                  <option value="sculpture">Sculpture</option>
                  <option value="3d">3D</option>
                  <option value="illustration">Illustration</option>
                  <option value="mixed-media">Mixed Media</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="form-label">
                  Price (INR) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="form-input"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Enhanced Tags System */}
            <div className="form-section">
              <label className="form-label">
                Tags (Max 10) {selectedTags.length > 0 && <span className="muted-text">- {selectedTags.length}/10</span>}
              </label>

              {/* Selected Tags Display */}
              {selectedTags.length > 0 && (
                <div className="tags-container">
                  {selectedTags.map((tag, index) => (
                    <span key={index} className="tag-item">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="tag-remove-btn">
                        <X className="icon-small" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag Input with Autocomplete */}
              <div className="relative">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  onFocus={() => setShowSuggestions(tagInput.trim().length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="form-input"
                  placeholder={selectedTags.length < 10 ? "Type to search tags or press Enter to add custom tag..." : "Maximum tags reached"}
                  disabled={selectedTags.length >= 10}
                />

                {/* Autocomplete Suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="tag-suggestions">
                    {filteredSuggestions.map((tag, index) => (
                      <button key={index} type="button" onClick={() => addTag(tag)} className="tag-suggestion-item">
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Tags for Selected Category */}
              {formData.category && (
                <div className="mt-4">
                  <p className="small-muted">Popular tags for {formData.category}:</p>
                  <div className="popular-tags">
                    {getPopularTagsForCategory().slice(0, 8).map((tag, index) => (
                      !selectedTags.includes(tag) && (
                        <button
                          key={index}
                          type="button"
                          onClick={() => addTag(tag)}
                          disabled={selectedTags.length >= 10}
                          className="popular-tag-btn"
                        >
                          <Plus className="icon-small icon-spacing" />
                          {tag}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Common Tags (when no category selected) */}
              {!formData.category && (
                <div className="mt-4">
                  <p className="small-muted">Popular tags:</p>
                  <div className="popular-tags">
                    {COMMON_TAGS.slice(0, 8).map((tag, index) => (
                      !selectedTags.includes(tag) && (
                        <button
                          key={index}
                          type="button"
                          onClick={() => addTag(tag)}
                          disabled={selectedTags.length >= 10}
                          className="popular-tag-btn"
                        >
                          <Plus className="icon-small icon-spacing" />
                          {tag}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}

              <p className="hint-text">
                Type to search existing tags, press Enter to add custom tags, or click suggested tags above.
              </p>
            </div>



            {/* Enhanced Submit Buttons */}
            <div className="submit-buttons">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'draft')}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading && formData.status === 'draft' ? (
                  <>
                    <svg className="spinner icon-medium icon-spacing" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Draft...
                  </>
                ) : (
                  <>
                    <svg className="icon-medium icon-spacing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Save as Draft
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'pending')}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading && formData.status === 'pending' ? (
                  <>
                    <svg className="spinner icon-medium icon-spacing" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="icon-medium icon-spacing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit for Review
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

