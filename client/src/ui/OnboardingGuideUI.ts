import {
  createElement,
  X,
  Play,
  Volume2,
  VolumeX,
} from "lucide";
import { Theme } from "../config/theme";
import { SoundFX } from "../audio/SoundEffects";
import { assetUrl } from "../config/basePath";

export type GuideLanguage = "ar" | "en";

export interface VideoTopicData {
  id: string;
  driveId: string;
  category: "power" | "propulsion" | "telecom" | "computing" | "physics" | "shielding";
  categoryLabel: { en: string; ar: string };
  ruleTag: { en: string; ar: string };
  title: { en: string; ar: string };
  brief: { en: string; ar: string };
  ruleHint: { en: string; ar: string };
}

export const VIDEO_TOPICS: VideoTopicData[] = [
  {
    id: "autonomy",
    driveId: "1-ZA7P_tMX56Jbge7m9A7mBwP1-3cA_37",
    category: "computing",
    categoryLabel: { en: "Flight Systems", ar: "أنظمة الطيران والتحكم" },
    ruleTag: { en: "RULE 8: BRAIN", ar: "القاعدة 8: الحاسوب" },
    title: { en: "Spacecraft Autonomy", ar: "الاستقلالية والتحكم الذاتي" },
    brief: {
      en: "Onboard computers manage critical maneuvers when light-speed latency isolates the crew from Earth.",
      ar: "كيف تدير حواسيب الطيران الذاتية مناورات المسار الحرجة عندما يمنع تأخر الإشارة تحكم هيوستن المباشر.",
    },
    ruleHint: {
      en: "Exactly 1 Flight Computer + Co-processors required for navigation & science demand.",
      ar: "يلزم حاسوب طيران رئيسي واحد بدقة مع رقائق مساعدة لتغطية ملاحة المهمة وأجهزة العلوم.",
    },
  },
  {
    id: "data_rate",
    driveId: "1X7ZV3wiVIQ7Wv23BdknF7julHyKnO4Dv",
    category: "telecom",
    categoryLabel: { en: "Communications", ar: "الاتصالات الفضائية" },
    ruleTag: { en: "RULE 9 & 10: COMMS", ar: "القاعدتان 9 و10: البث" },
    title: { en: "Data Rate & Telemetry", ar: "معدل نقل البيانات والبث العلمي" },
    brief: {
      en: "Transmitting massive spectrometer telemetry back to Earth using high-gain dishes and data compression.",
      ar: "بث البيانات العلمية الضخمة من أجهزة الاستشعار عبر الفضاء السحيق بالهوائيات ووحدات الضغط.",
    },
    ruleHint: {
      en: "Antenna throughput and signal range must exceed instrument telemetry generation.",
      ar: "يجب أن يعادل معدل نقل البيانات ونطاق الهوائي متطلبات المهمة لضمان وصول القياسات للأرض.",
    },
  },
  {
    id: "deep_space_solar",
    driveId: "10bZYQlpiYCYVbL7WLUhCk01UVa6rSWGs",
    category: "power",
    categoryLabel: { en: "Power & Energy", ar: "الطاقة الشمسية" },
    ruleTag: { en: "RULE 4: POWER", ar: "القاعدة 4: توليد الطاقة" },
    title: { en: "Deep Space Solar Power", ar: "الطاقة الشمسية في الفضاء السحيق" },
    brief: {
      en: "The inverse-square law: why solar wattage drops to ~3.7% at Europa and ~1% at Titan.",
      ar: "قانون التربيع العكسي: لماذا تنهار كفاءة الألواح الشمسية إلى 3.7% في أوروبا و1% في تيتان.",
    },
    ruleHint: {
      en: "Inner planets thrive on solar; outer moon targets demand nuclear RTGs or space reactors.",
      ar: "الألواح الشمسية تكفي قرب الأرض، بينما أهداف الفضاء السحيق كأوروبا وتيتان تتطلب مفاعلات نووية.",
    },
  },
  {
    id: "fuel_burn",
    driveId: "144ThGlyqKIa9ZkfJYeuvYunuGtbU-4MW",
    category: "propulsion",
    categoryLabel: { en: "Propulsion", ar: "الدفع والوقود" },
    ruleTag: { en: "RULE 3: FUEL", ar: "القاعدة 3: سعة الوقود" },
    title: { en: "Fuel Burn & Delta-V", ar: "استهلاك الوقود والدفع النوعي" },
    brief: {
      en: "Calculating fuel capacity and staging to prevent running dry during interplanetary transit.",
      ar: "حساب سعة الوقود المطلوبة ومعدل الحرق لضمان قطع المسافات بين الكواكب دون نفاد الخزانات.",
    },
    ruleHint: {
      en: "Fuel stored must be ≥ Mission Distance × Highest Engine Burn Rate installed.",
      ar: "سعة الوقود المخزنة يجب أن تعادل حاصل ضرب مسافة المهمة في أعلى معدل حرق لأي محرك مركب.",
    },
  },
  {
    id: "gravity",
    driveId: "1LODiWPGeQuQfxRukeSQDKs4MV_87KaNj",
    category: "physics",
    categoryLabel: { en: "Astrodynamics", ar: "الميكانيكا المدارية" },
    ruleTag: { en: "RULE 2: THRUST", ar: "القاعدة 2: قوة الدفع" },
    title: { en: "Gravity & Orbital Mechanics", ar: "الجاذبية والميكانيكا المدارية" },
    brief: {
      en: "Escaping planetary gravity wells and establishing stable orbit trajectories around alien worlds.",
      ar: "التغلب على جاذبية الكواكب وتحقيق الهروب المداري للوصول إلى المدارات المستقرة.",
    },
    ruleHint: {
      en: "Total thrust must overcome gross spacecraft mass multiplied by planetary launch pull.",
      ar: "قوة الدفع الصاروخي يجب أن تفوق حاصل ضرب وزن الصاروخ بالكامل في معامل جاذبية الكوكب.",
    },
  },
  {
    id: "ion_engine",
    driveId: "1AJhPZDV3x6VXdN8TDICMsubESZHITAbq",
    category: "propulsion",
    categoryLabel: { en: "Advanced Propulsion", ar: "المحركات الأيونية" },
    ruleTag: { en: "PROPULSION", ar: "أنظمة الدفع الكهربائي" },
    title: { en: "Ion Engines & Xenon Plasma", ar: "محركات الأيونات وبلازما الزينون" },
    brief: {
      en: "Electrostatic acceleration of xenon delivers unmatched fuel efficiency at high electrical demand.",
      ar: "تسريع غاز الزينون كهربائياً يوفر كفاءة وقود خرافية مقابل استهلاك تيار كهربائي كبير.",
    },
    ruleHint: {
      en: "Provides ultra-low fuel burn for distant missions, provided your power grid can feed it.",
      ar: "خيار مثالي للمسافات البعيدة لاستهلاكه وقوداً ضئيلاً، بشرط توفير طاقة كافية لتشغيله.",
    },
  },
  {
    id: "orbital_night",
    driveId: "1FGy8Rcc1bMI9ykJ0F6FiJJmZA8-RniGJ",
    category: "power",
    categoryLabel: { en: "Power Storage", ar: "تخزين الطاقة والبطاريات" },
    ruleTag: { en: "RULE 5: BATTERIES", ar: "القاعدة 5: بطاريات الليل" },
    title: { en: "Orbital Night & Storage", ar: "الليل المداري وبطاريات الطوارئ" },
    brief: {
      en: "Surviving planetary eclipse shadows when solar generation drops to absolute zero.",
      ar: "كيفية النجاة أثناء عبور الجانب المظلم من الكواكب حين ينقطع ضوء الشمس تماماً.",
    },
    ruleHint: {
      en: "If using solar on missions with nightNeed, battery capacity must bridge the eclipse duration.",
      ar: "إذا اعتمدت على الألواح الشمسية والمهمة تتضمن ليلاً مدارياً، يلزم توفير بنك بطاريات كافٍ.",
    },
  },
  {
    id: "radiation_shielding",
    driveId: "1Nu6eSGDqMDuuSSqLJyc4aWvvcJ5xXhzp",
    category: "shielding",
    categoryLabel: { en: "Thermal & Radiation", ar: "الدروع والإشعاع" },
    ruleTag: { en: "RULE 7: SHIELDING", ar: "القاعدة 7: مقاومة الإشعاع" },
    title: { en: "Radiation Shielding", ar: "الحماية والدروع الإشعاعية" },
    brief: {
      en: "Shielding avionics and astronauts from intense Jupiter radiation belts and cosmic particle rays.",
      ar: "حماية الإلكترونيات ورواد الفضاء من أحزمة إشعاع المشتري العنيفة والجسيمات الكونية المشحونة.",
    },
    ruleHint: {
      en: "Craft radiation rating must meet or exceed target mission radiation danger.",
      ar: "يجب أن تعادل دروع الحماية أو تفوق الدرجة الإشعاعية المسجلة لبيئة الكوكب المستهدف.",
    },
  },
  {
    id: "rocket_thrust",
    driveId: "1nD9SXMz0TASFukTg4qwf_TvuRMr9hybQ",
    category: "propulsion",
    categoryLabel: { en: "Propulsion", ar: "الدفع الصاروخي" },
    ruleTag: { en: "RULE 2: THRUST", ar: "القاعدة 2: قوة الدفع" },
    title: { en: "Rocket Thrust Dynamics", ar: "قوة الدفع الصاروخي TWR" },
    brief: {
      en: "Generating sufficient rocket momentum to lift multi-ton spacecraft hulls off the launch pad.",
      ar: "توليد قوة دفع كافية لرفع هياكل الصواريخ الثقيلة المحملة بالمعدات خارج منصة الإطلاق.",
    },
    ruleHint: {
      en: "Check that Total Thrust ≥ Gross Spacecraft Mass × Launch Pull factor.",
      ar: "تأكد من أن إجمالي قوة المحركات تفوق حاصل ضرب وزن الصاروخ في معامل سحب الجاذبية.",
    },
  },
  {
    id: "space_reactor",
    driveId: "1YSOImnAntmZOgitXRnjdV3zFSjF02LeK",
    category: "power",
    categoryLabel: { en: "Nuclear Power", ar: "المفاعلات النووية" },
    ruleTag: { en: "RULE 4 & 5: BASE POWER", ar: "القواعد 4 و5: الطاقة الأساسية" },
    title: { en: "Space Reactors & RTGs", ar: "المفاعلات والبطاريات النووية" },
    brief: {
      en: "Nuclear isotope generators deliver steady, shadow-immune power across decades in deep space.",
      ar: "المولدات والمفاعلات النووية توفر كهرباء مستمرة لعقود لا تتأثر بالظلال أو البعد الشمسي.",
    },
    ruleHint: {
      en: "Essential base power for Europa and Titan missions where solar output is near zero.",
      ar: "مصدر طاقة أساسي لا غنى عنه لمهام أوروبا وتيتان للتغلب على انعدام الإشعاع الشمسي.",
    },
  },
];

