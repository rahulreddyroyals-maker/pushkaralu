import type { Lang } from "./types";

/**
 * Emergency messages never go through the model. The reply text is fixed,
 * the contacts come from the verified directory, and no number is ever
 * written from memory — an invented or outdated number in a crisis is worse
 * than none.
 */
const EN = /\b(emergency|ambulance|heart\s*attack|chest\s*pain|can'?t\s+breathe|cannot\s+breathe|unconscious|fainted|collapsed|bleeding|drown(?:ing|ed)?|stampede|on\s+fire|fire\s+(?:at|in|near)|accident|snake\s*bite|poison(?:ed|ing)?|seizure|stroke|missing\s+child|child\s+(?:is\s+)?(?:lost|missing)|lost\s+my\s+child|kidnap|assault|harass(?:ed|ment)|suicid|kill\s+myself|self[-\s]?harm|help\s+me\s+now)\b/i;
const TE = /అత్యవసర|అంబులెన్స్|ఆంబులెన్స్|గుండెపోటు|గుండె నొప్పి|ఊపిరి|స్పృహ|రక్తస్రావం|మునిగ|తొక్కిసలాట|అగ్ని|మంటలు|ప్రమాదం|పాము|విషం|తప్పిపోయ|కనిపించడం లేదు|పిల్లవాడు తప్పి|వేధింపు|ఆత్మహత్య|కాపాడండి/;

export function isEmergencyMessage(text: string): boolean {
  return EN.test(text) || TE.test(text);
}

export const EMERGENCY_TEXT: Record<Lang, { withContacts: string; without: string; missing: string }> = {
  en: {
    withContacts: "This sounds urgent. If anyone is in danger, contact emergency services now using the verified contacts below, or go straight to the nearest staffed help point or tell event staff or volunteers nearby. I can't send help or tell you how long it will take to arrive.",
    without: "This sounds urgent. If anyone is in danger, tell the nearest police, event staff or volunteers right away, or go to the nearest hospital. I don't have verified emergency numbers loaded right now, and I won't guess one.",
    missing: "If someone is missing, also report it on the Lost & Found page and, if you use Family Groups, alert your group.",
  },
  te: {
    withContacts: "ఇది అత్యవసరంగా అనిపిస్తోంది. ఎవరికైనా ప్రమాదం ఉంటే, క్రింద ఉన్న ధృవీకరించిన నంబర్లకు వెంటనే సంప్రదించండి, లేదా దగ్గరలోని సహాయ కేంద్రానికి వెళ్ళండి, సమీపంలోని ఈవెంట్ సిబ్బంది/వాలంటీర్లకు చెప్పండి. నేను సహాయం పంపలేను, ఎంత సమయంలో వస్తుందో చెప్పలేను.",
    without: "ఇది అత్యవసరంగా అనిపిస్తోంది. ఎవరికైనా ప్రమాదం ఉంటే వెంటనే సమీపంలోని పోలీసులకు, ఈవెంట్ సిబ్బందికి లేదా వాలంటీర్లకు చెప్పండి, లేదా దగ్గరలోని ఆసుపత్రికి వెళ్ళండి. ప్రస్తుతం ధృవీకరించిన అత్యవసర నంబర్లు నా వద్ద లేవు, నేను ఊహించి చెప్పను.",
    missing: "ఎవరైనా తప్పిపోతే, 'తప్పిపోయిన వస్తువులు/వ్యక్తులు' పేజీలో కూడా నివేదించండి; ఫ్యామిలీ గ్రూప్ వాడుతుంటే మీ గ్రూప్‌కు అలర్ట్ పంపండి.",
  },
};
