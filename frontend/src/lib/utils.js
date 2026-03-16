import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function getMethodColor(method) {
  const colors = {
    GET: "#10B981",
    POST: "#3B82F6",
    PUT: "#F59E0B",
    PATCH: "#8B5CF6",
    DELETE: "#EF4444",
    HEAD: "#06B6D4",
    OPTIONS: "#EC4899"
  };
  return colors[method.toUpperCase()] || "#64748B";
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function formatRelativeTime(date) {
  const now = /* @__PURE__ */ new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 6e4);
  const diffHours = Math.floor(diffMs / 36e5);
  const diffDays = Math.floor(diffMs / 864e5);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}
function generateInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
export {
  cn,
  copyToClipboard,
  formatDate,
  formatRelativeTime,
  generateInitials,
  getMethodColor,
  slugify
};
