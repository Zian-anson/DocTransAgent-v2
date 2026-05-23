import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelBadge, StatusBadge, CitationCard } from "../Badges";

describe("ModelBadge", () => {
  it("renders model name", () => {
    render(<ModelBadge model="gemini-2.5-flash" />);
    expect(screen.getByText(/gemini/i)).toBeTruthy();
  });

  it("renders latency when provided", () => {
    render(<ModelBadge model="deepseek-v3" latency={234} />);
    expect(screen.getByText(/234ms/)).toBeTruthy();
  });

  it("renders tokens when provided", () => {
    render(<ModelBadge model="gemini-2.5-flash" tokens={1204} />);
    expect(screen.getByText(/1204 tok/)).toBeTruthy();
  });
});

describe("StatusBadge", () => {
  it("renders translated status", () => {
    render(<StatusBadge status="translated" />);
    expect(screen.getByText(/已翻译/)).toBeTruthy();
  });

  it("renders error status", () => {
    render(<StatusBadge status="error" />);
    expect(screen.getByText(/错误/)).toBeTruthy();
  });

  it("renders unknown status as plain text", () => {
    render(<StatusBadge status="custom_status" />);
    expect(screen.getByText("custom_status")).toBeTruthy();
  });
});

describe("CitationCard", () => {
  it("renders source index and match score", () => {
    const source = {
      source_index: 1,
      text: "This document covers product specifications and compliance requirements for EU market entry.",
      metadata: { title: "Product Manual" },
      score: 0.92,
    };
    render(<CitationCard source={source} />);
    expect(screen.getByText(/Source 1/)).toBeTruthy();
    expect(screen.getByText(/92% match/)).toBeTruthy();
    expect(screen.getByText(/compliance requirements/)).toBeTruthy();
  });
});
