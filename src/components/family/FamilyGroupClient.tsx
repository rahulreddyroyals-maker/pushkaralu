"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input } from "@/components/ui";
import { api } from "@/lib/clientApi";
import { telHref } from "@/lib/safety/phone";
import { SAFETY_LIMITS } from "@/config/app";
import { alertSchema, emergencyContactSchema, meetingPointSchema, sharingSchema } from "@/features/family/schemas";
import type { GroupView, MemberView } from "@/features/family/types";

const POLL_MS = 30_000;
const LOCATION_POST_MS = 30_000;

const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

function fmtTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

function firstError(issues: { path: PropertyKey[]; message: string }[]) {
  return issues[0]?.message ?? "Please check the form";
}

export function FamilyGroupClient({ groupId, initial, myUid }: { groupId: string; initial: GroupView; myUid: string }) {
  const router = useRouter();
  const [view, setView] = useState<GroupView>(initial);
  const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const isOwner = view.group.ownerId === myUid;
  const base = `/api/family/groups/${groupId}`;

  const refresh = useCallback(async () => {
    const res = await api<GroupView>(base, "GET");
    if (res.ok) setView(res.data);
    else if (res.status === 404 || res.status === 401) router.replace("/family"); // removed from group / signed out
  }, [base, router]);

  // Polling only while the tab is visible. No realtime listeners: clients never touch Firestore.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  async function act<T>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, okText?: string) {
    setBusy(true);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error });
      return null;
    }
    if (okText) setNotice({ kind: "ok", text: okText });
    await refresh();
    return res.data;
  }

  /* ───────── Location sharing (opt-in, time-boxed, page-open only) ───────── */
  const [consent, setConsent] = useState(false);
  const [hours, setHours] = useState("2");
  const sharingActive = view.me.sharingActive;
  const lastPost = useRef(0);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!sharingActive || typeof navigator === "undefined" || !navigator.geolocation) return;
    const until = view.me.sharingUntil ? Date.parse(view.me.sharingUntil) : 0;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        if (until && Date.now() > until) return;
        if (Date.now() - lastPost.current < LOCATION_POST_MS) return;
        lastPost.current = Date.now();
        void api(`${base}/location`, "PUT", {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      (err) => setGeoError(err.code === err.PERMISSION_DENIED ? "Location permission was denied in your browser." : "Couldn't get your location."),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharingActive, view.me.sharingUntil, base]);

  async function startSharing() {
    const parsed = sharingSchema.safeParse({ enabled: true, consent, durationHours: Number(hours) });
    if (!parsed.success) return setNotice({ kind: "error", text: firstError(parsed.error.issues) });
    setGeoError(null);
    lastPost.current = 0;
    await act(() => api(`${base}/sharing`, "PUT", parsed.data), "Location sharing is on.");
    setConsent(false);
  }
  const stopSharing = () => act(() => api(`${base}/sharing`, "PUT", { enabled: false }), "Location sharing stopped and your last location was erased.");

  /* ───────── Own emergency contact ───────── */
  const [ecName, setEcName] = useState(view.me.emergencyContact?.name ?? "");
  const [ecPhone, setEcPhone] = useState(view.me.emergencyContact?.phone ?? "");
  async function saveContact(clear = false) {
    if (clear) {
      setEcName("");
      setEcPhone("");
      return void act(() => api(`${base}/profile`, "PATCH", { emergencyContact: null }), "Emergency contact removed.");
    }
    const parsed = emergencyContactSchema.safeParse({ name: ecName, phone: ecPhone });
    if (!parsed.success) return setNotice({ kind: "error", text: firstError(parsed.error.issues) });
    await act(() => api(`${base}/profile`, "PATCH", { emergencyContact: parsed.data }), "Emergency contact saved.");
  }

  /* ───────── Meeting point ───────── */
  const mp = view.group.meetingPoint;
  const [mpName, setMpName] = useState("");
  const [mpNote, setMpNote] = useState("");
  const [mpAt, setMpAt] = useState("");
  const [mpPos, setMpPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mpBusyGeo, setMpBusyGeo] = useState(false);

  function useMyPositionForMeetingPoint() {
    if (!navigator.geolocation) return setNotice({ kind: "error", text: "This browser can't provide your location." });
    setMpBusyGeo(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMpPos({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setMpBusyGeo(false);
      },
      () => {
        setMpBusyGeo(false);
        setNotice({ kind: "error", text: "Couldn't get your location. Allow location access and try again." });
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  }
  async function saveMeetingPoint() {
    const parsed = meetingPointSchema.safeParse({
      name: mpName,
      ...(mpPos ?? {}),
      note: mpNote || undefined,
      meetAt: mpAt ? new Date(mpAt).toISOString() : undefined,
    });
    if (!parsed.success) {
      return setNotice({ kind: "error", text: mpPos ? firstError(parsed.error.issues) : "Name the meeting point and use your current position to place it." });
    }
    const done = await act(() => api(`${base}/meeting-point`, "PUT", parsed.data), "Meeting point set.");
    if (done) {
      setMpName("");
      setMpNote("");
      setMpAt("");
      setMpPos(null);
    }
  }

  /* ───────── Alert ───────── */
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertLoc, setAlertLoc] = useState(false);
  const [escalate, setEscalate] = useState(false);
  const [cbPhone, setCbPhone] = useState("");

  async function sendAlert() {
    let coords: { latitude?: number; longitude?: number } = {};
    if (alertLoc) {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 15_000 });
      });
      if (!pos) return setNotice({ kind: "error", text: "Couldn't get your location. Untick “Include my location” or allow access." });
      coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    }
    const parsed = alertSchema.safeParse({
      message: alertMsg,
      includeLocation: alertLoc,
      ...coords,
      escalate,
      callbackPhone: escalate ? cbPhone : undefined,
    });
    if (!parsed.success) return setNotice({ kind: "error", text: firstError(parsed.error.issues) });
    const done = await act(() => api(`${base}/alerts`, "POST", parsed.data), "Alert sent to your group.");
    if (done) {
      setAlertOpen(false);
      setAlertMsg("");
      setAlertLoc(false);
      setEscalate(false);
      setCbPhone("");
    }
  }

  /* ───────── Invite ───────── */
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  async function makeInvite() {
    const data = await act(() => api<{ code: string; expiresAt: string }>(`${base}/invites`, "POST", {}));
    if (data) setInvite(data);
  }
  const inviteLink = invite && typeof window !== "undefined" ? `${window.location.origin}/family?code=${invite.code}` : "";

  /* ───────── Destructive actions ───────── */
  async function leave() {
    if (!confirm("Leave this group? Your location will be erased from it.")) return;
    const r = await act(() => api(`${base}/leave`, "POST", {}));
    if (r) router.push("/family");
  }
  async function deleteGroup() {
    if (!confirm("Delete this group for everyone? This can't be undone.")) return;
    setBusy(true);
    const r = await api(base, "DELETE");
    setBusy(false);
    if (!r.ok) return setNotice({ kind: "error", text: r.error });
    router.push("/family");
  }
  async function removeMember(m: MemberView) {
    if (!confirm(`Remove ${m.displayName} from the group?`)) return;
    await act(() => api(`${base}/members/${m.uid}`, "DELETE"), `${m.displayName} was removed.`);
  }
  const resolveAlert = (id: string) => act(() => api(`${base}/alerts/${id}`, "DELETE"), "Alert marked as resolved.");

  return (
    <div className="mt-6 space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">{view.group.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{view.members.length} members · only members of this group can see it</p>
      </header>

      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${notice.kind === "error" ? "bg-red-50 text-status-critical" : "bg-green-50 text-green-800"}`}>
          {notice.text}
        </p>
      )}

      {/* Active alerts */}
      {view.activeAlerts.map((a) => (
        <Card key={a.id} className="border-status-critical bg-red-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-status-critical">Alert from {a.senderName}</p>
              <p className="mt-1 text-sm text-ink">{a.message || "No message — please check in with them."}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {fmtTime(a.createdAt)}
                {a.escalated ? " · staff notified" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {a.location && (
                <a href={directionsUrl(a.location.latitude, a.location.longitude)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3 text-sm">
                  Navigate
                </a>
              )}
              {(a.senderId === myUid || isOwner) && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => resolveAlert(a.id)}>
                  Mark resolved
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Alert */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink">Emergency alert</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tell your group you need help. In a real emergency, <Link href="/emergency" className="font-medium underline">call emergency services directly</Link> first — group alerts are not monitored 24×7.
        </p>
        {!alertOpen ? (
          <Button className="mt-3" variant="danger" onClick={() => setAlertOpen(true)}>
            Send an alert
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <Input label="Message (optional)" value={alertMsg} maxLength={280} onChange={(e) => setAlertMsg(e.target.value)} placeholder="e.g. Lost near the main ghat, please call me" />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={alertLoc} onChange={(e) => setAlertLoc(e.target.checked)} />
              <span>Include my current location in this alert (one time only)</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} />
              <span>Also notify platform staff. They will see this alert and your phone number only — not your group.</span>
            </label>
            {escalate && <Input label="Phone number staff can call" inputMode="tel" value={cbPhone} onChange={(e) => setCbPhone(e.target.value)} />}
            <div className="flex gap-2">
              <Button variant="danger" disabled={busy} onClick={sendAlert}>
                Send alert
              </Button>
              <Button variant="ghost" onClick={() => setAlertOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Members */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink">Members</h2>
        <ul className="mt-3 divide-y divide-border">
          {view.members.map((m) => {
            const tel = m.emergencyContact ? telHref(m.emergencyContact.phone) : null;
            return (
              <li key={m.uid} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink">
                    {m.displayName} {m.uid === myUid && <span className="text-ink-muted">(you)</span>} {m.role === "OWNER" && <Badge>Owner</Badge>}
                  </p>
                  {m.emergencyContact && (
                    <p className="text-sm text-ink-muted">
                      Emergency contact: {m.emergencyContact.name}
                      {tel && (
                        <>
                          {" · "}
                          <a href={tel} className="font-medium text-river-deep underline">
                            {m.emergencyContact.phone}
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-ink-muted">
                    {m.sharingActive && m.location
                      ? `Sharing location · updated ${fmtTime(m.location.updatedAt)}`
                      : m.sharingActive
                        ? "Sharing location · waiting for first update"
                        : "Not sharing location"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {m.sharingActive && m.location && m.uid !== myUid && (
                    <a href={directionsUrl(m.location.latitude, m.location.longitude)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm">
                      Navigate
                    </a>
                  )}
                  {isOwner && m.uid !== myUid && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => removeMember(m)}>
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Meeting point */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink">Meeting point</h2>
        {mp ? (
          <div className="mt-2 text-sm">
            <p className="font-medium text-ink">{mp.name}</p>
            {mp.note && <p className="text-ink-muted">{mp.note}</p>}
            {mp.meetAt && <p className="text-ink-muted">Meet at {fmtTime(mp.meetAt)}</p>}
            <p className="text-xs text-ink-muted">Set by {mp.setByName}</p>
            <div className="mt-2 flex gap-2">
              <a href={directionsUrl(mp.location.latitude, mp.location.longitude)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-lg bg-river-deep px-3 text-sm text-white">
                Navigate
              </a>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => api(`${base}/meeting-point`, "DELETE"), "Meeting point cleared.")}>
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">No meeting point yet. Pick a spot everyone can find if you get separated.</p>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-river-deep">{mp ? "Change meeting point" : "Set a meeting point"}</summary>
          <div className="mt-3 space-y-3">
            <Input label="Name" value={mpName} onChange={(e) => setMpName(e.target.value)} placeholder="e.g. Gate 2 tea stall" />
            <Input label="Note (optional)" value={mpNote} onChange={(e) => setMpNote(e.target.value)} />
            <Input label="Meet at (optional)" type="datetime-local" value={mpAt} onChange={(e) => setMpAt(e.target.value)} />
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" disabled={mpBusyGeo} onClick={useMyPositionForMeetingPoint}>
                {mpBusyGeo ? "Locating…" : "Use my current position"}
              </Button>
              {mpPos && <span className="text-xs text-ink-muted">Position captured</span>}
            </div>
            <Button disabled={busy} onClick={saveMeetingPoint}>
              Save meeting point
            </Button>
          </div>
        </details>
      </Card>

      {/* Sharing */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink">Share my location</h2>
        {sharingActive ? (
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-ink">
              You are sharing your location with this group until <strong>{fmtTime(view.me.sharingUntil)}</strong>.
            </p>
            <p className="text-ink-muted">Updates are sent only while this page is open. Stopping erases your last shared location.</p>
            {geoError && <p className="text-status-critical">{geoError}</p>}
            <Button variant="outline" disabled={busy} onClick={stopSharing}>
              Stop sharing now
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-sm">
            <p className="text-ink-muted">Off. Nobody in the group can see where you are. If you turn it on, members of this group only will see it, and it switches itself off at the time you choose.</p>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree to share my live location with the members of “{view.group.name}”.</span>
            </label>
            <label className="flex items-center gap-2">
              <span>For</span>
              <select className="h-10 rounded-lg border border-border bg-surface-raised px-2" value={hours} onChange={(e) => setHours(e.target.value)}>
                {[0.5, 1, 2, 4, 8, SAFETY_LIMITS.familyMaxShareHours].map((h) => (
                  <option key={h} value={h}>
                    {h < 1 ? `${h * 60} minutes` : `${h} hour${h > 1 ? "s" : ""}`}
                  </option>
                ))}
              </select>
            </label>
            <Button disabled={!consent || busy} onClick={startSharing}>
              Start sharing
            </Button>
          </div>
        )}
      </Card>

      {/* My emergency contact */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink">My emergency contact</h2>
        <p className="mt-1 text-sm text-ink-muted">Visible to members of this group only.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
          <Input label="Phone" inputMode="tel" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button disabled={busy} onClick={() => saveContact()}>
            Save
          </Button>
          {view.me.emergencyContact && (
            <Button variant="ghost" disabled={busy} onClick={() => saveContact(true)}>
              Remove
            </Button>
          )}
        </div>
      </Card>

      {/* Invite */}
      {isOwner && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">Invite someone</h2>
          <p className="mt-1 text-sm text-ink-muted">Codes work for {SAFETY_LIMITS.familyInviteTtlHours} hours. Share only with people you know.</p>
          <Button className="mt-3" variant="outline" disabled={busy} onClick={makeInvite}>
            Create invite code
          </Button>
          {invite && (
            <div className="mt-3 rounded-lg bg-river-mist p-3 text-sm">
              <p>
                Code: <code className="text-lg font-semibold tracking-widest">{invite.code}</code>
              </p>
              <p className="text-xs text-ink-muted">Expires {fmtTime(invite.expiresAt)}</p>
              <a
                className="mt-2 inline-block font-medium text-river-deep underline"
                href={`https://wa.me/?text=${encodeURIComponent(`Join my family group on Pushkaralu: ${inviteLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on WhatsApp
              </a>
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-end">
        {isOwner ? (
          <Button variant="ghost" disabled={busy} onClick={deleteGroup}>
            Delete group
          </Button>
        ) : (
          <Button variant="ghost" disabled={busy} onClick={leave}>
            Leave group
          </Button>
        )}
      </div>
    </div>
  );
}
