import type { LostFoundStore } from "./service";
import type { LostFoundReport, LostFoundResponse } from "./types";

/** In-memory adapter for tests only (no server-only import, no Firestore). */
export function createMemoryLostFoundStore(): LostFoundStore & { reports: Map<string, LostFoundReport>; responses: LostFoundResponse[] } {
  const reports = new Map<string, LostFoundReport>();
  const responses: LostFoundResponse[] = [];
  let n = 0;
  return {
    reports,
    responses,
    async createReport(r) {
      const id = `r${++n}`;
      reports.set(id, { ...r, id });
      return id;
    },
    async getReport(id) {
      const r = reports.get(id);
      return r ? { ...r } : null;
    },
    async updateReport(id, patch) {
      const r = reports.get(id);
      if (r) reports.set(id, { ...r, ...patch });
    },
    async countReportsSince(uid, since) {
      return [...reports.values()].filter((r) => r.reporterId === uid && r.createdAt >= since).length;
    },
    async listApproved({ category, reportType, pageSize }) {
      const items = [...reports.values()]
        .filter((r) => r.status === "APPROVED" && (!category || r.category === category) && (!reportType || r.reportType === reportType))
        .slice(0, pageSize);
      return { items, nextCursor: null };
    },
    async listByReporter(uid, limit) {
      return [...reports.values()].filter((r) => r.reporterId === uid).slice(0, limit);
    },
    async listByStatus(status, limit) {
      return [...reports.values()].filter((r) => r.status === status).slice(0, limit);
    },
    async createResponse(r) {
      const id = `x${++n}`;
      responses.push({ ...r, id });
      return id;
    },
    async countResponsesBy(reportId, uid) {
      return responses.filter((r) => r.reportId === reportId && r.responderId === uid).length;
    },
    async listResponses(reportId, limit) {
      return responses.filter((r) => r.reportId === reportId).slice(0, limit);
    },
  };
}
