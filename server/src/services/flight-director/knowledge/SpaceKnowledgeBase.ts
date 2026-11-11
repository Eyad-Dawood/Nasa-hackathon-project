import type { KnowledgeArticle } from "../types/FlightPlanTypes";

/**
 * Curated NASA/JPL grounded educational knowledge base for ages 7–14 and
 * Flight Director engineering explanations. Every URL is an official public
 * NASA / NASA Science resource and is cited strictly when relevant.
 */
export const SPACE_KNOWLEDGE_ARTICLES: readonly KnowledgeArticle[] = [
  {
    id: "solar_inverse_square",
    title: "Sunlight Strength & the Inverse-Square Law Across the Solar System",
    organization: "NASA Science",
    url: "https://science.nasa.gov/solar-system/",
    topics: [
      "solar",
      "sunlight",
      "power",
      "europa",
      "jupiter",
      "titan",
      "saturn",
      "mars",
      "sun",
      "inverse-square",
      "energy",
      "شمس",
      "طاقة",
      "ألواح",
      "أوروبا",
      "تيتان",
    ],
    missions: ["M01", "M02", "M03", "M04", "M05", "M06"],
    summary:
      "Sunlight spreads out rapidly as you travel away from the Sun: at double the distance, sunlight is only 1/4 as strong (the inverse-square law).",
    facts: [
      "At Earth's distance (1 AU, Moon / LEO missions M01 & M04), solar arrays receive 100% of baseline sunlight.",
      "At Mars (~1.5 AU, M02), sunlight drops to roughly 43%–50%, cutting solar panel output in half.",
      "At Jupiter / Europa (~5.2 AU, M03), sunlight is only ~3.7% (modeled as 10% in game rules), so even huge solar wings like NASA's Juno and Europa Clipper need enormous arrays or much less power demand.",
      "At Saturn / Titan (~9.5 AU, M06), sunlight falls to roughly 1%, making solar panels nearly useless.",
      "Close to the Sun (M05), sunlight jumps dramatically (300% in game rules), flooding solar panels with abundant power—if you survive the heat!",
    ],
    ageFriendlyAnalogy:
      "Imagine shining a flashlight close to a wall versus across a gym—the same light spreads over a bigger circle, so each square gets much dimmer.",
    gameConnection:
      "Solar panels (PT01–PT04) multiply power_made by sunlight_pct/100. Use Solar near Earth/Sun (M01, M04, M05) and switch to Nuclear power (PT05–PT07) for Europa (10% sun) and Titan (1% sun).",
  },
  {
    id: "nuclear_rtg_deep_space",
    title: "Nuclear & Radioisotope Power for Outer Solar System Missions",
    organization: "NASA Science — Radioisotope Power Systems",
    url: "https://science.nasa.gov/planetary-science/programs/radioisotope-power-systems/",
    topics: [
      "nuclear",
      "reactor",
      "rtg",
      "titan",
      "europa",
      "battery",
      "night",
      "dark",
      "dragonfly",
      "نووي",
      "مفاعل",
      "بطارية",
      "ظلام",
    ],
    missions: ["M02", "M03", "M06"],
    summary:
      "When destinations are too dark, dusty, or far from the Sun, NASA spacecraft carry Radioisotope Thermoelectric Generators (MMRTGs) or nuclear power instead of relying on sunlight.",
    facts: [
      "Real NASA spacecraft like Voyager 1 & 2, Cassini (Saturn/Titan), Curiosity & Perseverance (Mars), and upcoming Titan rotorcraft Dragonfly use radioisotope power.",
      "Nuclear systems generate steady electrical power 24/7—day or night, in thick haze like Titan, or billions of kilometers from the Sun.",
      "Because nuclear sources do not depend on sunlight, spacecraft using nuclear-only power do not require nighttime solar battery banks.",
    ],
    ageFriendlyAnalogy:
      "Solar panels are like a solar calculator; nuclear power is like carrying your own long-lasting power plant inside a thermos.",
    gameConnection:
      "PT05–PT07 produce constant power unaffected by sunlightPct and never trigger the Night Battery rule (#5) unless you also keep a solar panel on board.",
  },
  {
    id: "lunar_night_batteries",
    title: "Planetary Eclipses, Long Lunar Nights & Battery Storage",
    organization: "NASA Science — The Moon",
    url: "https://science.nasa.gov/moon/",
    topics: [
      "battery",
      "batteries",
      "night",
      "moon",
      "eclipse",
      "shadow",
      "storage",
      "leo",
      "بطاريات",
      "ليل",
      "قمر",
    ],
    missions: ["M01", "M02", "M03", "M04"],
    summary:
      "Solar-powered spacecraft spend time in orbital shadow or long planetary nights and must store energy in rechargeable batteries to keep computers and heaters alive.",
    facts: [
      "A single night on the Moon lasts about 14 Earth days—two straight weeks of freezing darkness without any sunlight.",
      "Even satellites in Low Earth Orbit (M04) pass through Earth's shadow roughly every 90 minutes, cycling batteries thousands of times.",
      "Mars nights (~12 hours) and dust storms also interrupt solar charging.",
    ],
    ageFriendlyAnalogy:
      "A battery is like a water tank filled during sunny daytime so your spacecraft can keep sipping power after sunset.",
    gameConnection:
      "Whenever at least one solar panel (PT01–PT04) is installed and mission nightNeed > 0, Battery Storage (PT08–PT10) must be >= nightNeed (40 at Moon, 20 at Mars/Europa/LEO).",
  },
  {
    id: "jupiter_radiation_shielding",
    title: "Radiation Hazards at Jupiter, Europa & Close Solar Orbits",
    organization: "NASA Science — Europa Clipper",
    url: "https://science.nasa.gov/mission/europa-clipper/",
    topics: [
      "radiation",
      "shield",
      "water",
      "europa",
      "sun",
      "magnetosphere",
      "vault",
      "computer",
      "إشعاع",
      "درع",
      "مياه",
      "حماية",
    ],
    missions: ["M01", "M02", "M03", "M05", "M06"],
    summary:
      "High-energy trapped particle belts around Jupiter and intense solar energetic particles near the Sun can flip computer memory bits and damage electronics unless shielded.",
    facts: [
      "Jupiter's giant magnetic field traps fierce radiation belts around Europa—NASA's Europa Clipper uses a thick titanium-aluminum radiation vault to protect sensitive electronics.",
      "Hydrogen-rich materials like water are surprisingly effective radiation shields because hydrogen nuclei break up incoming particles efficiently—inspiring NASA's water-wall concepts for deep-space habitats.",
      "Near the Sun (M05, radiation 12), solar flares and particle storms demand heavy shielding.",
      "In Low Earth Orbit below the Van Allen belts (M04, radiation 0), Earth's magnetic field shields spacecraft naturally.",
    ],
    ageFriendlyAnalogy:
      "Radiation is like tiny invisible hailstones moving super fast—you put your spacecraft computer inside armor or behind a wall of water so the electronics don't get scrambled.",
    gameConnection:
      "Match mission radiation using SC07–SC11 shields plus SC15 Rugged Computer (+1 Radiation). Water Wall (SC08) gives cheap radiation 4 when you have spare Space.",
  },
  {
    id: "thermal_protection_extremes",
    title: "Surviving Extreme Heat Near the Sun & Deep Cold Outer Worlds",
    organization: "NASA Science — Parker Solar Probe",
    url: "https://science.nasa.gov/mission/parker-solar-probe/",
    topics: [
      "heat",
      "thermal",
      "insulation",
      "blanket",
      "sun",
      "titan",
      "europa",
      "cold",
      "cryogenic",
      "حرارة",
      "عزل",
      "شمس",
    ],
    missions: ["M01", "M02", "M03", "M04", "M05", "M06"],
    summary:
      "Spacecraft thermal protection keeps instruments from roasting near the Sun or freezing solid in outer-planet cold.",
    facts: [
      "NASA's Parker Solar Probe flies through the Sun's scorching corona behind a carbon-composite heat shield while keeping instruments near room temperature.",
      "Spacecraft also use shiny Multi-Layer Insulation (MLI) gold/silver thermal blankets to reflect heat or lock warmth inside at cryogenic places like Europa (-160 °C) and Titan (-179 °C).",
      "Notice Titan's thick nitrogen-methane atmosphere conducts cold fast compared to vacuum, making thermal insulation (heat_protection 9) essential.",
    ],
    ageFriendlyAnalogy:
      "Thermal insulation works like an astronaut's thermos—keeping hot heat out near a campfire and keeping precious warmth in during a blizzard.",
    gameConnection:
      "Stack Insulation parts (PT14 +2, PT15 +5, PT16 +9) to meet mission heatDanger (11 at Sun Watcher, 9 at Titan, 7 at Europa).",
  },
  {
    id: "propulsion_thrust_vs_ion",
    title: "Chemical Rockets vs. Ion Electric Propulsion & Launch Mass",
    organization: "NASA Glenn Research Center",
    url: "https://www.nasa.gov/centers-and-facilities/glenn/solar-electric-propulsion/",
    topics: [
      "thrust",
      "engine",
      "ion",
      "rocket",
      "fuel",
      "mass",
      "weight",
      "nose",
      "cone",
      "gravity",
      "دفع",
      "محرك",
      "وقود",
      "كتلة",
    ],
    missions: ["M01", "M02", "M03", "M04", "M05", "M06"],
    summary:
      "Heavier spacecraft need more thrust to lift off and accelerate, while high-efficiency ion engines sip fuel compared to heavy chemical rockets.",
    facts: [
      "Every extra kilogram of structure or payload increases the thrust required to overcome gravity and drag during launch.",
      "Smooth aerodynamic nose cones reduce atmospheric drag during ascent, lowering the effective push needed to clear the atmosphere.",
      "Chemical rockets produce massive thrust quickly for heavy payloads, while Xenon Ion thrusters (used on NASA Dawn, DART, and Psyche) use electrical power to push gently while consuming far less propellant over deep-space trips.",
    ],
    ageFriendlyAnalogy:
      "A rocket engine is like a sprinter giving a giant shove off the starting block; an ion engine is like a marathon glider needing electrical power to run super far on very little fuel.",
    gameConnection:
      "Thrust >= Mass × (launchPull - SC19 nose cone 0.1). Fuel needed = distanceRating × max engine fuelBurn (burn does NOT stack!). Low-burn Ion engines (burn 1) halve or third fuel tank requirements vs rockets (burn 2–3), but consume Power.",
  },
  {
    id: "deep_space_comms_dsn",
    title: "Deep Space Network, Radio Range & Onboard Data Compression",
    organization: "NASA SCaN — Deep Space Network",
    url: "https://www.nasa.gov/directorates/somd/space-communications-and-navigation-program/what-is-the-deep-space-network/",
    topics: [
      "comms",
      "radio",
      "antenna",
      "dish",
      "signal",
      "range",
      "data",
      "compressor",
      "booster",
      "dsn",
      "اتصالات",
      "إشارة",
      "راديو",
      "بيانات",
    ],
    missions: ["M01", "M02", "M03", "M04", "M05", "M06"],
    summary:
      "Outer-planet probes need large directional dishes and strong signal reach to whisper science across hundreds of millions of kilometers, while data compression shrinks science files before transmission.",
    facts: [
      "Radio signal strength drops rapidly with distance (inverse-square law), so missions to Jupiter (M03) and Saturn/Titan (M06) need high-gain dishes or signal boosters.",
      "Data compression and onboard memory buffers shrink raw camera images and radar files so slower deep-space links don't fall behind.",
      "High-speed optical laser links (like NASA's DSOC experiment on Psyche) deliver huge bandwidth using power, though aiming across deep space requires precision.",
    ],
    ageFriendlyAnalogy:
      "Talking from Saturn is like whispering across a stadium—you need a big megaphone dish aimed right at Earth and compressed notes so nothing gets dropped.",
    gameConnection:
      "Signal Range = best radio + boosters (>= signalNeed). Data Rate = sum of radios + Antenna Pointer Motor (>= dataMade - dataReduction). Every ship needs >= 1 radio.",
  },
  {
    id: "europa_and_titan_science",
    title: "Science Targets: Europa's Subsurface Ocean & Titan's Methane World",
    organization: "NASA Science — Ocean Worlds",
    url: "https://science.nasa.gov/jupiter/moons/europa/",
    topics: [
      "science",
      "europa",
      "ice",
      "radar",
      "titan",
      "methane",
      "chemistry",
      "mars",
      "sun",
      "spectrometer",
      "instrument",
      "علوم",
      "رادار",
      "كيمياء",
    ],
    missions: ["M01", "M02", "M03", "M05", "M06"],
    summary:
      "Each mission's Star Instrument mirrors real planetary science tools—like ice-penetrating radar at Europa, chemistry labs at Titan, rock analyzers at Mars, and spectrometers near the Sun.",
    facts: [
      "Europa hides a global saltwater ocean beneath kilometers of ice; ice-penetrating radar probes through the icy shell to map water below.",
      "Saturn's moon Titan has a thick nitrogen-methane haze plus rivers, lakes, and rain of liquid methane—chemistry analyzers study its complex organic molecules.",
      "Mars rock and soil analyzers study ancient minerals that record whether liquid water once flowed there.",
      "Every high-resolution sensor produces data and uses onboard computing ('brain') to process science readings safely.",
    ],
    ageFriendlyAnalogy:
      "Think of each Star Instrument as the exact detective tool built for that world's biggest mystery—ice radar to peek under frozen armor, or a chemistry sniffer for misty methane lakes.",
    gameConnection:
      "Installing the mission's Star Instrument gives +10 free Science Points toward rule #11 (e.g. SI04 at Moon, SI14 at Mars, SI19 at Europa, SI02 at LEO, SI12 at Sun, SI16 at Titan).",
  },
];

