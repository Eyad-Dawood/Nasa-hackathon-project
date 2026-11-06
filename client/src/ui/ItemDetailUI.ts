import { Theme, getRoleLabel, getRoleColor } from "../config/theme";
import { GameItem } from "../game/data/ItemData";

/**
 * ItemDetailUI
 * ────────────
 * Floating panel (right side) showing one component's full data.
 * Non-blocking — the game continues behind it.
 * Closed by clicking the × button or calling close().
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
      position:      "fixed",
      top:           "80px",
      right:         "16px",
      width:         "260px",
      background:    colors.surface,
      border:        `1px solid ${colors.border}`,
      borderRadius:  radius.lg,
      padding:       spacing.md,
      zIndex:        "2000",
      fontFamily:    font.family,
      boxShadow:     "0 4px 24px rgba(0,0,0,0.6)",
      display:       "flex",
      flexDirection: "column",
      gap:           spacing.sm,
      maxHeight:     "80vh",
      overflowY:     "auto",
    });

    // ── Header ──
    const header = document.createElement("div");
    Object.assign(header.style, { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm });

    const titleWrap = document.createElement("div");
    titleWrap.style.flex = "1";

    const title = document.createElement("div");
    title.textContent = item.name;
    Object.assign(title.style, { color: colors.textPrimary, fontSize: font.sizeMd, fontWeight: "bold", lineHeight: "1.3" });

    const idTag = document.createElement("div");
    idTag.textContent = `${item.id}  ·  ${item.category}`;
    Object.assign(idTag.style, { color: colors.textMuted, fontSize: "10px", marginTop: "2px" });

    const roleTag = document.createElement("div");
    roleTag.textContent = getRoleLabel(item.roleId);
    Object.assign(roleTag.style, { color: getRoleColor(item.roleId), fontSize: "10px", fontWeight: "bold", marginTop: "2px" });

    titleWrap.append(title, idTag, roleTag);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      background: "transparent", border: "none",
      color: colors.textMuted, cursor: "pointer",
      fontSize: "18px", lineHeight: "1", padding: "0 2px", flexShrink: "0",
    });
    closeBtn.addEventListener("click", () => this.close());
    header.append(titleWrap, closeBtn);

    // ── Divider ──
    const hr = () => { const h = document.createElement("hr"); h.style.borderColor = colors.border; h.style.margin = "0"; return h; };

    // ── Core stats (every component has these) ──
    const coreStats = document.createElement("div");
    Object.assign(coreStats.style, { display: "flex", flexDirection: "column", gap: "3px" });
    coreStats.append(
      this._stat("Mass",        `${item.mass} kg`),
      this._stat("Size",        `${item.size} Space`),
      this._stat("Cost",        `${item.cost} credits`),
      this._stat("Max / ship",  item.maxPerShip === null ? "unlimited" : String(item.maxPerShip)),
    );

    // ── Specialised stats ──
    const specStats = document.createElement("div");
    Object.assign(specStats.style, { display: "flex", flexDirection: "column", gap: "3px" });

    const addStat = (label: string, val: number | undefined, suffix = "") => {
      if (val !== undefined && val !== 0) specStats.appendChild(this._stat(label, `${val}${suffix}`));
    };

    // Power & Thermal
    if (item.powerMade)         addStat("⚡ Power Made",          item.powerMade,  item.solar ? ` (×sunlight%)` : "");
    if (item.powerUse)          addStat("⚡ Power Used",          item.powerUse);
    if (item.powerSaved)        addStat("⚡ Power Saved",         item.powerSaved);
    if (item.batteryStorage)    addStat("🔋 Battery Storage",     item.batteryStorage);
    if (item.heatProtection)    addStat("🔥 Heat Protection",     item.heatProtection);
    if (item.fuelCapacity)      addStat("⛽ Fuel Capacity",       item.fuelCapacity);
    if (item.thrust)            addStat("🚀 Thrust",              item.thrust);
    if (item.fuelBurn)          addStat("⛽ Fuel Burn / dist",    item.fuelBurn);
    // Structure & Computing
    if (item.frameSpace)        addStat("📦 Frame Space",         item.frameSpace);
    if (item.spaceBonus)        addStat("📦 Space Bonus",         item.spaceBonus);
    if (item.radiationProtection) addStat("☢ Rad. Protection",   item.radiationProtection);
    if (item.brainPower)        addStat("🧠 Brain Power",         item.brainPower);
    if (item.brainBonus)        addStat("🧠 Brain Bonus",         item.brainBonus);
    if (item.launchPullReduction) addStat("🔻 Launch Pull −",     item.launchPullReduction);
    // Communications
    if (item.dataRate)          addStat("📡 Data Rate",           item.dataRate);
    if (item.signalRange)       addStat("📡 Signal Range",        item.signalRange);
    if (item.rangeBonus)        addStat("📡 Range Bonus",         item.rangeBonus);
    if (item.rateBonus)         addStat("📡 Rate Bonus",          item.rateBonus);
    if (item.dataReduction)     addStat("🗜 Data Reduction",      item.dataReduction);
    // Science
    if (item.dataMade)          addStat("🌌 Data Made",           item.dataMade);
    if (item.brainUse)          addStat("🧠 Brain Used",          item.brainUse);
    if (item.sciencePoints)     addStat("🔬 Science Points",      item.sciencePoints);

    // ── Good / Watch out ──
    const tipsBlock = document.createElement("div");
    Object.assign(tipsBlock.style, { display: "flex", flexDirection: "column", gap: "4px" });

    const goodDiv = document.createElement("div");
    Object.assign(goodDiv.style, {
      background: `${colors.success}14`, borderLeft: `3px solid ${colors.success}`,
      borderRadius: "3px", padding: `3px ${spacing.sm}`,
      color: colors.success, fontSize: "10px",
    });
    goodDiv.textContent = `✓ ${item.good}`;

    const warnDiv = document.createElement("div");
    Object.assign(warnDiv.style, {
      background: "#e9456018", borderLeft: "3px solid #e94560",
      borderRadius: "3px", padding: `3px ${spacing.sm}`,
      color: "#e94560", fontSize: "10px",
    });
    warnDiv.textContent = `⚠ ${item.watchOut}`;

    tipsBlock.append(goodDiv, warnDiv);

    const children: HTMLElement[] = [header, hr()];
    if (coreStats.children.length) children.push(coreStats);
    if (specStats.children.length) children.push(hr(), specStats);
    children.push(hr(), tipsBlock);

    panel.append(...children);
    return panel;
  }

  private _stat(label: string, value: string): HTMLDivElement {
    const { colors, font } = Theme;
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", justifyContent: "space-between", gap: "8px" });

    const lbl = document.createElement("span");
    lbl.textContent = label;
    Object.assign(lbl.style, { color: colors.textMuted, fontSize: font.sizeXs, flexShrink: "0" });

    const val = document.createElement("span");
    val.textContent = value;
    Object.assign(val.style, { color: colors.textPrimary, fontSize: font.sizeXs, fontWeight: "bold", textAlign: "right" });

    row.append(lbl, val);
    return row;
  }
}
