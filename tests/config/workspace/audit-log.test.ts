import { describe, it, beforeEach, afterEach, expect } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AuditLogService } from "../../../src/workspace/audit-log.js";

describe("AuditService",() =>{
    let tempDir:string;
    let auditFilePath:string;
    let auditLog: AuditLogService;
    beforeEach(async () =>{
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(),"audot-test-"));
        auditFilePath = path.join(tempDir,"audit.jsonl");
        auditLog = new AuditLogService(auditFilePath);

    });
    afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("appends a tool_completed event and reads it back with metadata", async () => {
    await auditLog.append({
      event: "tool_completed",
      sessionId: "sess_01",
      runId: "run_01",
      tool: "get_current_time",
      durationMs: 42,
    });

    const rawDisk = await fs.readFile(auditFilePath, "utf-8");
    const lines = rawDisk.trim().split("\n");
    expect(lines).toHaveLength(1);

    const recent = await auditLog.readRecent();
    expect(recent).toHaveLength(1);
    expect(recent[0]?.event).toBe("tool_completed");
    expect(recent[0]?.tool).toBe("get_current_time");
    expect(recent[0]?.durationMs).toBe(42);
    expect(recent[0]?.ts).toBeDefined();
  });

  it("redacts API keys inside arguments before writing to disk", async () => {
    const fakeKey = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz12345";

    await auditLog.append({
      event: "tool_requested",
      tool: "fetch_weather",
      arguments: { apiKey: fakeKey, city: "Hyderabad" },
    });

    const rawDisk = await fs.readFile(auditFilePath, "utf-8");
    expect(rawDisk).not.toContain(fakeKey);
    expect(rawDisk).toContain("[REDACTED]");

    const recent = await auditLog.readRecent();
    expect(recent[0]?.arguments).toEqual({
      apiKey: "[REDACTED]",
      city: "Hyderabad",
    });
  });

  it("returns only the N most recent entries when limit is passed", async () => {
    for (let i = 1; i <= 5; i++) {
      await auditLog.append({
        event: "agent_started",
        sessionId: `sess_${i}`,
      });
    }

    const recent = await auditLog.readRecent(3);
    expect(recent).toHaveLength(3);
    expect(recent[0]?.sessionId).toBe("sess_3");
    expect(recent[1]?.sessionId).toBe("sess_4");
    expect(recent[2]?.sessionId).toBe("sess_5");
  });
});
