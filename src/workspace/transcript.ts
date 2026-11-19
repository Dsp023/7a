import fs from 'node:fs/promises';
import path from 'node:path';
import { redactSecrets } from '../security/redact.js';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
export type TrustLevel = 'trusted' | 'untrusted';

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface TranscriptMessage {
  v?: number;
  seq?: number; 
  ts?: string;
  sessionId: string;
  runId?: string;
  role: MessageRole;
  trust?: TrustLevel;
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export class TranscriptService {
  constructor(private readonly sessionsDir: string) {}

  private getSessionPath(sessionId: string): string {
    const safeId = path.basename(sessionId);
    return path.join(this.sessionsDir, `${safeId}.jsonl`);
  }

  async append(sessionId: string, message: TranscriptMessage): Promise<void> {
    await fs.mkdir(this.sessionsDir, { recursive: true, mode: 0o700 });

    const entry: TranscriptMessage = {
      ...message,
      v: 1,
      sessionId,
      ts: message.ts ?? new Date().toISOString(),
      trust: message.trust ?? 'trusted',
    };

    const safeEntry = redactSecrets(entry);

    const line = JSON.stringify(safeEntry) + '\n';

    await fs.appendFile(this.getSessionPath(sessionId), line, {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  async read(sessionId: string): Promise<TranscriptMessage[]> {
    let rawContent: string;

    try {
      rawContent = await fs.readFile(this.getSessionPath(sessionId), 'utf-8');
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const lines = rawContent.split('\n');
    const messages: TranscriptMessage[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      try {
        const parsed = JSON.parse(line) as TranscriptMessage;
        messages.push(parsed);
      } catch {
      }
    }

    return messages;
  }
}
