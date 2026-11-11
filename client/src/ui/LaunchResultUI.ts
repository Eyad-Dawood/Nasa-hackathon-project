/**
 * LaunchResultUI.ts  —  LAUNCH RESULT MODAL
 * ───────────────────────────────────────────
 * DOM modal shown after the Launch button is pressed.
 * Displays each of the 12 rule checks as a pass/fail row.
 *
 * PLACEHOLDER OUTCOMES (replace when real game events are designed):
 *   - All 12 pass → _onSuccess() called (shows green success banner, logs event)
 *   - Any fail    → _onFailure() called (shows red failure banner, lists fails)
 */

import { Theme } from "../config/theme";
import { LaunchResult, CheckResult } from "../game/data/LaunchSystem";

export class LaunchResultUI {
  private _container: HTMLDivElement;
  private _onClose:   () => void;
  private _onAskAi?:  (result: LaunchResult) => void;

  constructor(
    result: LaunchResult,
    onClose: () => void,
    onAskAi?: (result: LaunchResult) => void,
  ) {
    this._onClose    = onClose;
    this._onAskAi    = onAskAi;
    this._container  = this._buildDOM(result);
    if (result.success) {
      this._onSuccess(result);
    } else {
      this._onFailure(result);
    }
  }

  mount(): void  { document.body.appendChild(this._container); }
  close(): void  { this._container.remove(); this._onClose(); }

  // ── Private ────────────────────────────────────────────────────────────

  private _buildDOM(result: LaunchResult): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "launch-result-overlay";
    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.88)", zIndex: "2000", fontFamily: font.family,
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, padding: spacing.lg,
      width: "560px", maxHeight: "88vh", maxWidth: "95vw",
      display: "flex", flexDirection: "column", gap: spacing.sm,
      boxShadow: "0 8px 60px rgba(0,0,0,0.7)",
      overflowY: "auto",
    });

    // ── Header ──
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex", justifyContent: "space-between", alignItems: "center",
    });

    const title = document.createElement("h2");
    title.textContent = result.success ? "🚀 LAUNCH SUCCESSFUL" : "🚫 LAUNCH FAILED";
    Object.assign(title.style, {
      color:        result.success ? "#2ecc71" : "#e94560",
      fontSize:     font.sizeLg, margin: "0", letterSpacing: "2px",
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      background: "transparent", border: "none",
      color: colors.textMuted, cursor: "pointer", fontSize: "22px",
    });
    closeBtn.addEventListener("click", () => this.close());
    header.append(title, closeBtn);

    // ── Summary bar ──
    const summaryBar = document.createElement("div");
    const passColor = result.success ? "#2ecc71" : "#e94560";
    Object.assign(summaryBar.style, {
      display: "flex", justifyContent: "center", gap: spacing.lg,
      background: `${passColor}18`, borderRadius: radius.md,
      border: `1px solid ${passColor}`,
      padding: `${spacing.xs} ${spacing.sm}`,
    });

    const passEl = document.createElement("span");
    passEl.textContent = `✅  ${result.passCount} passed`;
    Object.assign(passEl.style, { color: "#2ecc71", fontSize: font.sizeSm, fontWeight: "bold" });

    const failEl = document.createElement("span");
    failEl.textContent = `❌  ${result.failCount} failed`;
    Object.assign(failEl.style, { color: "#e94560", fontSize: font.sizeSm, fontWeight: "bold" });

    summaryBar.append(passEl, failEl);

    const hr = document.createElement("hr");
    hr.style.borderColor = colors.border; hr.style.margin = "0";

    // ── Checks list ──
    const list = document.createElement("div");
    Object.assign(list.style, { display: "flex", flexDirection: "column", gap: "6px" });

    for (const check of result.checks) {
      list.appendChild(this._buildCheckRow(check));
    }

    panel.append(header, summaryBar, hr, list);

    if (!result.success && this._onAskAi) {
      const footer = document.createElement("div");
      Object.assign(footer.style, {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: spacing.sm,
      });

      const askAiBtn = document.createElement("button");
      askAiBtn.textContent = "Ask Flight Director AI How to Fix";
      Object.assign(askAiBtn.style, {
        background: colors.accent,
        border: "none",
        borderRadius: radius.sm,
        color: "#080a10",
        fontSize: font.sizeSm,
        fontWeight: "600",
        fontFamily: font.family,
        padding: "8px 14px",
        cursor: "pointer",
      });
      askAiBtn.addEventListener("click", () => {
        const handler = this._onAskAi;
        this.close();
        handler?.(result);
      });

      footer.appendChild(askAiBtn);
      panel.appendChild(footer);
    }

    overlay.appendChild(panel);
    return overlay;
  }

  private _buildCheckRow(check: CheckResult): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;
    const passColor = check.pass ? "#2ecc71" : "#e94560";

    const row = document.createElement("div");
    Object.assign(row.style, {
      background: `${passColor}0d`,
      border:     `1px solid ${passColor}33`,
      borderLeft: `4px solid ${passColor}`,
      borderRadius: radius.sm,
      padding: `${spacing.xs} ${spacing.sm}`,
      display: "flex", flexDirection: "column", gap: "2px",
    });

    // Top line: icon + rule label
    const topLine = document.createElement("div");
    Object.assign(topLine.style, { display: "flex", gap: spacing.sm, alignItems: "baseline" });

    const icon = document.createElement("span");
    icon.textContent = check.pass ? "✅" : "❌";
    icon.style.fontSize = "14px";

    const label = document.createElement("span");
    label.textContent = check.label;
    Object.assign(label.style, {
      color:      colors.textPrimary, fontSize: font.sizeSm, fontWeight: "bold",
    });

    topLine.append(icon, label);

    // Values lines
    const actual = document.createElement("div");
    actual.textContent = `  Actual: ${check.actual}`;
    Object.assign(actual.style, {
      color: check.pass ? "#2ecc71" : "#e94560", fontSize: font.sizeXs,
      paddingLeft: "24px",
    });

    const req = document.createElement("div");
    req.textContent = `  Needed: ${check.required}`;
    Object.assign(req.style, { color: colors.textMuted, fontSize: font.sizeXs, paddingLeft: "24px" });

    row.append(topLine, actual, req);

    // Optional note
    if (check.note) {
      const note = document.createElement("div");
      note.textContent = `  ${check.note}`;
      Object.assign(note.style, {
        color: colors.textMuted, fontSize: font.sizeXs,
        paddingLeft: "24px", fontStyle: "italic",
      });
      row.appendChild(note);
    }

    return row;
  }

  // ── Outcome placeholders — replace with real game events ───────────────

  /**
   * Called when all 12 checks pass.
   * PLACEHOLDER: logs to console + shows a toast. Replace with real scene event.
   */
  private _onSuccess(result: LaunchResult): void {
    console.log("🚀 [LaunchSystem] LAUNCH SUCCESS!", result);
    // TODO: trigger server "launchShip" event, play launch animation, transition scene, etc.
  }

  /**
   * Called when one or more checks fail.
   * PLACEHOLDER: logs failures to console. Replace with real feedback.
   */
  private _onFailure(result: LaunchResult): void {
    const fails = result.checks.filter(c => !c.pass).map(c => c.label);
    console.warn("❌ [LaunchSystem] LAUNCH FAILED — failing rules:", fails);
    // TODO: show hint, play failure sound, etc.
  }
}
