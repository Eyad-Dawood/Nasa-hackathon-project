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
import { ShipEntrySnapshot } from "../game/entities/ShipEntity";

/**
 * ShipMenuUI
 * ──────────
 * Spacecraft Manifest & Subsystem Telemetry overlay.
 * Supports duplicate components keyed by `instanceId`, `maxPerShip` limits,
 * server rejection alerts (`shipError`), authoritative 12-rule launch audit,
 * and Launch -> AI diagnosis handoff.
 */
export class ShipMenuUI {
  private _container: HTMLDivElement;
  private _carry: CarrySystem;
  private _onClose: () => void;
  private _onConsultAi?: (contextPrompt?: string) => void;
  private _onLaunchMission?: () => void;
  private _openDetail: ItemDetailUI | null = null;
  private _openResult: LaunchResultUI | null = null;
  private _playerRoles: string[];
  private _objective: Objective | null;
  private _isHost: boolean;

  private _bannerEl!: HTMLDivElement;
  private _errorEl!: HTMLDivElement;
  private _contentEl!: HTMLDivElement;
  private _snapshot: Map<string, ShipEntrySnapshot>;
  private _unsubShipError: (() => void) | null = null;
  private _pendingCarryAction: { type: "add" | "remove"; item: GameItem } | null = null;

  constructor(
    snapshot: Map<string, ShipEntrySnapshot>,
    carry: CarrySystem,
    playerRoles: string[],
    objective: Objective | null,
    isHost: boolean,
    onClose: () => void,
    onConsultAi?: (contextPrompt?: string) => void,
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
    this._unsubShipError = ColyseusService.on("shipError", (data: unknown) => {
      if (this._pendingCarryAction) {
        if (this._pendingCarryAction.type === "add" && !this._carry.isHolding) {
          this._carry.pickUp(this._pendingCarryAction.item);
        } else if (
          this._pendingCarryAction.type === "remove" &&
          this._carry.heldItem?.id === this._pendingCarryAction.item.id
        ) {
          this._carry.putDown();
        }
        this._pendingCarryAction = null;
        this._rebuildContent();
      }
      const msg = (data as { message?: string })?.message ?? "Spacecraft manifest action rejected.";
      this._showError(msg);
    });
  }

  close(): void {
    this._unsubShipError?.();
    this._unsubShipError = null;
    this._pendingCarryAction = null;
    this._openDetail?.close();
    this._openResult?.close();
    this._container.remove();
    this._onClose();
  }

  setObjective(objective: Objective | null): void {
    this._objective = objective;
    this._updateBanner();
    this._rebuildContent();
  }

  setIsHost(isHost: boolean): void {
    this._isHost = isHost;
    this._rebuildContent();
  }

  refresh(snapshot: Map<string, ShipEntrySnapshot>): void {
    this._pendingCarryAction = null;
    this._snapshot = snapshot;
    this._rebuildContent();
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _showError(message: string): void {
    if (!this._errorEl) return;
    this._errorEl.textContent = message;
    this._errorEl.style.display = "flex";
    setTimeout(() => {
      if (this._errorEl) this._errorEl.style.display = "none";
    }, 4500);
  }

  private _updateBanner(): void {
    if (!this._bannerEl) return;
    if (this._objective) {
      this._bannerEl.style.display = "flex";
      this._bannerEl.innerHTML = `<span><strong>Mission (${this._objective.id}):</strong> ${this._objective.label}</span><span>Budget: ${this._objective.budget} cr · Goal: ${this._objective.scienceGoal} pts</span>`;
    } else {
      this._bannerEl.style.display = "none";
    }
  }

  private _buildDOM(): HTMLDivElement {
    const { font, colors } = Theme;

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
      background: "rgba(12, 16, 26, 0.9)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 24px 48px rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(20px) saturate(1.5)",
      WebkitBackdropFilter: "blur(20px) saturate(1.5)",
      border: "none",
      borderRadius: "16px",
      padding: "20px 24px",
      width: "540px",
      maxHeight: "86vh",
      maxWidth: "92vw",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      overflowY: "auto",
    });

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

    this._bannerEl = document.createElement("div");
    Object.assign(this._bannerEl.style, {
      background: "rgba(255, 255, 255, 0.04)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      borderRadius: "8px",
      padding: "8px 12px",
      color: "rgba(255, 255, 255, 0.85)",
      fontSize: "11px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    });
    this._updateBanner();

    this._errorEl = document.createElement("div");
    Object.assign(this._errorEl.style, {
      display: "none",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "8px",
      background: "rgba(248, 113, 113, 0.14)",
      border: `1px solid ${colors.danger}`,
      color: colors.danger,
      fontSize: "12px",
    });

    this._contentEl = document.createElement("div");
    Object.assign(this._contentEl.style, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    });

    panel.append(header, hr, this._bannerEl, this._errorEl, this._contentEl);
    overlay.appendChild(panel);

    this._rebuildContent();
    return overlay;
  }

