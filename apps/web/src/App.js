import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { fetchTasks, registerInstallation, reclassifyTask, sendChatMessage, subscribePush } from "./lib/api";
import { dueBadgeLabel, memoCategoryLabel, taskKindLabel } from "./lib/task-view";
const SESSION_KEY = "secretary_session";
const DEFAULT_DUE_KEY = "default_due_time";
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
    const [inputText, setInputText] = useState("");
    const [defaultDueTime, setDefaultDueTime] = useState(loadDefaultDueTime());
    const [busy, setBusy] = useState(false);
    const [statusText, setStatusText] = useState("起動中...");
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
        if (!session)
            return;
        void refreshTasks(session);
    }, [session]);
    const sortedTasks = useMemo(() => [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [tasks]);
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
            await refreshTasks(session);
        }
        catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: newMessageId(),
                    role: "assistant",
                    text: "通信エラーが発生しました。もう一度お試しください。"
                }
            ]);
        }
        finally {
            setBusy(false);
        }
    }
    async function submitInput(event) {
        event.preventDefault();
        const text = inputText.trim();
        if (!text || busy)
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
    function saveDefaultDueTime(next) {
        setDefaultDueTime(next);
        localStorage.setItem(DEFAULT_DUE_KEY, next);
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Online MVP v0.2" }), _jsx("h1", { children: "\u81EA\u5206\u5C02\u7528\u79D8\u66F8PWA" })] }), _jsx("p", { children: statusText })] }), _jsxs("main", { className: "layout", children: [_jsxs("section", { className: "panel chat-panel", children: [_jsx("h2", { children: "\u4F1A\u8A71\u5165\u529B" }), _jsx("p", { className: "muted", children: "\u4F1A\u8A71\u3067\u5165\u529B\u3057\u3001\u78BA\u8A8D\u306F\u9078\u629E\u80A2\u3067\u78BA\u5B9A\u3057\u307E\u3059\u3002" }), _jsxs("div", { className: "messages", children: [messages.length === 0 ? _jsx("p", { className: "muted", children: "\u6700\u521D\u306E\u5165\u529B\u3092\u9001\u4FE1\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }) : null, messages.map((message) => (_jsx("div", { className: `message ${message.role}`, children: message.text }, message.id)))] }), _jsx("div", { className: "choices", children: quickChoices.map((choice) => (_jsx("button", { type: "button", disabled: busy, onClick: () => void postMessage({ selectedChoice: choice }), children: choice }, choice))) }), _jsxs("form", { className: "chat-form", onSubmit: submitInput, children: [_jsx("textarea", { value: inputText, onChange: (event) => setInputText(event.target.value), placeholder: "\u4F8B: \u660E\u65E59\u6642\u306BA\u3055\u3093\u3078\u9023\u7D61" }), _jsx("button", { type: "submit", disabled: busy || !session, children: "\u9001\u4FE1" })] })] }), _jsxs("section", { className: "panel side-panel", children: [_jsx("h2", { children: "\u8A2D\u5B9A" }), _jsxs("label", { className: "label", children: ["\u65E2\u5B9A\u6642\u523B", _jsx("input", { type: "time", value: defaultDueTime, onChange: (event) => saveDefaultDueTime(event.target.value) })] }), _jsx("button", { type: "button", onClick: () => void onPushSubscribe(), children: "\u901A\u77E5\u3092\u6709\u52B9\u5316" }), _jsx("h2", { children: "\u30BF\u30B9\u30AF\u30FB\u30E1\u30E2\u4E00\u89A7" }), _jsx("ul", { className: "task-list", children: sortedTasks.map((task) => (_jsxs("li", { className: "task-item", children: [_jsx("p", { className: "task-title", children: task.title }), _jsxs("div", { className: "meta-row", children: [_jsx("span", { className: `badge ${task.kind}`, children: taskKindLabel(task) }), task.memoCategory ? _jsx("span", { className: "badge memo-cat", children: memoCategoryLabel(task.memoCategory) }) : null, _jsx("span", { className: `badge due ${task.dueState}`, children: dueBadgeLabel(task) })] }), _jsx("button", { type: "button", onClick: () => void onReclassify(task), children: task.kind === "task" ? "メモへ変更" : "タスクへ変更" })] }, task.id))) })] })] })] }));
}
