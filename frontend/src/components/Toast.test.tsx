import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function TestConsumer({ action }: { action?: { label: string; onClick: () => void } }) {
  const { showToast } = useToast();
  return (
    <button
      onClick={() =>
        showToast("測試錯誤訊息", action ? { action } : undefined)
      }
    >
      觸發
    </button>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("呼叫 showToast 後顯示訊息", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    expect(screen.getByText("測試錯誤訊息")).toBeInTheDocument();
  });

  it("有 duration 時自動消失", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    expect(screen.getByText("測試錯誤訊息")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5100));
    expect(screen.queryByText("測試錯誤訊息")).not.toBeInTheDocument();
  });

  it("點擊關閉按鈕立即移除 Toast", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    await user.click(screen.getByLabelText("關閉通知"));
    expect(screen.queryByText("測試錯誤訊息")).not.toBeInTheDocument();
  });

  it("帶 action 的 Toast 顯示按鈕並觸發 callback", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onAction = vi.fn();
    render(
      <ToastProvider>
        <TestConsumer action={{ label: "重試", onClick: onAction }} />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    expect(screen.getByText("重試")).toBeInTheDocument();
    await user.click(screen.getByText("重試"));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("帶 action 的 Toast 不自動消失", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onAction = vi.fn();
    render(
      <ToastProvider>
        <TestConsumer action={{ label: "重試", onClick: onAction }} />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText("測試錯誤訊息")).toBeInTheDocument();
  });
});
