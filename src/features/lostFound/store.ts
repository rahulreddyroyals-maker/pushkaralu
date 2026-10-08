import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso } from "@/lib/pagination";
import { FieldValue, Timestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { LostFoundStore } from "./service";
import type { LostFoundReport, LostFoundResponse } from "./types";

function mapReport(doc: QueryDocumentSnapshot<DocumentData>): LostFoundReport {
  const d = doc.data();
  return {
    id: doc.id,
    reporterId: d.reporterId,
    reporterName: d.reporterName,
    category: d.category,
    reportType: d.reportType,
    title: d.title,
    description: d.description,
    lastSeenPlace: d.lastSeenPlace,
    lastSeenAt: timestampToIso(d.lastSeenAt),
    contactPhone: d.contactPhone,
    ...(d.subjectName ? { subjectName: d.subjectName } : {}),
    ...(typeof d.subjectAge === "number" ? { subjectAge: d.subjectAge } : {}),
    status: d.status,
    priority: Boolean(d.priority),
    ...(d.publicTitle ? { publicTitle: d.publicTitle } : {}),
    ...(d.publicSummary ? { publicSummary: d.publicSummary } : {}),
    ...(d.publicArea ? { publicArea: d.publicArea } : {}),
    ...(d.rejectionReason ? { rejectionReason: d.rejectionReason } : {}),
    ...(d.moderatedBy ? { moderatedBy: d.moderatedBy } : {}),
    ...(d.moderatedAt ? { moderatedAt: timestampToIso(d.moderatedAt) } : {}),
    ...(d.resolvedAt ? { resolvedAt: timestampToIso(d.resolvedAt) } : {}),
    createdAt: timestampToIso(d.createdAt),
    updatedAt: timestampToIso(d.updatedAt),
  };
}

function mapResponse(doc: QueryDocumentSnapshot<DocumentData>): LostFoundResponse {
  const d = doc.data();
  return {
    id: doc.id,
    reportId: d.reportId,
    responderId: d.responderId,
    responderName: d.responderName,
    message: d.message,
    contactPhone: d.contactPhone,
    createdAt: timestampToIso(d.createdAt),
  };
}

const toTs = (iso: string) => Timestamp.fromDate(new Date(iso));

/**
 * Firestore adapter (Admin SDK). Clients never read these collections
 * directly — firestore.rules must deny all client access to
 * lostFoundReports and lostFoundResponses (see docs/SPRINT_7.md).
 */
export const firestoreLostFoundStore: LostFoundStore = {
  async createReport(report) {
    const ref = getAdminDb().collection("lostFoundReports").doc();
    await ref.set({
      ...report,
      lastSeenAt: toTs(report.lastSeenAt),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  },
  async getReport(id) {
    const snap = await getAdminDb().collection("lostFoundReports").doc(id).get();
    return snap.exists ? mapReport(snap as QueryDocumentSnapshot<DocumentData>) : null;
  },
  async updateReport(id, patch) {
    const data: Record<string, unknown> = { ...patch };
    delete data.id;
    for (const key of ["moderatedAt", "resolvedAt"] as const) if (typeof data[key] === "string") data[key] = toTs(data[key] as string);
    data.updatedAt = FieldValue.serverTimestamp();
    await getAdminDb().collection("lostFoundReports").doc(id).update(data);
  },
  async countReportsSince(reporterId, sinceIso) {
    const snap = await getAdminDb()
      .collection("lostFoundReports")
      .where("reporterId", "==", reporterId)
      .where("createdAt", ">=", toTs(sinceIso))
      .count()
      .get();
    return snap.data().count;
  },
  async listApproved({ category, reportType, cursor, pageSize }) {
    let query = getAdminDb().collection("lostFoundReports").where("status", "==", "APPROVED") as FirebaseFirestore.Query;
    if (category) query = query.where("category", "==", category);
    if (reportType) query = query.where("reportType", "==", reportType);
    return paginateQuery<LostFoundReport>(query.orderBy("createdAt", "desc"), mapReport, { pageSize, cursor });
  },
  async listByReporter(reporterId, limit) {
    const snap = await getAdminDb().collection("lostFoundReports").where("reporterId", "==", reporterId).orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map(mapReport);
  },
  async listByStatus(status, limit) {
    const snap = await getAdminDb().collection("lostFoundReports").where("status", "==", status).orderBy("createdAt", "asc").limit(limit).get();
    return snap.docs.map(mapReport);
  },
  async createResponse(response) {
    const ref = getAdminDb().collection("lostFoundResponses").doc();
    await ref.set({ ...response, createdAt: FieldValue.serverTimestamp() });
    return ref.id;
  },
  async countResponsesBy(reportId, responderId) {
    const snap = await getAdminDb().collection("lostFoundResponses").where("reportId", "==", reportId).where("responderId", "==", responderId).count().get();
    return snap.data().count;
  },
  async listResponses(reportId, limit) {
    const snap = await getAdminDb().collection("lostFoundResponses").where("reportId", "==", reportId).orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map(mapResponse);
  },
};
