import { jsx as _jsx } from "react/jsx-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async (input) => {
        const url = String(input);
        if (url.includes("/v1/installations/register")) {
            return new Response(JSON.stringify({
                installationId: "i1",
                accessToken: "t1",
                timezone: "Asia/Tokyo"
            }), { status: 200 });
        }
        if (url.includes("/v1/tasks")) {
            return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
    }));
});
describe("App", () => {
    it("renders heading", async () => {
        render(_jsx(App, {}));
        await waitFor(() => expect(screen.getByRole("heading", { name: "自分専用秘書PWA" })).toBeInTheDocument());
    });
});