/**
 * OnboardingGuideUI
 * ─────────────────
 * High-craft Retro Game Landing Page directly matching the Jamboree visual reference:
 *  - Background: #191c2b (exact color match to the floating pixel rocket art).
 *  - Retro Game typography: Pixelify Sans / Press Start 2P.
 *  - Left: "Build the rocket to deep space" + Stats (4 ROLES | 6 PLANETS | 12 RULES).
 *  - Right: Floating pixel-art space island with astronaut waving at the ascending rocket.
 *  - Section 2: 10 Video Topics with direct Google Drive first-frame thumbnails & cinema popup.
 *  - Procedural deep space hum audio via Web Audio API.
 */
export class OnboardingGuideUI {
  private static instance: OnboardingGuideUI | null = null;

  private pageEl: HTMLDivElement | null = null;
  private videoModal: HTMLDivElement | null = null;
  private currentLanguage: GuideLanguage = "ar";
  private selectedCategory: string = "all";
  private activeVideoIndex: number = 0;
  private isAmbiencePlaying: boolean = false;
  private isInGameContext: boolean = false;
  private onCloseCallback?: () => void;

  private constructor() {
    const savedLang = localStorage.getItem("nasa_guide_lang") as GuideLanguage | null;
    if (savedLang === "en" || savedLang === "ar") {
      this.currentLanguage = savedLang;
    }
  }

