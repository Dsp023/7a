
import { StringValidation } from "zod/v3";
import { TranscriptMessage, ToolCall } from "../workspace/transcript.js";


export interface TokenUsage{
    inputTokens: number;
    outputTokens: number;
}
export type LLMResponse =
| {
    type: "final",
    content: string;
    usage: TokenUsage;
}
|{

    type: "tool_calls";
    content?: string;
    calls: ToolCall[];
    usage:TokenUsage;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: unknown;
}
export interface LLMRequest{
    messages: TranscriptMessage[];
    tools?: ToolDefinition[];
    models?: string;
    temperature?: number;
}
export interface LLMProvider {
  readonly name: string;
  generateResponse(request: LLMRequest): Promise<LLMResponse>;
}