// src/components/ArtistHeader.jsx
import { Edit, Upload, Settings, UserPlus, Mail, Share2, CheckCircle, MapPin, Globe, DollarSign, Instagram, Twitter, Link as LinkIcon, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ArtistHeader({
  artist,
  stats,
  isOwnProfile,
  isFollowing,
  onFollow,
  onShare,
  onFollowersModal,
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Avatar */}
        <div className="relative">
          <img
            src={
              artist.profile?.avatar ||
              `https://ui-avatars.com/api/?name=${artist.username}`
            }
            alt={artist.username}
            className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-md"
          />
          {artist.isVerified && (
            <CheckCircle className="absolute bottom-2 right-2 w-6 h-6 text-blue-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {artist.username}
              </h1>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                Artist
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 sm:mt-0">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => navigate("/settings")}
                    className="btn-border"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => navigate("/upload")}
                    className="btn-blue"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="btn-border"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onFollow}
                    className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                      isFollowing
                        ? "bg-gray-200 text-gray-700"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    onClick={() => navigate(`/messages?user=${artist._id}`)}
                    className="btn-border"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={onShare} className="btn-border">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalArtworks}</div>
              <div className="text-sm text-gray-500">Artworks</div>
            </div>
            <button onClick={() => onFollowersModal("followers")}>
              <div className="text-2xl font-bold">
                {artist.followers?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Followers</div>
            </button>
            <button onClick={() => onFollowersModal("following")}>
              <div className="text-2xl font-bold">
                {artist.following?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Following</div>
            </button>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(stats.totalViews / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-gray-500">Views</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
