// src/components/ArtworksSection.jsx
import { Grid, List, Eye, Heart, Image as ImageIcon } from "lucide-react";
import ArtworkCard from "./ArtworkCard";
import { useNavigate } from "react-router-dom";

export default function ArtworksSection({
  artworks,
  isOwnProfile,
  viewMode,
  setViewMode,
}) {
  const navigate = useNavigate();

  if (!artworks.length)
    return (
      <div className="text-center py-16">
        <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-4">
          {isOwnProfile
            ? "You haven't posted any artworks yet"
            : "This artist hasn't posted any artworks yet"}
        </p>
        {isOwnProfile && (
          <button
            onClick={() => navigate("/upload")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Upload Your First Artwork
          </button>
        )}
      </div>
    );

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setViewMode("grid")}
          className={`p-2 rounded ${
            viewMode === "grid"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Grid className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`p-2 rounded ${
            viewMode === "list"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <List className="w-5 h-5" />
        </button>
      </div>

      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
            : "space-y-4"
        }
      >
        {artworks.map((artwork) =>
          viewMode === "grid" ? (
            <ArtworkCard key={artwork._id} artwork={artwork} />
          ) : (
            <div
              key={artwork._id}
              className="bg-white rounded-lg shadow-md p-4 flex gap-4 hover:shadow-lg transition"
            >
              <img
                loading="lazy"
                src={artwork.thumbnail}
                alt={artwork.title}
                className="w-24 h-24 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{artwork.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {artwork.description}
                </p>
                <div className="flex justify-between">
                  <span className="text-xl font-bold text-green-600">
                    ${artwork.price}
                  </span>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" /> {artwork.stats?.views ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />{" "}
                      {artwork.stats?.favorites ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
