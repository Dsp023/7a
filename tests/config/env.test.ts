import { describe, it, expect  } from "vitest";
import { envSchema } from "../../src/config/env.js";
describe("Environment Configuration",() => {
it("should return default values when input is empty",() =>{
    const actualValue = envSchema.parse({});
    expect(actualValue.NODE_ENV).toBe("development");
    expect(actualValue.GATEWAY_PORT).toBe(7171);
    expect(actualValue.WORKSPACE_DIR).toBe("~/.7a/workspace");
    expect(actualValue.LLM_PROVIDER).toBe("mock");
    expect(actualValue.DRY_RUN).toBe(false);
    
});
it("should coerce environment values into correct types", () => {
    const input = envSchema.parse({
        GATEWAY_PORT: "9000", DRY_RUN: "true"
    });
    expect(typeof input.GATEWAY_PORT ).toBe("number");
    expect(typeof input.DRY_RUN).toBe("boolean");
    expect(input.GATEWAY_PORT).toBe(9000);
    expect(input.DRY_RUN).toBe(true);
});
it("should reject invalid NODE_ENV values", () => {
 expect(() =>{ envSchema.parse({ NODE_ENV: "Invalid"});
 }).toThrow();
});

});
 