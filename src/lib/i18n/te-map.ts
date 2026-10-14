/**
 * English -> Telugu for the interface chrome (menus, buttons, form labels, home page).
 * Keyed by the exact English text so any string passed through tr() is translated when the
 * language is Telugu and left unchanged otherwise (and when a string has no entry yet).
 * Record content (names, descriptions) is translated per record via its `te` field in the admin forms.
 */
export const TE: Record<string, string> = {
  // navigation
  Pushkaralu: "పుష్కరాలు",
  Assistant: "సహాయకుడు", "AI Assistant": "AI సహాయకుడు", Ghats: "ఘాట్‌లు", Temples: "ఆలయాలు", Hotels: "హోటళ్లు", Purohits: "పురోహితులు",
  Travel: "ప్రయాణం", Emergency: "అత్యవసరం", Tourism: "పర్యాటకం", Itineraries: "ప్రయాణ ప్రణాళికలు", "Travel Packages": "ప్రయాణ ప్యాకేజీలు",
  "Events Calendar": "ఈవెంట్ క్యాలెండర్", Rituals: "పూజా విధులు", "Travel & Taxis": "ప్రయాణం & టాక్సీలు", Boats: "పడవలు", Restaurants: "రెస్టారెంట్లు",
  "Local Businesses": "స్థానిక వ్యాపారాలు", Guides: "గైడ్‌లు", Articles: "వ్యాసాలు", "Pilgrim Guides": "యాత్రికుల గైడ్‌లు", FAQs: "తరచుగా అడిగే ప్రశ్నలు",
  Locations: "ప్రదేశాలు", "Service Guides": "సేవా గైడ్‌లు", Parking: "పార్కింగ్", "Lost & Found": "పోయినవి & దొరికినవి", "Family Groups": "కుటుంబ గ్రూపులు",
  "Register your business": "మీ వ్యాపారాన్ని నమోదు చేయండి", About: "మా గురించి", Contact: "సంప్రదించండి", Terms: "నిబంధనలు", Privacy: "గోప్యత",
  "Refund Policy": "రీఫండ్ విధానం", Discover: "అన్వేషించండి", Services: "సేవలు", Learn: "తెలుసుకోండి", Safety: "భద్రత", Business: "వ్యాపారం",
  "All rights reserved.": "అన్ని హక్కులూ ఆరక్షితం.",
  // account
  Language: "భాష", "View profile": "ప్రొఫైల్ చూడండి", "Type a name to search hotels, temples, purohits and local businesses.": "హోటళ్లు, ఆలయాలు, పురోహితులు, స్థానిక వ్యాపారాల పేరు టైప్ చేయండి.",
  "Sign in": "సైన్ ఇన్", "Sign out": "సైన్ అవుట్", "Register business": "వ్యాపారం నమోదు", Admin: "అడ్మిన్", Profile: "ప్రొఫైల్",
  "Create account": "ఖాతా సృష్టించండి", "Creating account...": "ఖాతా సృష్టిస్తోంది...", "Create your account": "మీ ఖాతాను సృష్టించండి",
  "Join Pushkaralu to book services and save your favorites.": "సేవలు బుక్ చేయడానికి, ఇష్టమైనవి దాచుకోవడానికి పుష్కరాలులో చేరండి.",
  "Full name": "పూర్తి పేరు", Email: "ఇమెయిల్", Password: "పాస్‌వర్డ్", "Confirm password": "పాస్‌వర్డ్ నిర్ధారించండి",
  "At least 8 characters, with a letter and a number.": "కనీసం 8 అక్షరాలు, ఒక అక్షరం మరియు ఒక అంకె ఉండాలి.",
  "Continue with Google": "Google తో కొనసాగండి", OR: "లేదా", "Already have an account?": "ఇప్పటికే ఖాతా ఉందా?",
  "Welcome back": "తిరిగి స్వాగతం", "Sign in to your account": "మీ ఖాతాలోకి సైన్ ఇన్ చేయండి", "Forgot password?": "పాస్‌వర్డ్ మర్చిపోయారా?",
  "Don't have an account?": "ఖాతా లేదా?", "Sign up": "సైన్ అప్", "Signing in...": "సైన్ ఇన్ అవుతోంది...",
  "Incorrect email or password.": "ఇమెయిల్ లేదా పాస్‌వర్డ్ తప్పు.", "An account already exists with this email.": "ఈ ఇమెయిల్‌తో ఇప్పటికే ఖాతా ఉంది.",
  "Please choose a stronger password.": "దయచేసి బలమైన పాస్‌వర్డ్ ఎంచుకోండి.", "Something went wrong. Please try again.": "ఏదో తప్పు జరిగింది. మళ్ళీ ప్రయత్నించండి.",
  "Too many attempts. Please wait a moment and try again.": "చాలా ప్రయత్నాలు. కొద్దిసేపు ఆగి మళ్ళీ ప్రయత్నించండి.",
  "Network problem. Check your connection and try again.": "నెట్‌వర్క్ సమస్య. కనెక్షన్ చూసి మళ్ళీ ప్రయత్నించండి.",
  // home
  "Godavari Pushkaralu 2027": "గోదావరి పుష్కరాలు 2027", "Search ghats, temples, hotels, purohits...": "ఘాట్‌లు, ఆలయాలు, హోటళ్లు, పురోహితులను వెతకండి...", Search: "వెతకండి",
  "Everything for your visit": "మీ సందర్శనకు కావలసినవన్నీ", "Staff crowd updates": "సిబ్బంది ఇచ్చిన రద్దీ సమాచారం", "History & timings": "చరిత్ర & సమయాలు",
  "Stay near the ghats": "ఘాట్‌ల దగ్గర బస", "Book ritual services": "పూజా సేవలు బుక్ చేయండి", "Taxis & transfers": "టాక్సీలు & రవాణా", "River tourism": "నదీ పర్యాటకం",
  "Vegetarian & family": "శాకాహారం & కుటుంబం", "One-tap assistance": "ఒక్క ట్యాప్‌లో సహాయం",
  "Your complete companion for Pushkaralu": "పుష్కరాల కోసం మీ పూర్తి సహచరుడు",
  "Ghats, temples, hotels, priests, travel and safety — all in one place": "ఘాట్‌లు, ఆలయాలు, హోటళ్లు, పురోహితులు, ప్రయాణం మరియు భద్రత — అన్నీ ఒకే చోట",
  // generic
  Loading: "లోడ్ అవుతోంది", "Loading...": "లోడ్ అవుతోంది...", Save: "సేవ్", Cancel: "రద్దు", Submit: "సమర్పించండి", Delete: "తొలగించండి", Edit: "మార్చండి", Back: "వెనుకకు",
  Next: "తరువాత", "View all": "అన్నీ చూడండి", "See details": "వివరాలు చూడండి", "Try again": "మళ్ళీ ప్రయత్నించండి", "Book now": "ఇప్పుడే బుక్ చేయండి", Book: "బుక్ చేయండి",
  Send: "పంపండి", "New chat": "కొత్త చాట్", Open: "తెరవండి", Close: "మూసివేయండి", Status: "స్థితి", Phone: "ఫోన్", Address: "చిరునామా", Name: "పేరు",
  "No results found": "ఫలితాలు కనబడలేదు", "This couldn't load": "ఇది లోడ్ కాలేదు", "Check your connection and try again.": "కనెక్షన్ చూసి మళ్ళీ ప్రయత్నించండి.",
  "Open menu": "మెనూ తెరవండి", "Close menu": "మెనూ మూసివేయండి",
};
