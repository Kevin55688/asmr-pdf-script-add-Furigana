import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NotesPanel } from "./NotesPanel";

describe("NotesPanel", () => {
  it("displays initial notes", () => {
    render(<NotesPanel initialNotes="test note" onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "備註" }));
    expect(screen.getByDisplayValue("test note")).toBeInTheDocument();
  });

  it("calls onSave when textarea loses focus", async () => {
    const onSave = vi.fn();
    render(<NotesPanel initialNotes="" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "備註" }));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "新備註" } });
    await act(async () => { fireEvent.blur(textarea); });
    expect(onSave).toHaveBeenCalledWith("新備註");
  });

  it("toggles panel open and closed", () => {
    render(<NotesPanel initialNotes="" onSave={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "備註" });
    fireEvent.click(btn);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