  public static get(): OnboardingGuideUI {
    if (!OnboardingGuideUI.instance) {
      OnboardingGuideUI.instance = new OnboardingGuideUI();
    }
    return OnboardingGuideUI.instance;
  }

  /**
   * Opens the landing page / video briefings.
   */
  public open(targetSection: "hero" | "videos" | "briefing" = "hero", onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.isInGameContext = targetSection === "videos" || targetSection === "briefing" || !!localStorage.getItem("space_benders_onboarding_seen");

    if (this.pageEl) {
      this.pageEl.remove();
    }

    this._ensureGlobalStyles();
    this.pageEl = this._buildLandingPageDOM();
    document.body.appendChild(this.pageEl);

    // Fade-in animation
    requestAnimationFrame(() => {
      if (this.pageEl) {
        this.pageEl.style.opacity = "1";
      }
    });

    // Start gentle space ambience hum softly
    if (!this.isAmbiencePlaying) {
      SoundFX.startSpaceAmbience(0.04);
      this.isAmbiencePlaying = true;
    }

    if (targetSection === "videos" || targetSection === "briefing") {
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.getElementById("landing-videos-section")?.scrollIntoView({ behavior: "smooth" });
        }, 60);
      });
    }
  }

  /**
   * Closes the landing page and transitions into the game.
   */
  public close(): void {
    if (this.videoModal) {
      this.closeVideo();
    }

    if (this.isAmbiencePlaying) {
      SoundFX.stopSpaceAmbience();
      this.isAmbiencePlaying = false;
    }

    if (this.pageEl) {
      this.pageEl.style.opacity = "0";
      setTimeout(() => {
        this.pageEl?.remove();
        this.pageEl = null;
        this.onCloseCallback?.();
      }, 250);
    }
  }

  /**
   * Opens a specific video in the cinema popup modal.
   */
  public openVideo(topicIdOrIndex: string | number): void {
    if (typeof topicIdOrIndex === "number") {
      this.activeVideoIndex = Math.max(0, Math.min(VIDEO_TOPICS.length - 1, topicIdOrIndex));
    } else {
      const idx = VIDEO_TOPICS.findIndex((v) => v.id === topicIdOrIndex);
      this.activeVideoIndex = idx >= 0 ? idx : 0;
    }

    if (this.videoModal) {
      this.videoModal.remove();
    }

    this.videoModal = this._buildVideoModalDOM();
    document.body.appendChild(this.videoModal);

    requestAnimationFrame(() => {
      if (this.videoModal) {
        this.videoModal.style.opacity = "1";
      }
    });

    SoundFX.playRoleSelect();
  }

  public closeVideo(): void {
    if (this.videoModal) {
      this.videoModal.style.opacity = "0";
      setTimeout(() => {
        this.videoModal?.remove();
        this.videoModal = null;
      }, 180);
    }
  }

  private _toggleAmbience(): void {
    if (this.isAmbiencePlaying) {
      SoundFX.stopSpaceAmbience();
      this.isAmbiencePlaying = false;
    } else {
      SoundFX.startSpaceAmbience(0.04);
      this.isAmbiencePlaying = true;
    }
    SoundFX.playClick();
    this._updateAmbienceButton();
  }

  private _setLanguage(lang: GuideLanguage): void {
    this.currentLanguage = lang;
    localStorage.setItem("nasa_guide_lang", lang);
    SoundFX.playClick();

    if (this.pageEl) {
      const scrollPos = this.pageEl.scrollTop;
      this.pageEl.remove();
      this.pageEl = this._buildLandingPageDOM();
      document.body.appendChild(this.pageEl);
      this.pageEl.style.opacity = "1";
      this.pageEl.scrollTop = scrollPos;
    }

    if (this.videoModal) {
      this.openVideo(this.activeVideoIndex);
    }
  }

  private _ensureGlobalStyles(): void {
    if (document.getElementById("landing-game-styles")) return;
    const style = document.createElement("style");
    style.id = "landing-game-styles";
    style.textContent = `
      @keyframes floatIsland {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-12px); }
      }
      .pixel-game-title {
        font-family: 'Pixelify Sans', 'Press Start 2P', monospace;
      }
      .pixel-stats-num {
        font-family: 'Pixelify Sans', 'Press Start 2P', monospace;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Landing Page Construction ──────────────────────────────────────────

  private _buildLandingPageDOM(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";
    const dir = isAr ? "rtl" : "ltr";

    const page = document.createElement("div");
    page.id = "nasa-onboarding-landing-page";
    page.dir = dir;
    Object.assign(page.style, {
      position: "fixed",
      inset: "0",
      zIndex: "3000",
      overflowY: "auto",
      overflowX: "hidden",
      // 100% OPAQUE static Earth Blaze space wallpaper (zero WebGL/animation overhead, maximum performance)
      backgroundColor: "#020308",
      backgroundImage: `url('${assetUrl("/assets/landing_space_earth_bg.jpg")}?v=2')`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
      color: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      opacity: "0",
      transition: "opacity 0.25s ease",
      scrollBehavior: "smooth",
    });

    // 1. Fixed Top Navigation
    const nav = this._buildNavBar();
    page.appendChild(nav);

    // Main Container
    const mainWrap = document.createElement("div");
    Object.assign(mainWrap.style, {
      maxWidth: "1140px",
      margin: "0 auto",
      padding: "100px 32px 80px 32px",
      display: "flex",
      flexDirection: "column",
      gap: "70px",
    });

    // 2. Hero Section (Jamboree-style 2 Columns)
    const heroSection = this._buildHeroSectionDOM();
    mainWrap.appendChild(heroSection);

    // 3. Section 2: Video Academy Grid (Embedded Thumbnails)
    const videosSection = this._buildVideosSectionDOM();
    mainWrap.appendChild(videosSection);

    // 4. Clean Footer
    const footer = document.createElement("div");
    Object.assign(footer.style, {
      paddingTop: "32px",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "14px",
      fontSize: "12px",
      color: "rgba(255, 255, 255, 0.4)",
      fontFamily: "'JetBrains Mono', monospace",
    });
    footer.innerHTML = `
      <div>SPACE BENDERS · NASA DEEP SPACE CO-OP OPERATIONS</div>
      <div>100% GROUNDED IN REAL AEROSPACE PHYSICS</div>
    `;
    mainWrap.appendChild(footer);

    page.appendChild(mainWrap);
    return page;
  }

  // ── Navigation Bar (Jamboree Style) ────────────────────────────────────

  private _buildNavBar(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";

    const nav = document.createElement("nav");
    Object.assign(nav.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "3200",
      padding: "18px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "rgba(5, 8, 18, 0.75)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      gap: "16px",
    });

    // Left: Brand Logo in Game Pixel Font
    const brand = document.createElement("div");
    brand.className = "pixel-game-title";
    brand.textContent = "Space Benders";
    Object.assign(brand.style, {
      fontSize: "22px",
      fontWeight: "700",
      letterSpacing: "0.5px",
      color: "#ffffff",
      cursor: "pointer",
    });
    brand.addEventListener("click", () => {
      this.pageEl?.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Center Links (Mission Briefing & 10 Videos)
    const centerLinks = document.createElement("div");
    Object.assign(centerLinks.style, {
      display: "flex",
      alignItems: "center",
      gap: "28px",
      fontSize: "13px",
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.7)",
    });

    const createLink = (label: string, onClick: () => void) => {
      const a = document.createElement("span");
      a.textContent = label;
      a.style.cursor = "pointer";
      a.style.transition = "color 0.15s ease";
      a.addEventListener("mouseenter", () => (a.style.color = "#ffffff"));
      a.addEventListener("mouseleave", () => (a.style.color = "rgba(255, 255, 255, 0.7)"));
      a.addEventListener("click", onClick);
      return a;
    };

    centerLinks.append(
      createLink(isAr ? "دليل المهمة" : "Mission Briefing", () => {
        this.pageEl?.scrollTo({ top: 0, behavior: "smooth" });
      }),
      createLink(isAr ? "أكاديمية الفيديو (10)" : "10 Video Briefings", () => {
        document.getElementById("landing-videos-section")?.scrollIntoView({ behavior: "smooth" });
      }),
    );

    // Right Controls
    const right = document.createElement("div");
    Object.assign(right.style, { display: "flex", alignItems: "center", gap: "14px" });

    // Ambience Audio Button
    const audioBtn = document.createElement("button");
    audioBtn.id = "landing-ambience-btn";
    this._styleAmbienceBtn(audioBtn);
    audioBtn.addEventListener("click", () => this._toggleAmbience());

    // Language Toggle (Displays 'AR' in English mode, 'EN' in Arabic mode)
    const langBtn = document.createElement("button");
    langBtn.innerHTML = `<span>${isAr ? "EN" : "AR"}</span>`;
    Object.assign(langBtn.style, {
      background: "rgba(255, 255, 255, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.16)",
      borderRadius: "6px",
      color: "#ffffff",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "12px",
      fontWeight: "700",
      cursor: "pointer",
      padding: "6px 12px",
      transition: "all 0.15s ease",
    });
    langBtn.addEventListener("mouseenter", () => {
      langBtn.style.background = "rgba(255, 255, 255, 0.16)";
      langBtn.style.borderColor = "rgba(255, 255, 255, 0.3)";
    });
    langBtn.addEventListener("mouseleave", () => {
      langBtn.style.background = "rgba(255, 255, 255, 0.08)";
      langBtn.style.borderColor = "rgba(255, 255, 255, 0.16)";
    });
    langBtn.addEventListener("click", () => {
      this._setLanguage(isAr ? "en" : "ar");
    });

    // Enter / Close Button (Context-aware: in game vs initial onboarding)
    const enterBtn = document.createElement("button");
    enterBtn.textContent = this.isInGameContext
      ? (isAr ? "✕ إغلاق والعودة" : "✕ Close & Return")
      : (isAr ? "دخول اللعبة ←" : "Enter Mission Bay");
    Object.assign(enterBtn.style, {
      background: "transparent",
      border: "none",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      padding: "6px 12px",
      transition: "opacity 0.15s ease",
    });
    enterBtn.addEventListener("mouseenter", () => (enterBtn.style.opacity = "0.75"));
    enterBtn.addEventListener("mouseleave", () => (enterBtn.style.opacity = "1"));
    enterBtn.addEventListener("click", () => {
      localStorage.setItem("space_benders_onboarding_seen", "true");
      this.close();
    });

    right.append(audioBtn, langBtn, enterBtn);
    nav.append(brand, centerLinks, right);
    return nav;
  }

  private _styleAmbienceBtn(btn: HTMLButtonElement): void {
    btn.innerHTML = `
      <span style="font-size:11px; font-family:'JetBrains Mono', monospace;">
        ${this.isAmbiencePlaying ? "● AUDIO ON" : "○ AUDIO OFF"}
      </span>
    `;
    Object.assign(btn.style, {
      background: this.isAmbiencePlaying ? "rgba(52, 211, 153, 0.12)" : "rgba(255, 255, 255, 0.05)",
      border: `1px solid ${this.isAmbiencePlaying ? "rgba(52, 211, 153, 0.35)" : "rgba(255, 255, 255, 0.1)"}`,
      borderRadius: "6px",
      color: this.isAmbiencePlaying ? "#34D399" : "rgba(255, 255, 255, 0.5)",
      padding: "5px 10px",
      cursor: "pointer",
      transition: "all 0.15s ease",
    });
  }

  private _updateAmbienceButton(): void {
    const btn = document.getElementById("landing-ambience-btn") as HTMLButtonElement | null;
    if (btn) this._styleAmbienceBtn(btn);
  }

  // ── Section 1: Hero Section (2-Column Jamboree Style) ──────────────────

  private _buildHeroSectionDOM(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";

    const section = document.createElement("section");
    Object.assign(section.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      alignItems: "center",
      gap: "48px",
      padding: "20px 0 10px 0",
    });

    // ── Left Column: Content ──
    const leftCol = document.createElement("div");
    Object.assign(leftCol.style, {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    });

    // Eyebrow tag: "A WEEKEND GAME JAM" style
    const eyebrow = document.createElement("div");
    eyebrow.textContent = isAr ? "مهمة فضائية جماعية · وكالة ناسا" : "A NASA SPACE HACKATHON CO-OP";
    Object.assign(eyebrow.style, {
      fontSize: "12px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "rgba(255, 255, 255, 0.5)",
      letterSpacing: "2px",
      textTransform: "uppercase",
    });

    // Giant Pixel Headline (Matching "Make a small game by Sunday.")
    const headline = document.createElement("div");
    headline.innerHTML = isAr
      ? `
        <div class="pixel-game-title" style="font-size:clamp(46px, 6vw, 76px); font-weight:700; color:#ffffff; line-height:1.05; letter-spacing:-1px;">ابنِ</div>
        <div style="font-size:clamp(22px, 3.2vw, 38px); font-weight:700; color:#ffffff; line-height:1.2; margin-top:6px;">صاروخ أعماق الفضاء.</div>
      `
      : `
        <div class="pixel-game-title" style="font-size:clamp(46px, 6vw, 76px); font-weight:700; color:#ffffff; line-height:1.05; letter-spacing:-1px;">Build</div>
        <div style="font-size:clamp(22px, 3.2vw, 38px); font-weight:700; color:#ffffff; line-height:1.2; margin-top:6px;">the rocket to deep space.</div>
      `;

    // Subtitle paragraph
    const sub = document.createElement("p");
    sub.textContent = isAr
      ? "اختر دورك الهندسي، كوّن فريقاً من 4 رواد فضاء، وصمّموا مركبة تجتاز 12 قاعدة فيزيائية وملاحية قبل الإطلاق."
      : "Pick an engineering role, assemble a team of 4 astronauts and build a launch-ready spacecraft meeting all 12 physics constraints.";
    Object.assign(sub.style, {
      fontSize: "15px",
      color: "rgba(255, 255, 255, 0.7)",
      lineHeight: "1.6",
      margin: "0",
      maxWidth: "460px",
    });

    // Action Buttons Row (Matching "Join the next jam" & "Browse the games")
    const actionRow = document.createElement("div");
    Object.assign(actionRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "20px",
      marginTop: "8px",
      flexWrap: "wrap",
    });

    // Vibrant Pink/Crimson Button (Jamboree primary button style)
    const primaryBtn = document.createElement("button");
    primaryBtn.textContent = this.isInGameContext
      ? (isAr ? "العودة إلى المهمة ↵" : "Back to Mission ↵")
      : (isAr ? "ابدأ المهمة الآن" : "Launch Mission Now");
    Object.assign(primaryBtn.style, {
      background: "#ff1a60", // Vibrant Jamboree pink/crimson
      border: "none",
      borderRadius: "6px",
      color: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      fontSize: "14px",
      fontWeight: "700",
      padding: "14px 28px",
      cursor: "pointer",
      boxShadow: "0 4px 18px rgba(255, 26, 96, 0.45)",
      transition: "all 0.15s ease",
    });
    primaryBtn.addEventListener("mouseenter", () => {
      primaryBtn.style.background = "#ff3377";
      primaryBtn.style.transform = "translateY(-1px)";
      primaryBtn.style.boxShadow = "0 6px 24px rgba(255, 26, 96, 0.6)";
    });
    primaryBtn.addEventListener("mouseleave", () => {
      primaryBtn.style.background = "#ff1a60";
      primaryBtn.style.transform = "translateY(0)";
      primaryBtn.style.boxShadow = "0 4px 18px rgba(255, 26, 96, 0.45)";
    });
    primaryBtn.addEventListener("click", () => {
      localStorage.setItem("space_benders_onboarding_seen", "true");
      this.close();
    });

    // Underline Secondary Link
    const secondaryLink = document.createElement("span");
    secondaryLink.textContent = isAr ? "شاهد دليل الإطلاق" : "Watch the guide to launch";
    Object.assign(secondaryLink.style, {
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      textDecoration: "underline",
      cursor: "pointer",
      textUnderlineOffset: "4px",
      transition: "opacity 0.15s ease",
    });
    secondaryLink.addEventListener("mouseenter", () => (secondaryLink.style.opacity = "0.75"));
    secondaryLink.addEventListener("mouseleave", () => (secondaryLink.style.opacity = "1"));
    secondaryLink.addEventListener("click", () => {
      document.getElementById("landing-videos-section")?.scrollIntoView({ behavior: "smooth" });
    });

    actionRow.append(primaryBtn, secondaryLink);

    // Stats Row (Matching "48 HOURS | 320 MAKERS | 86 GAMES")
    const statsRow = document.createElement("div");
    Object.assign(statsRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "36px",
      marginTop: "24px",
      paddingTop: "24px",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    });

    const createStat = (num: string, labelEn: string, labelAr: string) => {
      const box = document.createElement("div");
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.gap = "4px";

      const numEl = document.createElement("div");
      numEl.className = "pixel-stats-num";
      numEl.textContent = num;
      Object.assign(numEl.style, {
        fontSize: "30px",
        fontWeight: "700",
        color: "#ffffff",
        lineHeight: "1",
      });

      const labelEl = document.createElement("div");
      labelEl.textContent = isAr ? labelAr : labelEn;
      Object.assign(labelEl.style, {
        fontSize: "11px",
        fontFamily: "'JetBrains Mono', monospace",
        color: "rgba(255, 255, 255, 0.5)",
        letterSpacing: "1px",
        textTransform: "uppercase",
      });

      box.append(numEl, labelEl);
      return box;
    };

    statsRow.append(
      createStat("4", "ROLES", "أدوار هندسية"),
      createStat("6", "MISSIONS", "مهام فضائية"),
      createStat("12", "RULES", "قواعد فيزيائية"),
      createStat("10", "VIDEOS", "فيديوهات علمية"),
    );

    leftCol.append(eyebrow, headline, sub, actionRow, statsRow);

    // ── Right Column: Pixel Island Rocket Icon (Clean Transparent Sprite, No Float Animation) ──
    const rightCol = document.createElement("div");
    Object.assign(rightCol.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    });

    const rocketImg = document.createElement("img");
    rocketImg.src = assetUrl("/assets/landing_hero_rocket.png");
    rocketImg.alt = "Ascending Pixel Rocket on Floating Island";
    Object.assign(rocketImg.style, {
      width: "100%",
      maxWidth: "380px",
      height: "auto",
      imageRendering: "pixelated",
      filter: "drop-shadow(0 24px 48px rgba(0, 0, 0, 0.85))",
      userSelect: "none",
      pointerEvents: "none",
    });

    rightCol.appendChild(rocketImg);
    section.append(leftCol, rightCol);
    return section;
  }

  // ── Section 2: Video Academy Grid (10 Topics) ──────────────────────────

  private _buildVideosSectionDOM(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";

    const section = document.createElement("section");
    section.id = "landing-videos-section";
    Object.assign(section.style, {
      display: "flex",
      flexDirection: "column",
      gap: "28px",
      paddingTop: "40px",
    });

    // Section Header (Jamboree Clean Style)
    const headRow = document.createElement("div");
    Object.assign(headRow.style, {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "16px",
      paddingBottom: "16px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    });

    const headTitle = document.createElement("div");
    headTitle.innerHTML = `
      <div style="font-size:11px; font-family:'JetBrains Mono', monospace; color:#34D399; letter-spacing:1.5px; text-transform:uppercase;">
        ${isAr ? "المكتبة العلمية المرئية" : "VISUAL AEROSPACE BRIEFINGS"}
      </div>
      <div class="pixel-game-title" style="font-size:24px; font-weight:700; color:#ffffff; margin-top:6px;">
        ${isAr ? "فيديوهات القواعد والفيزياء (10 مقاطع)" : "10 Mission Science Topics"}
      </div>
    `;

    // Category Filter Chips
    const filters = document.createElement("div");
    Object.assign(filters.style, { display: "flex", gap: "8px", flexWrap: "wrap" });

    const CATS = [
      { id: "all", en: "All (10)", ar: "الكل (10)" },
      { id: "power", en: "Power & Solar", ar: "الطاقة والكهرباء" },
      { id: "propulsion", en: "Propulsion", ar: "الدفع والوقود" },
      { id: "telecom", en: "Comms", ar: "الاتصالات" },
      { id: "computing", en: "Autonomy", ar: "التحكم الذاتي" },
    ];

    CATS.forEach((c) => {
      const chip = document.createElement("button");
      chip.textContent = isAr ? c.ar : c.en;
      const isSel = this.selectedCategory === c.id;

      Object.assign(chip.style, {
        background: isSel ? "#ffffff" : "rgba(255, 255, 255, 0.06)",
        color: isSel ? "#191c2b" : "rgba(255, 255, 255, 0.75)",
        border: "none",
        borderRadius: "6px",
        padding: "6px 14px",
        fontSize: "12px",
        fontWeight: isSel ? "700" : "500",
        cursor: "pointer",
        transition: "all 0.15s ease",
      });

      chip.addEventListener("click", () => {
        this.selectedCategory = c.id;
        SoundFX.playClick();
        this._rerenderVideoGrid();
      });
      filters.appendChild(chip);
    });

    headRow.append(headTitle, filters);
    section.appendChild(headRow);

    // Cards Grid
    const grid = document.createElement("div");
    grid.id = "landing-videos-grid";
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: "24px",
    });

    this._populateVideoCards(grid);
    section.appendChild(grid);
    return section;
  }

  private _populateVideoCards(grid: HTMLDivElement): void {
    grid.innerHTML = "";
    const isAr = this.currentLanguage === "ar";

    const filtered =
      this.selectedCategory === "all"
        ? VIDEO_TOPICS
        : VIDEO_TOPICS.filter((v) => v.category === this.selectedCategory);

    filtered.forEach((topic) => {
      const globalIdx = VIDEO_TOPICS.indexOf(topic);

      const card = document.createElement("div");
      Object.assign(card.style, {
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      });

      card.addEventListener("mouseenter", () => {
        card.style.background = "rgba(255, 255, 255, 0.06)";
        card.style.borderColor = "rgba(255, 26, 96, 0.5)"; // Jamboree pink hover accent!
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.5)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.background = "rgba(255, 255, 255, 0.03)";
        card.style.borderColor = "rgba(255, 255, 255, 0.08)";
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "none";
      });

      card.addEventListener("click", () => {
        this.openVideo(globalIdx);
      });

      // ── Thumbnail Container (Shows first-frame JPEG directly from Google Drive) ──
      const mediaBox = document.createElement("div");
      Object.assign(mediaBox.style, {
        position: "relative",
        width: "100%",
        paddingTop: "56.25%", // 16:9 aspect ratio
        background: "#0d101a",
        overflow: "hidden",
      });

      const thumbImg = document.createElement("img");
      thumbImg.src = assetUrl(`/assets/videos/${topic.id}.jpg`);
      thumbImg.alt = isAr ? topic.title.ar : topic.title.en;
      thumbImg.loading = "lazy";
      thumbImg.onerror = () => {
        // Fallback to Google Drive URL if local asset fails
        thumbImg.src = `https://lh3.googleusercontent.com/d/${topic.driveId}=w640`;
      };
      Object.assign(thumbImg.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transition: "transform 0.3s ease",
      });

      card.addEventListener("mouseenter", () => (thumbImg.style.transform = "scale(1.04)"));
      card.addEventListener("mouseleave", () => (thumbImg.style.transform = "scale(1)"));

      // Play Overlay
      const playOverlay = document.createElement("div");
      Object.assign(playOverlay.style, {
        position: "absolute",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.35)",
        transition: "background 0.2s ease",
      });

      const playPill = document.createElement("div");
      Object.assign(playPill.style, {
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: "rgba(255, 26, 96, 0.9)", // Jamboree pink play button
        boxShadow: "0 4px 18px rgba(255, 26, 96, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
      });
      playPill.appendChild(createElement(Play, { width: 18, height: 18, fill: "#ffffff", "stroke-width": 1 }));
      playOverlay.appendChild(playPill);

      // Rule Tag on top corner
      const tagPill = document.createElement("div");
      tagPill.textContent = isAr ? topic.ruleTag.ar : topic.ruleTag.en;
      Object.assign(tagPill.style, {
        position: "absolute",
        top: "12px",
        ...(isAr ? { right: "12px" } : { left: "12px" }),
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "4px",
        padding: "3px 8px",
        fontSize: "10px",
        fontFamily: "'JetBrains Mono', monospace",
        color: "#ffffff",
        fontWeight: "700",
      });

      mediaBox.append(thumbImg, playOverlay, tagPill);

      // Card Body
      const body = document.createElement("div");
      Object.assign(body.style, {
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      });

      const cardTitle = document.createElement("div");
      cardTitle.textContent = isAr ? topic.title.ar : topic.title.en;
      Object.assign(cardTitle.style, {
        fontSize: "15px",
        fontWeight: "700",
        color: "#ffffff",
      });

      const briefText = document.createElement("div");
      briefText.textContent = isAr ? topic.brief.ar : topic.brief.en;
      Object.assign(briefText.style, {
        fontSize: "12px",
        color: "rgba(255, 255, 255, 0.65)",
        lineHeight: "1.5",
      });

      body.append(cardTitle, briefText);
      card.append(mediaBox, body);
      grid.appendChild(card);
    });
  }

  private _rerenderVideoGrid(): void {
    const grid = document.getElementById("landing-videos-grid") as HTMLDivElement | null;
    if (grid) this._populateVideoCards(grid);
  }

  // ── Cinema Video Modal ─────────────────────────────────────────────────

  private _buildVideoModalDOM(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";
    const dir = isAr ? "rtl" : "ltr";
    const topic = VIDEO_TOPICS[this.activeVideoIndex];

    const overlay = document.createElement("div");
    overlay.id = "nasa-video-popup-overlay";
    overlay.dir = dir;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "4500",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "rgba(0, 0, 0, 0.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      opacity: "0",
      transition: "opacity 0.2s ease",
      fontFamily: "'Inter', sans-serif",
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      width: "920px",
      maxWidth: "96vw",
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      background: "#121522",
      borderRadius: "16px",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9)",
      overflow: "hidden",
    });

    // 1. Header
    const head = document.createElement("div");
    Object.assign(head.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 22px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      background: "rgba(255, 255, 255, 0.03)",
      gap: "12px",
    });

    const titleWrap = document.createElement("div");
    Object.assign(titleWrap.style, { display: "flex", alignItems: "center", gap: "10px" });

    const numBadge = document.createElement("span");
    numBadge.textContent = `${this.activeVideoIndex + 1}/${VIDEO_TOPICS.length}`;
    Object.assign(numBadge.style, {
      fontSize: "11px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "#ff1a60",
      background: "rgba(255, 26, 96, 0.15)",
      padding: "2px 6px",
      borderRadius: "4px",
      fontWeight: "700",
    });

    const titleText = document.createElement("span");
    titleText.textContent = isAr ? topic.title.ar : topic.title.en;
    Object.assign(titleText.style, {
      fontSize: "15px",
      fontWeight: "700",
      color: "#ffffff",
    });
    titleWrap.append(numBadge, titleText);

    const closeBtn = document.createElement("button");
    closeBtn.appendChild(createElement(X, { width: 16, height: 16, "stroke-width": 2 }));
    Object.assign(closeBtn.style, {
      background: "rgba(255, 255, 255, 0.08)",
      border: "none",
      borderRadius: "6px",
      color: "rgba(255, 255, 255, 0.8)",
      padding: "6px 8px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });
    closeBtn.addEventListener("click", () => this.closeVideo());
    head.append(titleWrap, closeBtn);

    // 2. Embedded Video Container
    const videoContainer = document.createElement("div");
    Object.assign(videoContainer.style, {
      position: "relative",
      width: "100%",
      height: "460px",
      maxHeight: "56vh",
      background: "#000000",
    });

    const iframe = document.createElement("iframe");
    iframe.src = `https://drive.google.com/file/d/${topic.driveId}/preview`;
    iframe.allow = "autoplay; fullscreen";
    iframe.setAttribute("allowfullscreen", "true");
    Object.assign(iframe.style, {
      width: "100%",
      height: "100%",
      border: "none",
    });
    videoContainer.appendChild(iframe);

    // 3. Footer (Brief + Nav Next/Prev)
    const footer = document.createElement("div");
    Object.assign(footer.style, {
      padding: "16px 24px",
      background: "rgba(255, 255, 255, 0.02)",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });

    const ruleText = document.createElement("div");
    ruleText.innerHTML = `
      <span style="color:#ff1a60; font-weight:700; font-size:12px;">${isAr ? "القاعدة المرتبطة:" : "Connected NASA Rule:"}</span>
      <span style="color:rgba(255,255,255,0.75); font-size:12px;"> ${isAr ? topic.ruleHint.ar : topic.ruleHint.en}</span>
    `;

    const navBar = document.createElement("div");
    Object.assign(navBar.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "4px",
      paddingTop: "8px",
      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    });

    const prevBtn = document.createElement("button");
    prevBtn.disabled = this.activeVideoIndex === 0;
    prevBtn.textContent = isAr ? "← المقطع السابق" : "← Previous Video";
    Object.assign(prevBtn.style, {
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "6px",
      color: prevBtn.disabled ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.8)",
      padding: "6px 14px",
      fontSize: "11px",
      cursor: prevBtn.disabled ? "not-allowed" : "pointer",
    });
    prevBtn.addEventListener("click", () => {
      if (this.activeVideoIndex > 0) this.openVideo(this.activeVideoIndex - 1);
    });

    const nextBtn = document.createElement("button");
    nextBtn.disabled = this.activeVideoIndex === VIDEO_TOPICS.length - 1;
    nextBtn.textContent = isAr ? "المقطع التالي →" : "Next Video →";
    Object.assign(nextBtn.style, {
      background: "rgba(255, 26, 96, 0.15)",
      border: "1px solid rgba(255, 26, 96, 0.4)",
      borderRadius: "6px",
      color: nextBtn.disabled ? "rgba(255, 255, 255, 0.25)" : "#ff4d88",
      padding: "6px 14px",
      fontSize: "11px",
      fontWeight: "600",
      cursor: nextBtn.disabled ? "not-allowed" : "pointer",
    });
    nextBtn.addEventListener("click", () => {
      if (this.activeVideoIndex < VIDEO_TOPICS.length - 1) this.openVideo(this.activeVideoIndex + 1);
    });

    navBar.append(prevBtn, nextBtn);
    footer.append(ruleText, navBar);

    modal.append(head, videoContainer, footer);
    overlay.appendChild(modal);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeVideo();
    });

    return overlay;
  }
}
