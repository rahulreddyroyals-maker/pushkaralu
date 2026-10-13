export const LEGAL_UPDATED = "13 October 2026";
export const OPERATOR = "FlowGenic Technologies";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export interface LegalSection { heading: string; body: string[] }

export const PRIVACY: LegalSection[] = [
  { heading: "Who we are", body: [`Pushkaralu (the website and the Android app) is operated by ${OPERATOR}. It helps pilgrims and visitors find ghats, temples, hotels, purohits, transport and safety information for the Pushkaralu festival.`] },
  { heading: "What we collect", body: [
    "Account details: your name, email address and (if you add one) phone number, when you register or sign in with email or Google.",
    "Bookings and inquiries: the details you submit to request a hotel, purohit or other service, which are shared with that provider so they can respond.",
    "Family groups: group membership, and your location only while you choose to share it, for the time you select. Sharing stops automatically and you can stop it at any time.",
    "Lost & Found reports: the details you enter. Personal details (names, ages, your phone number) are visible only to you and to moderators; the public sees only what moderators approve.",
    "Assistant questions: messages you type to the AI assistant are sent to our AI provider (Groq) to produce an answer. Do not enter sensitive personal information.",
    "Device and usage data: a notification token (to send alerts you opted into) and basic, aggregated usage counts. We do not sell personal data and we do not show personalised third-party advertising.",
  ] },
  { heading: "Location", body: ["The app asks for location only when you use a feature that needs it (for example sharing your position with your family group, or sorting places by distance). You can refuse and still use the rest of the app."] },
  { heading: "How we use it", body: ["To run your account, process booking requests, deliver notifications you asked for, keep the service safe (including abuse prevention and moderation), and improve reliability. Crowd and status information shown in the app is entered manually by event staff and is not a live sensor reading."] },
  { heading: "Who we share it with", body: [
    "Providers you contact (hotel, purohit, business) receive the details needed to fulfil your request.",
    "Service providers that process data for us: Google Firebase (authentication, database, notifications), Vercel (hosting), Razorpay (payments; we never see or store your card details), Groq (AI assistant).",
    "Authorities, if required by law or to protect someone's safety.",
  ] },
  { heading: "Retention and deletion", body: ["We keep data while your account is active and as needed for bookings, payments and legal obligations. You can delete your account yourself from Profile (website or app) as described on the Delete account page, or by contacting us; some booking and payment records may be retained where the law requires."] },
  { heading: "Security", body: ["Data is transmitted over HTTPS and access to it is restricted by role. No system is perfectly secure, so please use a strong, unique password."] },
  { heading: "Children", body: ["The service is not directed at children under 13 and we do not knowingly collect their personal data."] },
  { heading: "Your rights", body: ["You may request access to, correction of, or deletion of your personal data. Contact us using the details below."] },
  { heading: "Changes", body: ["We may update this policy; the date above shows the latest version. Material changes will be announced in the app or on the website."] },
];

export const TERMS: LegalSection[] = [
  { heading: "Using Pushkaralu", body: [`These terms apply to your use of the Pushkaralu website and app, operated by ${OPERATOR}. By using the service you agree to them.`, "You must provide accurate information and keep your account secure. You are responsible for activity under your account."] },
  { heading: "Information we show", body: ["We work to keep listings accurate, but dates, timings, prices, availability and crowd or status information can change. Crowd and status information is entered manually by event staff and may be out of date; it is not a live sensor reading. Always follow instructions from officials on the ground. In an emergency, call the emergency numbers directly."] },
  { heading: "Bookings and providers", body: ["Hotels, purohits and other businesses are independent providers. A booking request is not confirmed until the provider confirms it. Providers are responsible for the services they offer. We charge providers a commission as described on the platform."] },
  { heading: "Payments", body: ["Payments are processed by Razorpay. A booking is marked paid only when the payment provider confirms it. See the Refund Policy for cancellations and refunds."] },
  { heading: "Acceptable use", body: ["Do not misuse the service: no false reports, spam, harassment, scraping that harms the service, attempts to break security, or content that is unlawful or infringes others' rights. We may remove content and suspend accounts that break these rules."] },
  { heading: "AI assistant", body: ["The assistant answers using information published on the platform and may make mistakes. It cannot make bookings, confirm room availability, or send help. Verify important details with the listing or provider."] },
  { heading: "Liability", body: ["To the extent permitted by law, the service is provided \"as is\" and we are not liable for indirect or consequential loss, or for services delivered by independent providers."] },
  { heading: "Changes and contact", body: ["We may update these terms; continued use means you accept the updated terms. Governing law is that of India. Questions: see the Contact page."] },
];

export const REFUND: LegalSection[] = [
  { heading: "Who decides", body: ["Hotels, purohits and other providers on Pushkaralu set their own cancellation terms, which are shown on the listing or confirmed when your booking is accepted. This policy explains how refunds work on the platform."] },
  { heading: "Before the provider confirms", body: ["If a booking has not yet been confirmed by the provider, you can cancel it from your Bookings page. If you already paid, the amount is refunded to the original payment method."] },
  { heading: "After confirmation", body: ["Refunds depend on the provider's stated cancellation terms and how close the booking date is. If the provider cancels or cannot deliver the service, you are entitled to a full refund."] },
  { heading: "Timing", body: ["Approved refunds are initiated promptly and normally reach your account in 5 to 10 working days, depending on your bank or payment method."] },
  { heading: "Problems", body: ["If you were charged but your booking does not show as paid, or you have a dispute with a provider, contact us with your booking reference using the Contact page and we will look into it."] },
];

export const DELETE_ACCOUNT: LegalSection[] = [
  { heading: "How to delete your account", body: [
    "On the website: sign in, open Profile, scroll to \"Delete my account\", type DELETE and confirm.",
    "In the Android app: Profile, then \"Delete my account\", and confirm.",
    "If you cannot sign in, contact us from the Contact page using the email address on your account and we will delete it for you.",
  ] },
  { heading: "What is deleted", body: ["Your sign-in account, profile, notification inbox and settings, favourites, Lost & Found reports you filed, and your family-group memberships (groups you own are deleted). This cannot be undone."] },
  { heading: "What is kept", body: ["Booking and payment records are kept for accounting, tax and dispute-resolution purposes, as required by law. Staff and provider accounts must be handled by an administrator first so that listings are not orphaned."] },
];
