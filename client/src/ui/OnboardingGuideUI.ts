import {
  createElement,
  X,
  Play,
  BookOpen,
  Video,
  Globe,
  ChevronRight,
  ChevronLeft,
  Zap,
  Flame,
  Radio,
  Cpu,
  ShieldAlert,
  Orbit,
  ExternalLink,
  Sparkles,
} from "lucide";
import { Theme } from "../config/theme";
import { SoundFX } from "../audio/SoundEffects";

export type GuideLanguage = "ar" | "en";

export interface VideoTopicData {
  id: string;
  driveId: string;
  category: "power" | "propulsion" | "telecom" | "computing" | "physics" | "shielding";
  categoryLabel: {
    en: string;
    ar: string;
  };
  title: {
    en: string;
    ar: string;
  };
  duration: string;
  summary: {
    en: string;
    ar: string;
  };
  keyPhysics: {
    en: string;
    ar: string;
  };
  gameRuleHint: {
    en: string;
    ar: string;
  };
}

export const VIDEO_TOPICS: VideoTopicData[] = [
  {
    id: "autonomy",
    driveId: "1-ZA7P_tMX56Jbge7m9A7mBwP1-3cA_37",
    category: "computing",
    categoryLabel: { en: "Flight Systems", ar: "أنظمة الطيران والتحكم" },
    title: { en: "Spacecraft Autonomy", ar: "الاستقلالية والتحكم الذاتي للمركبة" },
    duration: "Briefing",
    summary: {
      en: "How onboard flight computers execute autonomous trajectory and critical decisions when communication delays with Earth make real-time control impossible.",
      ar: "كيف تتخذ حواسيب الطيران الذاتية القرارات اللحظية ومناورات المسار الحرجة في أعماق الفضاء عندما يصبح تأخر إشارات الأرض عائقاً أمام التحكم البشري المباشر.",
    },
    keyPhysics: {
      en: "Speed-of-light round-trip latency (e.g. 8–40 mins for Mars/Europa) necessitates automated fault recovery and local computational autonomy.",
      ar: "سرعة الضوء المحدودة تتطلب حواسيب ذاتية لإدارة الأخطاء وحسابات الملاحة وتوجيه الحمولات دون انتظار تعليمات هيوستن.",
    },
    gameRuleHint: {
      en: "Rule 8 (Brain Power): Install exactly 1 Flight Computer + Co-processors to satisfy navigation & science instruments demand.",
      ar: "القاعدة 8 (الحاسوب الملاحي): تتطلب كل مركبة حاسوب طيران رئيسي واحد بدقة مع معالجات مساعدة لتشغيل كافة الأجهزة.",
    },
  },
  {
    id: "data_rate",
    driveId: "1X7ZV3wiVIQ7Wv23BdknF7julHyKnO4Dv",
    category: "telecom",
    categoryLabel: { en: "Communications", ar: "الاتصالات الفضائية" },
    title: { en: "Data Rate & Telemetry", ar: "معدل نقل البيانات والبث العلمي" },
    duration: "Explainer",
    summary: {
      en: "Transmitting massive scientific spectrometer data across millions of kilometers using high-frequency radios and on-board data compression.",
      ar: "بث البيانات العلمية الضخمة من أجهزة الاستشعار عبر ملايين الكيلومترات إلى الأرض باستخدام هوائيات الدفع ومعدات ضغط البيانات.",
    },
    keyPhysics: {
      en: "Signal attenuation follows inverse-square law; antenna dish gain and compression units multiply effective throughput back to the Deep Space Network.",
      ar: "تضمحل الإشارات مع مربع المسافة؛ تتطلب الهوائيات مضخمات إشارة ووحدات ضغط رقمي لضمان وصول القياسات العلمية كاملة.",
    },
    gameRuleHint: {
      en: "Rule 9 (Data Rate) & Rule 10 (Signal Range): Ensure effective data transmission bandwidth matches or exceeds instrument generation.",
      ar: "القاعدة 9 و 10 (الاتصالات ونطاق الإشارة): يجب أن يتفوق معدل نقل البيانات ونطاق الهوائي على متطلبات المهمة لضمان وصول القياسات.",
    },
  },
  {
    id: "deep_space_solar",
    driveId: "10bZYQlpiYCYVbL7WLUhCk01UVa6rSWGs",
    category: "power",
    categoryLabel: { en: "Power & Energy", ar: "الطاقة والكهرباء" },
    title: { en: "Deep Space Solar Power", ar: "الطاقة الشمسية في الفضاء السحيق" },
    duration: "Explainer",
    summary: {
      en: "Solar panel efficiency plummets drastically as spacecraft venture away from the Sun towards Jupiter (Europa) and Saturn (Titan).",
      ar: "كيف تنهار كفاءة الألواح الشمسية بشكل حاد كلما ابتعدت المركبة عن الشمس متجهة نحو المشتري (أوروبا) وزحل (تيتان).",
    },
    keyPhysics: {
      en: "Solar irradiance drops by 1/d². At Mars sunlight is ~43%, at Jupiter (Europa) ~3.7%, and at Titan ~1% of Earth's solar constant.",
      ar: "تنخفض شدة الإشعاع الشمسي مع مربع المسافة: في مدار المريخ 43%، بينما في قمر أوروبا 3.7% فقط، وتيتان 1%، مما يستدعي بدائل نووية.",
    },
    gameRuleHint: {
      en: "Rule 4 (Power Generation): High-sunlight missions excel with solar; deep-space destinations require nuclear RTGs or reactors.",
      ar: "القاعدة 4 (توليد الطاقة): الألواح الشمسية ممتازة بالقرب من الأرض والشمس، بينما مهام أوروبا وتيتان تتطلب مفاعلات نووية لإنتاج الطاقة.",
    },
  },
  {
    id: "fuel_burn",
    driveId: "144ThGlyqKIa9ZkfJYeuvYunuGtbU-4MW",
    category: "propulsion",
    categoryLabel: { en: "Propulsion", ar: "الدفع والوقود" },
    title: { en: "Fuel Burn & Specific Impulse", ar: "استهلاك الوقود والدفع النوعي" },
    duration: "Briefing",
    summary: {
      en: "Balancing rocket propellant reserves with engine burn rate to guarantee enough delta-V to transit deep space distances without running dry.",
      ar: "حساب كميات الوقود اللازمة ومعدل حرق المحركات لضمان امتلاك الدلتا-V الكافية لقطع المسافات المدارية دون نفاد الخزانات.",
    },
    keyPhysics: {
      en: "Tsiolkovsky rocket equation dictates exponential propellant needs for higher delta-V. Highest-burn engine sets the mission burn rate.",
      ar: "معادلة تسالكوفسكي الصاروخية: كل زيادة في المسافة تتطلب وقوداً إضافياً، والمحرك الأعلى استهلاكاً هو الذي يحدد معدل الحرق للمهمة.",
    },
    gameRuleHint: {
      en: "Rule 3 (Fuel Storage): Stored fuel capacity must be ≥ Mission Distance × Highest Engine Fuel Burn rate.",
      ar: "القاعدة 3 (سعة الوقود): يجب أن تغطي سعة الوقود المخزنة المسافة المدارية مضروبة في أعلى معدل استهلاك لأي محرك مركب.",
    },
  },
  {
    id: "gravity",
    driveId: "1LODiWPGeQuQfxRukeSQDKs4MV_87KaNj",
    category: "physics",
    categoryLabel: { en: "Astrodynamics", ar: "الفيزياء المدارية والجاذبية" },
    title: { en: "Gravity & Orbital Mechanics", ar: "الجاذبية والميكانيكا المدارية" },
    duration: "Explainer",
    summary: {
      en: "Overcoming celestial gravity wells and planetary surface pull to achieve orbit insertion and interplanetary escape trajectories.",
      ar: "فهم آبار الجاذبية الكونية وكيفية التغلب على قوة الجذب الكوكبي لتحقيق الهروب المداري والوصول إلى المسارات بين الكوكبية.",
    },
    keyPhysics: {
      en: "Orbital escape velocity and planetary surface gravity require high initial thrust-to-weight ratio (TWR > 1.0) before transitioning to cruising thrust.",
      ar: "سرعة الإفلات المداري وقوة السحب السطحي تتطلب قوة دفع تفوق الوزن الإجمالي للمركبة للتغلب على سحب الإطلاق بنجاح.",
    },
    gameRuleHint: {
      en: "Rule 2 (Thrust vs Mass): Total engine thrust must exceed Gross Craft Mass × Target Launch Pull gravity factor.",
      ar: "القاعدة 2 (قوة الدفع ضد السحب): يجب أن تتجاوز قوة الدفع الصافية حاصل ضرب وزن الصاروخ بالكامل في معامل جاذبية الكوكب.",
    },
  },
  {
    id: "ion_engine",
    driveId: "1AJhPZDV3x6VXdN8TDICMsubESZHITAbq",
    category: "propulsion",
    categoryLabel: { en: "Advanced Propulsion", ar: "المحركات الأيونية المتطورة" },
    title: { en: "Ion Engines & Electric Propulsion", ar: "محركات الأيونات والدفع الكهربائي" },
    duration: "Explainer",
    summary: {
      en: "Utilizing electrostatic acceleration of ionized xenon gas to achieve extraordinary fuel efficiency at the cost of high electrical demand.",
      ar: "استخدام الحقول الكهروستاتيكية لتسريع غاز الزينون المتأين، مما يوفر كفاءة وقود خرافية على حساب استهلاك تيار كهربائي هائل.",
    },
    keyPhysics: {
      en: "Extremely high specific impulse (Isp > 3000s) produces gentle but relentless acceleration over months, requiring heavy power supplies.",
      ar: "دفع نوعي فائق يتجاوز 3000 ثانية يستهلك وقوداً ضئيلاً جداً، لكنه يحتاج محطة طاقة كهربائية قوية ومستمرة لتغذية المحرك.",
    },
    gameRuleHint: {
      en: "Pairs ultra-low fuel burn with significant power consumption — ideal for long voyages like Titan and Europa.",
      ar: "تتميز باستهلاك وقود قليل جداً وتساعد في اجتياز متطلبات المسافات الطويلة، بشرط توفير طاقة كافية لتشغيلها.",
    },
  },
  {
    id: "orbital_night",
    driveId: "1FGy8Rcc1bMI9ykJ0F6FiJJmZA8-RniGJ",
    category: "power",
    categoryLabel: { en: "Power & Storage", ar: "تخزين الطاقة والبطاريات" },
    title: { en: "Orbital Night & Battery Storage", ar: "الليل المداري وبطاريات الطوارئ" },
    duration: "Briefing",
    summary: {
      en: "Surviving planetary shadow eclipses where solar panels produce zero power: sizing electrochemical batteries for life-support continuity.",
      ar: "كيفية النجاة أثناء مرور المركبة في ظل الكواكب (الكسوف المداري) حين ينقطع ضوء الشمس تماماً، ودور بنك البطاريات في استمرار الحياة.",
    },
    keyPhysics: {
      en: "In low-orbit or behind celestial bodies, solar generation halts 100%. Chemical batteries must bridge the entire eclipse duration.",
      ar: "في الجانب المظلم من الكواكب تتوقف الألواح الشمسية تماماً؛ وتتحمل البطاريات الكيميائية تغذية كافة الأنظمة الحيوية حتى شروق الشمس.",
    },
    gameRuleHint: {
      en: "Rule 5 (Night Batteries): If any solar panel is installed and the mission has nightNeed, battery storage must meet the mission rating.",
      ar: "القاعدة 5 (بطاريات الليل): إذا اعتمدت المركبة على الألواح الشمسية والمهمة تتضمن ليلاً مدارياً، يجب توفير سعة بطاريات كافية.",
    },
  },
  {
    id: "radiation_shielding",
    driveId: "1Nu6eSGDqMDuuSSqLJyc4aWvvcJ5xXhzp",
    category: "shielding",
    categoryLabel: { en: "Thermal & Radiation", ar: "الدروع والحماية الإشعاعية" },
    title: { en: "Radiation Shielding & Cosmic Rays", ar: "الحماية والدروع الإشعاعية" },
    duration: "Explainer",
    summary: {
      en: "Defending delicate electronics, optical spectrometers, and astronauts from galactic cosmic rays and intense Jupiter radiation belts.",
      ar: "حماية الإلكترونيات الحساسة وأجهزة الاستشعار ورواد الفضاء من الأشعة الكونية وأحزمة الإشعاع العنيفة المحيطة بالمشتري والشمس.",
    },
    keyPhysics: {
      en: "High-Z materials and hydrogen-rich polymers absorb ionized particles, secondary bremsstrahlung radiation, and solar proton events.",
      ar: "مواد البوليمرات المقواة والدروع المعدنية تشتت الجسيمات المشحونة وتمنع احتراق الرقائق الإلكترونية وفشل الحواسيب الملاحية.",
    },
    gameRuleHint: {
      en: "Rule 7 (Radiation Protection): Spacecraft radiation protection rating must meet or exceed target mission radiation level.",
      ar: "القاعدة 7 (مقاومة الإشعاع): يجب أن تعادل دروع الحماية أو تفوق الدرجة الإشعاعية المسجلة لبيئة الكوكب المستهدف.",
    },
  },
  {
    id: "rocket_thrust",
    driveId: "1nD9SXMz0TASFukTg4qwf_TvuRMr9hybQ",
    category: "propulsion",
    categoryLabel: { en: "Propulsion", ar: "الدفع الصاروخي" },
    title: { en: "Rocket Thrust & Lift-off Dynamics", ar: "قوة الدفع الصاروخي وديناميكا الإطلاق" },
    duration: "Explainer",
    summary: {
      en: "Understanding Newton's third law and chemical reaction momentum transfer required to lift multi-ton spacecraft hulls off the excavation bay.",
      ar: "فهم قانون نيوتن الثالث والدفع الصاروخي لرفع هياكل المركبات الفضائية الثقيلة المحملة بالمعدات خارج منصة الإطلاق.",
    },
    keyPhysics: {
      en: "Thrust = Mass flow rate × Exhaust velocity. Thrust-to-weight ratio determines whether the rocket ascends or remains grounded.",
      ar: "قوة الدفع = معدل تدفق الكتلة × سرعة خروج الغازات. أي نقص في قوة الدفع عن وزن المركبة وسحب الجاذبية يؤدي إلى فشل الإقلاع.",
    },
    gameRuleHint: {
      en: "Rule 2 (Thrust): Verify that total engine thrust exceeds the product of total spacecraft mass and target launch pull.",
      ar: "القاعدة 2 (الدفع): احرص على أن تتجاوز قوة محركاتك إجمالي كتلة الصاروخ مضروبة في قوة السحب لتفادي تحطم الصاروخ.",
    },
  },
  {
    id: "space_reactor",
    driveId: "1YSOImnAntmZOgitXRnjdV3zFSjF02LeK",
    category: "power",
    categoryLabel: { en: "Nuclear Power", ar: "المفاعلات النووية الفضائية" },
    title: { en: "Space Reactors & RTGs", ar: "المفاعلات والبطاريات النووية الفضائية" },
    duration: "Explainer",
    summary: {
      en: "Deploying radioisotope thermoelectric generators (RTGs) and compact fission reactors to supply uninterrupted power for deep space exploration.",
      ar: "تجهيز المولدات النظائرية (RTG) والمفاعلات المدمجة لتوفير تيار كهربائي هائل ومستمر لعقود في أقصى أطراف المجموعة الشمسية.",
    },
    keyPhysics: {
      en: "Radioactive decay of isotopes releases steady thermal energy converted to electricity via thermocouples, completely immune to solar shadow.",
      ar: "الاضمحلال الإشعاعي يوفر طاقة حرارية وكهربائية مستمرة لا تتأثر بالكسوف الشمسي أو البعد الهائل عن قرص الشمس.",
    },
    gameRuleHint: {
      en: "Rule 4 & 5 (Base Power): Essential for Europa and Titan missions where solar power produces negligible wattage.",
      ar: "القواعد 4 و 5 (توليد الطاقة الأساسية): مكون حيوي لا غنى عنه في مهام أوروبا وتيتان للتغلب على انعدام الإشعاع الشمسي.",
    },
  },
];

