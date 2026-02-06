import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { fetchTasks, registerInstallation, reclassifyTask, sendChatMessage, subscribePush } from "./lib/api";
import { chatControlHint, inferChatControl, isTextInputAllowed } from "./lib/chat-control";
import { dueBadgeLabel, memoCategoryLabel, taskKindLabel } from "./lib/task-view";
const SESSION_KEY = "secretary_session";
const DEFAULT_DUE_KEY = "default_due_time";
const TASK_ID_QUERY_KEY = "taskId";
const DEFAULT_CHAT_CONTROL = {
    inputMode: "free_text",
    confirmationType: null,
    negativeChoice: null
};
function newMessageId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function loadStoredSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function saveStoredSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function loadDefaultDueTime() {
    return localStorage.getItem(DEFAULT_DUE_KEY) ?? "09:00";
}
function readTaskIdFromQuery() {
    if (typeof window === "undefined")
        return null;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get(TASK_ID_QUERY_KEY)?.trim();
    return taskId ? taskId : null;
}
function clearTaskIdQuery() {
    if (typeof window === "undefined")
        return;
    const url = new URL(window.location.href);
    url.searchParams.delete(TASK_ID_QUERY_KEY);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
function base64ToUint8Array(base64) {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64Safe);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
        output[i] = raw.charCodeAt(i);
    }
    return output;
}
function choiceTone(choice) {
    if (choice === "○")
        return "confirm-yes";
    if (choice === "✕")
        return "confirm-no";
    if (choice === "設定する")
        return "due-set";
    if (choice === "設定しない")
        return "due-none";
    if (choice === "後で設定する")
        return "due-later";
    if (choice === "タスク")
        return "kind-task";
    if (choice === "メモ")
        return "kind-memo";
    if (choice === "やりたいこと")
        return "memo-want";
    if (choice === "アイデア")
        return "memo-idea";
    if (choice === "メモ（雑多）")
        return "memo-misc";
    return "default";
}
function choiceHelpText(choices) {
    if (choices.includes("○") && choices.includes("✕")) {
        return "✕ を選ぶと補足の自然言語入力に進みます。";
    }
    if (choices.includes("設定する") && choices.includes("後で設定する")) {
        return "設定するを選ぶと、続けて期日を自然言語で入力できます。";
    }
    if (choices.includes("タスク") && choices.includes("メモ")) {
        return "判断に迷う場合は、まずメモで保存して後から変更できます。";
    }
    if (choices.includes("やりたいこと") || choices.includes("アイデア") || choices.includes("メモ（雑多）")) {
        return "内容に合うメモ分類を選択してください。";
    }
    return null;
}
async function registerServiceWorker() {
    if (!("serviceWorker" in navigator))
        return null;
    return navigator.serviceWorker.register("/sw.js");
}
export default function App() {
    const [session, setSession] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [messages, setMessages] = useState([]);
    const [quickChoices, setQuickChoices] = useState([]);
    const [chatControl, setChatControl] = useState(DEFAULT_CHAT_CONTROL);
    const [inputText, setInputText] = useState("");
    const [defaultDueTime, setDefaultDueTime] = useState(loadDefaultDueTime());
    const [busy, setBusy] = useState(false);
    const [statusText, setStatusText] = useState("起動中...");
    const [focusedTaskId, setFocusedTaskId] = useState(readTaskIdFromQuery());
    useEffect(() => {
        void (async () => {
            await registerServiceWorker();
            let nextSession = loadStoredSession();
            if (!nextSession) {
                nextSession = await registerInstallation(Intl.DateTimeFormat().resolvedOptions().timeZone);
                saveStoredSession(nextSession);
            }
            setSession(nextSession);
            setStatusText("オンラインMVPモードで接続済み");
        })();
    }, []);
    useEffect(() => {
        const onPopState = () => setFocusedTaskId(readTaskIdFromQuery());
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);
    useEffect(() => {
        if (!session)
            return;
        void refreshTasks(session);
    }, [session]);
    useEffect(() => {
        if (!focusedTaskId || tasks.length === 0)
            return;
        const target = tasks.find((task) => task.id === focusedTaskId);
        if (!target) {
            setStatusText("通知から開いたタスクが見つかりませんでした");
            return;
        }
        setStatusText(`通知から「${target.title}」を表示中`);
        requestAnimationFrame(() => {
            const node = document.querySelector(`[data-task-id="${focusedTaskId}"]`);
            node?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }, [focusedTaskId, tasks]);
    const sortedTasks = useMemo(() => {
        const ordered = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        if (!focusedTaskId)
            return ordered;
        return ordered.sort((a, b) => {
            if (a.id === focusedTaskId && b.id !== focusedTaskId)
                return -1;
            if (b.id === focusedTaskId && a.id !== focusedTaskId)
                return 1;
            return 0;
        });
    }, [tasks, focusedTaskId]);
    const quickChoiceHelp = useMemo(() => choiceHelpText(quickChoices), [quickChoices]);
    const chatModeHint = useMemo(() => chatControlHint(chatControl), [chatControl]);
    const canTypeText = useMemo(() => isTextInputAllowed(chatControl), [chatControl]);
    async function refreshTasks(currentSession) {
        const items = await fetchTasks(currentSession);
        setTasks(items);
    }
    async function postMessage(payload) {
        if (!session)
            return;
        setBusy(true);
        try {
            if (payload.text) {
                setMessages((prev) => [...prev, { id: newMessageId(), role: "user", text: payload.text }]);
            }
            else if (payload.selectedChoice) {
                setMessages((prev) => [...prev, { id: newMessageId(), role: "user", text: payload.selectedChoice }]);
            }
            const response = await sendChatMessage(session, {
                ...payload,
                defaultDueTime
            });
            setMessages((prev) => [
                ...prev,
                {
                    id: newMessageId(),
                    role: "assistant",
                    text: response.assistantText
                }
            ]);
            setQuickChoices(response.quickChoices);
            setChatControl(inferChatControl(response));
            await refreshTasks(session);
        }
        catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: newMessageId(),
                    role: "assistant",
                    text: "通信エラーが発生しました。もう一度お試しください。"
                }
            ]);
            setQuickChoices([]);
            setChatControl(DEFAULT_CHAT_CONTROL);
        }
        finally {
            setBusy(false);
        }
    }
    async function submitInput(event) {
        event.preventDefault();
        const text = inputText.trim();
        if (!text || busy || !canTypeText)
            return;
        setInputText("");
        await postMessage({ text });
    }
    async function onPushSubscribe() {
        if (!session)
            return;
        if (!("Notification" in window)) {
            alert("このブラウザは通知に対応していません。");
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            alert("通知許可が必要です。");
            return;
        }
        const registration = await registerServiceWorker();
        if (!registration) {
            alert("Service Worker登録に失敗しました。");
            return;
        }
        const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
        if (!publicKey) {
            alert("VITE_WEB_PUSH_PUBLIC_KEY が未設定です。");
            return;
        }
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToUint8Array(publicKey)
        });
        await subscribePush(session, subscription);
        alert("通知購読を保存しました。");
    }
    async function onReclassify(task) {
        if (!session)
            return;
        const nextKind = task.kind === "task" ? "memo" : "task";
        await reclassifyTask(session, task.id, nextKind);
        await refreshTasks(session);
    }
    function onClearFocusTask() {
        setFocusedTaskId(null);
        clearTaskIdQuery();
        setStatusText("オンラインMVPモードで接続済み");
    }
    function saveDefaultDueTime(next) {
        setDefaultDueTime(next);
        localStorage.setItem(DEFAULT_DUE_KEY, next);
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Online MVP v0.2" }), _jsx("h1", { children: "\u81EA\u5206\u5C02\u7528\u79D8\u66F8PWA" })] }), _jsx("p", { children: statusText })] }), focusedTaskId ? (_jsxs("section", { className: "focus-banner", children: [_jsx("p", { children: "\u901A\u77E5\u304B\u3089\u958B\u3044\u305F\u30BF\u30B9\u30AF\u3092\u4E0A\u90E8\u8868\u793A\u3057\u3066\u3044\u307E\u3059\u3002" }), _jsx("button", { type: "button", onClick: onClearFocusTask, children: "\u8868\u793A\u3092\u89E3\u9664" })] })) : null, _jsxs("main", { className: "layout", children: [_jsxs("section", { className: "panel chat-panel", children: [_jsx("h2", { children: "\u4F1A\u8A71\u5165\u529B" }), _jsx("p", { className: "muted", children: "\u4F1A\u8A71\u3067\u5165\u529B\u3057\u3001\u78BA\u8A8D\u306F\u9078\u629E\u80A2\u3067\u78BA\u5B9A\u3057\u307E\u3059\u3002" }), _jsxs("div", { className: "messages", children: [messages.length === 0 ? _jsx("p", { className: "muted", children: "\u6700\u521D\u306E\u5165\u529B\u3092\u9001\u4FE1\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }) : null, messages.map((message) => (_jsx("div", { className: `message ${message.role}`, children: message.text }, message.id)))] }), _jsx("div", { className: "choices", "aria-live": "polite", children: quickChoices.map((choice) => (_jsx("button", { type: "button", className: `choice-btn ${choiceTone(choice)}`, disabled: busy, onClick: () => void postMessage({ selectedChoice: choice }), children: choice }, choice))) }), quickChoiceHelp ? _jsx("p", { className: "choice-hint", children: quickChoiceHelp }) : null, chatModeHint ? _jsx("p", { className: "input-lock-hint", children: chatModeHint }) : null, _jsxs("form", { className: "chat-form", onSubmit: submitInput, children: [_jsx("textarea", { value: inputText, onChange: (event) => setInputText(event.target.value), placeholder: "\u4F8B: \u660E\u65E59\u6642\u306BA\u3055\u3093\u3078\u9023\u7D61", disabled: busy || !canTypeText }), _jsx("button", { type: "submit", disabled: busy || !session || !canTypeText || !inputText.trim(), children: "\u9001\u4FE1" })] })] }), _jsxs("section", { className: "panel side-panel", children: [_jsx("h2", { children: "\u8A2D\u5B9A" }), _jsxs("label", { className: "label", children: ["\u65E2\u5B9A\u6642\u523B", _jsx("input", { type: "time", value: defaultDueTime, onChange: (event) => saveDefaultDueTime(event.target.value) })] }), _jsx("button", { type: "button", onClick: () => void onPushSubscribe(), children: "\u901A\u77E5\u3092\u6709\u52B9\u5316" }), _jsx("h2", { children: "\u30BF\u30B9\u30AF\u30FB\u30E1\u30E2\u4E00\u89A7" }), _jsx("ul", { className: "task-list", children: sortedTasks.map((task) => (_jsxs("li", { "data-task-id": task.id, className: `task-item ${task.id === focusedTaskId ? "focused" : ""}`, children: [_jsx("p", { className: "task-title", children: task.title }), _jsxs("div", { className: "meta-row", children: [_jsx("span", { className: `badge ${task.kind}`, children: taskKindLabel(task) }), task.memoCategory ? _jsx("span", { className: "badge memo-cat", children: memoCategoryLabel(task.memoCategory) }) : null, _jsx("span", { className: `badge due ${task.dueState}`, children: dueBadgeLabel(task) })] }), _jsx("button", { type: "button", onClick: () => void onReclassify(task), children: task.kind === "task" ? "メモへ変更" : "タスクへ変更" })] }, task.id))) })] })] })] }));
}
