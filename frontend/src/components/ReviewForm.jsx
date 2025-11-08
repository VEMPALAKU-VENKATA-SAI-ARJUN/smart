import React, { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Star } from "lucide-react";

const MAX_STARS = 5;

export default function ReviewForm({ onSubmit, submitting }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center mb-2">
        {[...Array(MAX_STARS)].map((_, i) => (
          <Star
            key={i}
            className={`w-6 h-6 cursor-pointer ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
            onClick={() => setRating(i + 1)}
            fill={i < rating ? "#facc15" : "none"}
          />
        ))}
      </div>
      <Textarea
        className="mb-2"
        rows={3}
        placeholder="Write your review..."
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      <Button
        disabled={submitting || rating === 0 || comment.trim() === ""}
        onClick={() => onSubmit({ rating, comment })}
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </Card>
  );
}
