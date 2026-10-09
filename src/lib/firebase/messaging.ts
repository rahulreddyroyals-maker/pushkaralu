/**
 * Browser-side web push (FCM). Client-only. Permission is requested ONLY from
 * an explicit user click (see PushToggle), never on page load.
 */
import { getMessaging, getToken, deleteToken, isSupported } from "firebase/messaging";
import { getFirebaseApp } from "./client";
import { api } from "@/lib/clientApi";

const TOKEN_KEY = "pushkaralu.fcmToken";

export type PushState = "unsupported" | "denied" | "off" | "on";

export async function pushSupported(): Promise<boolean> {
  try {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window && (await isSupported());
  } catch {
    return false;
  }
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function currentPushState(): Promise<PushState> {
  if (!(await pushSupported())) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && storedToken() ? "on" : "off";
}

function swUrl(): string {
  const q = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });
  return `/firebase-messaging-sw.js?${q.toString()}`;
}

export async function enablePush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await pushSupported())) return { ok: false, error: "This browser doesn't support push notifications." };
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { ok: false, error: "Push notifications aren't configured on this site yet." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Notifications are blocked. Allow them in your browser settings, then try again." };
  try {
    const registration = await navigator.serviceWorker.register(swUrl());
    const token = await getToken(getMessaging(getFirebaseApp()), { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return { ok: false, error: "Couldn't get a push token. Please try again." };
    const res = await api("/api/notifications/devices", "POST", { token, platform: "web" });
    if (!res.ok) return { ok: false, error: res.error };
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode: push still works this session */
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't turn on push notifications. Please try again." };
  }
}

export async function disablePush(): Promise<void> {
  const token = storedToken();
  try {
    await deleteToken(getMessaging(getFirebaseApp()));
  } catch {
    /* already gone */
  }
  if (token) await api("/api/notifications/devices", "DELETE", { token });
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
