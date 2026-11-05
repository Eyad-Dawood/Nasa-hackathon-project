import { Theme, getRoleLabel } from "../config/theme";
import { getItemById } from "../game/data/ItemData";
import { STATIONS } from "../game/data/StationData";
import { CarrySystem } from "../game/systems/CarrySystem";
import { ColyseusService } from "../network/ColyseusService";
import { ItemDetailUI } from "./ItemDetailUI";

type ShipEntry = { itemId: string; roleId: string; addedBy: string };

/**
 * ShipMenuUI
 * ──────────
 * DOM overlay shown when a player interacts with the spaceship.
 *
 * DISPLAYS:
 *   - Total ship weight (sum of all added items).
 *   - Items grouped by role section. Each section shows all 4 roles.
 *   - [Detail] button on each item → opens ItemDetailUI.
 *   - [Remove] button → sends removeItemFromShip to server + player carries it back.
 *   - [Add carried item] button at the bottom → sends addItemToShip to server.
 *
 * REFRESH:
 *   refresh(newSnapshot) is called by ShipEntity whenever the server state
 *   patches arrive, so the menu stays live while open.
 */
export class ShipMenuUI {
  private _container: HTMLDivElement;
  private _carry:     CarrySystem;
  private _onClose:   () => void;
  private _openDetail: ItemDetailUI | null = null;

  // The main content area re-rendered on refresh
  private _contentEl!: HTMLDivElement;
  private _snapshot:   Map<string, ShipEntry>;

  constructor(
    snapshot: Map<string, ShipEntry>,
    carry:    CarrySystem,
    onClose:  () => void,
  ) {
    this._snapshot = snapshot;
    this._carry    = carry;
    this._onClose  = onClose;
    this._container = this._buildDOM();
  }

  mount(): void { document.body.appendChild(this._container); }

  close(): void {
    this._openDetail?.close();
    this._container.remove();
    this._onClose();
  }

