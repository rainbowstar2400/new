import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ResponseTone, Task } from "@new/shared";
import {
  fetchTasks,
  registerInstallation,
  reclassifyTask,
  sendChatMessage,
  subscribePush,
  type DeviceSession
} from "./lib/api";
import { chatControlHint, inferChatControl, isTextInputAllowed, type ChatControlState } from "./lib/chat-control";
import { dueBadgeLabel, memoCategoryLabel, taskKindLabel } from "./lib/task-view";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type TabKey = "chat" | "items" | "settings";
type ItemFilter = "all" | "memo" | "task";

const SESSION_KEY = "secretary_session";
const DEFAULT_DUE_KEY = "default_due_time";
const RESPONSE_TONE_KEY = "response_tone";
const ACTIVE_TAB_KEY = "active_tab_v03";
const ITEMS_FILTER_KEY = "items_filter_v03";
const TASK_ID_QUERY_KEY = "taskId";

const RESPONSE_TONE_OPTIONS: Array<{ value: ResponseTone; label: string }> = [
  { value: "polite", label: "丁寧" },
  { value: "friendly", label: "フレンドリー" },
  { value: "concise", label: "簡潔" }
];

const ITEM_FILTER_OPTIONS: Array<{ value: ItemFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "memo", label: "メモのみ" },
  { value: "task", label: "タスクのみ" }
];

const TAB_OPTIONS: Array<{ value: TabKey; label: string }> = [
  { value: "chat", label: "チャット" },
  { value: "items", label: "メモ・タスク" },
  { value: "settings", label: "設定" }
];

const DEFAULT_CHAT_CONTROL: ChatControlState = {
  inputMode: "free_text",
  confirmationType: null,
  negativeChoice: null
};

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

function isResponseTone(value: string): value is ResponseTone {
  return value === "polite" || value === "friendly" || value === "concise";
}

function loadResponseTone(): ResponseTone {
  const raw = localStorage.getItem(RESPONSE_TONE_KEY);
  return raw && isResponseTone(raw) ? raw : "polite";
}

function isTabKey(value: string): value is TabKey {
  return value === "chat" || value === "items" || value === "settings";
}

function loadActiveTab(): TabKey {
  const raw = localStorage.getItem(ACTIVE_TAB_KEY);
  return raw && isTabKey(raw) ? raw : "chat";
}

function isItemFilter(value: string): value is ItemFilter {
  return value === "all" || value === "memo" || value === "task";
}

