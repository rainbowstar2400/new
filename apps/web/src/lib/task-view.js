export function taskKindLabel(task) {
    return task.kind === "task" ? "タスク" : "メモ";
}
export function dueBadgeLabel(task) {
    if (task.kind === "memo")
        return "メモ";
    if (task.dueState === "pending_due")
        return "!期日設定";
    if (task.dueState === "no_due")
        return "期日なし";
    if (!task.dueAt)
        return "期日なし";
    return `期限: ${new Date(task.dueAt).toLocaleString("ja-JP")}`;
}
export function memoCategoryLabel(category) {
    if (category === "want")
        return "やりたいこと";
    if (category === "idea")
        return "アイデア";
    if (category === "misc")
        return "メモ（雑多）";
    return "";
}
