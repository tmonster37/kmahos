import { describe, it, expect } from "vitest";
import { escapeHtml } from "../utils/printHelper";

describe("Print Helper & XSS Sanitization (printHelper.js)", () => {
    it("escapes script tags to prevent DOM-based XSS in print popups", () => {
        const payload = '<script>alert("xss")</script>';
        const escaped = escapeHtml(payload);
        expect(escaped).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
        expect(escaped).not.toContain("<script>");
    });

    it("escapes img onerror attributes", () => {
        const payload = '<img src="x" onerror="alert(1)">';
        const escaped = escapeHtml(payload);
        expect(escaped).toBe("&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;");
        expect(escaped).not.toContain("<img");
    });

    it("escapes quotes and ampersands properly", () => {
        const payload = 'Tom & "Jerry" / O\'Reilly';
        const escaped = escapeHtml(payload);
        expect(escaped).toBe("Tom &amp; &quot;Jerry&quot; / O&#039;Reilly");
    });

    it("handles null, undefined, numbers, and plain strings gracefully", () => {
        expect(escapeHtml(null)).toBe("");
        expect(escapeHtml(undefined)).toBe("");
        expect(escapeHtml(12345)).toBe("12345");
        expect(escapeHtml("Nguyễn Văn A")).toBe("Nguyễn Văn A");
    });
});

