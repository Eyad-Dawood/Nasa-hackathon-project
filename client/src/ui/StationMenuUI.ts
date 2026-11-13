import {
  createElement,
  Box,
  Sun,
  Zap,
  BatteryCharging,
  Sliders,
  Shield,
  Flame,
  Cpu,
  Radio,
  Activity,
  Minimize2,
  Camera,
  Compass,
  FlaskConical,
  Disc,
  Truck,
  Plus,
  Check,
  Info,
  X,
  Sparkles,
  AlertTriangle,
  Layers,
  Fuel,
  Wrench,
  Search,
} from "lucide";
import { Theme, getRoleHex, getRoleLabel } from "../config/theme";
import { StationDefinition } from "../game/data/StationData";
import { GameItem } from "../game/data/ItemData";
import { CarrySystem } from "../game/systems/CarrySystem";
import { ItemDetailUI } from "./ItemDetailUI";
import { SoundFX } from "../audio/SoundEffects";

/**
 * Helper to select a vibrant category icon and color for Minecraft-style item slots.
 */
function getCategoryVisual(category: string): {
  icon: any;
  color: string;
  badgeBg: string;
} {
  switch (category) {
    case "solar":
      return { icon: Sun, color: "#FBBF24", badgeBg: "rgba(251, 191, 36, 0.18)" };
    case "nuclear":
      return { icon: Zap, color: "#34D399", badgeBg: "rgba(52, 211, 153, 0.18)" };
    case "battery":
      return { icon: BatteryCharging, color: "#60A5FA", badgeBg: "rgba(96, 165, 250, 0.18)" };
    case "power_manager":
      return { icon: Sliders, color: "#A78BFA", badgeBg: "rgba(167, 139, 250, 0.18)" };
    case "insulation":
      return { icon: Layers, color: "#F472B6", badgeBg: "rgba(244, 114, 182, 0.18)" };
    case "fuel_tank":
      return { icon: Fuel, color: "#FB923C", badgeBg: "rgba(251, 146, 60, 0.18)" };
    case "engine":
      return { icon: Flame, color: "#F87171", badgeBg: "rgba(248, 113, 113, 0.18)" };
    case "frame":
      return { icon: Box, color: "#38BDF8", badgeBg: "rgba(56, 189, 248, 0.18)" };
    case "shield":
      return { icon: Shield, color: "#818CF8", badgeBg: "rgba(129, 140, 248, 0.18)" };
    case "computer":
      return { icon: Cpu, color: "#34D399", badgeBg: "rgba(52, 211, 153, 0.18)" };
    case "addon":
      return { icon: Wrench, color: "#FCD34D", badgeBg: "rgba(252, 211, 77, 0.18)" };
    case "radio":
      return { icon: Radio, color: "#67E8F9", badgeBg: "rgba(103, 232, 249, 0.18)" };
    case "booster":
      return { icon: Activity, color: "#A78BFA", badgeBg: "rgba(167, 139, 250, 0.18)" };
    case "compressor":
      return { icon: Minimize2, color: "#34D399", badgeBg: "rgba(52, 211, 153, 0.18)" };
    case "camera":
      return { icon: Camera, color: "#38BDF8", badgeBg: "rgba(56, 189, 248, 0.18)" };
    case "sensor":
      return { icon: Compass, color: "#F472B6", badgeBg: "rgba(244, 114, 182, 0.18)" };
    case "analyzer":
      return { icon: FlaskConical, color: "#A78BFA", badgeBg: "rgba(167, 139, 250, 0.18)" };
    case "radar":
      return { icon: Disc, color: "#FBBF24", badgeBg: "rgba(251, 191, 36, 0.18)" };
    case "rover":
      return { icon: Truck, color: "#34D399", badgeBg: "rgba(52, 211, 153, 0.18)" };
    default:
      return { icon: Box, color: "#38BDF8", badgeBg: "rgba(56, 189, 248, 0.18)" };
  }
}

/**
 * StationMenuUI
 * ─────────────
 * Engaging Minecraft-Style Inventory & Item Selection UI for workstation consoles.
 *
 * Key features:
 * - Authentic Minecraft-style beveled GUI window & inset recessed item slots.
 * - Responsive inventory grid accommodating any number of available items.
 * - Each item slot displays a distinct colorful item icon, name, and stack/mass badge.
 * - Creative-mode category tabs for quick and child-friendly navigation.
 * - Hotbar section showing current player carried item status & Return/Put Down actions.
 * - Click interaction provides two intuitive actions:
 *     1. "Carry Item": adds item to player's carried inventory (preserving all game rules).
 *     2. "View Details": inspects technical specifications with the ItemDetailUI panel.
 */
