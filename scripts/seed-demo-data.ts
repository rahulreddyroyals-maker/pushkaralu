/**
 * Demo data seed script — spec §37: "Create seed/demo data. Do not use
 * real people's personal information. Use clearly marked demo data."
 *
 * Every document created here has "[Demo]" in its English name and a
 * `isDemoData: true` field, so it's unambiguous in the admin UI and easy
 * to bulk-delete later (query where isDemoData == true).
 *
 * Run with: npm run seed
 * Requires .env.local to be configured with real Firebase Admin
 * credentials pointing at a project you're happy to write demo data into
 * — this uses the Admin SDK and will actually write to Firestore.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Deliberately NOT importing src/lib/firebase/admin.ts here — that module
 * imports the `server-only` package, which throws when loaded outside
 * Next.js's bundler context (as this standalone script is run via tsx/
 * plain Node). Rather than weaken that guard for the real app code just
 * to make a script convenient, this script has its own minimal,
 * duplicated bootstrap. Keep the two in sync by hand if the Admin SDK
 * init logic changes.
 */
function getAdminDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase Admin env vars — check .env.local");
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getFirestore();
}

async function seed() {
  const db = getAdminDb();
  console.log("Seeding demo data...");

  // --- Event -----------------------------------------------------------
  const eventRef = db.collection("events").doc();
  await eventRef.set({
    name: { en: "[Demo] Godavari Pushkaralu", te: "[డెమో] గోదావరి పుష్కరాలు" },
    river: "GODAVARI",
    year: 2027,
    startDate: "2027-07-14",
    endDate: "2027-07-25",
    description: {
      en: "Demo event data for development and testing. Not a real, government-confirmed event schedule.",
      te: "అభివృద్ధి మరియు పరీక్ష కోసం డెమో ఈవెంట్ డేటా.",
    },
    status: "UPCOMING",
    published: true,
    featuredImage: null,
    seo: {
      title: { en: "[Demo] Godavari Pushkaralu 2027", te: "[డెమో] గోదావరి పుష్కరాలు 2027" },
      description: { en: "Demo event for development.", te: "అభివృద్ధి కోసం డెమో ఈవెంట్." },
      canonicalPath: "/events/demo-godavari-pushkaralu-2027",
    },
    isDemoData: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`Created demo event: ${eventRef.id}`);

  // --- Ghats (event-scoped) --------------------------------------------
  const demoGhats = [
    {
      name: { en: "[Demo] Ramalayam Ghat", te: "[డెమో] రామాలయం ఘాట్" },
      crowdStatus: "MODERATE",
      facilities: ["parking", "toilets", "drinking_water", "medical"],
      location: { latitude: 16.9891, longitude: 81.7799 },
    },
    {
      name: { en: "[Demo] Kotilingala Ghat", te: "[డెమో] కోటిలింగాల ఘాట్" },
      crowdStatus: "LOW",
      facilities: ["parking", "toilets", "food_stalls"],
      location: { latitude: 16.995, longitude: 81.786 },
    },
    {
      name: { en: "[Demo] Pushkar Ghat", te: "[డెమో] పుష్కర్ ఘాట్" },
      crowdStatus: "HIGH",
      facilities: ["parking", "toilets", "drinking_water", "medical", "wheelchair_access"],
      location: { latitude: 16.982, longitude: 81.775 },
    },
  ];

  for (const [i, ghat] of demoGhats.entries()) {
    const ghatRef = eventRef.collection("ghats").doc();
    await ghatRef.set({
      name: ghat.name,
      nameLower: ghat.name.en.toLowerCase(),
      description: {
        en: "Demo ghat data for development and testing — facilities and crowd status are illustrative, not live.",
        te: "అభివృద్ధి కోసం డెమో ఘాట్ డేటా.",
      },
      images: [],
      location: ghat.location,
      facilities: ghat.facilities,
      crowdStatus: ghat.crowdStatus,
      crowdStatusUpdatedAt: FieldValue.serverTimestamp(),
      crowdStatusUpdatedBy: null,
      parkingInfo: { en: "Demo parking information.", te: "డెమో పార్కింగ్ సమాచారం." },
      medicalInfo: { en: "Demo medical facility information.", te: "డెమో వైద్య సదుపాయాల సమాచారం." },
      published: true,
      seo: {
        title: ghat.name,
        description: { en: "Demo ghat.", te: "డెమో ఘాట్." },
        canonicalPath: `/events/${eventRef.id}/ghats/demo-ghat-${i + 1}`,
      },
      isDemoData: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Created demo ghat: ${ghatRef.id} (${ghat.name.en})`);
  }

  // --- Announcement ------------------------------------------------------
  await eventRef.collection("announcements").add({
    title: { en: "[Demo] Welcome to Pushkaralu", te: "[డెమో] పుష్కరాలకు స్వాగతం" },
    body: {
      en: "This is a demo announcement created by the seed script for development purposes.",
      te: "ఇది అభివృద్ధి ప్రయోజనాల కోసం సీడ్ స్క్రిప్ట్ ద్వారా సృష్టించబడిన డెమో ప్రకటన.",
    },
    published: true,
    isDemoData: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log("Created demo announcement");

  // --- Temples (top-level, event-agnostic) --------------------------------
  const demoTemples = [
    {
      name: { en: "[Demo] Sri Someswara Swamy Temple", te: "[డెమో] శ్రీ సోమేశ్వర స్వామి ఆలయం" },
      address: "Demo Address, Bhadrachalam Road, Andhra Pradesh",
      location: { latitude: 17.668, longitude: 80.893 },
      nearbyAttractions: ["[Demo] Riverside Park", "[Demo] Old Fort"],
    },
    {
      name: { en: "[Demo] Sri Venugopala Swamy Temple", te: "[డెమో] శ్రీ వేణుగోపాల స్వామి ఆలయం" },
      address: "Demo Address, Rajahmundry, Andhra Pradesh",
      location: { latitude: 17.005, longitude: 81.777 },
      nearbyAttractions: ["[Demo] Godavari Bridge Viewpoint"],
    },
  ];

  for (const [i, temple] of demoTemples.entries()) {
    const templeRef = db.collection("temples").doc();
    await templeRef.set({
      name: temple.name,
      nameLower: temple.name.en.toLowerCase(),
      description: {
        en: "Demo temple data for development and testing.",
        te: "అభివృద్ధి కోసం డెమో ఆలయం డేటా.",
      },
      history: { en: "Demo history text.", te: "డెమో చరిత్ర టెక్స్ట్." },
      timings: "6:00 AM - 12:00 PM, 4:00 PM - 8:00 PM",
      location: temple.location,
      address: temple.address,
      images: [],
      nearbyAttractions: temple.nearbyAttractions,
      published: true,
      seo: {
        title: temple.name,
        description: { en: "Demo temple.", te: "డెమో ఆలయం." },
        canonicalPath: `/temples/demo-temple-${i + 1}`,
      },
      isDemoData: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Created demo temple: ${templeRef.id} (${temple.name.en})`);
  }

  console.log("\nDone. All demo documents are tagged isDemoData: true and prefixed [Demo] for easy identification/cleanup.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