  private _rebuildContent(): void {
    const { colors, font } = Theme;
    this._contentEl.innerHTML = "";

    const allItems: GameItem[] = [];
    this._snapshot.forEach((e) => {
      const item = getItemById(e.itemId);
      if (item) allItems.push(item);
    });

    const totalMass = allItems.reduce((s, i) => s + i.mass, 0);
    const totalCost = allItems.reduce((s, i) => s + i.cost, 0);
    const totalScience = allItems.reduce((s, i) => s + (i.sciencePoints ?? 0), 0);
    const totalSize = allItems.reduce((s, i) => s + i.size, 0);

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
      createStat("Total Mass", `${totalMass} kg`, "#ffffff"),
      createStat("Cost / Budget", `${totalCost} / ${this._objective?.budget ?? "—"} cr`, isOverBudget ? colors.danger : "#ffffff"),
      createStat("Science Pts", `${totalScience}`, "#70a1ff"),
      createStat("Used Space", `${totalSize} units`),
    );
    this._contentEl.appendChild(totalsBar);

    const allRoles = STATIONS.map((s) => ({ roleId: s.roleId }));
    for (const { roleId } of allRoles) {
      this._contentEl.appendChild(this._buildRoleSection(roleId));
    }

    // ── Add Carried Item Action ──
    const held = this._carry.heldItem;
    if (held) {
      const existingCount = [...this._snapshot.values()].filter((e) => e.itemId === held.id).length;
      const atLimit = held.maxPerShip !== null && existingCount >= held.maxPerShip;
      const ownsRole = this._playerRoles.includes(held.roleId);
      const canInstall = ownsRole && !atLimit;

      const addBar = document.createElement("div");
      Object.assign(addBar.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "10px",
        background: "rgba(255, 255, 255, 0.06)",
        boxShadow:
          "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
        borderRadius: "10px",
        padding: "10px 14px",
      });

      const addLabel = document.createElement("span");
      addLabel.textContent = atLimit
        ? `${held.name} — max ${held.maxPerShip} per ship reached`
        : !ownsRole
          ? `${held.name} — requires ${getRoleLabel(held.roleId)} role`
          : `Install: ${held.name} (${held.mass} kg · ${held.cost} cr)`;
      Object.assign(addLabel.style, {
        color: canInstall ? "#ffffff" : colors.warning,
        fontSize: "12px",
        fontWeight: "500",
        flex: "1",
      });

      const addBtn = document.createElement("button");
      addBtn.style.display = "flex";
      addBtn.style.alignItems = "center";
      addBtn.style.gap = "6px";
      addBtn.disabled = !canInstall;
      addBtn.appendChild(createElement(canInstall ? Plus : AlertTriangle, { width: 13, height: 13, "stroke-width": 2 }));
      const addBtnText = document.createElement("span");
      addBtnText.textContent = canInstall ? "Install on Ship" : "Blocked";
      addBtn.appendChild(addBtnText);

      Object.assign(addBtn.style, {
        background: canInstall ? "#ffffff" : "rgba(255,255,255,0.08)",
        color: canInstall ? "#04060a" : "rgba(255,255,255,0.4)",
        border: "none",
        borderRadius: "8px",
        padding: "6px 14px",
        fontWeight: "600",
        fontSize: "12px",
        boxShadow: canInstall ? "0 2px 12px rgba(255, 255, 255, 0.25)" : "none",
        cursor: canInstall ? "pointer" : "not-allowed",
        transition: "all 0.15s ease",
      });

