import "server-only";
import { randomInt } from "node:crypto";
import { auditSink } from "@/lib/serviceHttp";
import { firestoreFamilyStore } from "./store";
import type { Deps } from "./service";

/** Unambiguous alphabet (no 0/O/1/I) so codes survive being read aloud or typed from a WhatsApp message. Must match INVITE_CODE_PATTERN. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export const familyDeps: Deps = { store: firestoreFamilyStore, audit: auditSink, newCode };
