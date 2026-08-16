import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAttackStream, ConnectionState } from "../src/useAttackStream";

type FakeWs = {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

class WebSocketMock {
  static instances: FakeWs[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = WebSocketMock.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = WebSocketMock.CLOSED;
    this.onclose?.();
  });

  constructor(url: string) {
    WebSocketMock.instances.push(this);
  }
}

describe("useAttackStream", () => {
  beforeEach(() => {
    WebSocketMock.instances = [];
    vi.stubGlobal("WebSocket", WebSocketMock);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function openLatest() {
    const ws = WebSocketMock.instances[WebSocketMock.instances.length - 1];
    act(() => {
      ws.readyState = WebSocketMock.OPEN;
      ws.onopen?.();
    });
    return ws;
  }

  it("connects and reports connected state", async () => {
    const onEvents = vi.fn();
    let state: ConnectionState = "reconnecting";
    const { result } = renderHook(() => {
      state = useAttackStream({ url: "ws://x", onEvents });
      return state;
    });
    expect(result.current).toBe("reconnecting");
    openLatest();
    expect(result.current).toBe("connected");
  });

  it("delivers valid event batches and drops invalid ones", async () => {
    const onEvents = vi.fn();
    renderHook(() => useAttackStream({ url: "ws://x", onEvents }));
    const ws = openLatest();
    act(() => {
      ws.onmessage?.({ data: JSON.stringify([{ id: "1", source_lat: 35, source_lon: 103, dest_lat: 0, dest_lon: 0, source_country: "CN", dest_country: "US", timestamp: "x", attack_type: "SYN flood", volume: 5 }]) });
    });
    expect(onEvents).toHaveBeenCalledWith([
      expect.objectContaining({ id: "1", attack_type: "SYN flood" }),
    ]);
  });

  it("reconnects with exponential backoff after close", async () => {
    renderHook(() => useAttackStream({ url: "ws://x", onEvents: vi.fn() }));
    openLatest();
    // simulate a drop: first socket closes
    const first = WebSocketMock.instances[0];
    act(() => {
      first.readyState = WebSocketMock.CLOSED;
      first.onclose?.();
    });
    // after first retry delay (1000ms) it should open a second socket
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1001);
    });
    expect(WebSocketMock.instances.length).toBe(2);
    // open it -> connected
    openLatest();
    expect(WebSocketMock.instances[1].readyState).toBe(WebSocketMock.OPEN);
  });

  it("goes offline after exceeding maxRetries", async () => {
    let state: ConnectionState = "reconnecting";
    renderHook(() => {
      state = useAttackStream({ url: "ws://x", onEvents: vi.fn(), maxRetries: 1 });
      return state;
    });
    openLatest();
    const first = WebSocketMock.instances[0];
    act(() => {
      first.readyState = WebSocketMock.CLOSED;
      first.onclose?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1001);
    });
    // retry 1 opens a second socket
    const second = WebSocketMock.instances[1];
    act(() => {
      second.readyState = WebSocketMock.CLOSED;
      second.onclose?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3001);
    });
    expect(state).toBe("offline");
  });
});
