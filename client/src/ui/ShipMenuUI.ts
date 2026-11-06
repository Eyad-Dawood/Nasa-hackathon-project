import {
  createElement,
  Rocket,
  Plus,
  Trash2,
  Info,
  Activity,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide";
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
 * Spacecraft Manifest & Subsystem Telemetry overlay.
 * Liquid Glass styling with live aerospace telemetry, 12-rule launch validation,
 * AI Flight Director integration, and cinematic warp launch sequence.
 */
export class ShipMenuUI {
  private _container: HTMLDivElement;
  private _carry: CarrySystem;
  private _onClose: () => void;
  private _onConsultAi?: () => void;
  private _onLaunchMission?: () => void;
  private _openDetail: ItemDetailUI | null = null;
  private _openResult: LaunchResultUI | null = null;
  private _playerRoles: string[];
  private _objective: Objective | null;
  private _isHost: boolean;

  private _contentEl!: HTMLDivElement;
  private _snapshot: Map<string, ShipEntry>;

  constructor(
    snapshot: Map<string, ShipEntry>,
    carry: CarrySystem,
    playerRoles: string[],
    objective: Objective | null,
    isHost: boolean,
    onClose: () => void,
    onConsultAi?: () => void,
    onLaunchMission?: () => void,
  ) {
    this._snapshot = snapshot;
    this._carry = carry;
    this._playerRoles = playerRoles;
    this._objective = objective;
    this._isHost = isHost;
    this._onClose = onClose;
    this._onConsultAi = onConsultAi;
    this._onLaunchMission = onLaunchMission;
    this._container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this._container);
  }

  close(): void {
    this._openDetail?.close();
    this._openResult?.close();
    this._container.remove();
    this._onClose();
  }

  refresh(snapshot: Map<string, ShipEntry>): void {
    this._snapshot = snapshot;
    this._rebuildContent();
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _buildDOM(): HTMLDivElement {
    const { font } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "ship-menu-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8, 10, 16, 0.88)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      zIndex: "1500",
      fontFamily: font.family,
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.close();
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(12, 16, 26, 0.88)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 24px 48px rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(20px) saturate(1.5)",
      WebkitBackdropFilter: "blur(20px) saturate(1.5)",
      border: "none",
      borderRadius: "16px",
      padding: "20px 24px",
      width: "520px",
      maxHeight: "84vh",
      maxWidth: "92vw",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      overflowY: "auto",
    });

    // Header
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    });

    const titleBox = document.createElement("div");
    Object.assign(titleBox.style, { display: "flex", alignItems: "center", gap: "8px" });
    titleBox.appendChild(
      createElement(Rocket, { width: 18, height: 18, "stroke-width": 1.5, color: "#ffffff" }),
    );

    const title = document.createElement("h3");
    title.textContent = "Spacecraft Manifest & Telemetry";
    Object.assign(title.style, {
      color: "#ffffff",
      fontSize: "15px",
      fontWeight: "600",
      letterSpacing: "0.2px",
      margin: "0",
    });
    titleBox.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.appendChild(createElement(X, { width: 16, height: 16, "stroke-width": 1.5 }));
    Object.assign(closeBtn.style, {
      background: "transparent",
      border: "none",
      color: "rgba(255, 255, 255, 0.5)",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
    });
    closeBtn.addEventListener("click", () => this.close());
    header.append(titleBox, closeBtn);

    const hr = document.createElement("hr");
    hr.style.borderColor = "rgba(255, 255, 255, 0.08)";
    hr.style.margin = "0";

    panel.append(header, hr);

    // Objective banner if available
    if (this._objective) {
      const objBanner = document.createElement("div");
      Object.assign(objBanner.style, {
        background: "rgba(255, 255, 255, 0.04)",
        boxShadow:
          "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        borderRadius: "8px",
        padding: "8px 12px",
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: "11px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      });
      objBanner.innerHTML = `<span><strong>Mission:</strong> ${this._objective.label}</span><span>Budget: $${this._objective.budget}M · Goal: ${this._objective.scienceGoal} pts</span>`;
      panel.appendChild(objBanner);
    }

    this._contentEl = document.createElement("div");
    Object.assign(this._contentEl.style, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    });

    panel.appendChild(this._contentEl);
    overlay.appendChild(panel);

    this._rebuildContent();
    return overlay;
  }

  private _rebuildContent(): void {
    const { colors, font } = Theme;
    this._contentEl.innerHTML = "";

    // Gather all installed items
    const allItems: GameItem[] = [];
    this._snapshot.forEach((e) => {
      const item = getItemById(e.itemId);
      if (item) allItems.push(item);
    });

    // ── Live Telemetry Totals Strip ──
    const totalMass = allItems.reduce((s, i) => s + (i.mass ?? (i as any).weight ?? 0), 0);
    const totalCost = allItems.reduce((s, i) => s + (i.cost ?? 0), 0);
    const totalScience = allItems.reduce((s, i) => s + (i.sciencePoints ?? 0), 0);
    const totalSize = allItems.reduce((s, i) => s + (i.size ?? 0), 0);

    const totalsBar = document.createElement("div");
    Object.assign(totalsBar.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(255, 255, 255, 0.04)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      borderRadius: "10px",
      padding: "10px 14px",
      flexWrap: "wrap",
      gap: "8px",
    });

    const createStat = (label: string, value: string, highlight = "#ffffff") => {
      const box = document.createElement("div");
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.gap = "2px";

      const lbl = document.createElement("span");
      lbl.textContent = label;
      lbl.style.fontSize = "10px";
      lbl.style.color = "rgba(255, 255, 255, 0.5)";
      lbl.style.textTransform = "uppercase";
      lbl.style.letterSpacing = "0.5px";

      const val = document.createElement("span");
      val.textContent = value;
      val.style.fontSize = "13px";
      val.style.fontFamily = font.mono;
      val.style.fontWeight = "600";
      val.style.color = highlight;

      box.append(lbl, val);
      return box;
    };

    const isOverBudget = this._objective && totalCost > this._objective.budget;
    totalsBar.append(
      createStat("Payload Mass", `${totalMass} kg`, totalMass > 300 ? colors.danger : "#ffffff"),
      createStat("Total Budget", `$${totalCost}M`, isOverBudget ? colors.danger : "#ffffff"),
      createStat("Science Yield", `${totalScience} pts`, "#70a1ff"),
      createStat("Module Volume", `${totalSize} units`),
    );
    this._contentEl.appendChild(totalsBar);

    // ── Role sections ──
    const allRoles = STATIONS.map((s) => ({ roleId: s.roleId }));
    for (const { roleId } of allRoles) {
      this._contentEl.appendChild(this._buildRoleSection(roleId));
    }

    // ── Add Carried Item Action ──
    const held = this._carry.heldItem;
    if (held) {
      const addBar = document.createElement("div");
      Object.assign(addBar.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.06)",
        boxShadow:
          "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
        borderRadius: "10px",
        padding: "10px 14px",
      });
      const addLabel = document.createElement("span");
      const massVal = held.mass ?? (held as any).weight ?? 0;
      addLabel.textContent = `Install: ${held.name} (${massVal} kg)`;
      Object.assign(addLabel.style, {
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "500",
        flex: "1",
      });

      const addBtn = document.createElement("button");
      addBtn.style.display = "flex";
      addBtn.style.alignItems = "center";
      addBtn.style.gap = "6px";
      addBtn.appendChild(createElement(Plus, { width: 13, height: 13, "stroke-width": 2 }));
      const addBtnText = document.createElement("span");
      addBtnText.textContent = "Install on Ship";
      addBtn.appendChild(addBtnText);

      Object.assign(addBtn.style, {
        background: "#ffffff",
        color: "#04060a",
        border: "none",
        borderRadius: "8px",
        padding: "6px 14px",
        fontWeight: "600",
        fontSize: "12px",
        boxShadow: "0 2px 12px rgba(255, 255, 255, 0.25)",
        cursor: "pointer",
        transition: "all 0.15s ease",
      });
      addBtn.addEventListener("mouseenter", () => (addBtn.style.transform = "scale(1.02)"));
      addBtn.addEventListener("mouseleave", () => (addBtn.style.transform = "scale(1)"));
      addBtn.addEventListener("click", () => {
        const item = this._carry.putDown();
        if (item) {
          ColyseusService.send("addItemToShip", { itemId: item.id, roleId: item.roleId });
          this._snapshot.set(item.id, {
            itemId: item.id,
            roleId: item.roleId,
            addedBy: "me",
          });
          this.refresh(this._snapshot);
        }
      });

      addBar.append(addLabel, addBtn);
      this._contentEl.appendChild(addBar);
    }

    // ── Consult Flight Director AI Button ──
    if (this._onConsultAi) {
      const consultBar = document.createElement("div");
      Object.assign(consultBar.style, {
        marginTop: "4px",
        borderTop: `1px solid rgba(255, 255, 255, 0.08)`,
        paddingTop: "10px",
        display: "flex",
        justifyContent: "flex-end",
      });

      const aiBtn = document.createElement("button");
      aiBtn.style.display = "flex";
      aiBtn.style.alignItems = "center";
      aiBtn.style.gap = "6px";
      aiBtn.appendChild(createElement(Activity, { width: 14, height: 14, "stroke-width": 1.5 }));
      const aiBtnText = document.createElement("span");
      aiBtnText.textContent = "Evaluate with Flight Director";
      aiBtn.appendChild(aiBtnText);

      Object.assign(aiBtn.style, {
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "8px",
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "500",
        fontFamily: font.family,
        padding: "8px 14px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      });
      aiBtn.addEventListener("mouseenter", () => {
        aiBtn.style.background = "#ffffff";
        aiBtn.style.color = "#080a10";
      });
      aiBtn.addEventListener("mouseleave", () => {
        aiBtn.style.background = "rgba(255, 255, 255, 0.05)";
        aiBtn.style.color = "#ffffff";
      });
      aiBtn.addEventListener("click", () => {
        this.close();
        this._onConsultAi?.();
      });

      consultBar.appendChild(aiBtn);
      this._contentEl.appendChild(consultBar);
    }

    // ── Launch Evaluation & Initiation (Host or All Roles) ──
    const installedRoleIds = new Set(Array.from(this._snapshot.values()).map((e) => e.roleId));
    const allRolesCovered = installedRoleIds.size >= 4;

    if (this._isHost || allRolesCovered) {
      const launchActionRow = document.createElement("div");
      Object.assign(launchActionRow.style, {
        display: "flex",
        gap: "10px",
        marginTop: "8px",
      });

      // 1. Run 12-rule launch validation dialog
      const evalBtn = document.createElement("button");
      evalBtn.style.display = "flex";
      evalBtn.style.alignItems = "center";
      evalBtn.style.justifyContent = "center";
      evalBtn.style.gap = "6px";
      evalBtn.style.flex = "1";
      evalBtn.appendChild(createElement(CheckCircle2, { width: 14, height: 14, "stroke-width": 1.5 }));
      const evalText = document.createElement("span");
      evalText.textContent = "Run Launch Audit (12 Rules)";
      evalBtn.appendChild(evalText);

      Object.assign(evalBtn.style, {
        background: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "10px",
        color: "#ffffff",
        fontWeight: "500",
        fontSize: "12px",
        fontFamily: font.family,
        padding: "10px 14px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      });
      evalBtn.addEventListener("mouseenter", () => (evalBtn.style.background = "rgba(255, 255, 255, 0.14)"));
      evalBtn.addEventListener("mouseleave", () => (evalBtn.style.background = "rgba(255, 255, 255, 0.08)"));
      evalBtn.addEventListener("click", () => {
        if (this._openResult) return;
        const result = runLaunchChecks(allItems, this._objective);
        this._openResult = new LaunchResultUI(result, () => {
          this._openResult = null;
        });
        this._openResult.mount();
      });

      // 2. Initiate Launch Sequence Button
      const launchBtn = document.createElement("button");
      launchBtn.style.display = "flex";
      launchBtn.style.alignItems = "center";
      launchBtn.style.justifyContent = "center";
      launchBtn.style.gap = "8px";
      launchBtn.style.flex = "1.3";
      launchBtn.appendChild(createElement(Rocket, { width: 15, height: 15, "stroke-width": 2 }));
      const launchText = document.createElement("span");
      launchText.textContent = "Initiate Launch Sequence";
      launchBtn.appendChild(launchText);

      Object.assign(launchBtn.style, {
        background: "#ffffff",
        border: "none",
        borderRadius: "10px",
        color: "#04060a",
        fontWeight: "600",
        fontSize: "13px",
        fontFamily: font.family,
        padding: "10px 16px",
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(255, 255, 255, 0.35), inset 0 1px 1px #ffffff",
        transition: "all 0.15s ease",
      });
      launchBtn.addEventListener("mouseenter", () => (launchBtn.style.boxShadow = "0 6px 30px rgba(255, 255, 255, 0.5)"));
      launchBtn.addEventListener("mouseleave", () => (launchBtn.style.boxShadow = "0 4px 20px rgba(255, 255, 255, 0.35)"));
      launchBtn.addEventListener("click", () => {
        this.close();
        this._onLaunchMission?.();
      });

      launchActionRow.append(evalBtn, launchBtn);
      this._contentEl.appendChild(launchActionRow);
    }
  }

  private _buildRoleSection(roleId: string): HTMLDivElement {
    const { colors, font } = Theme;
    const label = getRoleLabel(roleId);
    const playerOwnsRole = this._playerRoles.includes(roleId);

    const section = document.createElement("div");
    Object.assign(section.style, { display: "flex", flexDirection: "column", gap: "6px" });

    const sectionLabel = document.createElement("div");
    sectionLabel.textContent = label;
    Object.assign(sectionLabel.style, {
      color: colors.textSecondary,
      fontSize: "11px",
      fontWeight: "500",
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      padding: "2px 0",
    });
    section.appendChild(sectionLabel);

    const roleEntries = [...this._snapshot.values()].filter((e) => e.roleId === roleId);

    if (roleEntries.length === 0) {
      const empty = document.createElement("span");
      empty.textContent = "No units installed";
      Object.assign(empty.style, {
        color: colors.textMuted,
        fontSize: "11px",
        padding: "4px 8px",
        fontStyle: "italic",
      });
      section.appendChild(empty);
      return section;
    }

    for (const entry of roleEntries) {
      const item = getItemById(entry.itemId);
      if (!item) continue;

      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "rgba(255, 255, 255, 0.04)",
        boxShadow:
          "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        borderRadius: "8px",
        padding: "8px 12px",
      });

      const name = document.createElement("span");
      name.textContent = item.name;
      Object.assign(name.style, {
        color: colors.textPrimary,
        fontSize: "12px",
        flex: "1",
      });

      const kg = document.createElement("span");
      const massVal = item.mass ?? (item as any).weight ?? 0;
      kg.textContent = `${massVal} kg`;
      Object.assign(kg.style, {
        color: colors.textSecondary,
        fontSize: "11px",
        fontFamily: font.mono,
        whiteSpace: "nowrap",
      });

      const detailBtn = document.createElement("button");
      detailBtn.style.display = "flex";
      detailBtn.style.alignItems = "center";
      detailBtn.style.gap = "4px";
      detailBtn.appendChild(createElement(Info, { width: 12, height: 12, "stroke-width": 1.5 }));
      const detailText = document.createElement("span");
      detailText.textContent = "Specs";
      detailBtn.appendChild(detailText);

      this._styleBtn(detailBtn, colors.textSecondary, true);
      detailBtn.addEventListener("click", () => {
        this._openDetail?.close();
        this._openDetail = new ItemDetailUI(item);
        this._openDetail.mount();
      });

      const removeBtn = document.createElement("button");
      removeBtn.style.display = "flex";
      removeBtn.style.alignItems = "center";
      removeBtn.style.gap = "4px";
      removeBtn.appendChild(createElement(Trash2, { width: 12, height: 12, "stroke-width": 1.5 }));
      const removeText = document.createElement("span");
      removeText.textContent = "Remove";
      removeBtn.appendChild(removeText);

      const canRemove = !this._carry.isHolding && playerOwnsRole;
      removeBtn.disabled = !canRemove;
      this._styleBtn(removeBtn, colors.danger, true);

      if (!canRemove) {
        removeBtn.style.opacity = "0.4";
        removeBtn.style.cursor = "not-allowed";
        removeBtn.title = playerOwnsRole
          ? "Put down your current item first"
          : "You don't have this role authorization";
      }

      removeBtn.addEventListener("click", () => {
        if (this._carry.isHolding) return;
        ColyseusService.send("removeItemFromShip", { itemId: item.id });
        this._snapshot.delete(item.id);
        this.refresh(this._snapshot);
        this._carry.pickUp(item);
      });

      row.append(name, kg, detailBtn, removeBtn);
      section.appendChild(row);
    }

    return section;
  }

  private _styleBtn(btn: HTMLButtonElement, color: string, ghost = false): void {
    const { font } = Theme;
    Object.assign(btn.style, {
      background: ghost ? "transparent" : color,
      border: ghost ? `1px solid ${color}` : "none",
      borderRadius: "4px",
      color: ghost ? color : "#080a10",
      cursor: "pointer",
      fontFamily: font.family,
      fontSize: "11px",
      padding: "4px 8px",
      whiteSpace: "nowrap",
      flexShrink: "0",
      transition: "opacity 0.15s ease",
    });
  }
}
