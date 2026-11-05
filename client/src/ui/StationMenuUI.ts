import { Theme, getRoleHex } from "../config/theme";
import { StationDefinition } from "../game/data/StationData";
import { GameItem } from "../game/data/ItemData";
import { CarrySystem } from "../game/systems/CarrySystem";
import { ItemDetailUI } from "./ItemDetailUI";

/**
 * StationMenuUI
 * ─────────────
 * DOM overlay shown when a player interacts with a role station.
 *
 * HOST RULES (applied from CarrySystem state):
 *   - If player is already carrying an item from THIS role: shows a
 *     "Return Item" button at the top to put it back without picking another.
 *   - If player is carrying an item from a DIFFERENT role: Carry buttons
 *     are disabled with a note ("Put down your current item first").
 *   - If player is carrying nothing: all Carry buttons are enabled.
 *
 * CARRY FLOW:
 *   1. Player clicks "Carry" on an item row.
 *   2. CarrySystem.pickUp(item) is called.
 *   3. Menu closes automatically.
 */
export class StationMenuUI {
  private _container: HTMLDivElement;
  private _carry:     CarrySystem;
  private _onClose:   () => void;
  private _openDetail: ItemDetailUI | null = null;

  constructor(
    def:      StationDefinition,
    items:    GameItem[],
    carry:    CarrySystem,
    onClose:  () => void,
  ) {
    this._carry   = carry;
    this._onClose = onClose;
    this._container = this._buildDOM(def, items);
  }

  mount(): void { document.body.appendChild(this._container); }

  close(): void {
    this._openDetail?.close();
    this._container.remove();
    this._onClose();
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _buildDOM(def: StationDefinition, items: GameItem[]): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "station-menu-overlay";
    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", zIndex: "1500", fontFamily: font.family,
    });
    // Click outside to close
    overlay.addEventListener("click", (e) => { if (e.target === overlay) this.close(); });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, padding: spacing.lg,
      width: "420px", maxWidth: "92vw",
      display: "flex", flexDirection: "column", gap: spacing.sm,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    });

    // ── Header ──
    const header = document.createElement("div");
    Object.assign(header.style, { display: "flex", justifyContent: "space-between", alignItems: "center" });

    const title = document.createElement("h3");
    title.textContent = def.label;
    Object.assign(title.style, {
      color: `#${getRoleHex(def.roleId).toString(16).padStart(6, "0")}`,
      fontSize: font.sizeLg, margin: "0", letterSpacing: "1px",
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      background: "transparent", border: "none",
      color: colors.textMuted, cursor: "pointer", fontSize: "20px",
    });
    closeBtn.addEventListener("click", () => this.close());
    header.append(title, closeBtn);

    const hr = document.createElement("hr");
    hr.style.borderColor = colors.border; hr.style.margin = "0";

    // ── Carry status notice ──
    const notice = this._buildNotice(def);

    // ── Item rows ──
    const list = document.createElement("div");
    Object.assign(list.style, { display: "flex", flexDirection: "column", gap: spacing.xs });

    const held = this._carry.heldItem;
    const sameTool = held !== null && held.roleId === def.roleId;
    const otherTool = held !== null && held.roleId !== def.roleId;

    // Return-item button (only if carrying same-role item)
    if (sameTool && held) {
      const returnRow = this._buildReturnRow(held);
      list.appendChild(returnRow);
    }

    items.forEach((item) => {
      list.appendChild(this._buildItemRow(item, otherTool));
    });

    panel.append(header, hr, ...(notice ? [notice] : []), list);
    overlay.appendChild(panel);
    return overlay;
  }

  private _buildNotice(def: StationDefinition): HTMLDivElement | null {
    const held = this._carry.heldItem;
    if (!held) return null;

    const { colors, font, spacing, radius } = Theme;
    const div = document.createElement("div");
    Object.assign(div.style, {
      background: `${colors.accent}18`, border: `1px solid ${colors.accent}`,
      borderRadius: radius.sm, padding: `${spacing.xs} ${spacing.sm}`,
      color: colors.accent, fontSize: font.sizeXs,
    });

    if (held.roleId === def.roleId) {
      div.textContent = `Carrying: ${held.name} — return it or drop it at the ship first.`;
    } else {
      div.textContent = `Carrying ${held.name} from another station. Deliver it to the ship first.`;
    }
    return div;
  }

  private _buildReturnRow(item: GameItem): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: `${colors.success}14`, border: `1px solid ${colors.success}`,
      borderRadius: radius.sm, padding: `${spacing.xs} ${spacing.sm}`, gap: spacing.sm,
    });

    const info = document.createElement("span");
    info.textContent = `↩ Return: ${item.name}`;
    Object.assign(info.style, { color: colors.success, fontSize: font.sizeSm, flex: "1" });

    const btn = document.createElement("button");
    btn.textContent = "Put Down";
    this._styleBtn(btn, colors.success);
    btn.addEventListener("click", () => {
      this._carry.putDown();
      this.close();
    });

    row.append(info, btn);
    return row;
  }

  private _buildItemRow(item: GameItem, disabled: boolean): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex", alignItems: "center", gap: spacing.sm,
      background: colors.background, border: `1px solid ${colors.border}`,
      borderRadius: radius.md, padding: `${spacing.xs} ${spacing.sm}`,
    });

    const name = document.createElement("span");
    name.textContent = item.name;
    Object.assign(name.style, { color: colors.textPrimary, fontSize: font.sizeSm, flex: "1" });

    const weight = document.createElement("span");
    weight.textContent = `${item.weight} kg`;
    Object.assign(weight.style, { color: colors.textMuted, fontSize: font.sizeXs, whiteSpace: "nowrap" });

    const detailBtn = document.createElement("button");
    detailBtn.textContent = "Detail";
    this._styleBtn(detailBtn, colors.textMuted, true);
    detailBtn.addEventListener("click", () => {
      this._openDetail?.close();
      this._openDetail = new ItemDetailUI(item);
      this._openDetail.mount();
    });

    const carryBtn = document.createElement("button");
    carryBtn.textContent = "Carry";
    carryBtn.disabled    = disabled || this._carry.isHolding;
    this._styleBtn(carryBtn, colors.accent);
    if (carryBtn.disabled) {
      carryBtn.style.background = colors.disabled;
      carryBtn.style.cursor     = "not-allowed";
    }
    carryBtn.addEventListener("click", () => {
      if (this._carry.pickUp(item)) this.close();
    });

    row.append(name, weight, detailBtn, carryBtn);
    return row;
  }

  private _styleBtn(
    btn: HTMLButtonElement,
    color: string,
    ghost = false,
  ): void {
    const { font, radius, spacing } = Theme;
    Object.assign(btn.style, {
      background:   ghost ? "transparent" : color,
      border:       ghost ? `1px solid ${color}` : "none",
      borderRadius: radius.sm,
      color:        ghost ? color : "#fff",
      cursor:       "pointer",
      fontFamily:   font.family,
      fontSize:     font.sizeXs,
      padding:      `2px ${spacing.sm}`,
      whiteSpace:   "nowrap",
      flexShrink:   "0",
    });
  }
}
