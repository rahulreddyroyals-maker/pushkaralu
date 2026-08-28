import type { Dictionary } from "../types";

/**
 * Telugu dictionary. Must satisfy the exact same shape as en.ts — TypeScript
 * will error at build time if a key is missing or extra, so translations
 * can never silently drift out of sync with the English source.
 */
const te: Dictionary = {
  common: {
    appName: "పుష్కరాలు",
    loading: "లోడ్ అవుతోంది...",
    error: "ఏదో తప్పు జరిగింది",
    retry: "మళ్ళీ ప్రయత్నించండి",
    viewAll: "అన్నీ చూడండి",
    seeDetails: "వివరాలు చూడండి",
    updatedAgo: "{{time}} క్రితం నవీకరించబడింది",
  },
  nav: {
    home: "హోమ్",
    explore: "అన్వేషించండి",
    services: "సేవలు",
    bookings: "బుకింగ్‌లు",
    profile: "ప్రొఫైల్",
  },
  home: {
    heroTitle: "పుష్కరాల కోసం మీ పూర్తి సహచరుడు",
    heroSubtitle: "ఘాట్‌లు, ఆలయాలు, హోటళ్లు, పురోహితులు, ప్రయాణం మరియు భద్రత — అన్నీ ఒకే చోట",
  },
};

export default te;