  /** Called by ShipEntity on every server state patch. Re-renders content. */
  refresh(snapshot: Map<string, ShipEntry>): void {
    this._snapshot = snapshot;
    this._rebuildContent();
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _buildDOM(): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "ship-menu-overlay";
    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.80)", zIndex: "1500", fontFamily: font.family,
    });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) this.close(); });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, padding: spacing.lg,
      width: "480px", maxHeight: "80vh", maxWidth: "92vw",
      display: "flex", flexDirection: "column", gap: spacing.sm,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      overflowY: "auto",
    });

    // Header
    const header = document.createElement("div");
    Object.assign(header.style, { display: "flex", justifyContent: "space-between", alignItems: "center" });

    const title = document.createElement("h3");
    title.textContent = "🚀 Spaceship Manifest";
    Object.assign(title.style, { color: "#aaffcc", fontSize: font.sizeLg, margin: "0", letterSpacing: "1px" });

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

    // Content (re-rendered on refresh)
    this._contentEl = document.createElement("div");
    Object.assign(this._contentEl.style, { display: "flex", flexDirection: "column", gap: spacing.sm });

    panel.append(header, hr, this._contentEl);
    overlay.appendChild(panel);

    this._rebuildContent();
    return overlay;
  }

  private _rebuildContent(): void {
    const { colors, font, spacing } = Theme;
    this._contentEl.innerHTML = "";

    // ── Total weight ──
    const total = [...this._snapshot.values()].reduce((sum, e) => {
      const item = getItemById(e.itemId);
      return sum + (item?.weight ?? 0);
    }, 0);

    const weightBar = document.createElement("div");
    Object.assign(weightBar.style, {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: colors.background, borderRadius: "6px", padding: `${spacing.xs} ${spacing.sm}`,
    });
    const wLabel = document.createElement("span");
    wLabel.textContent = "Total Weight";
    wLabel.style.color = colors.textMuted; wLabel.style.fontSize = font.sizeSm;
    const wValue = document.createElement("span");
    wValue.textContent = `${total} kg`;
    Object.assign(wValue.style, { color: "#aaffcc", fontSize: font.sizeMd, fontWeight: "bold" });
    weightBar.append(wLabel, wValue);
    this._contentEl.appendChild(weightBar);

    // ── Role sections ──
    const allRoles = STATIONS.map((s) => ({ roleId: s.roleId, label: s.label }));
    for (const { roleId, label } of allRoles) {
      const section = this._buildRoleSection(roleId, label);
      this._contentEl.appendChild(section);
    }

    // ── Add carried item button ──
    const held = this._carry.heldItem;
    if (held) {
      const addBar = document.createElement("div");
      Object.assign(addBar.style, {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `${colors.success}18`, border: `1px solid ${colors.success}`,
        borderRadius: "6px", padding: `${spacing.xs} ${spacing.sm}`,
      });
      const addLabel = document.createElement("span");
      addLabel.textContent = `➕ Add: ${held.name} (${held.weight} kg)`;
      Object.assign(addLabel.style, { color: colors.success, fontSize: font.sizeSm, flex: "1" });

      const addBtn = document.createElement("button");
      addBtn.textContent = "Add to Ship";
      this._styleBtn(addBtn, colors.success);
      addBtn.addEventListener("click", () => {
        const item = this._carry.putDown();
        if (item) {
          ColyseusService.send("addItemToShip", { itemId: item.id, roleId: item.roleId });
        }
        // Menu stays open — server state patch will trigger refresh()
      });

      addBar.append(addLabel, addBtn);
      this._contentEl.appendChild(addBar);
    }
  }

  private _buildRoleSection(roleId: string, label: string): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const section = document.createElement("div");
    Object.assign(section.style, { display: "flex", flexDirection: "column", gap: "4px" });

    const sectionLabel = document.createElement("div");
    sectionLabel.textContent = `── ${label} ──`;
    Object.assign(sectionLabel.style, {
      color: colors.textMuted, fontSize: font.sizeXs,
      letterSpacing: "1px", textTransform: "uppercase", padding: `${spacing.xs} 0 2px 0`,
    });
    section.appendChild(sectionLabel);

    // Find items in ship for this role
    const roleEntries = [...this._snapshot.values()].filter((e) => e.roleId === roleId);

    if (roleEntries.length === 0) {
      const empty = document.createElement("span");
      empty.textContent = "(empty)";
      Object.assign(empty.style, { color: colors.textMuted, fontSize: font.sizeXs, paddingLeft: spacing.sm });
      section.appendChild(empty);
      return section;
    }

    for (const entry of roleEntries) {
      const item = getItemById(entry.itemId);
      if (!item) continue;

      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex", alignItems: "center", gap: spacing.sm,
        background: colors.background, border: `1px solid ${colors.border}`,
        borderRadius: radius.sm, padding: `${spacing.xs} ${spacing.sm}`,
      });

      const name = document.createElement("span");
      name.textContent = item.name;
      Object.assign(name.style, { color: colors.textPrimary, fontSize: font.sizeSm, flex: "1" });

      const kg = document.createElement("span");
      kg.textContent = `${item.weight} kg`;
      Object.assign(kg.style, { color: colors.textMuted, fontSize: font.sizeXs, whiteSpace: "nowrap" });

      const detailBtn = document.createElement("button");
      detailBtn.textContent = "Detail";
      this._styleBtn(detailBtn, colors.textMuted, true);
      detailBtn.addEventListener("click", () => {
        this._openDetail?.close();
        this._openDetail = new ItemDetailUI(item);
        this._openDetail.mount();
      });

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      const canRemove = !this._carry.isHolding;
      removeBtn.disabled = !canRemove;
      this._styleBtn(removeBtn, "#e94560");
      if (!canRemove) {
        removeBtn.style.background = colors.disabled;
        removeBtn.style.cursor = "not-allowed";
      }
      removeBtn.addEventListener("click", () => {
        if (this._carry.isHolding) return;
        ColyseusService.send("removeItemFromShip", { itemId: item.id });
        // Server removes it → state patch → refresh() re-renders
        // Also give it back to the player to carry
        this._carry.pickUp(item);
      });

      row.append(name, kg, detailBtn, removeBtn);
      section.appendChild(row);
    }

    return section;
  }

  private _styleBtn(btn: HTMLButtonElement, color: string, ghost = false): void {
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