export class StationMenuUI {
  private _container: HTMLDivElement;
  private _def: StationDefinition;
  private _items: GameItem[];
  private _carry: CarrySystem;
  private _onClose: () => void;
  private _openDetail: ItemDetailUI | null = null;

  // Selected item state
  private _selectedItem: GameItem | null = null;
  private _activeCategory: string = "all";
  private _gridContainer!: HTMLDivElement;
  private _actionPanelContainer!: HTMLDivElement;
  private _carriedSlotContainer!: HTMLDivElement;
  private _popupMenuEl: HTMLDivElement | null = null;

  constructor(
    def: StationDefinition,
    items: GameItem[],
    carry: CarrySystem,
    onClose: () => void,
  ) {
    this._def = def;
    this._items = items;
    this._carry = carry;
    this._onClose = onClose;
    // Default selected item to first item if available
    this._selectedItem = items.length > 0 ? items[0] : null;
    this._container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this._container);
  }

  close(): void {
    this._popupMenuEl?.remove();
    this._openDetail?.close();
    this._container.remove();
    this._onClose();
  }

  // ── Private UI Builders ────────────────────────────────────────────────

  private _buildDOM(): HTMLDivElement {
    const { font } = Theme;
    this._injectStyles();

    // Dark backdrop overlay
    const overlay = document.createElement("div");
    overlay.id = "station-inventory-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(4, 7, 13, 0.75)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      zIndex: "1500",
      fontFamily: font.family,
      padding: "16px",
      userSelect: "none",
    });

    // Close on clicking backdrop
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // ── Minecraft-Themed Inventory Chest Window ──
    const windowEl = document.createElement("div");
    windowEl.className = "mc-inventory-window";
    const roleColor = getRoleHex(this._def.roleId);

    Object.assign(windowEl.style, {
      position: "relative",
      width: "560px",
      maxWidth: "96vw",
      maxHeight: "92vh",
      background: "#1E222D",
      borderTop: "3px solid #4B5267",
      borderLeft: "3px solid #4B5267",
      borderRight: "3px solid #0D0F15",
      borderBottom: "3px solid #0D0F15",
      borderRadius: "10px",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), inset 0 2px 0 rgba(255, 255, 255, 0.15)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    });

    // ── 1. Window Header ──
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      background: "linear-gradient(180deg, #2A3040 0%, #202532 100%)",
      borderBottom: "2px solid #141722",
    });

    const headerLeft = document.createElement("div");
    Object.assign(headerLeft.style, { display: "flex", alignItems: "center", gap: "12px" });

    const roleBadge = document.createElement("div");
    Object.assign(roleBadge.style, {
      width: "36px",
      height: "36px",
      borderRadius: "6px",
      background: "#141722",
      borderTop: "2px solid #0E1017",
      borderLeft: "2px solid #0E1017",
      borderBottom: "2px solid #3B4256",
      borderRight: "2px solid #3B4256",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });
    roleBadge.appendChild(createElement(Box, { width: 20, height: 20, color: roleColor }));

    const titleGroup = document.createElement("div");
    titleGroup.innerHTML = `
      <div style="font-size:15px; font-weight:800; color:#FFFFFF; letter-spacing:0.3px; font-family:'JetBrains Mono', monospace;">
        ${getRoleLabel(this._def.roleId).toUpperCase()} INVENTORY
      </div>
      <div style="font-size:11px; color:rgba(255, 255, 255, 0.6); margin-top:2px;">
        Station Catalog • ${this._items.length} Components Available
      </div>
    `;
    headerLeft.append(roleBadge, titleGroup);

    // Minecraft Close Button (3D tactile style)
    const closeBtn = document.createElement("button");
    closeBtn.className = "mc-btn-close";
    closeBtn.innerHTML = "✕";
    Object.assign(closeBtn.style, {
      width: "28px",
      height: "28px",
      background: "#373E52",
      color: "#FFFFFF",
      borderTop: "2px solid #5C6582",
      borderLeft: "2px solid #5C6582",
      borderBottom: "2px solid #1B1E28",
      borderRight: "2px solid #1B1E28",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "800",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "filter 0.1s ease",
    });
    closeBtn.addEventListener("click", () => {
      SoundFX.playClick();
      this.close();
    });

    header.append(headerLeft, closeBtn);

    // ── 2. Carried Item Status (Minecraft Hotbar Section) ──
    this._carriedSlotContainer = document.createElement("div");
    this._refreshCarriedSlot();

    // ── 3. Creative-Mode Category Tabs ──
    const tabsContainer = this._buildCategoryTabs();

    // ── 4. Main Inventory Slots Grid ──
    const gridWrapper = document.createElement("div");
    Object.assign(gridWrapper.style, {
      padding: "12px 18px",
      flex: "1",
      overflowY: "auto",
      maxHeight: "310px",
    });

    this._gridContainer = document.createElement("div");
    this._gridContainer.className = "mc-grid-container";
    Object.assign(this._gridContainer.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))",
      gap: "10px",
      justifyContent: "center",
    });
    this._renderInventoryGrid();
    gridWrapper.appendChild(this._gridContainer);

    // ── 5. Bottom Interactive Item Inspector & Action Bar ──
    this._actionPanelContainer = document.createElement("div");
    this._refreshActionPanel();

    windowEl.append(
      header,
      this._carriedSlotContainer,
      tabsContainer,
      gridWrapper,
      this._actionPanelContainer,
    );

    overlay.appendChild(windowEl);
    return overlay;
  }

  /**
   * Refreshes the top "Currently Carried" slot.
   */
  private _refreshCarriedSlot(): void {
    this._carriedSlotContainer.innerHTML = "";
    Object.assign(this._carriedSlotContainer.style, {
      padding: "10px 18px",
      background: "#181B24",
      borderBottom: "2px solid #12141B",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
    });

    const held = this._carry.heldItem;
    const isSameRole = held !== null && held.roleId === this._def.roleId;
    const isOtherRole = held !== null && held.roleId !== this._def.roleId;

    const leftBox = document.createElement("div");
    Object.assign(leftBox.style, { display: "flex", alignItems: "center", gap: "10px" });

    // Single Hotbar Slot Box
    const hotbarSlot = document.createElement("div");
    hotbarSlot.className = "mc-slot-box mc-slot-carried";
    Object.assign(hotbarSlot.style, {
      width: "44px",
      height: "44px",
      background: "#12151E",
      borderTop: "2px solid #0B0D14",
      borderLeft: "2px solid #0B0D14",
      borderBottom: "2px solid #33394D",
      borderRight: "2px solid #33394D",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    });

    if (held) {
      const vis = getCategoryVisual(held.category);
      hotbarSlot.appendChild(createElement(vis.icon, { width: 22, height: 22, color: vis.color }));
      hotbarSlot.style.borderColor = isSameRole ? "#10B981" : "#F59E0B";

      const infoText = document.createElement("div");
      infoText.innerHTML = `
        <div style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.5); font-family:'JetBrains Mono', monospace; text-transform:uppercase;">
          🎒 Carried in Hands
        </div>
        <div style="font-size:12.5px; font-weight:700; color:${isSameRole ? '#34D399' : '#FBBF24'};">
          ${held.name} (${held.mass} kg)
        </div>
      `;
      leftBox.append(hotbarSlot, infoText);
    } else {
      hotbarSlot.style.border = "2px dashed rgba(255, 255, 255, 0.2)";
      const infoText = document.createElement("div");
      infoText.innerHTML = `
        <div style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.4); font-family:'JetBrains Mono', monospace; text-transform:uppercase;">
          🎒 Hands Empty
        </div>
        <div style="font-size:12px; color:rgba(255,255,255,0.65);">
          Select any component below to carry it to the ship!
        </div>
      `;
      leftBox.append(hotbarSlot, infoText);
    }

    this._carriedSlotContainer.appendChild(leftBox);

    // Right Action: Return / Put Down if carrying same role item
    if (isSameRole && held) {
      const returnBtn = document.createElement("button");
      returnBtn.className = "mc-btn mc-btn-warning";
      Object.assign(returnBtn.style, {
        background: "#D97706",
        borderTop: "2px solid #FBBF24",
        borderLeft: "2px solid #FBBF24",
        borderBottom: "2px solid #78350F",
        borderRight: "2px solid #78350F",
        borderRadius: "6px",
        color: "#FFFFFF",
        fontSize: "11px",
        fontWeight: "800",
        fontFamily: "'JetBrains Mono', monospace",
        padding: "6px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        whiteSpace: "nowrap",
      });
      returnBtn.innerHTML = `<span>↩ Put Down / Return</span>`;
      returnBtn.addEventListener("click", () => {
        SoundFX.playInstallModule();
        this._carry.putDown();
        this._refreshCarriedSlot();
        this._renderInventoryGrid();
        this._refreshActionPanel();
      });
      this._carriedSlotContainer.appendChild(returnBtn);
    } else if (isOtherRole && held) {
      const warnBadge = document.createElement("div");
      Object.assign(warnBadge.style, {
        fontSize: "10.5px",
        color: "#FBBF24",
        background: "rgba(245, 158, 11, 0.15)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        borderRadius: "6px",
        padding: "4px 8px",
        fontFamily: "'JetBrains Mono', monospace",
      });
      warnBadge.textContent = "Deliver other item to ship first";
      this._carriedSlotContainer.appendChild(warnBadge);
    }
  }

  /**
   * Builds Minecraft Creative Tabs across the top of the grid.
   */
  private _buildCategoryTabs(): HTMLDivElement {
    const tabs = document.createElement("div");
    Object.assign(tabs.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 18px",
      background: "#181B24",
      overflowX: "auto",
      borderBottom: "2px solid #141722",
    });

    // Unique categories from items list
    const categories = ["all", ...Array.from(new Set(this._items.map((i) => i.category)))];

    categories.forEach((cat) => {
      const tabBtn = document.createElement("button");
      const isActive = this._activeCategory === cat;
      const label = cat === "all" ? `ALL (${this._items.length})` : cat.replace("_", " ").toUpperCase();

      Object.assign(tabBtn.style, {
        background: isActive ? "#373E52" : "#1A1D27",
        color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
        borderTop: isActive ? "2px solid #5C6582" : "1px solid rgba(255, 255, 255, 0.08)",
        borderLeft: isActive ? "2px solid #5C6582" : "1px solid rgba(255, 255, 255, 0.08)",
        borderBottom: isActive ? "2px solid #1A1D27" : "1px solid #10121A",
        borderRight: isActive ? "2px solid #1A1D27" : "1px solid #10121A",
        borderRadius: "4px",
        padding: "4px 10px",
        fontSize: "10px",
        fontWeight: "800",
        fontFamily: "'JetBrains Mono', monospace",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.1s ease",
      });

      tabBtn.textContent = label;
      tabBtn.addEventListener("click", () => {
        SoundFX.playClick();
        this._activeCategory = cat;
        // Re-render tabs and grid
        const parent = tabs.parentElement;
        if (parent) {
          const newTabs = this._buildCategoryTabs();
          parent.replaceChild(newTabs, tabs);
          this._renderInventoryGrid();
        }
      });

      tabs.appendChild(tabBtn);
    });

    return tabs;
  }

  /**
   * Renders the Minecraft-style inventory grid slots.
   */
  private _renderInventoryGrid(): void {
    this._gridContainer.innerHTML = "";

    const filteredItems = this._activeCategory === "all"
      ? this._items
      : this._items.filter((i) => i.category === this._activeCategory);

    if (filteredItems.length === 0) {
      const emptyNote = document.createElement("div");
      emptyNote.textContent = "No items found in this category.";
      Object.assign(emptyNote.style, {
        gridColumn: "1 / -1",
        color: "rgba(255, 255, 255, 0.4)",
        fontSize: "12px",
        textAlign: "center",
        padding: "24px 0",
      });
      this._gridContainer.appendChild(emptyNote);
      return;
    }

    const held = this._carry.heldItem;
    const isHandsFull = held !== null;

    filteredItems.forEach((item) => {
      const slot = this._buildItemSlot(item, isHandsFull);
      this._gridContainer.appendChild(slot);
    });
  }

  /**
   * Builds an individual Minecraft inventory slot box.
   */
  private _buildItemSlot(item: GameItem, isHandsFull: boolean): HTMLDivElement {
    const isSelected = this._selectedItem?.id === item.id;
    const isCurrentlyCarried = this._carry.heldItem?.id === item.id;
    const vis = getCategoryVisual(item.category);

    const slot = document.createElement("div");
    slot.className = `mc-slot-box ${isSelected ? 'mc-slot-selected' : ''}`;
    slot.setAttribute("data-item-id", item.id);

    Object.assign(slot.style, {
      width: "82px",
      height: "82px",
      background: isSelected ? "#262C3E" : "#131620",
      borderTop: isSelected ? "2px solid #29ADFF" : "2px solid #0B0E16",
      borderLeft: isSelected ? "2px solid #29ADFF" : "2px solid #0B0E16",
      borderBottom: isSelected ? "2px solid #0284C7" : "2px solid #2C3345",
      borderRight: isSelected ? "2px solid #0284C7" : "2px solid #2C3345",
      borderRadius: "6px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px",
      boxSizing: "border-box",
      cursor: "pointer",
      position: "relative",
      boxShadow: isSelected ? "0 0 12px rgba(41, 173, 255, 0.45)" : "none",
      transition: "background 0.12s ease, transform 0.12s ease",
      opacity: isCurrentlyCarried ? "0.6" : "1",
    });

    // Icon Container with subtle radial badge
    const iconWrap = document.createElement("div");
    Object.assign(iconWrap.style, {
      width: "36px",
      height: "36px",
      borderRadius: "6px",
      background: vis.badgeBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      transition: "transform 0.15s ease",
    });
    iconWrap.appendChild(createElement(vis.icon, { width: 22, height: 22, color: vis.color }));

    // Item Label (Compact & Readable)
    const nameLabel = document.createElement("div");
    nameLabel.textContent = item.name;
    Object.assign(nameLabel.style, {
      fontSize: "9px",
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "center",
      lineHeight: "1.1",
      marginTop: "4px",
      maxWidth: "74px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      fontFamily: "'JetBrains Mono', monospace",
    });

    // Minecraft Stack Count Tag (e.g. "4kg" or "1s" in bottom-right corner)
    const massTag = document.createElement("div");
    massTag.textContent = `${item.mass}k`;
    Object.assign(massTag.style, {
      position: "absolute",
      bottom: "2px",
      right: "3px",
      fontSize: "9px",
      fontWeight: "800",
      color: "#FDE047",
      textShadow: "1px 1px 0px #000000, -1px -1px 0px #000000",
      fontFamily: "'JetBrains Mono', monospace",
      pointerEvents: "none",
      lineHeight: "1",
    });

    // If currently carried, show active checkmark
    if (isCurrentlyCarried) {
      const carriedCheck = document.createElement("div");
      Object.assign(carriedCheck.style, {
        position: "absolute",
        top: "2px",
        left: "3px",
        fontSize: "8px",
        color: "#34D399",
        fontWeight: "800",
        fontFamily: "'JetBrains Mono', monospace",
      });
      carriedCheck.textContent = "HELD";
      slot.appendChild(carriedCheck);
    }

    slot.append(iconWrap, nameLabel, massTag);

    // Hover interactions
    slot.addEventListener("mouseenter", () => {
      if (!isSelected) {
        slot.style.background = "#1D2230";
        slot.style.borderTopColor = "#2C3448";
        slot.style.borderLeftColor = "#2C3448";
      }
      iconWrap.style.transform = "scale(1.1)";
    });
    slot.addEventListener("mouseleave", () => {
      if (!isSelected) {
        slot.style.background = "#131620";
        slot.style.borderTopColor = "#0B0E16";
        slot.style.borderLeftColor = "#0B0E16";
      }
      iconWrap.style.transform = "scale(1)";
    });

    // Click: Select item & show interaction options
    slot.addEventListener("click", (e) => {
      SoundFX.playClick();
      this._selectedItem = item;
      this._renderInventoryGrid();
      this._refreshActionPanel();
      this._showContextualPopup(item, slot);
    });

    return slot;
  }

  /**
   * Small contextual popup near the clicked slot offering the two required actions:
   * 1. Carry Item
   * 2. View Details
   */
  private _showContextualPopup(item: GameItem, slotEl: HTMLElement): void {
    this._popupMenuEl?.remove();

    const popup = document.createElement("div");
    this._popupMenuEl = popup;
    popup.className = "mc-context-popup";

    const slotRect = slotEl.getBoundingClientRect();
    const overlayRect = this._container.getBoundingClientRect();

    Object.assign(popup.style, {
      position: "fixed",
      left: `${Math.min(window.innerWidth - 180, Math.max(10, slotRect.left - 40))}px`,
      top: `${Math.min(window.innerHeight - 120, slotRect.bottom + 8)}px`,
      background: "#1E222D",
      borderTop: "2px solid #555E78",
      borderLeft: "2px solid #555E78",
      borderBottom: "2px solid #0E1017",
      borderRight: "2px solid #0E1017",
      borderRadius: "6px",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.75)",
      padding: "8px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      zIndex: "2000",
      width: "160px",
    });

    const isHolding = this._carry.isHolding;
    const isCurrentlyCarried = this._carry.heldItem?.id === item.id;

    // Action 1: Carry Item Button
    const carryBtn = document.createElement("button");
    carryBtn.className = "mc-btn mc-btn-primary";
    const canCarry = !isHolding;

    Object.assign(carryBtn.style, {
      background: canCarry ? "#10B981" : "#374151",
      borderTop: canCarry ? "2px solid #34D399" : "1px solid #4B5563",
      borderLeft: canCarry ? "2px solid #34D399" : "1px solid #4B5563",
      borderBottom: canCarry ? "2px solid #065F46" : "1px solid #1F2937",
      borderRight: canCarry ? "2px solid #065F46" : "1px solid #1F2937",
      borderRadius: "4px",
      color: canCarry ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
      fontSize: "11px",
      fontWeight: "800",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "6px 8px",
      cursor: canCarry ? "pointer" : "not-allowed",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      justifyContent: "center",
    });

    carryBtn.innerHTML = `<span>📦 Carry Item</span>`;
    if (!canCarry) {
      carryBtn.disabled = true;
      if (isCurrentlyCarried) {
        carryBtn.innerHTML = `<span>✓ In Hands</span>`;
      } else {
        carryBtn.innerHTML = `<span>🚫 Hands Full</span>`;
      }
    } else {
      carryBtn.addEventListener("click", () => {
        popup.remove();
        if (this._carry.pickUp(item)) {
          this.close();
        }
      });
    }

    // Action 2: View Details Button
    const detailBtn = document.createElement("button");
    detailBtn.className = "mc-btn mc-btn-secondary";
    Object.assign(detailBtn.style, {
      background: "#2563EB",
      borderTop: "2px solid #60A5FA",
      borderLeft: "2px solid #60A5FA",
      borderBottom: "2px solid #1E40AF",
      borderRight: "2px solid #1E40AF",
      borderRadius: "4px",
      color: "#FFFFFF",
      fontSize: "11px",
      fontWeight: "800",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "6px 8px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      justifyContent: "center",
    });
    detailBtn.innerHTML = `<span>🔍 View Details</span>`;
    detailBtn.addEventListener("click", () => {
      popup.remove();
      this._openDetail?.close();
      this._openDetail = new ItemDetailUI(item);
      this._openDetail.mount();
    });

    popup.append(carryBtn, detailBtn);
    document.body.appendChild(popup);

    // Auto dismiss popup when clicking elsewhere
    const dismissHandler = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && e.target !== slotEl && !slotEl.contains(e.target as Node)) {
        popup.remove();
        document.removeEventListener("mousedown", dismissHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", dismissHandler);
    }, 10);
  }

  /**
   * Refreshes the bottom action panel showing the currently selected item details
   * and the two primary actions: Carry Item and View Details.
   */
  private _refreshActionPanel(): void {
    this._actionPanelContainer.innerHTML = "";
    Object.assign(this._actionPanelContainer.style, {
      padding: "12px 18px",
      background: "linear-gradient(180deg, #181B24 0%, #13161F 100%)",
      borderTop: "2px solid #141722",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "14px",
    });

    const item = this._selectedItem;
    if (!item) {
      const placeholder = document.createElement("div");
      placeholder.textContent = "Click an item in the inventory to view actions.";
      placeholder.style.color = "rgba(255, 255, 255, 0.4)";
      placeholder.style.fontSize = "12px";
      this._actionPanelContainer.appendChild(placeholder);
      return;
    }

    const vis = getCategoryVisual(item.category);
    const isHolding = this._carry.isHolding;
    const isCurrentlyCarried = this._carry.heldItem?.id === item.id;
    const canCarry = !isHolding;

    // Left info block
    const leftBlock = document.createElement("div");
    Object.assign(leftBlock.style, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flex: "1",
      minWidth: "0",
    });

    const previewSlot = document.createElement("div");
    Object.assign(previewSlot.style, {
      width: "48px",
      height: "48px",
      background: "#131620",
      borderTop: "2px solid #0B0E16",
      borderLeft: "2px solid #0B0E16",
      borderBottom: "2px solid #2C3345",
      borderRight: "2px solid #2C3345",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
    });
    previewSlot.appendChild(createElement(vis.icon, { width: 26, height: 26, color: vis.color }));

    const textWrap = document.createElement("div");
    Object.assign(textWrap.style, { minWidth: "0" });
    textWrap.innerHTML = `
      <div style="font-size:13.5px; font-weight:800; color:#FFFFFF; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:0.2px;">
        ${item.name}
      </div>
      <div style="font-size:10.5px; color:rgba(255, 255, 255, 0.6); font-family:'JetBrains Mono', monospace; margin-top:2px;">
        ${item.category.toUpperCase()} • Mass: <strong style="color:#FDE047">${item.mass} kg</strong> • Size: <strong style="color:#38BDF8">${item.size} space</strong> • Cost: <strong style="color:#34D399">$${item.cost}M</strong>
      </div>
    `;
    leftBlock.append(previewSlot, textWrap);

    // Right Action Buttons Block
    const actionBtns = document.createElement("div");
    Object.assign(actionBtns.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexShrink: "0",
    });

    // 1. View Details Button
    const detailBtn = document.createElement("button");
    detailBtn.className = "mc-btn mc-btn-secondary";
    Object.assign(detailBtn.style, {
      background: "#2563EB",
      borderTop: "2px solid #60A5FA",
      borderLeft: "2px solid #60A5FA",
      borderBottom: "2px solid #1E40AF",
      borderRight: "2px solid #1E40AF",
      borderRadius: "6px",
      color: "#FFFFFF",
      fontSize: "11.5px",
      fontWeight: "800",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "8px 14px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "filter 0.1s ease",
    });
    detailBtn.innerHTML = `<span>🔍 View Details</span>`;
    detailBtn.addEventListener("click", () => {
      SoundFX.playClick();
      this._openDetail?.close();
      this._openDetail = new ItemDetailUI(item);
      this._openDetail.mount();
    });

    // 2. Carry Item Button
    const carryBtn = document.createElement("button");
    carryBtn.className = "mc-btn mc-btn-primary";
    Object.assign(carryBtn.style, {
      background: canCarry ? "#10B981" : "#374151",
      borderTop: canCarry ? "2px solid #34D399" : "1px solid #4B5563",
      borderLeft: canCarry ? "2px solid #34D399" : "1px solid #4B5563",
      borderBottom: canCarry ? "2px solid #065F46" : "1px solid #1F2937",
      borderRight: canCarry ? "2px solid #065F46" : "1px solid #1F2937",
      borderRadius: "6px",
      color: canCarry ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
      fontSize: "11.5px",
      fontWeight: "800",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "8px 16px",
      cursor: canCarry ? "pointer" : "not-allowed",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "filter 0.1s ease",
    });

    if (canCarry) {
      carryBtn.innerHTML = `<span>📦 Carry Item</span>`;
      carryBtn.addEventListener("click", () => {
        if (this._carry.pickUp(item)) {
          this.close();
        }
      });
    } else {
      carryBtn.disabled = true;
      if (isCurrentlyCarried) {
        carryBtn.innerHTML = `<span>✓ In Hands</span>`;
      } else {
        carryBtn.innerHTML = `<span>🚫 Hands Full</span>`;
      }
    }

    actionBtns.append(detailBtn, carryBtn);
    this._actionPanelContainer.append(leftBlock, actionBtns);
  }

  private _injectStyles(): void {
    if (document.getElementById("station-minecraft-styles")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "station-minecraft-styles";
    styleEl.textContent = `
      .mc-inventory-window ::-webkit-scrollbar {
        width: 8px;
        height: 6px;
      }
      .mc-inventory-window ::-webkit-scrollbar-track {
        background: #111319;
      }
      .mc-inventory-window ::-webkit-scrollbar-thumb {
        background: #373E52;
        border-radius: 4px;
        border: 1px solid #181B24;
      }
      .mc-inventory-window ::-webkit-scrollbar-thumb:hover {
        background: #29ADFF;
      }

      .mc-slot-box:hover {
        transform: translateY(-2px);
      }
      .mc-slot-box:active {
        transform: translateY(0px);
      }

      .mc-btn:hover {
        filter: brightness(1.12);
      }
      .mc-btn:active {
        filter: brightness(0.9);
        transform: translateY(1px);
      }

      @media (max-width: 600px) {
        .mc-inventory-window {
          width: 95vw !important;
        }
        .mc-grid-container {
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)) !important;
          gap: 6px !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }
}
