// src/components/AnalyticsSection.jsx
import { Eye, DollarSign, UserPlus, TrendingUp } from "lucide-react";

export default function AnalyticsSection({ stats }) {
  const cards = [
    {
      title: "Total Views",
      icon: <Eye className="text-blue-500 w-5 h-5" />,
      value: stats.totalViews,
      growth: "+12% from last month",
    },
    {
      title: "Total Sales",
      icon: <DollarSign className="text-green-500 w-5 h-5" />,
      value: `$${stats.totalSales}`,
      growth: "+8% from last month",
    },
    {
      title: "Followers",
      icon: <UserPlus className="text-purple-500 w-5 h-5" />,
      value: stats.followers,
      growth: "+23% from last month",
    },
    {
      title: "Engagement",
      icon: <TrendingUp className="text-orange-500 w-5 h-5" />,
      value: "4.2%",
      growth: "+1.3% from last month",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
            {card.icon}
          </div>
          <p className="text-3xl font-bold text-gray-900">{card.value}</p>
          <p className="text-sm text-green-600 mt-2">{card.growth}</p>
        </div>
      ))}
    </div>
  );
}
