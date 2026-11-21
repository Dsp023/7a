import { AppError } from "../errors/app-error.js";

import {
    LLMProvider,
    LLMRequest,
    LLMResponse,
} from "./llm.interface.js";

export class MockLLMProvider implements LLMProvider {
    public readonly name = "mock";
    public readonly requests: LLMRequest[] = [];
    public readonly script: LLMResponse[];

    constructor(script:  LLMResponse[] = []){
        this.script = [...script];
    }
    get remainingScriptCount(): number {
        return this.script.length;
    }
    async generateResponse(request: LLMRequest): Promise<LLMResponse> {
        this.requests.push(request);
        const nextResponse = this.script.shift();
        if(!nextResponse){
            throw new AppError(
                "MockLLMProvider: script exhauted -no more canned response",
                500,
                "INTERNAL_ERROR"
            );
        }
        return nextResponse;
    }

}