import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, Users, UserPlus, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import http from '../lib/http';
import ArtistCard from '../components/ArtistCard';
import { useArtistPrefetch } from '../hooks/useIntersectionObserver';
import { useQueryClient } from '@tanstack/react-query';
import styles from '../styles/Following.module.css';

// Use Vite env or fallback to localhost backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Following() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [feedArtworks, setFeedArtworks] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [suggestedArtists, setSuggestedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  const [error, setError] = useState('');

  // Prefetch function for artist preview data
  const prefetchArtistPreview = (artistId) => {
    if (!artistId) return;
    
    queryClient.prefetchQuery({
      queryKey: ['artistPreview', artistId],
      queryFn: async () => {
        const headers = { 
          Authorization: `Bearer ${localStorage.getItem('auth_token')}` 
        };
        
        const response = await http.get(
          `/api/users/${artistId}/mini-preview`,
          { 
            headers,
            dedupeKey: `artist-preview:${artistId}`
          }
        );
        
        return response?.data?.data || response?.data;
      },
      staleTime: 30000,
    });
  };

  // Set up intersection observer for prefetching
  useArtistPrefetch(followingList, prefetchArtistPreview);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const controller = new AbortController();
    fetchFollowingData(controller.signal);
    return () => controller.abort();
  }, [user]);

  const fetchFollowingData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch following list
      const followingResp = await http.get(`/api/users/${user.id}/following`, { dedupeKey: `following-list:${user.id}` });
      const following = followingResp?.data?.data ?? followingResp?.data ?? [];
      setFollowingList(following);

      // Fetch feed artworks from followed artists
      if (following.length > 0) {
        const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
        const feedResp = await http.get('/api/artworks/feed', { headers, dedupeKey: `feed:${user.id}` });
        setFeedArtworks(feedResp?.data?.data ?? feedResp?.data ?? []);
      }

      // Fetch suggested artists
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      const suggestionsResp = await http.get('/api/users/suggestions', { headers, dedupeKey: `suggestions:${user.id}` });
      setSuggestedArtists(suggestionsResp?.data?.data ?? suggestionsResp?.data ?? []);

    } catch (error) {
      console.error('Error fetching following data:', error);
      setError('Failed to load following data');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (artistId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      await http.post(`/api/users/${artistId}/follow`, {}, { headers });
      // Refresh data (dedupe will help avoid duplicate heavy calls)
      fetchFollowingData();
    } catch (error) {
      console.error('Error following artist:', error);
    }
  };

  const handleUnfollow = async (artistId) => {
    try {
      // Optimistically update the UI by removing the artist from the list
      setFollowingList((prevList) => prevList.filter((artist) => artist._id !== artistId));
      
      // If we're on the feed tab and there are no more following, show empty state
      if (followingList.length === 1 && activeTab === 'feed') {
        setFeedArtworks([]);
      }
      
      // Invalidate the query cache for this artist's preview
      queryClient.invalidateQueries(['artistPreview', artistId]);
      
      // Optionally refresh the full data in the background
      // This will update follower counts and other data
      fetchFollowingData();
    } catch (error) {
      console.error('Error unfollowing artist:', error);
      // On error, refetch to restore the correct state
      fetchFollowingData();
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Following</h1>
          <p className={styles.subtitle}>Stay updated with your favorite artists</p>
        </div>

        {/* Tabs skeleton */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${styles.tabActive}`}>
            <Sparkles className={styles.tabIcon} />
            Feed
          </button>
          <button className={styles.tab}>
            <Users className={styles.tabIcon} />
            Following
          </button>
          <button className={styles.tab}>
            <TrendingUp className={styles.tabIcon} />
            Discover
          </button>
        </div>

        {/* Skeleton loaders */}
        <div className={styles.skeletonGrid}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonAvatar} />
              <div className={`${styles.skeletonText} ${styles.skeletonTextShort}`} />
              <div className={`${styles.skeletonText} ${styles.skeletonTextLong}`} />
              <div className={`${styles.skeletonText} ${styles.skeletonTextLong}`} />
              <div className={styles.skeletonButton} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Following</h1>
        <p className={styles.subtitle}>Stay updated with your favorite artists</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('feed')}
          className={`${styles.tab} ${activeTab === 'feed' ? styles.tabActive : ''}`}
        >
          <Sparkles className={styles.tabIcon} />
          Feed ({feedArtworks.length})
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`${styles.tab} ${activeTab === 'following' ? styles.tabActive : ''}`}
        >
          <Users className={styles.tabIcon} />
          Following ({followingList.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`${styles.tab} ${activeTab === 'suggestions' ? styles.tabActive : ''}`}
        >
          <TrendingUp className={styles.tabIcon} />
          Discover
        </button>
      </div>

      {/* Content */}
      {activeTab === 'feed' && (
        <div>
          {followingList.length === 0 ? (
            <div className={styles.emptyState}>
              <Users className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No Following Yet</h3>
              <p className={styles.emptyDescription}>
                Follow artists to see their latest artworks in your feed
              </p>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={styles.emptyButton}
              >
                Discover Artists
              </button>
            </div>
          ) : feedArtworks.length === 0 ? (
            <div className={styles.emptyState}>
              <Sparkles className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No New Artworks</h3>
              <p className={styles.emptyDescription}>
                The artists you follow haven't posted anything recently
              </p>
            </div>
          ) : (
            <div className={styles.feedGrid}>
              {feedArtworks.map((artwork) => (
                <div key={artwork._id} className={styles.feedArtworkCard}>
                  <div className={styles.feedArtworkImageContainer}>
                    <img
                      src={artwork.thumbnail}
                      alt={artwork.title}
                      className={styles.feedArtworkImage}
                    />
                    <div className={styles.feedArtworkPrice}>
                      ₹{artwork.price}
                    </div>
                  </div>
                  <div className={styles.feedArtworkContent}>
                    <div className={styles.feedArtworkArtist}>
                      <img
                        src={artwork.artist?.profile?.avatar || `https://ui-avatars.com/api/?name=${artwork.artist?.username}&size=32`}
                        alt={artwork.artist?.username}
                        className={styles.feedArtworkArtistAvatar}
                      />
                      <span className={styles.feedArtworkArtistName}>
                        {artwork.artist?.username}
                      </span>
                    </div>
                    <h3 className={styles.feedArtworkTitle}>{artwork.title}</h3>
                    <p className={styles.feedArtworkDescription}>
                      {artwork.description}
                    </p>
                    <div className={styles.feedArtworkFooter}>
                      <div className={styles.feedArtworkStats}>
                        <span className={styles.feedArtworkStat}>
                          <Eye className={styles.feedArtworkStatIcon} />
                          {artwork.stats?.views || 0}
                        </span>
                        <span className={styles.feedArtworkStat}>
                          <Heart className={styles.feedArtworkStatIcon} />
                          {artwork.stats?.likes || 0}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/artwork/${artwork._id}`)}
                        className={styles.feedArtworkViewButton}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div>
          {followingList.length === 0 ? (
            <div className={styles.emptyState}>
              <Users className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>Not Following Anyone</h3>
              <p className={styles.emptyDescription}>
                Start following artists to build your network
              </p>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={styles.emptyButton}
              >
                Find Artists to Follow
              </button>
            </div>
          ) : (
            <div className={styles.artistGrid}>
              {followingList.map((artist) => (
                <ArtistCard
                  key={artist._id}
                  artist={artist}
                  onUnfollow={handleUnfollow}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div>
          {suggestedArtists.length === 0 ? (
            <div className={styles.emptyState}>
              <TrendingUp className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No Suggestions Available</h3>
              <p className={styles.emptyDescription}>
                Check back later for artist recommendations
              </p>
            </div>
          ) : (
            <div className={styles.suggestionsGrid}>
              {suggestedArtists.map((artist) => (
                <div key={artist._id} className={styles.suggestionCard}>
                  <div className={styles.suggestionHeader}>
                    <img
                      src={artist.profile?.avatar || `https://ui-avatars.com/api/?name=${artist.username}&size=64`}
                      alt={artist.username}
                      className={styles.suggestionAvatar}
                    />
                    <div className={styles.suggestionInfo}>
                      <h3 className={styles.suggestionName}>{artist.username}</h3>
                      {artist.role === 'artist' && (
                        <span className={styles.suggestionRoleBadge}>
                          Artist
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {artist.profile?.bio && (
                    <p className={styles.suggestionBio}>
                      {artist.profile.bio}
                    </p>
                  )}
                  
                  <div className={styles.suggestionFooter}>
                    <div className={styles.suggestionFollowers}>
                      {artist.followers?.length || 0} followers
                    </div>
                    <div className={styles.suggestionActions}>
                      <button
                        onClick={() => navigate(`/profile/${artist._id}`)}
                        className={styles.suggestionViewButton}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleFollow(artist._id)}
                        className={styles.suggestionFollowButton}
                      >
                        <UserPlus size={12} />
                        Follow
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}