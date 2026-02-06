function inferConfirmationTypeLegacy(response) {
    const choices = response.quickChoices;
    const text = response.assistantText;
    if (choices.includes("タスク") && choices.includes("メモ"))
        return "task_or_memo";
    if (choices.includes("やりたいこと") || choices.includes("アイデア") || choices.includes("メモ（雑多）")) {
        return "memo_category";
    }
    if (choices.includes("設定する") && choices.includes("設定しない") && choices.includes("後で設定する")) {
        return "due_choice";
    }
    if (choices.includes("○") && choices.includes("✕")) {
        return text.includes("対象タスク") ? "task_target_confirm" : "due_time_confirm";
    }
    if (response.actionType !== "confirm")
        return null;
    if (text.includes("タスクにしますか？メモにしますか"))
        return "task_or_memo";
    if (text.includes("メモの分類"))
        return "memo_category";
    if (text.includes("期日はどうしますか") || text.includes("いつを期限"))
        return "due_choice";
    if (text.includes("時刻") || text.includes("○/✕"))
        return "due_time_confirm";
    if (text.includes("対象タスク"))
        return "task_target_confirm";
    return null;
}
function inferInputModeLegacy(response, confirmationType) {
    if (confirmationType === null)
        return "free_text";
    if (response.quickChoices.length === 0)
        return "free_text";
    if (response.quickChoices.includes("○") && response.quickChoices.includes("✕")) {
        return "choice_then_text_on_negative";
    }
    return "choice_only";
}
export function inferChatControl(response) {
    const confirmationType = response.confirmationType ?? inferConfirmationTypeLegacy(response);
    const inputMode = response.inputMode ?? inferInputModeLegacy(response, confirmationType);
    const negativeChoice = response.negativeChoice ?? (inputMode === "choice_then_text_on_negative" ? "✕" : null);
    return {
        inputMode,
        confirmationType,
        negativeChoice
    };
}
export function isTextInputAllowed(control) {
    return control.inputMode === "free_text";
}
export function chatControlHint(control) {
    if (control.inputMode === "choice_only") {
        return "選択肢を先に選んでください。";
    }
    if (control.inputMode === "choice_then_text_on_negative") {
        return `${control.negativeChoice ?? "✕"} を選ぶと補足の自然言語入力に進みます。`;
    }
    return null;
}
