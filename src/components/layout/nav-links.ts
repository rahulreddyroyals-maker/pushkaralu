import { ROUTES } from "@/config/app";

export interface NavLink {
  label: string;
  href: string;
}

/** Primary nav — kept short and high-intent for the header. Full directory lives in the footer. */
export const PRIMARY_NAV: NavLink[] = [
  { label: "Ghats", href: ROUTES.ghats },
  { label: "Temples", href: ROUTES.temples },
  { label: "Hotels", href: ROUTES.hotels },
  { label: "Purohits", href: ROUTES.purohits },
  { label: "Travel", href: ROUTES.travel },
  { label: "Emergency", href: ROUTES.emergency },
];

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: "Discover",
    links: [
      { label: "Ghats", href: ROUTES.ghats },
      { label: "Temples", href: ROUTES.temples },
      { label: "Tourism", href: ROUTES.tourism },
      { label: "Itineraries", href: ROUTES.itineraries },
      { label: "Travel Packages", href: ROUTES.packages },
      { label: "Events Calendar", href: ROUTES.events },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Hotels", href: ROUTES.hotels },
      { label: "Purohits", href: ROUTES.purohits },
      { label: "Rituals", href: ROUTES.rituals },
      { label: "Travel & Taxis", href: ROUTES.travel },
      { label: "Boats", href: ROUTES.boats },
      { label: "Restaurants", href: ROUTES.restaurants },
      { label: "Local Businesses", href: ROUTES.businesses },
      { label: "Guides", href: ROUTES.guides },
    ],
  },
  {
    title: "Safety",
    links: [
      { label: "Emergency", href: ROUTES.emergency },
      { label: "Parking", href: ROUTES.parking },
      { label: "Lost & Found", href: ROUTES.lostAndFound },
    ],
  },
  {
    title: "Business",
    links: [
      { label: "Register your business", href: ROUTES.registerBusiness },
      { label: "About", href: ROUTES.about },
      { label: "Contact", href: ROUTES.contact },
    ],
  },
];
