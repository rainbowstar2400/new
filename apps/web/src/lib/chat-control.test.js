import { describe, expect, it } from "vitest";
import { chatControlHint, inferChatControl, isTextInputAllowed } from "./chat-control";
function baseResponse(overrides) {
    return {
        assistantText: "ok",
        summarySlot: "ok",
        actionType: "confirm",
        quickChoices: [],
        affectedTaskIds: [],
        ...overrides
    };
}
describe("chat-control", () => {
    it("uses explicit API meta when provided", () => {
        const control = inferChatControl(baseResponse({
            inputMode: "choice_only",
            confirmationType: "due_choice",
            negativeChoice: null,
            quickChoices: ["設定する", "設定しない", "後で設定する"]
        }));
        expect(control.inputMode).toBe("choice_only");
        expect(control.confirmationType).toBe("due_choice");
        expect(isTextInputAllowed(control)).toBe(false);
    });
    it("falls back to legacy inference for circle-cross choices", () => {
        const control = inferChatControl(baseResponse({
            assistantText: "期限を確認します。（○/✕）",
            quickChoices: ["○", "✕"]
        }));
        expect(control.inputMode).toBe("choice_then_text_on_negative");
        expect(control.negativeChoice).toBe("✕");
        expect(chatControlHint(control)).toContain("✕");
    });
    it("allows free text when choices are absent", () => {
        const control = inferChatControl(baseResponse({
            actionType: "confirm",
            assistantText: "期限の日時を入力してください。",
            quickChoices: []
        }));
        expect(control.inputMode).toBe("free_text");
        expect(isTextInputAllowed(control)).toBe(true);
    });
});
