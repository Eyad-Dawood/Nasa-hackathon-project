import { createElement, UserCheck, ArrowRight } from "lucide";
import { Theme } from "../config/theme";

/**
 * AccountForm
 * ───────────
 * NASA Flight Crew Session Authorization.
 * Unslopped aerospace sign-in overlay.
 */

const LS_KEY = "username";

export function getSavedUsername(): string | null {
  return localStorage.getItem(LS_KEY);
}

export function saveUsername(username: string): void {
  localStorage.setItem(LS_KEY, username);
}

export class AccountForm {
  private container: HTMLDivElement;
  private onSubmit: (username: string) => void;

  constructor(onSubmit: (username: string) => void) {
    this.onSubmit = onSubmit;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);
    const input = this.container.querySelector<HTMLInputElement>("#username-input");
    input?.focus();
  }

  destroy(): void {
    this.container.remove();
  }

  private _buildDOM(): HTMLDivElement {
    const { colors, font } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "account-form-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end", // Dock to the dark Earth area on the right
      paddingRight: "min(8vw, 96px)",
      paddingLeft: "24px",
      boxSizing: "border-box",
      background: "transparent",
      zIndex: "1000",
      fontFamily: font.family,
      pointerEvents: "none",
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "transparent",
      border: "none",
      boxShadow: "none",
      padding: "0",
      width: "420px",
      maxWidth: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      pointerEvents: "auto",
    });

    // Header
    const headerBox = document.createElement("div");
    Object.assign(headerBox.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      textAlign: "left",
      alignItems: "flex-start",
    });

    const tag = document.createElement("div");
    Object.assign(tag.style, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      color: "rgba(255, 255, 255, 0.45)",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
    });
    tag.innerHTML = `<span>NASA MISSION CONTROL &middot; FLIGHT AUTHORIZATION</span>`;

    const title = document.createElement("h1");
    title.textContent = "Astronaut Sign-in";
    Object.assign(title.style, {
      background: "linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.65) 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      fontSize: "38px",
      fontWeight: "700",
      margin: "0",
      letterSpacing: "-0.6px",
      lineHeight: "1.1",
    });

    const subtitle = document.createElement("p");
    subtitle.textContent = "Enter your operator callsign to connect to mission control and deploy.";
    Object.assign(subtitle.style, {
      color: "rgba(255, 255, 255, 0.45)",
      fontSize: "14px",
      lineHeight: "1.5",
      margin: "0",
    });

    headerBox.append(tag, title, subtitle);

    // Input
    const input = document.createElement("input");
    input.id = "username-input";
    input.type = "text";
    input.placeholder = "Callsign (e.g. Flight-1)...";
    input.maxLength = 24;
    const saved = getSavedUsername();
    if (saved) input.value = saved;

    Object.assign(input.style, {
      background: "rgba(255, 255, 255, 0.05)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
      backdropFilter: "blur(12px) saturate(1.4)",
      WebkitBackdropFilter: "blur(12px) saturate(1.4)",
      border: "none",
      borderRadius: "10px",
      color: "#ffffff",
      fontFamily: font.family,
      fontSize: "14px",
      padding: "13px 16px",
      outline: "none",
      transition: "box-shadow 0.15s ease",
    });
    input.addEventListener("focus", () => {
      input.style.boxShadow = "inset 0 1px 1px rgba(255, 255, 255, 0.35), inset 0 0 0 0.5px rgba(255, 255, 255, 0.25), 0 0 16px rgba(255, 255, 255, 0.1)";
    });
    input.addEventListener("blur", () => {
      input.style.boxShadow = "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)";
    });

    const error = document.createElement("span");
    error.id = "username-error";
    Object.assign(error.style, {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "11px",
      minHeight: "14px",
    });

    const btn = document.createElement("button");
    btn.id = "username-submit";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.gap = "8px";
    const btnText = document.createElement("span");
    btnText.textContent = "Authorize Session";
    btn.append(btnText, createElement(ArrowRight, { width: 14, height: 14, "stroke-width": 2 }));

    Object.assign(btn.style, {
      background: "#ffffff",
      border: "none",
      borderRadius: "12px",
      color: "#04060a",
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: font.family,
      padding: "14px 20px",
      cursor: "pointer",
      transition: "all 0.15s ease",
      boxShadow: "0 4px 24px rgba(255, 255, 255, 0.25), inset 0 1px 1px #ffffff",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.boxShadow = "0 6px 32px rgba(255, 255, 255, 0.45)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.boxShadow = "0 4px 24px rgba(255, 255, 255, 0.25)";
    });

    const submit = () => {
      const val = input.value.trim();
      if (!val) {
        error.textContent = "Callsign is required.";
        return;
      }
      if (val.length < 2) {
        error.textContent = "Must be at least 2 characters.";
        return;
      }
      saveUsername(val);
      this.destroy();
      this.onSubmit(val);
    };

    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    card.append(headerBox, input, error, btn);
    overlay.appendChild(card);
    return overlay;
  }
}
