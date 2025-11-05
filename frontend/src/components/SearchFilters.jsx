import { useState } from 'react';
import { Search, Filter, X, ChevronDown, SortAsc, SortDesc } from 'lucide-react';

export default function SearchFilters({ onFilterChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    order: 'desc'
  });

  const categories = [
    { value: 'digital', label: 'Digital Art' },
    { value: 'painting', label: 'Painting' },
    { value: 'photography', label: 'Photography' },
    { value: 'sculpture', label: 'Sculpture' },
    { value: '3d', label: '3D Art' },
    { value: 'illustration', label: 'Illustration' },
    { value: 'mixed-media', label: 'Mixed Media' },
    { value: 'other', label: 'Other' }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Latest' },
    { value: 'stats.views', label: 'Most Viewed' },
    { value: 'stats.favorites', label: 'Most Favorited' },
    { value: 'price', label: 'Price' },
    { value: 'title', label: 'Title' }
  ];

  const handleChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'createdAt',
      order: 'desc'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = filters.search || filters.category || filters.minPrice || filters.maxPrice;

  return (
    <div className="card mb-8 animate-slide-up">
      <div className="card-body">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search artworks, artists, or tags..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="form-input pl-10"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 whitespace-nowrap`}
          >
            <Filter size={18} />
            Filters
            {hasActiveFilters && (
              <span className="badge badge-error ml-1">
                {[filters.search, filters.category, filters.minPrice, filters.maxPrice].filter(Boolean).length}
              </span>
            )}
            <ChevronDown 
              size={16} 
              className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-6 space-y-6 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category */}
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="form-group">
                <label className="form-label">Min Price ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={filters.minPrice}
                  onChange={(e) => handleChange('minPrice', e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Price ($)</label>
                <input
                  type="number"
                  placeholder="No limit"
                  min="0"
                  value={filters.maxPrice}
                  onChange={(e) => handleChange('maxPrice', e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Sort By */}
              <div className="form-group">
                <label className="form-label">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleChange('sortBy', e.target.value)}
                  className="form-input"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={clearFilters}
                className="btn btn-ghost text-sm flex items-center gap-2"
                disabled={!hasActiveFilters}
              >
                <X size={16} />
                Clear All Filters
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 font-medium">Sort Order:</span>
                <button
                  onClick={() => handleChange('order', filters.order === 'desc' ? 'asc' : 'desc')}
                  className="btn btn-secondary btn-sm flex items-center gap-2"
                >
                  {filters.order === 'desc' ? (
                    <>
                      <SortDesc size={16} />
                      Descending
                    </>
                  ) : (
                    <>
                      <SortAsc size={16} />
                      Ascending
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                {filters.search && (
                  <span className="badge badge-primary flex items-center gap-1">
                    Search: "{filters.search}"
                    <button onClick={() => handleChange('search', '')}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filters.category && (
                  <span className="badge badge-primary flex items-center gap-1">
                    {categories.find(c => c.value === filters.category)?.label}
                    <button onClick={() => handleChange('category', '')}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filters.minPrice && (
                  <span className="badge badge-primary flex items-center gap-1">
                    Min: ${filters.minPrice}
                    <button onClick={() => handleChange('minPrice', '')}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filters.maxPrice && (
                  <span className="badge badge-primary flex items-center gap-1">
                    Max: ${filters.maxPrice}
                    <button onClick={() => handleChange('maxPrice', '')}>
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
