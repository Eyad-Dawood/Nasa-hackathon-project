import { Theme, getRoleLabel, getRoleColor } from "../config/theme";
import { GameItem } from "../game/data/ItemData";

/**
 * ItemDetailUI
 * ────────────
 * Compact side panel showing full component specifications.
 * Styled with Liquid Glass dark aesthetics.
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
    const { colors, font, spacing, radius } = Theme;
    const item = this._item;

    const panel = document.createElement("div");
    panel.id = `item-detail-${item.id}`;
    Object.assign(panel.style, {
      position: "fixed",
      top: "80px",
      right: "24px",
      width: "280px",
      background: "rgba(12, 16, 26, 0.88)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 20px 40px rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(16px) saturate(1.4)",
      WebkitBackdropFilter: "blur(16px) saturate(1.4)",
      border: "none",
      borderRadius: "14px",
      padding: "16px",
      zIndex: "2000",
      fontFamily: font.family,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      maxHeight: "80vh",
      overflowY: "auto",
    });

    // ── Header ──
    const header = document.createElement("div");
    Object.assign(header.style, { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm });

    const titleWrap = document.createElement("div");
    titleWrap.style.flex = "1";

    const title = document.createElement("div");
    title.textContent = item.name;
    Object.assign(title.style, { color: "#ffffff", fontSize: "14px", fontWeight: "600", lineHeight: "1.3" });

    const idTag = document.createElement("div");
    idTag.textContent = `${item.id}  ·  ${item.category}`;
    Object.assign(idTag.style, { color: "rgba(255, 255, 255, 0.4)", fontSize: "10px", marginTop: "2px" });

    const roleTag = document.createElement("div");
    roleTag.textContent = getRoleLabel(item.roleId);
    Object.assign(roleTag.style, { color: "rgba(255, 255, 255, 0.85)", fontSize: "10px", fontWeight: "500", marginTop: "2px" });

    titleWrap.append(title, idTag, roleTag);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      background: "transparent",
      border: "none",
      color: "rgba(255, 255, 255, 0.5)",
      cursor: "pointer",
      fontSize: "18px",
      lineHeight: "1",
      padding: "0 2px",
      flexShrink: "0",
    });
    closeBtn.addEventListener("click", () => this.close());
    header.append(titleWrap, closeBtn);

    // ── Divider ──
    const hr = () => {
      const h = document.createElement("hr");
      h.style.borderColor = "rgba(255, 255, 255, 0.08)";
      h.style.margin = "0";
      return h;
    };

    // ── Core stats (every component has these) ──
    const coreStats = document.createElement("div");
    Object.assign(coreStats.style, { display: "flex", flexDirection: "column", gap: "4px" });
    coreStats.append(
      this._stat("Mass",        `${item.mass} kg`),
      this._stat("Size",        `${item.size} Space`),
      this._stat("Cost",        `${item.cost} credits`),
      this._stat("Max / ship",  item.maxPerShip === null ? "unlimited" : String(item.maxPerShip)),
    );

    // ── Specialised stats ──
    const specStats = document.createElement("div");
    Object.assign(specStats.style, { display: "flex", flexDirection: "column", gap: "4px" });

    const addStat = (label: string, val: number | undefined, suffix = "") => {
      if (val !== undefined && val !== 0) specStats.appendChild(this._stat(label, `${val}${suffix}`));
    };

    // Power & Thermal
    if (item.powerMade)         addStat("Power Made",             item.powerMade,  item.solar ? ` (×sunlight%)` : "");
    if (item.powerUse)          addStat("Power Used",             item.powerUse);
    if (item.powerSaved)        addStat("Power Saved",            item.powerSaved);
    if (item.batteryStorage)    addStat("Battery Storage",        item.batteryStorage);
    if (item.heatProtection)    addStat("Heat Protection",        item.heatProtection);
    if (item.fuelCapacity)      addStat("Fuel Capacity",          item.fuelCapacity);
    if (item.thrust)            addStat("Thrust",                 item.thrust);
    if (item.fuelBurn)          addStat("Fuel Burn / dist",       item.fuelBurn);
    // Structure & Computing
    if (item.frameSpace)        addStat("Frame Space",            item.frameSpace);
    if (item.spaceBonus)        addStat("Space Bonus",            item.spaceBonus);
    if (item.radiationProtection) addStat("Rad. Protection",      item.radiationProtection);
    if (item.brainPower)        addStat("Brain Power",            item.brainPower);
    if (item.brainBonus)        addStat("Brain Bonus",            item.brainBonus);
    if (item.launchPullReduction) addStat("Launch Pull Reduction", item.launchPullReduction);
    // Communications
    if (item.dataRate)          addStat("Data Rate",              item.dataRate);
    if (item.signalRange)       addStat("Signal Range",           item.signalRange);
    if (item.rangeBonus)        addStat("Range Bonus",            item.rangeBonus);
    if (item.rateBonus)         addStat("Rate Bonus",             item.rateBonus);
    if (item.dataReduction)     addStat("Data Reduction",         item.dataReduction);
    // Science
    if (item.dataMade)          addStat("Data Made",              item.dataMade);
    if (item.brainUse)          addStat("Brain Used",             item.brainUse);
    if (item.sciencePoints)     addStat("Science Points",         item.sciencePoints);

    // ── Good / Watch out ──
    const tipsBlock = document.createElement("div");
    Object.assign(tipsBlock.style, { display: "flex", flexDirection: "column", gap: "6px" });

    const goodDiv = document.createElement("div");
    Object.assign(goodDiv.style, {
      background: "rgba(52, 211, 153, 0.08)",
      borderLeft: "2px solid #34d399",
      borderRadius: "4px",
      padding: "4px 8px",
      color: "rgba(255, 255, 255, 0.9)",
      fontSize: "10.5px",
      lineHeight: "1.4",
    });
    goodDiv.textContent = item.good;

    const warnDiv = document.createElement("div");
    Object.assign(warnDiv.style, {
      background: "rgba(239, 68, 68, 0.08)",
      borderLeft: "2px solid #ef4444",
      borderRadius: "4px",
      padding: "4px 8px",
      color: "rgba(255, 255, 255, 0.9)",
      fontSize: "10.5px",
      lineHeight: "1.4",
    });
    warnDiv.textContent = item.watchOut;

    tipsBlock.append(goodDiv, warnDiv);

    const children: HTMLElement[] = [header, hr()];
    if (coreStats.children.length) children.push(coreStats);
    if (specStats.children.length) children.push(hr(), specStats);
    children.push(hr(), tipsBlock);

    panel.append(...children);
    return panel;
  }

  private _stat(label: string, value: string): HTMLDivElement {
    const { font } = Theme;
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", justifyContent: "space-between", gap: "8px" });

    const lbl = document.createElement("span");
    lbl.textContent = label;
    Object.assign(lbl.style, { color: "rgba(255, 255, 255, 0.5)", fontSize: "11px", flexShrink: "0" });

    const val = document.createElement("span");
    val.textContent = value;
    Object.assign(val.style, { color: "#ffffff", fontFamily: font.mono, fontSize: "11px", fontWeight: "600", textAlign: "right" });

    row.append(lbl, val);
    return row;
  }
}