function loadItemsFilter(): ItemFilter {
  const raw = localStorage.getItem(ITEMS_FILTER_KEY);
  return raw && isItemFilter(raw) ? raw : "all";
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

function choiceTone(choice: string): string {
  if (choice === "○") return "confirm-yes";
  if (choice === "✕") return "confirm-no";
  if (choice === "設定する") return "due-set";
  if (choice === "設定しない") return "due-none";
  if (choice === "後で設定する") return "due-later";
  if (choice === "タスク") return "kind-task";
  if (choice === "メモ") return "kind-memo";
  if (choice === "やりたいこと") return "memo-want";
  if (choice === "アイデア") return "memo-idea";
  if (choice === "メモ（雑多）") return "memo-misc";
  return "default";
}

function choiceHelpText(choices: string[]): string | null {
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

function emptyStateText(filter: ItemFilter): string {
  if (filter === "memo") return "メモはまだありません。チャットから追加してください。";
  if (filter === "task") return "タスクはまだありません。チャットで登録を始めましょう。";
  return "まだ項目がありません。チャットから最初の1件を登録してください。";
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
  const [chatControl, setChatControl] = useState<ChatControlState>(DEFAULT_CHAT_CONTROL);
  const [inputText, setInputText] = useState("");
  const [defaultDueTime, setDefaultDueTime] = useState(loadDefaultDueTime());
  const [responseTone, setResponseTone] = useState<ResponseTone>(loadResponseTone());
  const [activeTab, setActiveTab] = useState<TabKey>(loadActiveTab());
  const [itemsFilter, setItemsFilter] = useState<ItemFilter>(loadItemsFilter());
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

    setActiveTab("items");
    localStorage.setItem(ACTIVE_TAB_KEY, "items");
    if (itemsFilter !== "all") {
      setItemsFilter("all");
      localStorage.setItem(ITEMS_FILTER_KEY, "all");
    }
    setStatusText(`通知から「${target.title}」を表示中`);
    requestAnimationFrame(() => {
      const node = document.querySelector<HTMLElement>(`[data-task-id="${focusedTaskId}"]`);
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [focusedTaskId, itemsFilter, tasks]);

  useEffect(() => {
    if (!focusedTaskId) return;
    setActiveTab("items");
    localStorage.setItem(ACTIVE_TAB_KEY, "items");
  }, [focusedTaskId]);

  const sortedTasks = useMemo(() => {
    const ordered = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!focusedTaskId) return ordered;

    return ordered.sort((a, b) => {
      if (a.id === focusedTaskId && b.id !== focusedTaskId) return -1;
      if (b.id === focusedTaskId && a.id !== focusedTaskId) return 1;
      return 0;
    });
  }, [tasks, focusedTaskId]);

  const filteredTasks = useMemo(() => {
    if (itemsFilter === "all") return sortedTasks;
    return sortedTasks.filter((task) => task.kind === itemsFilter);
  }, [sortedTasks, itemsFilter]);

  const quickChoiceHelp = useMemo(() => choiceHelpText(quickChoices), [quickChoices]);
  const chatModeHint = useMemo(() => chatControlHint(chatControl), [chatControl]);
  const canTypeText = useMemo(() => isTextInputAllowed(chatControl), [chatControl]);

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
        defaultDueTime,
        responseTone
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
    } catch {
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
    } finally {
      setBusy(false);
    }
  }

  async function submitInput(event: FormEvent) {
    event.preventDefault();
    const text = inputText.trim();
    if (!text || busy || !canTypeText) return;
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

  function saveResponseTone(next: ResponseTone): void {
    setResponseTone(next);
    localStorage.setItem(RESPONSE_TONE_KEY, next);
  }

  function saveActiveTab(next: TabKey): void {
    setActiveTab(next);
    localStorage.setItem(ACTIVE_TAB_KEY, next);
  }

  function saveItemsFilter(next: ItemFilter): void {
    setItemsFilter(next);
    localStorage.setItem(ITEMS_FILTER_KEY, next);
  }

  return (
    <div className="v03-shell">
      <header className="v03-header">
        <div className="v03-header-copy">
          <p className="v03-kicker">Online MVP v0.3</p>
          <h1>自分専用秘書PWA</h1>
        </div>
        <p className="v03-status">{statusText}</p>
      </header>

      {focusedTaskId ? (
        <section className="v03-focus-banner" role="status">
          <p>通知から開いたタスクを優先表示しています。</p>
          <button type="button" onClick={onClearFocusTask}>表示を解除</button>
        </section>
      ) : null}

      <main className="v03-main" data-active-tab={activeTab}>
        <section className={`v03-screen ${activeTab === "chat" ? "is-active" : "is-hidden"}`} aria-label="チャット画面">
          <div className="v03-card chat-stage">
            <div className="v03-card-head">
              <h2>チャット</h2>
              <p>会話で登録し、確認は選択肢で確定します。</p>
            </div>

            <div className="v03-message-log" aria-live="polite">
              {messages.length === 0 ? <p className="v03-muted">最初の入力を送信してください。</p> : null}
              {messages.map((message) => (
                <article key={message.id} className={`v03-bubble ${message.role}`}>
                  {message.text}
                </article>
              ))}
            </div>

            <div className="v03-choice-row" aria-live="polite">
              {quickChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`v03-choice ${choiceTone(choice)}`}
                  disabled={busy}
                  onClick={() => void postMessage({ selectedChoice: choice })}
                >
                  {choice}
                </button>
              ))}
            </div>
            {quickChoiceHelp ? <p className="v03-choice-help">{quickChoiceHelp}</p> : null}
            {chatModeHint ? <p className="v03-input-hint">{chatModeHint}</p> : null}

            <form className="v03-chat-form" onSubmit={submitInput}>
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="例: 明日9時にAさんへ連絡"
                disabled={busy || !canTypeText}
              />
              <button type="submit" disabled={busy || !session || !canTypeText || !inputText.trim()}>
                送信
              </button>
            </form>
          </div>
        </section>

        <section className={`v03-screen ${activeTab === "items" ? "is-active" : "is-hidden"}`} aria-label="メモ・タスク画面">
          <div className="v03-card items-stage">
            <div className="v03-card-head">
              <h2>メモ・タスク</h2>
              <p>登録済み項目の確認と再分類を行います。</p>
            </div>

            <div className="v03-segment" role="tablist" aria-label="フィルタ">
              {ITEM_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={itemsFilter === option.value}
                  className={`v03-segment-btn ${itemsFilter === option.value ? "active" : ""}`}
                  onClick={() => saveItemsFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <p className="v03-meta-counter">{filteredTasks.length} 件</p>

            {filteredTasks.length === 0 ? (
              <div className="v03-empty-state">
                <h3>まだ表示できる項目がありません</h3>
                <p>{emptyStateText(itemsFilter)}</p>
              </div>
            ) : (
              <ul className="v03-item-list">
                {filteredTasks.map((task) => (
                  <li
                    key={task.id}
                    data-task-id={task.id}
                    className={`v03-item-card ${task.id === focusedTaskId ? "is-focused" : ""}`}
                  >
                    <p className="v03-item-title">{task.title}</p>
                    <div className="v03-badge-row">
                      <span className={`v03-badge kind-${task.kind}`}>{taskKindLabel(task)}</span>
                      {task.memoCategory ? (
                        <span className="v03-badge memo-category">{memoCategoryLabel(task.memoCategory)}</span>
                      ) : null}
                      <span className={`v03-badge due-state-${task.dueState}`}>{dueBadgeLabel(task)}</span>
                    </div>
                    <button type="button" className="v03-reclassify" onClick={() => void onReclassify(task)}>
                      {task.kind === "task" ? "メモへ変更" : "タスクへ変更"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={`v03-screen ${activeTab === "settings" ? "is-active" : "is-hidden"}`} aria-label="設定画面">
          <div className="v03-card settings-stage">
            <div className="v03-card-head">
              <h2>設定</h2>
              <p>既定時刻と応答文の文体を端末に保存します。</p>
            </div>

            <label className="v03-field">
              既定時刻
              <input
                type="time"
                value={defaultDueTime}
                onChange={(event) => saveDefaultDueTime(event.target.value)}
              />
            </label>

            <label className="v03-field">
              応答文の文体
              <select
                value={responseTone}
                onChange={(event) => saveResponseTone(event.target.value as ResponseTone)}
              >
                {RESPONSE_TONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button type="button" className="v03-push-button" onClick={() => void onPushSubscribe()}>
              通知を有効化
            </button>
          </div>
        </section>
      </main>

      <nav className="v03-tabbar" aria-label="メインタブ">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`v03-tab ${activeTab === tab.value ? "active" : ""}`}
            aria-current={activeTab === tab.value ? "page" : undefined}
            onClick={() => saveActiveTab(tab.value)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}



