import { Theme, getRoleLabel } from "../config/theme";
import { getItemById, GameItem } from "../game/data/ItemData";
import { STATIONS } from "../game/data/StationData";
import { CarrySystem } from "../game/systems/CarrySystem";
import { ColyseusService } from "../network/ColyseusService";
import { ItemDetailUI } from "./ItemDetailUI";
import { LaunchResultUI } from "./LaunchResultUI";
import { runLaunchChecks } from "../game/data/LaunchSystem";
import { Objective } from "../game/data/ObjectiveData";

type ShipEntry = { itemId: string; roleId: string; addedBy: string };

/**
 * ShipMenuUI
 * ──────────
 * DOM overlay shown when a player interacts with the spaceship.
 *
 * DISPLAYS:
 *   - Total mass / cost / science / size used (live totals).
 *   - Items grouped by role section.
 *   - [Detail] → ItemDetailUI,  [Remove] → role-gated.
 *   - [Add carried item] when player is holding something.
 *   - [🚀 Launch] button (host only) → runs 12-rule check → LaunchResultUI.
 *
 * REFRESH:
 *   refresh(newSnapshot) is called by ShipEntity whenever server state patches
 *   arrive, so the menu stays live while open.
 */
export class ShipMenuUI {
  private _container:   HTMLDivElement;
  private _carry:       CarrySystem;
  private _onClose:     () => void;
  private _openDetail:  ItemDetailUI | null = null;
  private _openResult:  LaunchResultUI | null = null;
  /** roleIds this local player has — gates the Remove button. */
  private _playerRoles: string[];
  /** Selected mission — used by LaunchSystem. Null if not yet chosen. */
  private _objective:   Objective | null;
  /** True if the local player is the lobby host. */
  private _isHost:      boolean;

  // The main content area re-rendered on refresh
  private _contentEl!: HTMLDivElement;
  private _snapshot:   Map<string, ShipEntry>;

  constructor(
    snapshot:    Map<string, ShipEntry>,
    carry:       CarrySystem,
    playerRoles: string[],
    objective:   Objective | null,
    isHost:      boolean,
    onClose:     () => void,
  ) {
    this._snapshot    = snapshot;
    this._carry       = carry;
    this._playerRoles = playerRoles;
    this._objective   = objective;
    this._isHost      = isHost;
    this._onClose     = onClose;
    this._container   = this._buildDOM();
  }

  mount(): void { document.body.appendChild(this._container); }

  close(): void {
    this._openDetail?.close();
    this._openResult?.close();
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
      width: "520px", maxHeight: "86vh", maxWidth: "95vw",
      display: "flex", flexDirection: "column", gap: spacing.sm,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)", overflowY: "auto",
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

    // Objective banner
    if (this._objective) {
      const objBanner = document.createElement("div");
      Object.assign(objBanner.style, {
        background: "rgba(170,255,204,0.08)", border: "1px solid #aaffcc33",
        borderRadius: "6px", padding: "5px 10px",
        color: "#aaffcc", fontSize: "11px",
        display: "flex", justifyContent: "space-between",
      });
      objBanner.textContent = `Mission: ${this._objective.label}  ·  Budget: ${this._objective.budget}  ·  Science goal: ${this._objective.scienceGoal}`;
      panel.append(header, hr, objBanner);
    } else {
      panel.append(header, hr);
    }

    // Content (re-rendered on refresh)
    this._contentEl = document.createElement("div");
    Object.assign(this._contentEl.style, { display: "flex", flexDirection: "column", gap: spacing.sm });

    panel.appendChild(this._contentEl);
    overlay.appendChild(panel);