/**
 * OnboardingGuideUI
 * ─────────────────
 * Fully localized (EN/AR), high-performance client-side onboarding and
 * NASA Flight Academy Video Library.
 *
 * Features:
 *  - 10 embedded Google Drive video briefings with instant popup player.
 *  - Interactive game mechanics overview & 4 team role briefings.
 *  - Zero server load (client-side DOM with native Google Drive iframe previews).
 *  - Language switch toggle with localStorage memory.
 *  - One-click Skip / Proceed option.
 */
export class OnboardingGuideUI {
  private static instance: OnboardingGuideUI | null = null;

  private overlay: HTMLDivElement | null = null;
  private videoModal: HTMLDivElement | null = null;
  private currentLanguage: GuideLanguage = "ar";
  private currentTab: "briefing" | "videos" = "briefing";
  private selectedCategory: string = "all";
  private activeVideoIndex: number = 0;
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
   * Opens the onboarding guide overlay.
   */
  public open(initialTab: "briefing" | "videos" = "briefing", onClose?: () => void): void {
    this.currentTab = initialTab;
    this.onCloseCallback = onClose;

    if (this.overlay) {
      this.overlay.remove();
    }

    this.overlay = this._buildOverlayDOM();
    document.body.appendChild(this.overlay);

    // Fade-in animation
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.style.opacity = "1";
        this.overlay.style.transform = "scale(1)";
      }
    });
  }

  /**
   * Closes the onboarding guide.
   */
  public close(): void {
    if (this.videoModal) {
      this.closeVideo();
    }

    if (this.overlay) {
      this.overlay.style.opacity = "0";
      this.overlay.style.transform = "scale(0.98)";
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
        this.onCloseCallback?.();
      }, 200);
    }
  }

  /**
   * Opens a specific video directly in the modal popup.
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

  /**
   * Closes the video popup player.
   */
  public closeVideo(): void {
    if (this.videoModal) {
      this.videoModal.style.opacity = "0";
      setTimeout(() => {
        this.videoModal?.remove();
        this.videoModal = null;
      }, 180);
    }
  }

  private _setLanguage(lang: GuideLanguage): void {
    this.currentLanguage = lang;
    localStorage.setItem("nasa_guide_lang", lang);
    SoundFX.playClick();

    // Re-render overlay cleanly
    if (this.overlay) {
      const parent = this.overlay.parentNode;
      this.overlay.remove();
      this.overlay = this._buildOverlayDOM();
      if (parent) {
        parent.appendChild(this.overlay);
        this.overlay.style.opacity = "1";
        this.overlay.style.transform = "scale(1)";
      }
    }

    if (this.videoModal) {
      this.openVideo(this.activeVideoIndex);
    }
  }

  // ── Main Overlay DOM ───────────────────────────────────────────────────

  private _buildOverlayDOM(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";
    const dir = isAr ? "rtl" : "ltr";

    const overlay = document.createElement("div");
    overlay.id = "nasa-onboarding-overlay";
    overlay.dir = dir;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "3500",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      boxSizing: "border-box",
      background: "rgba(4, 7, 16, 0.88)",
      backdropFilter: "blur(22px) saturate(1.5)",
      WebkitBackdropFilter: "blur(22px) saturate(1.5)",
      opacity: "0",
      transform: "scale(0.98)",
      transition: "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      fontFamily: Theme.font.family,
      color: "#ffffff",
    });

    // Content Container (Wide Glass Card)
    const card = document.createElement("div");
    card.id = "onboarding-card";
    Object.assign(card.style, {
      width: "1060px",
      maxWidth: "96vw",
      height: "88vh",
      maxHeight: "840px",
      display: "flex",
      flexDirection: "column",
      background: "rgba(12, 17, 28, 0.92)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 32px 64px rgba(0, 0, 0, 0.8)",
      borderRadius: "20px",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      overflow: "hidden",
    });

    // ── Header Bar ──
    const header = this._buildHeaderBar();
    card.appendChild(header);

    // ── Body Content (Tab-switched) ──
    const bodyContent = document.createElement("div");
    bodyContent.id = "onboarding-body-content";
    Object.assign(bodyContent.style, {
      flex: "1",
      overflowY: "auto",
      padding: "28px 36px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    });

    if (this.currentTab === "briefing") {
      bodyContent.appendChild(this._buildBriefingTabDOM());
    } else {
      bodyContent.appendChild(this._buildVideosTabDOM());
    }

    card.appendChild(bodyContent);

    // ── Bottom Action Footer ──
    const footer = this._buildFooterBar();
    card.appendChild(footer);

    overlay.appendChild(card);
    return overlay;
  }

  // ── Header Bar ─────────────────────────────────────────────────────────

  private _buildHeaderBar(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 28px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      background: "rgba(255, 255, 255, 0.02)",
      gap: "16px",
      flexWrap: "wrap",
    });

    // Left: NASA Emblem & Title
    const titleBox = document.createElement("div");
    Object.assign(titleBox.style, { display: "flex", alignItems: "center", gap: "12px" });

    const logo = document.createElement("img");
    logo.src = "/favicon.png";
    logo.alt = "NASA Space Benders";
    Object.assign(logo.style, {
      width: "30px",
      height: "30px",
      imageRendering: "pixelated",
      borderRadius: "6px",
    });

    const titleText = document.createElement("div");
    titleText.innerHTML = `
      <div style="font-size: 15px; font-weight: 700; letter-spacing: 0.3px; color: #ffffff;">
        ${isAr ? "أكاديمية تدريب رواد الفضاء · وكالة ناسا" : "NASA Deep Space Academy & Briefings"}
      </div>
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.45); font-family: 'JetBrains Mono', monospace;">
        SPACE BENDERS · MISSION OPERATIONS V2.0
      </div>
    `;
    titleBox.append(logo, titleText);

    // Center: Nav Switchers (Briefing vs Videos)
    const tabsBox = document.createElement("div");
    Object.assign(tabsBox.style, {
      display: "flex",
      alignItems: "center",
      background: "rgba(255, 255, 255, 0.06)",
      borderRadius: "10px",
      padding: "3px",
      gap: "2px",
    });

    const createTabBtn = (tabId: "briefing" | "videos", labelEn: string, labelAr: string, iconComponent: any) => {
      const btn = document.createElement("button");
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.gap = "6px";
      btn.appendChild(createElement(iconComponent, { width: 14, height: 14, "stroke-width": 1.5 }));
      const span = document.createElement("span");
      span.textContent = isAr ? labelAr : labelEn;
      btn.appendChild(span);

      const isActive = this.currentTab === tabId;
      Object.assign(btn.style, {
        background: isActive ? "rgba(255, 255, 255, 0.16)" : "transparent",
        boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
        color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
        border: "none",
        borderRadius: "8px",
        padding: "7px 14px",
        fontSize: "12px",
        fontWeight: isActive ? "600" : "500",
        cursor: "pointer",
        transition: "all 0.15s ease",
      });

      btn.addEventListener("click", () => {
        if (this.currentTab !== tabId) {
          this.currentTab = tabId;
          SoundFX.playClick();
          this.open(tabId, this.onCloseCallback);
        }
      });
      return btn;
    };

    tabsBox.append(
      createTabBtn("briefing", "Mission Guide", "دليل المهمة وقواعد اللعبة", BookOpen),
      createTabBtn("videos", "Video Academy (10)", "الفيديوهات التعليمية (10)", Video),
    );

    // Right: Language Switcher & Close
    const rightControls = document.createElement("div");
    Object.assign(rightControls.style, { display: "flex", alignItems: "center", gap: "10px" });

    // Language Toggle Switch
    const langBtn = document.createElement("button");
    langBtn.title = isAr ? "Switch to English" : "التبديل إلى العربية";
    langBtn.innerHTML = `
      <span style="font-family:'JetBrains Mono', monospace; font-size:11px; font-weight:700;">
        ${isAr ? "EN / إنجليزي" : "عربي / AR"}
      </span>
    `;
    Object.assign(langBtn.style, {
      background: "rgba(41, 173, 255, 0.15)",
      border: "1px solid rgba(41, 173, 255, 0.35)",
      borderRadius: "8px",
      color: "#29ADFF",
      padding: "6px 12px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "all 0.15s ease",
    });
    langBtn.addEventListener("click", () => {
      this._setLanguage(isAr ? "en" : "ar");
    });

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.appendChild(createElement(X, { width: 16, height: 16, "stroke-width": 2 }));
    Object.assign(closeBtn.style, {
      background: "rgba(255, 255, 255, 0.08)",
      border: "none",
      borderRadius: "8px",
      color: "rgba(255, 255, 255, 0.7)",
      padding: "6px 10px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.15s ease",
    });
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "rgba(239, 68, 68, 0.2)";
      closeBtn.style.color = "#ffffff";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "rgba(255, 255, 255, 0.08)";
      closeBtn.style.color = "rgba(255, 255, 255, 0.7)";
    });
    closeBtn.addEventListener("click", () => this.close());

    rightControls.append(langBtn, closeBtn);
    header.append(titleBox, tabsBox, rightControls);
    return header;
  }

  // ── Briefing Tab ───────────────────────────────────────────────────────

  private _buildBriefingTabDOM(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";
    const container = document.createElement("div");
    Object.assign(container.style, {
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    });

    // Hero Overview Banner
    const hero = document.createElement("div");
    Object.assign(hero.style, {
      background: "linear-gradient(135deg, rgba(41, 173, 255, 0.12) 0%, rgba(16, 185, 129, 0.06) 100%)",
      border: "1px solid rgba(41, 173, 255, 0.25)",
      borderRadius: "14px",
      padding: "22px 26px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });

    hero.innerHTML = `
      <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #29ADFF; letter-spacing: 1px; text-transform: uppercase;">
        ${isAr ? "نظرة عامة على اللعبة" : "GAMEPLAY OBJECTIVE & OVERVIEW"}
      </div>
      <div style="font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        ${
          isAr
            ? "تعاون مع طاقمك لبناء صاروخ ناسا وتحقيق 12 شرطاً هندسياً دقيقاً لكل كوكب!"
            : "Cooperate with your crew to engineer a launch-ready spacecraft meeting all 12 NASA constraints!"
        }
      </div>
      <div style="font-size: 13.5px; color: rgba(255, 255, 255, 0.75); line-height: 1.6;">
        ${
          isAr
            ? "في لعبة **Space Benders**، يتوزع اللاعبون على 4 أدوار هندسية متخصصة. مهمتكم المشتركة هي جمع القطع الفضائية من الورش وتثبيتها في حجرة الصاروخ المركزية بما يتوافق مع قوانين الفيزياء وميزانية المهمة دون تجاوز حد الكتلة أو الوقود."
            : "In **Space Benders**, players take on 4 specialized engineering roles. Your shared goal is to retrieve components from departmental stations, install them in the central rocket bay, and pass all 12 engineering checks (Power, Thrust, Delta-V, Computer, Comms, Thermal) within budget."
        }
      </div>
    `;
    container.appendChild(hero);

    // 4 Specialized Roles Section
    const rolesSection = document.createElement("div");
    Object.assign(rolesSection.style, { display: "flex", flexDirection: "column", gap: "12px" });

    const rolesTitle = document.createElement("div");
    rolesTitle.textContent = isAr ? "الأدوار الهندسية الأربعة للطاقم" : "The 4 Crew Engineering Roles";
    Object.assign(rolesTitle.style, { fontSize: "15px", fontWeight: "700", color: "#ffffff" });
    rolesSection.appendChild(rolesTitle);

    const rolesGrid = document.createElement("div");
    Object.assign(rolesGrid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "14px",
    });

    const ROLES = [
      {
        name: { en: "Flight Operations", ar: "مسؤول عمليات الطيران والدفع" },
        color: "#FFA800",
        items: { en: "Engines, Fuel Tanks, RCS Thrusters", ar: "المحركات، خزانات الوقود، أنظمة التوجيه" },
        desc: {
          en: "Ensures total thrust overcomes target gravity pull and stored fuel covers mission transit.",
          ar: "المسؤول عن توفير قوة دفع كافية وتخزين الوقود المناسب لمسافة المهمة.",
        },
      },
      {
        name: { en: "Commander", ar: "قائد المهمة والهيكل" },
        color: "#29ADFF",
        items: { en: "Spacecraft Frames, Computers, Chips", ar: "هياكل الصاروخ، حواسيب الطيران، الرقائق المساعدة" },
        desc: {
          en: "Sets up structural frame volume and computing power for navigation & telemetry.",
          ar: "يحدد سعة وحجم هيكل الصاروخ ويوفر المعالجات الكافية لتشغيل الملاحة.",
        },
      },
      {
        name: { en: "Science Specialist", ar: "أخصائي العلوم والأجهزة" },
        color: "#B05CFF",
        items: { en: "Spectrometers, Radars, Star Instruments", ar: "أجهزة القياس، الرادارات، الأجهزة النجمية" },
        desc: {
          en: "Installs scientific sensors and star instruments to meet mission science point quotas.",
          ar: "يثبت أجهزة الاستشعار العلمية والجهاز النجمي لتحقيق نقاط العلوم المطلوبة.",
        },
      },
      {
        name: { en: "Communications Engineer", ar: "مهندس الاتصالات والطاقة" },
        color: "#00E5FF",
        items: { en: "Solar Panels, Nuclear RTGs, Antennas", ar: "الألواح الشمسية، المفاعلات، هوائيات البث" },
        desc: {
          en: "Powers the entire spacecraft and links telemetry back to Earth's Deep Space Network.",
          ar: "يغذي المركبة بالكهرباء ويربط إشارات البث العلمي بشبكة الفضاء السحيق DSN.",
        },
      },
    ];

    ROLES.forEach((r) => {
      const rCard = document.createElement("div");
      Object.assign(rCard.style, {
        background: "rgba(255, 255, 255, 0.03)",
        border: `1px solid rgba(255, 255, 255, 0.08)`,
        borderTop: `3px solid ${r.color}`,
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      });

      rCard.innerHTML = `
        <div style="font-size:13.5px; font-weight:700; color:${r.color};">${isAr ? r.name.ar : r.name.en}</div>
        <div style="font-size:11px; font-family:'JetBrains Mono', monospace; color:rgba(255,255,255,0.45);">${isAr ? r.items.ar : r.items.en}</div>
        <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5; margin-top:4px;">${isAr ? r.desc.ar : r.desc.en}</div>
      `;
      rolesGrid.appendChild(rCard);
    });
    rolesSection.appendChild(rolesGrid);
    container.appendChild(rolesSection);

    // Controls & AI Director Card
    const bottomRow = document.createElement("div");
    Object.assign(bottomRow.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "14px",
    });

    const controlsCard = document.createElement("div");
    Object.assign(controlsCard.style, {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "12px",
      padding: "16px 20px",
    });
    controlsCard.innerHTML = `
      <div style="font-size:13px; font-weight:700; color:#ffffff; margin-bottom:10px;">
        ${isAr ? "مفاتيح التحكم" : "Controls & Interaction"}
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:rgba(255,255,255,0.8);">
        <div><b style="color:#ffffff; font-family:'JetBrains Mono', monospace; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">W A S D</b> ${isAr ? "التحرك داخل غرفة التجميع" : "Move around the assembly bay"}</div>
        <div><b style="color:#ffffff; font-family:'JetBrains Mono', monospace; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">E</b> ${isAr ? "التفاعل / التقاط القطعة أو تركيبها في الصاروخ" : "Interact / Pick up item / Install in Rocket"}</div>
        <div><b style="color:#ffffff; font-family:'JetBrains Mono', monospace; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">TAB</b> ${isAr ? "فتح وحدة تحكم ناسا والذكاء الاصطناعي (AI Director)" : "Open NASA Telemetry & AI Director Console"}</div>
      </div>
    `;

    const ctaCard = document.createElement("div");
    Object.assign(ctaCard.style, {
      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(41, 173, 255, 0.1))",
      border: "1px solid rgba(16, 185, 129, 0.3)",
      borderRadius: "12px",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    });
    ctaCard.innerHTML = `
      <div>
        <div style="font-size:13px; font-weight:700; color:#34D399; margin-bottom:6px;">
          ${isAr ? "أكاديمية الفيديوهات العلمية" : "NASA Video Briefings"}
        </div>
        <div style="font-size:12px; color:rgba(255,255,255,0.75); line-height:1.5;">
          ${
            isAr
              ? "استكشف 10 مقاطع فيديو تعليمية تشرح فيزياء الفضاء، الدفع الأيوني، الطاقة الشمسية، ومعدلات نقل البيانات لمهام الفضاء السحيق."
              : "Explore 10 curated video briefings explaining deep space solar, ion propulsion, data rates, and orbital night mechanics."
          }
        </div>
      </div>
    `;

    const ctaBtn = document.createElement("button");
    ctaBtn.textContent = isAr ? "مشاهدة الفيديوهات التعليمية (10) ←" : "Explore Video Academy (10) →";
    Object.assign(ctaBtn.style, {
      marginTop: "12px",
      background: "#34D399",
      color: "#040810",
      border: "none",
      borderRadius: "8px",
      padding: "9px 16px",
      fontSize: "12px",
      fontWeight: "700",
      cursor: "pointer",
      alignSelf: "flex-start",
      transition: "all 0.15s ease",
    });
    ctaBtn.addEventListener("click", () => {
      this.currentTab = "videos";
      SoundFX.playClick();
      this.open("videos", this.onCloseCallback);
    });
    ctaCard.appendChild(ctaBtn);

    bottomRow.append(controlsCard, ctaCard);
    container.appendChild(bottomRow);

    return container;
  }

  // ── Videos Tab ─────────────────────────────────────────────────────────

  private _buildVideosTabDOM(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";
    const container = document.createElement("div");
    Object.assign(container.style, {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    });

    // Category Filter Chips
    const filtersBar = document.createElement("div");
    Object.assign(filtersBar.style, {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    });

    const CATEGORIES = [
      { id: "all", labelEn: "All Topics (10)", labelAr: "كافة الموضوعات (10)" },
      { id: "power", labelEn: "Power & Solar", labelAr: "الطاقة والكهرباء" },
      { id: "propulsion", labelEn: "Propulsion & Thrust", labelAr: "الدفع والمحركات" },
      { id: "telecom", labelEn: "Communications & DSN", labelAr: "الاتصالات والبث" },
      { id: "computing", labelEn: "Autonomy & Computers", labelAr: "الحواسيب والتحكم" },
      { id: "shielding", labelEn: "Radiation & Shielding", labelAr: "الدروع والإشعاع" },
    ];

    CATEGORIES.forEach((cat) => {
      const chip = document.createElement("button");
      chip.textContent = isAr ? cat.labelAr : cat.labelEn;
      const isSelected = this.selectedCategory === cat.id;

      Object.assign(chip.style, {
        background: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.06)",
        color: isSelected ? "#040810" : "rgba(255, 255, 255, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "20px",
        padding: "6px 14px",
        fontSize: "11.5px",
        fontWeight: isSelected ? "700" : "500",
        cursor: "pointer",
        transition: "all 0.15s ease",
      });

      chip.addEventListener("click", () => {
        this.selectedCategory = cat.id;
        SoundFX.playClick();
        this.open("videos", this.onCloseCallback);
      });
      filtersBar.appendChild(chip);
    });
    container.appendChild(filtersBar);

    // Video Cards Grid
    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "16px",
    });

    const filtered =
      this.selectedCategory === "all"
        ? VIDEO_TOPICS
        : VIDEO_TOPICS.filter((v) => v.category === this.selectedCategory);

    filtered.forEach((topic) => {
      const idx = VIDEO_TOPICS.indexOf(topic);
      const card = this._buildVideoCardDOM(topic, idx);
      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  }

  private _buildVideoCardDOM(topic: VideoTopicData, index: number): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";
    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: "12px",
      cursor: "pointer",
      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    });

    card.addEventListener("mouseenter", () => {
      card.style.background = "rgba(255, 255, 255, 0.06)";
      card.style.borderColor = "rgba(41, 173, 255, 0.4)";
      card.style.transform = "translateY(-3px)";
      card.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.4)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.background = "rgba(255, 255, 255, 0.03)";
      card.style.borderColor = "rgba(255, 255, 255, 0.08)";
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "none";
    });

    card.addEventListener("click", () => {
      this.openVideo(index);
    });

    // Card Top Meta
    const topRow = document.createElement("div");
    Object.assign(topRow.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    });

    const categoryBadge = document.createElement("span");
    categoryBadge.textContent = isAr ? topic.categoryLabel.ar : topic.categoryLabel.en;
    Object.assign(categoryBadge.style, {
      fontSize: "10px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "#29ADFF",
      background: "rgba(41, 173, 255, 0.12)",
      border: "1px solid rgba(41, 173, 255, 0.25)",
      padding: "2px 8px",
      borderRadius: "4px",
      textTransform: "uppercase",
    });

    const durationBadge = document.createElement("span");
    durationBadge.textContent = topic.duration;
    Object.assign(durationBadge.style, {
      fontSize: "10px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "rgba(255, 255, 255, 0.4)",
    });

    topRow.append(categoryBadge, durationBadge);

    // Card Title & Summary
    const title = document.createElement("div");
    title.textContent = isAr ? topic.title.ar : topic.title.en;
    Object.assign(title.style, {
      fontSize: "14.5px",
      fontWeight: "700",
      color: "#ffffff",
      lineHeight: "1.3",
    });

    const summary = document.createElement("div");
    summary.textContent = isAr ? topic.summary.ar : topic.summary.en;
    Object.assign(summary.style, {
      fontSize: "12px",
      color: "rgba(255, 255, 255, 0.65)",
      lineHeight: "1.5",
    });

    // Bottom Play Action Pill
    const playBtn = document.createElement("div");
    Object.assign(playBtn.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "6px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#34D399",
    });
    playBtn.appendChild(createElement(Play, { width: 14, height: 14, fill: "#34D399", "stroke-width": 1.5 }));
    const playText = document.createElement("span");
    playText.textContent = isAr ? "مشاهدة المقطع الآن" : "Watch Briefing Video";
    playBtn.appendChild(playText);

    const midContent = document.createElement("div");
    Object.assign(midContent.style, { display: "flex", flexDirection: "column", gap: "8px" });
    midContent.append(topRow, title, summary);

    card.append(midContent, playBtn);
    return card;
  }

  // ── Bottom Footer Bar ──────────────────────────────────────────────────

  private _buildFooterBar(): HTMLDivElement {
    const isAr = this.currentLanguage === "ar";
    const footer = document.createElement("div");
    Object.assign(footer.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 28px",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      background: "rgba(255, 255, 255, 0.02)",
      gap: "12px",
    });

    const hint = document.createElement("div");
    hint.textContent = isAr
      ? "يمكنك إعادة فتح هذا الدليل ومشاهدة الفيديوهات في أي وقت عبر زر الأكاديمية أعلى الشاشة."
      : "You can reopen this Academy Guide and watch briefings anytime via the top navigation bar.";
    Object.assign(hint.style, {
      fontSize: "11.5px",
      color: "rgba(255, 255, 255, 0.45)",
    });

    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", alignItems: "center", gap: "10px" });

    // Skip / Close Button
    const skipBtn = document.createElement("button");
    skipBtn.textContent = isAr ? "تخطي / إغلاق" : "Skip / Close";
    Object.assign(skipBtn.style, {
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "10px",
      color: "rgba(255, 255, 255, 0.75)",
      padding: "10px 18px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.15s ease",
    });
    skipBtn.addEventListener("click", () => {
      localStorage.setItem("space_benders_onboarding_seen", "true");
      this.close();
    });

    // Proceed to Game Button
    const proceedBtn = document.createElement("button");
    proceedBtn.textContent = isAr ? "دخول محطة الإطلاق ←" : "Proceed to Mission Bays →";
    Object.assign(proceedBtn.style, {
      background: "#ffffff",
      border: "none",
      borderRadius: "10px",
      color: "#040810",
      padding: "10px 22px",
      fontSize: "12.5px",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 4px 16px rgba(255, 255, 255, 0.25)",
      transition: "all 0.15s ease",
    });
    proceedBtn.addEventListener("mouseenter", () => {
      proceedBtn.style.boxShadow = "0 6px 24px rgba(255, 255, 255, 0.4)";
    });
    proceedBtn.addEventListener("mouseleave", () => {
      proceedBtn.style.boxShadow = "0 4px 16px rgba(255, 255, 255, 0.25)";
    });
    proceedBtn.addEventListener("click", () => {
      localStorage.setItem("space_benders_onboarding_seen", "true");
      this.close();
    });

    actions.append(skipBtn, proceedBtn);
    footer.append(hint, actions);
    return footer;
  }

  // ── Video Player Modal (Popup) ─────────────────────────────────────────

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
      background: "rgba(0, 0, 0, 0.88)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      opacity: "0",
      transition: "opacity 0.2s ease",
      fontFamily: Theme.font.family,
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      width: "920px",
      maxWidth: "96vw",
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      background: "#080c14",
      borderRadius: "18px",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9)",
      overflow: "hidden",
    });

    // 1. Modal Header
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
      color: "#34D399",
      background: "rgba(16, 185, 129, 0.15)",
      padding: "2px 6px",
      borderRadius: "4px",
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

    // 2. Embedded Video Container (Google Drive native preview)
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

    // 3. Modal Briefing Description Footer
    const footer = document.createElement("div");
    Object.assign(footer.style, {
      padding: "18px 24px",
      background: "rgba(255, 255, 255, 0.02)",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });

    const descText = document.createElement("div");
    descText.textContent = isAr ? topic.summary.ar : topic.summary.en;
    Object.assign(descText.style, {
      fontSize: "12.5px",
      color: "rgba(255, 255, 255, 0.8)",
      lineHeight: "1.6",
    });

    const hintText = document.createElement("div");
    hintText.innerHTML = `
      <span style="color:#29ADFF; font-weight:600;">${isAr ? "القاعدة المرتبطة في اللعبة:" : "Space Benders Rule:"}</span>
      <span style="color:rgba(255,255,255,0.7);">${isAr ? topic.gameRuleHint.ar : topic.gameRuleHint.en}</span>
    `;
    hintText.style.fontSize = "11.5px";

    // Nav Controls (Prev / Next Topic)
    const navBar = document.createElement("div");
    Object.assign(navBar.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "6px",
      paddingTop: "10px",
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
      if (this.activeVideoIndex > 0) {
        this.openVideo(this.activeVideoIndex - 1);
      }
    });

    const nextBtn = document.createElement("button");
    nextBtn.disabled = this.activeVideoIndex === VIDEO_TOPICS.length - 1;
    nextBtn.textContent = isAr ? "المقطع التالي →" : "Next Video →";
    Object.assign(nextBtn.style, {
      background: "rgba(255, 255, 255, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "6px",
      color: nextBtn.disabled ? "rgba(255, 255, 255, 0.25)" : "#ffffff",
      padding: "6px 14px",
      fontSize: "11px",
      fontWeight: "600",
      cursor: nextBtn.disabled ? "not-allowed" : "pointer",
    });
    nextBtn.addEventListener("click", () => {
      if (this.activeVideoIndex < VIDEO_TOPICS.length - 1) {
        this.openVideo(this.activeVideoIndex + 1);
      }
    });

    navBar.append(prevBtn, nextBtn);
    footer.append(descText, hintText, navBar);

    modal.append(head, videoContainer, footer);
    overlay.appendChild(modal);

    // Close on click outside modal
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.closeVideo();
      }
    });

    return overlay;
  }
}
