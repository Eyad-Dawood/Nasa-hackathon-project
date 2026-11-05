import { Theme } from "../config/theme";

/**
 * AccountForm
 * ───────────
 * DOM overlay that prompts the player for a username.
 * Calls `onSubmit(username)` when the form is submitted.
 * Stores the username in localStorage under the key "username".
 *
 * Usage:
 *   const form = new AccountForm((name) => { ... proceed ... });
 *   form.mount();
 *   // later, when no longer needed:
 *   form.destroy();
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
    // Auto-focus input after mount
    const input = this.container.querySelector<HTMLInputElement>("#username-input");
    input?.focus();
  }

  destroy(): void {
    this.container.remove();
  }

  private _buildDOM(): HTMLDivElement {
    const { colors, font, spacing, radius, transition } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "account-form-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.85)",
      zIndex: "1000",
      fontFamily: font.family,
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
      minWidth: "320px",
      display: "flex",
      flexDirection: "column",
      gap: spacing.md,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    });

    const title = document.createElement("h1");
    title.textContent = "Enter Your Name";
    Object.assign(title.style, {
      color: colors.textPrimary,
      fontSize: font.sizeXl,
      margin: "0",
      textAlign: "center",
      letterSpacing: "2px",
    });

    const subtitle = document.createElement("p");
    subtitle.textContent = "This name is temporary and will persist in your browser.";
    Object.assign(subtitle.style, {
      color: colors.textMuted,
      fontSize: font.sizeSm,
      margin: "0",
      textAlign: "center",
    });

    const input = document.createElement("input");
    input.id = "username-input";
    input.type = "text";
    input.placeholder = "Your name…";
    input.maxLength = 24;
    Object.assign(input.style, {
      background: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      color: colors.textPrimary,
      fontFamily: font.family,
      fontSize: font.sizeMd,
      padding: `${spacing.sm} ${spacing.md}`,
      outline: "none",
      transition: `border-color ${transition.fast}`,
    });
    input.addEventListener("focus", () => {
      input.style.borderColor = colors.accent;
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = colors.border;
    });

    const error = document.createElement("span");
    error.id = "username-error";
    Object.assign(error.style, {
      color: colors.accent,
      fontSize: font.sizeXs,
      minHeight: "16px",
    });

    const btn = document.createElement("button");
    btn.id = "username-submit";
    btn.textContent = "Continue →";
    Object.assign(btn.style, {
      background: colors.accent,
      border: "none",
      borderRadius: radius.md,
      color: "#fff",
      cursor: "pointer",
      fontFamily: font.family,
      fontSize: font.sizeMd,
      fontWeight: "bold",
      padding: `${spacing.sm} ${spacing.md}`,
      transition: `background ${transition.fast}`,
      letterSpacing: "1px",
    });
    btn.addEventListener("mouseenter", () => { btn.style.background = colors.accentHover; });
    btn.addEventListener("mouseleave", () => { btn.style.background = colors.accent; });

    const submit = () => {
      const name = input.value.trim();
      if (!name) {
        error.textContent = "Please enter a name.";
        return;
      }
      saveUsername(name);
      this.onSubmit(name);
      this.destroy();
    };

    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    card.append(title, subtitle, input, error, btn);
    overlay.appendChild(card);
    return overlay;
  }
}
