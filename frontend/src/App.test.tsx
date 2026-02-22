import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";
import * as libraryApi from "./services/libraryApi";

vi.mock("./services/libraryApi");

const mockLibrary: libraryApi.Library = {
  folders: [{ id: "f-001", name: "ASMR", order: 0 }],
  tags: [],
  documents: [
    {
      id: "doc-001",
      name: "腳本",
      folderId: "f-001",
      tagIds: [],
      htmlFile: "doc-001.html",
      lastPage: 2,
      notes: "test note",
      translations: {},
      createdAt: "",
      uploadedAt: "2026-02-22",
    },
  ],
};

beforeEach(() => {
  vi.mocked(libraryApi.getLibrary).mockResolvedValue(mockLibrary);
  vi.mocked(libraryApi.getDocumentHtml).mockResolvedValue({
    html: '<section class="page"><p>Hello</p></section>',
    page_count: 1,
  });
});

describe("App", () => {
  it("renders sidebar with folder", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("ASMR")).toBeInTheDocument());
  });

  it("shows idle state with welcome message initially", async () => {
    render(<App />);
    await waitFor(() => screen.getByText("ASMR"));
    expect(screen.getByText(/選擇文件/)).toBeInTheDocument();
  });

  it("loads document html when document clicked", async () => {
    render(<App />);
    await waitFor(() => screen.getByText("腳本"));
    fireEvent.click(screen.getByText("腳本"));
    await waitFor(() =>
      expect(libraryApi.getDocumentHtml).toHaveBeenCalledWith("doc-001"),
    );
  });
});
