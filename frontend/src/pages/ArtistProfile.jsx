// src/pages/ArtistProfile.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../lib/http";
import { useAuth } from "../contexts/AuthContext";
import FollowersModal from "../components/FollowersModal";
import ArtistHeader from "../components/ArtistHeader";
import ArtworksSection from "../components/ArtworksSection";
import AnalyticsSection from "../components/AnalyticsSection";
import ShareModal from "../components/ShareModal";
import "../styles/ArtistProfile.css";

export default function ArtistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [artist, setArtist] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [stats, setStats] = useState({
    totalArtworks: 0,
    totalViews: 0,
    totalSales: 0,
    followers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState("artworks");
  const [viewMode, setViewMode] = useState("grid");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState("followers");

  const isOwnProfile = user && user.id === id;

  /** =========================
   *  FETCH ARTIST + ARTWORKS
   *  ========================= */
  useEffect(() => {
    const controller = new AbortController();
    fetchArtistData(controller.signal);
    fetchArtworks(controller.signal);
    return () => controller.abort();
  }, [id]);

  /** -------------------------
   *  Fetch Artist Profile
   *  ------------------------- */
  const fetchArtistData = async (signal) => {
    try {
      setLoading(true);
      setFetchError(null);

      const resp = await http.get(`/api/users/${id}`, { signal });
      console.log("🧩 Raw API response:", resp);

      const payload = resp?.data ?? resp;

      if (!payload || typeof payload !== "object" || !payload._id) {
        console.error("⚠️ Invalid artist payload:", payload);
        setFetchError("Invalid or missing artist data from server.");
        setArtist(null);
        return;
      }

      console.log("🎨 Artist object parsed:", payload);

      const safeProfile = {
        avatar: payload.profile?.avatar ?? "",
        bio: payload.profile?.bio ?? "",
        location: payload.profile?.location ?? "",
        website: payload.profile?.website ?? "",
        socialLinks: payload.profile?.socialLinks ?? {},
      };

      setArtist({ ...payload, profile: safeProfile });

      setStats({
        totalArtworks: payload.totalArtworks ?? 0,
        totalViews: payload.totalViews ?? 0,
        totalSales: payload.totalSales ?? 0,
        followers: Array.isArray(payload.followers)
          ? payload.followers.length
          : 0,
      });

      setIsFollowing(
        Boolean(
          payload.isFollowing ??
          (Array.isArray(payload.followers) &&
            user?.id &&
            payload.followers.includes(user.id))
        )
      );
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("❌ Artist fetch failed:", err);
        setFetchError("Failed to load artist profile.");
      }
    } finally {
      setLoading(false);
    }
  };


  /** -------------------------
   *  Fetch Artworks
   *  ------------------------- */
  const fetchArtworks = async (signal) => {
    try {
      const resp = await http.get(`/api/users/${id}/artworks`, { signal });
      const resData = resp?.data?.data ?? resp?.data ?? [];
      console.log("🖼️ Artworks loaded:", resData);
      setArtworks(Array.isArray(resData) ? resData : []);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch artworks:", error);
      }
    }
  };

  /** -------------------------
   *  Follow / Unfollow Handler
   *  ------------------------- */
  const handleFollow = useCallback(async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      };
      await http.post(`/api/users/${id}/follow`, {}, { headers });
      setIsFollowing((prev) => !prev);
      setStats((prev) => ({
        ...prev,
        followers: prev.followers + (isFollowing ? -1 : 1),
      }));
    } catch (error) {
      console.error("❌ Follow action failed:", error);
    }
  }, [id, isFollowing]);

  /** -------------------------
   *  Render States
   *  ------------------------- */
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-b-2 border-blue-500 rounded-full" />
      </div>
    );

  console.log("🎨 Artist data received:", artist);

  if (fetchError)
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2 text-red-600">
          {fetchError}
        </h1>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
        >
          Go Home
        </button>
      </div>
    );

  if (!artist || artist.role?.toLowerCase() !== "artist")
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Artist Profile Not Found</h1>
        <p className="text-gray-500 mb-4">
          This profile is not an artist or does not exist.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Go Home
        </button>
      </div>
    );

  /** -------------------------
   *  MAIN RENDER
   *  ------------------------- */
  return (
    <div className="artist-profile min-h-screen bg-gray-50">
      {/* HEADER */}
      <ArtistHeader
        artist={artist}
        stats={stats}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        onFollow={handleFollow}
        onShare={() => setShowShareModal(true)}
        onFollowersModal={(type) => {
          setFollowersModalType(type);
          setShowFollowersModal(true);
        }}
      />

      {/* CONTENT TABS */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 border-b">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("artworks")}
              className={`pb-3 font-medium ${activeTab === "artworks"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Artworks
            </button>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => setActiveTab("drafts")}
                  className={`pb-3 font-medium ${activeTab === "drafts"
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Drafts
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`pb-3 font-medium ${activeTab === "analytics"
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Analytics
                </button>
              </>
            )}
          </div>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "artworks" && (
          <ArtworksSection
            artworks={artworks}
            isOwnProfile={isOwnProfile}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        )}

        {activeTab === "analytics" && isOwnProfile && (
          <AnalyticsSection stats={stats} />
        )}
      </div>

      {/* MODALS */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={id}
        type={followersModalType}
        title={
          followersModalType === "followers"
            ? `${artist.username}'s Followers`
            : `${artist.username} Following`
        }
      />
    </div>
  );
}
