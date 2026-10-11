import type { Lang } from "./types";

/** Labels for verified-data facts. Written by us, in both languages — never model-generated. */
const EN = {
  dates: "Dates", status: "Platform status", river: "River", about: "About", announced: "Published",
  facilities: "Facilities", crowd: "Crowd", crowdNotReported: "Crowd not reported", crowdManual: "entered manually by event staff", updated: "updated", mayBeOutdated: "may be outdated",
  openState: "Open/closed", openNotReported: "Open/closed status not reported", open: "Open", closed: "Closed", wait: "Queue", alternative: "Alternative ghat suggested", note: "Staff note", parking: "Parking info", medical: "Medical info",
  timings: "Timings (as listed)", address: "Address", distance: "Distance", straight: "straight-line, not a travel time", nearby: "Nearby", order: "Suggested order",
  price: "Listed price", perNight: "per night", priceNotListed: "Price not listed", availabilityNote: "Room availability is not shown here — confirm with the hotel",
  amenities: "Amenities", languages: "Languages", experience: "Experience", years: "years", pricingProvider: "Pricing (as stated by the purohit)", availabilityProvider: "Availability (as stated by the purohit)",
  type: "Type", area: "Service area", pickup: "Pickup / terminal", fare: "Fare", indicative: "indicative", onRequest: "On request (no published price)", hours: "Operating hours", departures: "Timetable",
  capacity: "Capacity", vehicles: "vehicles", parkingStatus: "Parking status", hoursOpen: "Hours",
  phone: "Phone", altPhone: "Alternate phone", open24: "Open 24 hours", verified: "Verified on", source: "Verification source", staleVerify: "Verification is older than recommended — please confirm by phone",
  duration: "Duration", days: "days", suitable: "Suitable for", plan: "Plan", tips: "Tips", nights: "nights", from: "From (per person, indicative)", departureCity: "Departs from",
  section: "Section", summary: "Summary",
  manualNote: "Entered manually by event staff, not a live sensor", providerNote: "Provider-listed — confirm before you travel", officialNote: "Official announcement as published on the platform", editorialNote: "Written by the Pushkaralu team",
  confirmPrice: "Final prices and availability must be confirmed with the provider",
} as const;

const TE: Record<keyof typeof EN, string> = {
  dates: "తేదీలు", status: "ప్లాట్‌ఫాం స్థితి", river: "నది", about: "వివరాలు", announced: "ప్రచురించిన సమయం",
  facilities: "సౌకర్యాలు", crowd: "రద్దీ", crowdNotReported: "రద్దీ సమాచారం ఇవ్వలేదు", crowdManual: "ఈవెంట్ సిబ్బంది చేతితో నమోదు చేశారు", updated: "నవీకరణ", mayBeOutdated: "పాతది కావచ్చు",
  openState: "తెరిచి/మూసి", openNotReported: "తెరిచి ఉందా మూసి ఉందా అనే సమాచారం లేదు", open: "తెరిచి ఉంది", closed: "మూసి ఉంది", wait: "క్యూ", alternative: "సూచించిన ప్రత్యామ్నాయ ఘాట్", note: "సిబ్బంది గమనిక", parking: "పార్కింగ్ సమాచారం", medical: "వైద్య సమాచారం",
  timings: "సమయాలు (జాబితా ప్రకారం)", address: "చిరునామా", distance: "దూరం", straight: "నేరుగా దూరం, ప్రయాణ సమయం కాదు", nearby: "సమీపంలో", order: "సూచించిన క్రమం",
  price: "జాబితా చేసిన ధర", perNight: "రాత్రికి", priceNotListed: "ధర ఇవ్వలేదు", availabilityNote: "గదుల లభ్యత ఇక్కడ చూపబడదు — హోటల్‌తో నిర్ధారించుకోండి",
  amenities: "సౌకర్యాలు", languages: "భాషలు", experience: "అనుభవం", years: "సంవత్సరాలు", pricingProvider: "ధరలు (పురోహితుడు తెలిపినవి)", availabilityProvider: "లభ్యత (పురోహితుడు తెలిపినది)",
  type: "రకం", area: "సేవా ప్రాంతం", pickup: "పికప్ / టెర్మినల్", fare: "ఛార్జీ", indicative: "సూచనాత్మకం", onRequest: "అడిగినప్పుడు (ధర ప్రచురించలేదు)", hours: "పని వేళలు", departures: "టైమ్‌టేబుల్",
  capacity: "సామర్థ్యం", vehicles: "వాహనాలు", parkingStatus: "పార్కింగ్ స్థితి", hoursOpen: "వేళలు",
  phone: "ఫోన్", altPhone: "ప్రత్యామ్నాయ ఫోన్", open24: "24 గంటలూ తెరిచి ఉంటుంది", verified: "ధృవీకరించిన తేదీ", source: "ధృవీకరణ ఆధారం", staleVerify: "ధృవీకరణ పాతది — దయచేసి ఫోన్ చేసి నిర్ధారించుకోండి",
  duration: "వ్యవధి", days: "రోజులు", suitable: "వీరికి అనుకూలం", plan: "ప్రణాళిక", tips: "సూచనలు", nights: "రాత్రులు", from: "ప్రారంభ ధర (ఒక్కొక్కరికి, సూచనాత్మకం)", departureCity: "బయలుదేరే నగరం",
  section: "విభాగం", summary: "సారాంశం",
  manualNote: "ఈవెంట్ సిబ్బంది చేతితో నమోదు చేశారు, లైవ్ సెన్సార్ కాదు", providerNote: "ప్రొవైడర్ ఇచ్చిన వివరాలు — ప్రయాణానికి ముందు నిర్ధారించుకోండి", officialNote: "ప్లాట్‌ఫాంలో ప్రచురించిన అధికారిక ప్రకటన", editorialNote: "పుష్కరాలు బృందం రాసినది",
  confirmPrice: "తుది ధరలు, లభ్యతను ప్రొవైడర్‌తో నిర్ధారించుకోవాలి",
};

export type LabelKey = keyof typeof EN;
export const label = (lang: Lang, key: LabelKey): string => (lang === "te" ? TE[key] : EN[key]);
