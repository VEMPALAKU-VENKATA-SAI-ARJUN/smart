// src/components/ShareModal.jsx
import { Twitter } from "lucide-react";

export default function ShareModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Profile link copied!");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Share Profile</h3>
        <div className="space-y-3">
          <button
            onClick={copyLink}
            className="w-full border border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50 text-left"
          >
            Copy Profile Link
          </button>
          <button
            onClick={() =>
              window.open(
                `https://twitter.com/intent/tweet?url=${window.location.href}`,
                "_blank"
              )
            }
            className="w-full border border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Twitter className="w-5 h-5" /> Share on Twitter
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-600 hover:text-gray-900"
        >
          Close
        </button>
      </div>
    </div>
  );
}
