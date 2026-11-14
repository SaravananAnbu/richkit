import { describe, expect, it } from "vitest";
import * as server from "../src/server";

describe("richkit/server entry", () => {
  it("exports the prompt helpers and nothing else", () => {
    expect(Object.keys(server).sort()).toEqual(["AI_SYSTEM_PROMPT", "buildAIPrompt"]);

    const { system, user } = server.buildAIPrompt({
      action: "improve",
      selection: "<p>hi</p>",
      document: "<p>hi</p>",
    });
    expect(system).toBe(server.AI_SYSTEM_PROMPT);
    expect(user).toContain("<p>hi</p>");
  });
});
