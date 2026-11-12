import { describe, it, expect } from "vitest";
import { redactSecrets } from "../../../src/security/redact.js";

describe("redactSecrets", () => {
  it("redacts sensitive keys case-insensitively while preserving safe fields", () => {
    const input = {
      apiKey: "123",
      Authorization: "SecretHeader",
      user: {
        password: "abc",
        name: "Nakka",
      },
    };
    const result = redactSecrets(input);
    expect(result).toEqual({
      apiKey: "[REDACTED]",
      Authorization: "[REDACTED]",
      user: {
        password: "[REDACTED]",
        name: "Nakka",
      },
    });
  });

  it("masks inline secret tokens inside strings", () => {
    const rawLog = "failed with key AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz";
    const bearerLog = "Header: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature123";
    expect(redactSecrets(rawLog)).toBe("failed with key [REDACTED]");
    expect(redactSecrets(bearerLog)).toBe("Header: Bearer [REDACTED]");
  });

  it("does not mutate the original input object", () => {
    const original = {
      token: "secret",
      nested: {
        secret: "hidden",
      },
    };
    const result = redactSecrets(original);
    expect(result).toEqual({
      token: "[REDACTED]",
      nested: {
        secret: "[REDACTED]",
      },
    });
    expect(original.token).toBe("secret");
    expect(original.nested.secret).toBe("hidden");
  });

  it("handles circular references and error instances safely", () => {
    const circular: Record<string, unknown> = { name: "server-config" };
    circular.self = circular;
    const redactedCircular = redactSecrets(circular) as Record<string, unknown>;
    expect(redactedCircular.name).toBe("server-config");
    expect(redactedCircular.self).toBe("[Circular]");

    const err = new Error("Bad AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz");
    const redactedError = redactSecrets(err);
    expect(redactedError).toEqual({
      name: "Error",
      message: "Bad [REDACTED]",
    });
  });
});
