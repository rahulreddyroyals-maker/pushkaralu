export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

/**
 * Grouped by workflow area rather than one flat 20+ item list — matches
 * spec §25's module list, organized so the sidebar stays scannable.
 * Only `/admin` has a real page in Sprint 1; the rest are placeholder
 * hrefs reserved for the sprint that implements each module.
 */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: "📊" }],
  },
  {
    title: "Content",
    items: [
      { label: "Events", href: "/admin/events", icon: "🗓️" },
      { label: "Ghats", href: "/admin/ghats", icon: "🌊" },
      { label: "Temples", href: "/admin/temples", icon: "🛕" },
      { label: "News", href: "/admin/news", icon: "📰" },
      { label: "SEO", href: "/admin/seo", icon: "🔍" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { label: "Hotels", href: "/admin/hotels", icon: "🏨" },
      { label: "Purohits", href: "/admin/purohits", icon: "🙏" },
      { label: "Transport", href: "/admin/transport", icon: "🚕" },
      { label: "Boats", href: "/admin/boats", icon: "🛶" },
      { label: "Businesses", href: "/admin/businesses", icon: "🏬" },
      { label: "Bookings", href: "/admin/bookings", icon: "📖" },
      { label: "Payments", href: "/admin/payments", icon: "💳" },
      { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
    ],
  },
  {
    title: "Safety & Operations",
    items: [
      { label: "Emergency", href: "/admin/emergency", icon: "🚑" },
      { label: "Lost & Found", href: "/admin/lost-and-found", icon: "🔎" },
      { label: "Notifications", href: "/admin/notifications", icon: "🔔" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Users", href: "/admin/users", icon: "👤" },
      { label: "Advertisements", href: "/admin/advertisements", icon: "📣" },
      { label: "Reports", href: "/admin/reports", icon: "📈" },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: "🧾" },
      { label: "Settings", href: "/admin/settings", icon: "⚙️" },
    ],
  },
];