      if (canInstall) {
        addBtn.addEventListener("click", () => {
          const item = this._carry.putDown();
          if (!item) return;

          if (ColyseusService.room) {
            this._pendingCarryAction = { type: "add", item };
            ColyseusService.sendAddItem(item.id, item.roleId);
          } else {
            const localInstanceId = `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            this._snapshot.set(localInstanceId, {
              instanceId: localInstanceId,
              itemId: item.id,
              roleId: item.roleId,
              addedBy: "me",
            });
            this.refresh(this._snapshot);
          }
        });
      }

      addBar.append(addLabel, addBtn);
      this._contentEl.appendChild(addBar);
    }

    // ── Consult Flight Director AI Button ──
    if (this._onConsultAi) {
      const consultBar = document.createElement("div");
      Object.assign(consultBar.style, {
        marginTop: "4px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
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
        this._onConsultAi?.("Can we launch now? Evaluate all 12 rules for our current ship.");
      });

      consultBar.appendChild(aiBtn);
      this._contentEl.appendChild(consultBar);
    }

    // ── Launch Evaluation & Initiation ──
    const auditNow = runLaunchChecks(allItems, this._objective);
    const launchActionRow = document.createElement("div");
    Object.assign(launchActionRow.style, {
      display: "flex",
      gap: "10px",
      marginTop: "6px",
    });

    const evalBtn = document.createElement("button");
    evalBtn.style.display = "flex";
    evalBtn.style.alignItems = "center";
    evalBtn.style.justifyContent = "center";
    evalBtn.style.gap = "6px";
    evalBtn.style.flex = "1";
    evalBtn.appendChild(createElement(CheckCircle2, { width: 14, height: 14, "stroke-width": 1.5 }));
    const evalText = document.createElement("span");
    evalText.textContent = `Launch Audit (${auditNow.passCount}/12)`;
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
    });
    evalBtn.addEventListener("click", () => this._openLaunchAuditModal(allItems));
    launchActionRow.appendChild(evalBtn);

    if (this._isHost) {
      const launchBtn = document.createElement("button");
      launchBtn.style.display = "flex";
      launchBtn.style.alignItems = "center";
      launchBtn.style.justifyContent = "center";
      launchBtn.style.gap = "8px";
      launchBtn.style.flex = "1.3";
      launchBtn.appendChild(createElement(Rocket, { width: 15, height: 15, "stroke-width": 2 }));
      const launchText = document.createElement("span");
      launchText.textContent = auditNow.success
        ? "Initiate Launch Sequence"
        : `Verify & Launch (${auditNow.failCount} failing)`;
      launchBtn.appendChild(launchText);

      Object.assign(launchBtn.style, {
        background: auditNow.success ? "#ffffff" : "rgba(251, 191, 36, 0.18)",
        border: auditNow.success ? "none" : `1px solid ${colors.warning}`,
        borderRadius: "10px",
        color: auditNow.success ? "#04060a" : colors.warning,
        fontWeight: "600",
        fontSize: "12.5px",
        fontFamily: font.family,
        padding: "10px 16px",
        cursor: "pointer",
        boxShadow: auditNow.success
          ? "0 4px 20px rgba(255, 255, 255, 0.35), inset 0 1px 1px #ffffff"
          : "none",
      });

      launchBtn.addEventListener("click", () => {
        const result = runLaunchChecks(allItems, this._objective);
        if (!result.success) {
          this._openLaunchAuditModal(allItems);
          return;
        }
        this.close();
        this._onLaunchMission?.();
      });

      launchActionRow.appendChild(launchBtn);
    }

    this._contentEl.appendChild(launchActionRow);
  }

  private _openLaunchAuditModal(allItems: GameItem[]): void {
    if (this._openResult) return;
    const result = runLaunchChecks(allItems, this._objective);
    this._openResult = new LaunchResultUI(
      result,
      () => {
        this._openResult = null;
      },
      (failedResult) => {
        const failingNames = failedResult.checks
          .filter((c) => !c.pass)
          .map((c) => c.label)
          .join(", ");
        this.close();
        this._onConsultAi?.(
          `Our launch audit failed ${failedResult.failCount} rule(s): ${failingNames}. Why are we failing and what exact components should each engineer install next?`,
        );
      },
    );
    this._openResult.mount();
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

    const totalOfType = new Map<string, number>();
    roleEntries.forEach((e) => {
      totalOfType.set(e.itemId, (totalOfType.get(e.itemId) ?? 0) + 1);
    });
    const seenOfType = new Map<string, number>();

    for (const entry of roleEntries) {
      const item = getItemById(entry.itemId);
      if (!item) continue;

      const copyIndex = (seenOfType.get(entry.itemId) ?? 0) + 1;
      seenOfType.set(entry.itemId, copyIndex);
      const countTotal = totalOfType.get(entry.itemId) ?? 1;

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
      name.textContent = countTotal > 1 ? `${item.name} (#${copyIndex})` : item.name;
      Object.assign(name.style, {
        color: colors.textPrimary,
        fontSize: "12px",
        flex: "1",
      });

      const kg = document.createElement("span");
      kg.textContent = `${item.mass} kg`;
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
        if (ColyseusService.room) {
          this._pendingCarryAction = { type: "remove", item };
          ColyseusService.sendRemoveItem(entry.instanceId, item.id);
        } else {
          this._snapshot.delete(entry.instanceId);
          this.refresh(this._snapshot);
        }
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
