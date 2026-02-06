import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Task } from "@new/shared";
import {
  fetchTasks,
  registerInstallation,
  reclassifyTask,
  sendChatMessage,
  subscribePush,
  type DeviceSession
} from "./lib/api";
import { dueBadgeLabel, memoCategoryLabel, taskKindLabel } from "./lib/task-view";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SESSION_KEY = "secretary_session";
const DEFAULT_DUE_KEY = "default_due_time";
const TASK_ID_QUERY_KEY = "taskId";

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadStoredSession(): DeviceSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceSession;
  } catch {
    return null;
  }
}

function saveStoredSession(session: DeviceSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadDefaultDueTime(): string {
  return localStorage.getItem(DEFAULT_DUE_KEY) ?? "09:00";
}

function readTaskIdFromQuery(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get(TASK_ID_QUERY_KEY)?.trim();
  return taskId ? taskId : null;
}

function clearTaskIdQuery(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(TASK_ID_QUERY_KEY);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export default function App() {
  const [session, setSession] = useState<DeviceSession | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickChoices, setQuickChoices] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [defaultDueTime, setDefaultDueTime] = useState(loadDefaultDueTime());
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("起動中...");
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(readTaskIdFromQuery());

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
    if (!session) return;
    void refreshTasks(session);
  }, [session]);

  useEffect(() => {
    if (!focusedTaskId || tasks.length === 0) return;

    const target = tasks.find((task) => task.id === focusedTaskId);
    if (!target) {
      setStatusText("通知から開いたタスクが見つかりませんでした");
      return;
    }

    setStatusText(`通知から「${target.title}」を表示中`);
    requestAnimationFrame(() => {
      const node = document.querySelector<HTMLElement>(`[data-task-id="${focusedTaskId}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [focusedTaskId, tasks]);

  const sortedTasks = useMemo(() => {
    const ordered = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!focusedTaskId) return ordered;

    return ordered.sort((a, b) => {
      if (a.id === focusedTaskId && b.id !== focusedTaskId) return -1;
      if (b.id === focusedTaskId && a.id !== focusedTaskId) return 1;
      return 0;
    });
  }, [tasks, focusedTaskId]);

  async function refreshTasks(currentSession: DeviceSession): Promise<void> {
    const items = await fetchTasks(currentSession);
    setTasks(items);
  }

  async function postMessage(payload: { text?: string; selectedChoice?: string }): Promise<void> {
    if (!session) return;
    setBusy(true);
    try {
      if (payload.text) {
        setMessages((prev) => [...prev, { id: newMessageId(), role: "user", text: payload.text! }]);
      } else if (payload.selectedChoice) {
        setMessages((prev) => [...prev, { id: newMessageId(), role: "user", text: payload.selectedChoice! }]);
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
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: "assistant",
          text: "通信エラーが発生しました。もう一度お試しください。"
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function submitInput(event: FormEvent) {
    event.preventDefault();
    const text = inputText.trim();
    if (!text || busy) return;
    setInputText("");
    await postMessage({ text });
  }

  async function onPushSubscribe(): Promise<void> {
    if (!session) return;
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

    const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined;
    if (!publicKey) {
      alert("VITE_WEB_PUSH_PUBLIC_KEY が未設定です。");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(publicKey) as unknown as BufferSource
    });

    await subscribePush(session, subscription);
    alert("通知購読を保存しました。");
  }

  async function onReclassify(task: Task): Promise<void> {
    if (!session) return;
    const nextKind = task.kind === "task" ? "memo" : "task";
    await reclassifyTask(session, task.id, nextKind);
    await refreshTasks(session);
  }

  function onClearFocusTask(): void {
    setFocusedTaskId(null);
    clearTaskIdQuery();
    setStatusText("オンラインMVPモードで接続済み");
  }

  function saveDefaultDueTime(next: string): void {
    setDefaultDueTime(next);
    localStorage.setItem(DEFAULT_DUE_KEY, next);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Online MVP v0.2</p>
          <h1>自分専用秘書PWA</h1>
        </div>
        <p>{statusText}</p>
      </header>

      {focusedTaskId ? (
        <section className="focus-banner">
          <p>通知から開いたタスクを上部表示しています。</p>
          <button type="button" onClick={onClearFocusTask}>表示を解除</button>
        </section>
      ) : null}

      <main className="layout">
        <section className="panel chat-panel">
          <h2>会話入力</h2>
          <p className="muted">会話で入力し、確認は選択肢で確定します。</p>

          <div className="messages">
            {messages.length === 0 ? <p className="muted">最初の入力を送信してください。</p> : null}
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                {message.text}
              </div>
            ))}
          </div>

          <div className="choices">
            {quickChoices.map((choice) => (
              <button key={choice} type="button" disabled={busy} onClick={() => void postMessage({ selectedChoice: choice })}>
                {choice}
              </button>
            ))}
          </div>

          <form className="chat-form" onSubmit={submitInput}>
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="例: 明日9時にAさんへ連絡"
            />
            <button type="submit" disabled={busy || !session}>
              送信
            </button>
          </form>
        </section>

        <section className="panel side-panel">
          <h2>設定</h2>
          <label className="label">
            既定時刻
            <input
              type="time"
              value={defaultDueTime}
              onChange={(event) => saveDefaultDueTime(event.target.value)}
            />
          </label>
          <button type="button" onClick={() => void onPushSubscribe()}>
            通知を有効化
          </button>

          <h2>タスク・メモ一覧</h2>
          <ul className="task-list">
            {sortedTasks.map((task) => (
              <li
                key={task.id}
                data-task-id={task.id}
                className={`task-item ${task.id === focusedTaskId ? "focused" : ""}`}
              >
                <p className="task-title">{task.title}</p>
                <div className="meta-row">
                  <span className={`badge ${task.kind}`}>{taskKindLabel(task)}</span>
                  {task.memoCategory ? <span className="badge memo-cat">{memoCategoryLabel(task.memoCategory)}</span> : null}
                  <span className={`badge due ${task.dueState}`}>{dueBadgeLabel(task)}</span>
                </div>
                <button type="button" onClick={() => void onReclassify(task)}>
                  {task.kind === "task" ? "メモへ変更" : "タスクへ変更"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
