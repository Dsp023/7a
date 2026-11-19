import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TranscriptService } from '../../../src/workspace/transcript.js';

describe('TranscriptService', () => {
  let tempDir: string;
  let service: TranscriptService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'transcript-test-'));
    service = new TranscriptService(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('appends and reads user and assistant tool-call messages in order', async () => {
    const sessionId = 'session-123';

    await service.append(sessionId, {
      sessionId,
      role: 'user',
      content: 'Check the weather in Hyderabad',
    });

    await service.append(sessionId, {
      sessionId,
      role: 'assistant',
      content: '',
      toolCalls: [
        {
          id: 'call_1',
          name: 'get_weather',
          arguments: { city: 'Hyderabad' },
        },
      ],
    });

    const filePath = path.join(tempDir, `${sessionId}.jsonl`);
    const rawFile = await fs.readFile(filePath, 'utf-8');
    const lines = rawFile.trim().split('\n');
    expect(lines).toHaveLength(2);

    const messages = await service.read(sessionId);
    expect(messages).toHaveLength(2);

    expect(messages[0]?.v).toBe(1);
    expect(messages[0]?.role).toBe('user');
    expect(messages[0]?.trust).toBe('trusted');
    expect(messages[0]?.content).toBe('Check the weather in Hyderabad');
    expect(messages[0]?.ts).toBeDefined();

    expect(messages[1]?.role).toBe('assistant');
    expect(messages[1]?.toolCalls).toEqual([
      {
        id: 'call_1',
        name: 'get_weather',
        arguments: { city: 'Hyderabad' },
      },
    ]);
  });

  it('redacts secrets on disk before writing', async () => {
    const sessionId = 'session-secret';
    const leakedKey = 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz';

    await service.append(sessionId, {
      sessionId,
      role: 'tool',
      toolCallId: 'call_1',
      content: `API response error using key: ${leakedKey}`,
    });

    const filePath = path.join(tempDir, `${sessionId}.jsonl`);
    const rawDiskContent = await fs.readFile(filePath, 'utf-8');

    expect(rawDiskContent).not.toContain(leakedKey);
    expect(rawDiskContent).toContain('[REDACTED]');
  });

  it('tolerates a corrupted trailing line and returns valid prior messages', async () => {
    const sessionId = 'session-crash';

    await service.append(sessionId, {
      sessionId,
      role: 'user',
      content: 'First valid message',
    });

    await service.append(sessionId, {
      sessionId,
      role: 'assistant',
      content: 'Second valid message',
    });

    const filePath = path.join(tempDir, `${sessionId}.jsonl`);
    await fs.appendFile(filePath, '{"v":1,"role":"user","cont', 'utf-8');

    const messages = await service.read(sessionId);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toBe('First valid message');
    expect(messages[1]?.content).toBe('Second valid message');
  });
});