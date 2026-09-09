import { useState } from "react";

export default function EngagementGraph({ data, title = "Engagement", graphId = "default" }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [activeMetric, setActiveMetric] = useState("views");

  if (!data || data.length === 0) return null;

  const metrics = {
    views: { label: "Views", color: "#3b82f6", lightColor: "rgba(59,130,246,0.1)" },
    likes: { label: "Likes", color: "#ef4444", lightColor: "rgba(239,68,68,0.1)" },
    comments: { label: "Comments", color: "#22c55e", lightColor: "rgba(34,197,94,0.1)" }
  };

  const metric = metrics[activeMetric];
  const values = data.map(d => d[activeMetric] || 0);
  const maxVal = Math.max(...values, 1);
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const points = values.map((val, i) => ({
    x: padding.left + (i / (values.length - 1 || 1)) * graphWidth,
    y: padding.top + graphHeight - (val / maxVal) * graphHeight,
    value: val,
    date: data[i]?.date
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${padding.top + graphHeight} L ${padding.left} ${padding.top + graphHeight} Z`;

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  const formatMonth = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
        <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {Object.entries(metrics).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeMetric === key
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-48"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={`gradient-${graphId}-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + graphHeight * (1 - ratio)}
              x2={padding.left + graphWidth}
              y2={padding.top + graphHeight * (1 - ratio)}
              stroke="currentColor"
              className="text-zinc-100 dark:text-zinc-800"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill={`url(#gradient-${graphId}-${activeMetric})`} />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={metric.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 5 : 3}
              fill={metric.color}
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}

          {/* X-axis labels */}
          {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1).map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={chartHeight - 5}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize="10"
            >
              {formatMonth(p.date)}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-zinc-900 dark:bg-zinc-800 text-white px-3 py-2 rounded-xl text-xs shadow-xl pointer-events-none transition-all z-10"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(hoveredPoint.y / chartHeight) * 100 - 15}%`,
              transform: "translate(-50%, -100%)"
            }}
          >
            <p className="font-semibold">{hoveredPoint.value.toLocaleString()} {metric.label.toLowerCase()}</p>
            <p className="text-zinc-400 text-[10px] mt-0.5">{formatMonth(hoveredPoint.date)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
