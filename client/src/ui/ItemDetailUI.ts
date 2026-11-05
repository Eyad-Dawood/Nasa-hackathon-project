import { Theme, getRoleLabel } from "../config/theme";
import { GameItem } from "../game/data/ItemData";

/**
 * ItemDetailUI
 * ────────────
 * Small floating panel (top-right) showing one item's full details.
 * Non-blocking — the game continues behind it.
 * Closed by clicking the × button or calling close().
 *
 * Usage:
 *   const ui = new ItemDetailUI(item);
 *   ui.mount();
 *   // …later:
 *   ui.close();
 */
export class ItemDetailUI {
  private _container: HTMLDivElement;
  private _item:      GameItem;

  constructor(item: GameItem) {
    this._item      = item;
    this._container = this._buildDOM();
  }

  mount(): void  { document.body.appendChild(this._container); }
  close(): void  { this._container.remove(); }

  // ── Private ────────────────────────────────────────────────────────────

  private _buildDOM(): HTMLDivElement {
    const { colors, font, spacing, radius, transition } = Theme;

    const panel = document.createElement("div");
    panel.id = `item-detail-${this._item.id}`;
    Object.assign(panel.style, {
      position:    "fixed",
      top:         "80px",
      right:       "16px",
      width:       "220px",
      background:  colors.surface,
      border:      `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding:     spacing.md,
      zIndex:      "2000",
      fontFamily:  font.family,
      boxShadow:   "0 4px 24px rgba(0,0,0,0.6)",
      display:     "flex",
      flexDirection: "column",
      gap:         spacing.sm,
      animation:   "fadeSlideIn 0.15s ease",
    });

    // Header row
    const header = document.createElement("div");
    Object.assign(header.style, { display: "flex", justifyContent: "space-between", alignItems: "center" });

    const title = document.createElement("span");
    title.textContent = this._item.name;
    Object.assign(title.style, { color: colors.textPrimary, fontSize: font.sizeMd, fontWeight: "bold" });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      background: "transparent", border: "none",
      color: colors.textMuted, cursor: "pointer",
      fontSize: "18px", lineHeight: "1", padding: "0 2px",
    });
    closeBtn.addEventListener("click", () => this.close());
    header.append(title, closeBtn);

    // Divider
    const hr = document.createElement("hr");
    hr.style.borderColor = colors.border; hr.style.margin = "0";

    // Placeholder asset box
    const assetBox = document.createElement("div");
    Object.assign(assetBox.style, {
      width: "100%", height: "80px",
      background:  colors.background,
      border:      `1px dashed ${colors.border}`,
      borderRadius: radius.md,
      display:     "flex", alignItems: "center", justifyContent: "center",
      color:       colors.textMuted, fontSize: font.sizeXs,
    });
    assetBox.textContent = `[ ${this._item.assetKey} ]`;

    // Stats
    const stats = this._stat("Weight",  `${this._item.weight} kg`);
    const role  = this._stat("Role",    getRoleLabel(this._item.roleId));

    panel.append(header, hr, assetBox, stats, role);
    return panel;
  }

  private _stat(label: string, value: string): HTMLDivElement {
    const { colors, font } = Theme;
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", justifyContent: "space-between" });

    const lbl = document.createElement("span");
    lbl.textContent = label;
    lbl.style.color = Theme.colors.textMuted;
    lbl.style.fontSize = font.sizeXs;

    const val = document.createElement("span");
    val.textContent = value;
    val.style.color = colors.textPrimary;
    val.style.fontSize = font.sizeXs;
    val.style.fontWeight = "bold";

    row.append(lbl, val);
    return row;
  }
}
