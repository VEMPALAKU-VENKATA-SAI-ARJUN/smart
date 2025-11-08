import React from "react";
import { Card } from "./ui/card";
import { Star } from "lucide-react";

export default function ReviewList({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return <div className="text-gray-500">No reviews yet.</div>;
  }
  return (
    <div className="space-y-3">
      {reviews.map((review, idx) => (
        <Card key={review._id || idx} className="p-3">
          <div className="flex items-center mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < review.rating ? "text-yellow-400" : "text-gray-300"}`}
                fill={i < review.rating ? "#facc15" : "none"}
              />
            ))}
            <span className="ml-2 text-xs text-gray-500">{review.user?.username || "Anonymous"}</span>
          </div>
          <div className="text-sm">{review.comment}</div>
        </Card>
      ))}
    </div>
  );
}
