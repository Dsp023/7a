import fs from "node:fs/promises";
import path from "node:path";
import { redactSecrets } from "../security/redact.js";

export type AuditEvent = 
| "agent_started"
| "llm_request"
| "llm_response"
| "tool_requested"
| "tool_completed"
| "tool_failed"
| "tool_dry_run"
| "confirmation_requested"
| "confirmation_granted"
| "confirmation_denied_or_blocked"
| "memory_retrieved"
| "memory_written"
| "kill_switch_triggered"
| "agent_completed"
| "agent_stopping";

export interface AuditEntry{
    ts?: string;
    event: AuditEvent;
    sessionId?: string;
    runId?: string;
    tool?: string;
    arguments?:unknown;
    result?: string;
    error?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;

}
export class AuditLogService{
constructor(private readonly auditLogPath:string ){}
async append(entry: AuditEntry): Promise<void>{
    await fs.mkdir(path.dirname(this.auditLogPath),{recursive:true,mode:0o700});

    const completeEntry: AuditEntry ={
        ts: entry.ts ?? new Date().toISOString(),
        ...entry,
    };
    const safeEntry = redactSecrets(completeEntry);

    const line = JSON.stringify(safeEntry) + "\n";
    await fs.appendFile(this.auditLogPath,line, {
        encoding:"utf-8",
        mode:0o600,
    });

}
async readRecent(limit = 100): Promise<AuditEntry[]>{
    let raw: string;
    try{
        raw = await fs.readFile(this.auditLogPath,"utf-8");
    }catch(err :unknown){
        if((err as NodeJS.ErrnoException).code === "ENOENT"){
            return [];
        }
        throw err;

    }
    const lines = raw.split("\n");
    const entries : AuditEntry[] = [];
    for(const rawLine of lines){
        const line = rawLine.trim();
        if(!line) continue;
    try{
        const parsed = JSON.parse(line) as AuditEntry;
        entries.push(parsed);
    }catch{

    }

}
return entries.slice(-limit);
}
}