    this._rebuildContent();
    return overlay;
  }

  private _rebuildContent(): void {
    const { colors, font, spacing } = Theme;
    this._contentEl.innerHTML = "";

    // Gather all items
    const allItems: GameItem[] = [];
    this._snapshot.forEach((e) => {
      const item = getItemById(e.itemId);
      if (item) allItems.push(item);
    });

    // ── Totals bar ──
    const totalMass    = allItems.reduce((s, i) => s + i.mass, 0);
    const totalCost    = allItems.reduce((s, i) => s + i.cost, 0);
    const totalScience = allItems.reduce((s, i) => s + (i.sciencePoints ?? 0), 0);
    const totalSize    = allItems.reduce((s, i) => s + i.size, 0);

    const totalsBar = document.createElement("div");
    Object.assign(totalsBar.style, {
      display: "flex", gap: spacing.sm, flexWrap: "wrap",
      background: colors.background, borderRadius: "6px",
      padding: `${spacing.xs} ${spacing.sm}`,
    });

    const stat = (label: string, val: string, color = "#aaffcc") => {
      const el = document.createElement("span");
      el.textContent = `${label}: ${val}`;
      Object.assign(el.style, { color, fontSize: font.sizeXs, fontWeight: "bold" });
      return el;
    };

    const budgetColor = this._objective && totalCost > this._objective.budget ? "#e94560" : "#aaffcc";
    totalsBar.append(
      stat("Mass",    `${totalMass} kg`),
      stat("Cost",    `${totalCost}`,    budgetColor),
      stat("Science", `${totalScience} pts`, "#3498db"),
      stat("Size",    `${totalSize} Space`),
    );
    this._contentEl.appendChild(totalsBar);

    // ── Role sections ──
    const allRoles = STATIONS.map((s) => ({ roleId: s.roleId }));
    for (const { roleId } of allRoles) {
      this._contentEl.appendChild(this._buildRoleSection(roleId, allItems));
    }

    // ── Add carried item ──
    const held = this._carry.heldItem;
    if (held) {
      const addBar = document.createElement("div");
      Object.assign(addBar.style, {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `${colors.success}18`, border: `1px solid ${colors.success}`,
        borderRadius: "6px", padding: `${spacing.xs} ${spacing.sm}`,
      });
      const addLabel = document.createElement("span");
      addLabel.textContent = `➕ Add: ${held.name} (${held.mass} kg)`;
      Object.assign(addLabel.style, { color: colors.success, fontSize: font.sizeSm, flex: "1" });

      const addBtn = document.createElement("button");
      addBtn.textContent = "Add to Ship";
      this._styleBtn(addBtn, colors.success);
      addBtn.addEventListener("click", () => {
        const item = this._carry.putDown();
        if (item) ColyseusService.send("addItemToShip", { itemId: item.id, roleId: item.roleId });
      });

      addBar.append(addLabel, addBtn);
      this._contentEl.appendChild(addBar);
    }

    // ── Launch button (host only) ──
    if (this._isHost) {
      const launchBar = document.createElement("div");
      Object.assign(launchBar.style, {
        display: "flex", justifyContent: "center",
        marginTop: spacing.xs,
      });

      const launchBtn = document.createElement("button");
      launchBtn.textContent = "🚀  Launch Spaceship";
      Object.assign(launchBtn.style, {
        background:   "linear-gradient(135deg, #2ecc71, #27ae60)",
        border:       "none",
        borderRadius: "8px",
        color:        "#fff",
        cursor:       "pointer",
        fontFamily:   font.family,
        fontSize:     font.sizeMd,
        fontWeight:   "bold",
        padding:      `${spacing.sm} ${spacing.xl}`,
        letterSpacing: "1px",
        boxShadow:    "0 4px 16px rgba(46,204,113,0.4)",
        transition:   "opacity 0.15s ease",
      });
      launchBtn.addEventListener("mouseenter", () => { launchBtn.style.opacity = "0.85"; });
      launchBtn.addEventListener("mouseleave", () => { launchBtn.style.opacity = "1"; });

      launchBtn.addEventListener("click", () => {
        if (this._openResult) return;
        const result = runLaunchChecks(allItems, this._objective);
        this._openResult = new LaunchResultUI(result, () => { this._openResult = null; });
        this._openResult.mount();
      });

      launchBar.appendChild(launchBtn);
      this._contentEl.appendChild(launchBar);
    }
  }

  private _buildRoleSection(roleId: string, allItems: GameItem[]): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;
    const label        = getRoleLabel(roleId);
    const playerOwnsRole = this._playerRoles.includes(roleId);

    const section = document.createElement("div");
    Object.assign(section.style, { display: "flex", flexDirection: "column", gap: "4px" });

    const sectionLabel = document.createElement("div");
    sectionLabel.textContent = `── ${label} ──`;
    Object.assign(sectionLabel.style, {
      color: colors.textMuted, fontSize: font.sizeXs,
      letterSpacing: "1px", textTransform: "uppercase",
      padding: `${spacing.xs} 0 2px 0`,
    });
    section.appendChild(sectionLabel);

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
      kg.textContent = `${item.mass} kg`;
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
      const canRemove = !this._carry.isHolding && playerOwnsRole;
      removeBtn.disabled = !canRemove;
      this._styleBtn(removeBtn, "#e94560");
      if (!canRemove) {
        removeBtn.style.background = colors.disabled;
        removeBtn.style.cursor = "not-allowed";
        removeBtn.title = playerOwnsRole
          ? "Put down your current item first"
          : "You don't have this role";
      }
      removeBtn.addEventListener("click", () => {
        if (this._carry.isHolding) return;
        ColyseusService.send("removeItemFromShip", { itemId: item.id });
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
