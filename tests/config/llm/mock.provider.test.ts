import { describe, expect, it } from "vitest";
import { MockLLMProvider } from "../../../src/llm/mock.provider.js";
import { LLMRequest, LLMResponse } from "../../../src/llm/llm.interface.js";
import { AppError } from "../../../src/errors/app-error.js";
import { TranscriptMessage } from "../../../src/workspace/transcript.js";

const makeMessage = (
  overrides: Partial<TranscriptMessage> & Pick<TranscriptMessage, "role" | "content">
): TranscriptMessage => ({
  sessionId: "test-session",
  timestamp: new Date().toISOString(),
  ...overrides,
} as TranscriptMessage);

describe("MockLLMProvider", () => {
  it("1. plays back scripted responses in strict sequential order", async () => {
    const toolResponse: LLMResponse = {
      type: "tool_calls",
      calls: [
        {
          id: "call_1",
          name: "read_file",
          arguments: { path: "README.md" },
        },
      ],
      usage: { inputTokens: 15, outputTokens: 10 },
    };

    const finalResponse: LLMResponse = {
      type: "final",
      content: "Here is the summary of README.md.",
      usage: { inputTokens: 45, outputTokens: 20 },
    };

    const originalScript = [toolResponse, finalResponse];
    const provider = new MockLLMProvider(originalScript);

    expect(provider.name).toBe("mock");
    expect(provider.remainingScriptCount).toBe(2);

    const req1: LLMRequest = {
  messages: [makeMessage({ role: "user", content: "Summarize README.md" })],
};
    const res1 = await provider.generateResponse(req1);

    expect(res1).toEqual(toolResponse);
    expect(provider.remainingScriptCount).toBe(1);

   const req2: LLMRequest = {
  messages: [
    makeMessage({ role: "user", content: "Summarize README.md" }),
    makeMessage({ role: "tool", toolCallId: "call_1", content: "# 7A Runtime" }),
  ],
};
    const res2 = await provider.generateResponse(req2);

    expect(res2).toEqual(finalResponse);
    expect(provider.remainingScriptCount).toBe(0);
    // Ensures constructor cloned the input array instead of mutating it
    expect(originalScript).toHaveLength(2);
  });

  it("2. records incoming requests in provider.requests for telemetry inspection", async () => {
    const provider = new MockLLMProvider([
      {
        type: "final",
        content: "Done.",
        usage: { inputTokens: 10, outputTokens: 5 },
      },
    ]);

    const request: LLMRequest = {
      messages: [
        makeMessage({ role: "system", content: "You are 7A, a local-first assistant." }),
        makeMessage({ role: "user", content: "List workspace files" })],
      tools: [
        {
          name: "list_files",
          description: "Lists files in the workspace",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      ],
    };

    await provider.generateResponse(request);

    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0]).toEqual(request);
    expect(provider.requests[0].messages[0].content).toBe(
      "You are 7A, a local-first assistant."
    );
    expect(provider.requests[0].tools?.[0].name).toBe("list_files");
  });

  it("3. throws a 500 INTERNAL_ERROR AppError when the script is exhausted", async () => {
    const provider = new MockLLMProvider([
      {
        type: "final",
        content: "Only response",
        usage: { inputTokens: 5, outputTokens: 5 },
      },
    ]);

    await provider.generateResponse({
      messages: [makeMessage({ role: "user", content: "Turn 1" })],
    });
    expect(provider.remainingScriptCount).toBe(0);

    await expect(
      provider.generateResponse({
        messages: [makeMessage({ role: "user", content: "Unexpected Turn 2" })],
      })
    ).rejects.toMatchObject({
      name: "AppError",
      statusCode: 500,
      code: "INTERNAL_ERROR",
    });

    const emptyProvider = new MockLLMProvider();
    try {
      await emptyProvider.generateResponse({
        messages: [makeMessage({ role: "user", content: "Hello" })],
      });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(500);
      expect((err as AppError).code).toBe("INTERNAL_ERROR");
    }
  });
});