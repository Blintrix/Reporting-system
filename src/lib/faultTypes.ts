export type TelOneServiceKey =
  "adsl" | "lte" | "ftth" | "xftth" | "voip" | "voice" | "core_auxiliary";

export interface TelOneServiceInfo {
  key: TelOneServiceKey;
  label: string;
  shortCode: string;
  technology: string;
  description: string;
  color: string;
  badgeClass: string;
}

export const TELONE_SERVICES: Record<TelOneServiceKey, TelOneServiceInfo> = {
  adsl: {
    key: "adsl",
    label: "ADSL Broadband",
    shortCode: "ADSL",
    technology: "Copper-based ADSL2+ / Asymmetric Digital Subscriber Line",
    description:
      "Copper line internet connection delivered from TelOne exchange/MSAN to subscriber modem.",
    color: "text-amber-700 dark:text-amber-300",
    badgeClass:
      "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-700",
  },
  lte: {
    key: "lte",
    label: "Blaze LTE / Wireless",
    shortCode: "LTE",
    technology: "4G LTE TDD/FDD 1800/2300MHz Wireless Broadband",
    description:
      "TelOne Blaze LTE wireless high-speed data service delivered via outdoor CPE, MiFi, or router.",
    color: "text-purple-700 dark:text-purple-300",
    badgeClass:
      "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-400 dark:border-purple-700",
  },
  ftth: {
    key: "ftth",
    label: "FTTH GPON Fiber",
    shortCode: "FTTH",
    technology: "Gigabit Passive Optical Network (GPON ITU-T G.984)",
    description:
      "High-speed optical fiber directly to homes and offices via aerial/underground drop cables.",
    color: "text-emerald-700 dark:text-emerald-300",
    badgeClass:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700",
  },
  xftth: {
    key: "xftth",
    label: "XFTTH / XGPON 10G Fiber",
    shortCode: "XFTTH",
    technology: "10G-PON / XGS-PON (ITU-T G.9807.1) 10Gbps Symmetric",
    description:
      "Next-generation 10-Gigabit optical fiber for enterprise and high-capacity connections.",
    color: "text-cyan-700 dark:text-cyan-300",
    badgeClass:
      "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-400 dark:border-cyan-700",
  },
  voip: {
    key: "voip",
    label: "VoIP / SIP Voice Service",
    shortCode: "VoIP",
    technology: "Session Initiation Protocol (SIP) Voice over IP / Hosted PBX",
    description: "TelOne IP voice telephony, SIP trunking, and hosted IP-PBX communication.",
    color: "text-blue-700 dark:text-blue-300",
    badgeClass:
      "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-400 dark:border-blue-700",
  },
  voice: {
    key: "voice",
    label: "PSTN Copper Voice Landline",
    shortCode: "VOICE",
    technology: "POTS Analogue Copper Pair / Main Distribution Frame (MDF)",
    description:
      "Traditional TelOne telephone landline voice service with analogue dial tone and copper loop.",
    color: "text-indigo-700 dark:text-indigo-300",
    badgeClass:
      "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-400 dark:border-indigo-700",
  },
  core_auxiliary: {
    key: "core_auxiliary",
    label: "Core Exchange & Power Plant",
    shortCode: "CORE",
    technology: "Central Exchange / MSAN Cabinet / DC Power & Generator",
    description: "Regional backbone hubs, street MSAN distribution pillars, and power plant.",
    color: "text-rose-700 dark:text-rose-300",
    badgeClass:
      "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-400 dark:border-rose-700",
  },
};

export type FaultTypeKey =
  // FTTH (GPON)
  | "ftth_fiber_cut"
  | "ftth_high_loss"
  // XFTTH (10G XGPON)
  | "xftth_optical_mismatch"
  | "xftth_sfp_overload"
  // ADSL (Broadband)
  | "adsl_sync_loss"
  | "adsl_snr_attenuation"
  // LTE (Wireless)
  | "lte_signal_loss"
  | "lte_sim_geo_lock"
  // VoIP (SIP)
  | "voip_sip_registration"
  | "voip_one_way_audio"
  // Voice (Copper Landline)
  | "copper_no_dialtone"
  | "copper_earth_fault"
  | "copper_static_noise"
  // Core & Aux
  | "exchange_outage"
  | "power_generator"
  | "hardware_cabinet"
  | "general_telecom"
  // Legacy aliases
  | "fiber_cut"
  | "copper_landline"
  | "broadband_adsl_lte";

export interface FaultFixStep {
  step: number;
  action: string;
  detail: string;
}

export interface FaultTypeDefinition {
  id: FaultTypeKey;
  key: FaultTypeKey;
  serviceKey: TelOneServiceKey;
  serviceLabel: string;
  label: string;
  category: string;
  description: string;
  color: string;
  badgeClass: string;
  borderClass: string;
  iconName:
    | "Zap"
    | "Building2"
    | "PhoneCall"
    | "Wifi"
    | "BatteryWarning"
    | "Cpu"
    | "AlertTriangle"
    | "Radio"
    | "Activity";
  typicalSeverity: "low" | "medium" | "high" | "critical";
  defaultRecommendedAction: string;
  recommendedAction: string;
  bestWayToFix: FaultFixStep[];
  requiredTools: string[];
  safetyPrecautions: string;
  estimatedRepairTimeMinutes: number;
  keywords: string[];
}

export const FAULT_TYPE_DEFINITIONS: Record<FaultTypeKey, FaultTypeDefinition> = {
  // -------------------------------------------------------------
  // 1. FTTH (Fiber to the Home - GPON)
  // -------------------------------------------------------------
  ftth_fiber_cut: {
    id: "ftth_fiber_cut",
    key: "ftth_fiber_cut",
    serviceKey: "ftth",
    serviceLabel: "FTTH GPON Fiber",
    label: "FTTH Fiber Drop Severed / Cable Cut",
    category: "FTTH Optical Infrastructure",
    description:
      "Physical fiber drop cable from pole FAT box to subscriber house is snapped or severed, causing total loss of optical signal.",
    color: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10",
    badgeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
    borderClass: "border-rose-500/30",
    iconName: "Zap",
    typicalSeverity: "critical",
    defaultRecommendedAction:
      "Locate physical drop break, perform core-alignment fusion splice (<0.02dB loss), install protective heat-shrink sleeve, and verify ONT PON link state O5.",
    recommendedAction:
      "Locate physical drop break, perform core-alignment fusion splice (<0.02dB loss), install protective heat-shrink sleeve, and verify ONT PON link state O5.",
    bestWayToFix: [
      {
        step: 1,
        action: "Pinpoint Break Location",
        detail:
          "Trace aerial drop cable from FAT (Fiber Access Terminal) on utility pole to subscriber building entry. Use Visual Fault Locator (VFL red laser) to spot red light leakage.",
      },
      {
        step: 2,
        action: "Prepare Optical Fiber",
        detail:
          "Strip outer jacket of G.657A2 drop cable (30mm), clean bare 125µm silica core with 99% isopropyl alcohol, and precision-cleave at 90 degrees with an optical cleaver.",
      },
      {
        step: 3,
        action: "Execute Fusion Splice",
        detail:
          "Place fibers in automatic core-alignment fusion splicer. Complete arc splice ensuring loss is <0.02dB. Encase joint in a 45mm steel-reinforced heat-shrink protection sleeve.",
      },
      {
        step: 4,
        action: "Measure Optical Power (OPM)",
        detail:
          "Connect Optical Power Meter at subscriber SC/APC wall socket at 1490nm. Target Rx power must be between -16.0dBm and -24.0dBm.",
      },
      {
        step: 5,
        action: "Verify ONT Synchronization",
        detail:
          "Plug green SC/APC connector into subscriber ONT. Confirm LOS red light turns off and PON indicator shines solid green (GPON O5 synchronized state).",
      },
    ],
    requiredTools: [
      "Core-Alignment Optical Fusion Splicer",
      "Precision Optical Fiber Cleaver",
      "Optical Power Meter (OPM 1310/1490/1550nm)",
      "Visual Fault Locator (VFL 20mW Red Laser)",
      "Fiber Jacket & Buffer Tube Strippers",
      "99% Isopropyl Alcohol & Lint-free Wipes",
      "Heat-Shrink Splice Sleeves (45mm)",
      "Aerial Drop Wire Tension Clamps",
    ],
    safetyPrecautions:
      "CLASS 1M LASER HAZARD: Never look directly into energized fiber cores. Wear safety glasses and dispose of cleaved glass shards in a dedicated sharps container.",
    estimatedRepairTimeMinutes: 45,
    keywords: [
      "fiber cut",
      "fibre cut",
      "cable snapped",
      "severed",
      "drop wire",
      "dambuka",
      "waya dze fiber",
      "intambo",
      "zidabukileyo",
      "loss of light",
      "los red",
      "ftth",
      "gpon",
      "fiber broken",
      "ont red light",
      "red blinking",
      "pon light off",
      "pole snapped",
      "tree fell on fiber",
    ],
  },
  ftth_high_loss: {
    id: "ftth_high_loss",
    key: "ftth_high_loss",
    serviceKey: "ftth",
    serviceLabel: "FTTH GPON Fiber",
    label: "FTTH High Optical Attenuation / Macro-Bend / Dirty Connector",
    category: "FTTH Optical Infrastructure",
    description:
      "Optical power level is degraded below -27dBm due to tight indoor cable bending, contaminated SC/APC connector, or a degraded splitter port.",
    color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    borderClass: "border-amber-500/30",
    iconName: "Activity",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Inspect indoor patch cord for tight bends (<15mm), clean all SC/APC end-faces with fiber cleaning pen, and test FAT splitter port.",
    recommendedAction:
      "Inspect indoor patch cord for tight bends (<15mm), clean all SC/APC end-faces with fiber cleaning pen, and test FAT splitter port.",
    bestWayToFix: [
      {
        step: 1,
        action: "Measure Received Optical Power",
        detail:
          "Test optical signal at the customer ONT SC/APC input port with Optical Power Meter at 1490nm. Note power level (loss detected if < -27dBm).",
      },
      {
        step: 2,
        action: "Inspect Indoor Patch Cord",
        detail:
          "Check yellow/white indoor optical patch lead for crushing or tight corners. Ensure minimum bend radius of 15mm is maintained. Replace damaged patch cords.",
      },
      {
        step: 3,
        action: "Clean SC/APC Optical Connectors",
        detail:
          "Use a 2.5mm One-Click Fiber Cleaning Pen to dry-clean the green SC/APC bulkhead and male connectors at both the wall box and ONT.",
      },
      {
        step: 4,
        action: "Audit Pole FAT Splitter Port",
        detail:
          "If optical loss persists, open pole FAT box. Measure the 1:8 optical splitter output port. If port loss exceeds standard, migrate subscriber to an unassigned clean port.",
      },
      {
        step: 5,
        action: "Perform Speed & Stability Test",
        detail:
          "Confirm Rx power is normalized between -18dBm and -23dBm. Run continuous ping and speed test to confirm zero packet loss.",
      },
    ],
    requiredTools: [
      "Optical Power Meter (OPM)",
      "2.5mm One-Click Fiber Cleaning Pen",
      "Fiber Video Inspection Microscope",
      "Replacement SC/APC to SC/APC Patch Leads (2m/3m)",
      "Pole Climbing Safety Ladder",
    ],
    safetyPrecautions:
      "Do not touch ferrule end-faces with bare fingers. Wear safety harness when working on FAT pole box.",
    estimatedRepairTimeMinutes: 30,
    keywords: [
      "fiber slow",
      "high loss",
      "attenuation",
      "macro-bend",
      "flashing red",
      "los blinking",
      "dirty connector",
      "patch cord",
      "packet loss fiber",
      "fiber intermittent",
      "inononoka",
      "inethiwekhi ihamba kancane",
    ],
  },

  // -------------------------------------------------------------
  // 2. XFTTH (10G XGPON Fiber)
  // -------------------------------------------------------------
  xftth_optical_mismatch: {
    id: "xftth_optical_mismatch",
    key: "xftth_optical_mismatch",
    serviceKey: "xftth",
    serviceLabel: "XFTTH / XGPON 10G Fiber",
    label: "XGS-PON 10G Wavelength & Coexistence Attenuation",
    category: "10G Optical Infrastructure",
    description:
      "10-Gigabit XGS-PON carrier synchronization failure; downstream 1577nm or upstream 1270nm optical carrier attenuated by high reflection return loss.",
    color: "text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    badgeClass:
      "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800",
    borderClass: "border-cyan-500/30",
    iconName: "Zap",
    typicalSeverity: "critical",
    defaultRecommendedAction:
      "Measure dual 1577nm/1270nm wavelengths with XGS-PON meter, clean angled SC/APC optical interfaces with micro-cassette, and verify OLT GEM profile.",
    recommendedAction:
      "Measure dual 1577nm/1270nm wavelengths with XGS-PON meter, clean angled SC/APC optical interfaces with micro-cassette, and verify OLT GEM profile.",
    bestWayToFix: [
      {
        step: 1,
        action: "Dual-Wavelength Optical Measurement",
        detail:
          "Connect Dual-Wavelength XGS-PON Power Meter. Measure 1577nm (downstream 10G) and 1270nm (upstream 10G). Verify link budget is within Class N1/N2 standard (<29dB total loss).",
      },
      {
        step: 2,
        action: "Inspect WDM1r Multiplexer",
        detail:
          "Inspect WDM1r coexistence multiplexer filter at OLT chassis to confirm proper isolation between legacy 1490nm GPON and 1577nm XGS-PON wavelengths.",
      },
      {
        step: 3,
        action: "High-Grade Optical End-Face Cleaning",
        detail:
          "Clean angled SC/APC and LC/APC connectors with high-density lint-free micro-fiber cleaning tape. Optical Return Loss (ORL) must exceed 32dB.",
      },
      {
        step: 4,
        action: "Validate OLT GEM Port & T-CONT Allocation",
        detail:
          "Access TelOne OLT EMS management console. Verify 10G ONT Serial Number registration, T-CONT bandwidth profile, and GEM port mapping.",
      },
      {
        step: 5,
        action: "Run 10G Line-Rate Throughput Benchmark",
        detail:
          "Perform RFC 2544 / ITU-T Y.1564 throughput test to verify 10Gbps symmetric capacity with zero frame discard.",
      },
    ],
    requiredTools: [
      "Dual-Wavelength XGS-PON Power Meter (1577/1270nm)",
      "High-Density Fiber Cleaning Cassette",
      "Core-Alignment Fusion Splicer",
      "10G SFP+ Network Traffic Analyzer",
      "Laptop with OLT EMS Console Access",
    ],
    safetyPrecautions:
      "HIGH POWER OPTICAL EMISSION: 10G optical launch power is intensified. Avoid skin and optical exposure.",
    estimatedRepairTimeMinutes: 60,
    keywords: [
      "10g",
      "10gbps",
      "xftth",
      "xgpon",
      "xgs-pon",
      "1577nm",
      "10g fiber",
      "enterprise fiber",
      "gem port",
      "t-cont",
      "wdm1r",
      "fiber 10 gig",
    ],
  },
  xftth_sfp_overload: {
    id: "xftth_sfp_overload",
    key: "xftth_sfp_overload",
    serviceKey: "xftth",
    serviceLabel: "XFTTH / XGPON 10G Fiber",
    label: "10GbE SFP+ Transceiver Link Drop / Thermal Throttling / VLAN Flap",
    category: "10G Optical Infrastructure",
    description:
      "Enterprise 10G SFP+ optical transceiver overheating or experiencing periodic interface flapping, causing corporate multi-service VLAN trunk drop.",
    color: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
    badgeClass:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
    borderClass: "border-indigo-500/30",
    iconName: "Cpu",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Check SFP+ DOM temperature and optical power, replace degraded 10GBASE-LR module, and audit VLAN trunking tags.",
    recommendedAction:
      "Check SFP+ DOM temperature and optical power, replace degraded 10GBASE-LR module, and audit VLAN trunking tags.",
    bestWayToFix: [
      {
        step: 1,
        action: "Check SFP+ DOM Telemetry",
        detail:
          "Query SFP+ DOM (Digital Optical Monitoring) parameters via switch CLI: check internal temperature (must be <70°C), TX bias current, and supply voltage.",
      },
      {
        step: 2,
        action: "Improve Rack Thermal Dissipation",
        detail:
          "Inspect enterprise rack airflow, clean dust filters, and ensure 1RU thermal spacing around the 10G optical gateway router.",
      },
      {
        step: 3,
        action: "Replace SFP+ Transceiver & Patch Cable",
        detail:
          "Swap degraded SFP+ module with a fresh TelOne certified 10GBASE-LR/ER optical transceiver. Replace OM4 LC-LC duplex optical jumper.",
      },
      {
        step: 4,
        action: "Audit VLAN & QinQ Configurations",
        detail:
          "Verify multi-service 802.1Q VLAN IDs (Internet, SIP Trunk, MPLS VPN) on router sub-interfaces and verify no MTU mismatches (standard 1500 / jumbo 9000).",
      },
      {
        step: 5,
        action: "Execute Link Stability Monitoring",
        detail:
          "Monitor interface error counters (CRC, frame alignment) for 15 minutes to guarantee zero link flaps.",
      },
    ],
    requiredTools: [
      "10GBASE-LR SFP+ Transceivers",
      "OM4 Duplex LC-LC Optical Jumpers",
      "10G Ethernet Packet Analyzer",
      "Console Cable & Diagnostic Laptop",
      "Air Duster Canister",
    ],
    safetyPrecautions:
      "Electrostatic Discharge (ESD) wrist strap required when replacing SFP+ transceivers in server racks.",
    estimatedRepairTimeMinutes: 45,
    keywords: [
      "sfp+",
      "transceiver",
      "10g drop",
      "interface flap",
      "vlan drop",
      "overheating sfp",
      "corporate line down",
      "10gbps link down",
    ],
  },

  // -------------------------------------------------------------
  // 3. ADSL (Broadband)
  // -------------------------------------------------------------
  adsl_sync_loss: {
    id: "adsl_sync_loss",
    key: "adsl_sync_loss",
    serviceKey: "adsl",
    serviceLabel: "ADSL Broadband",
    label: "ADSL Loss of Sync / Blinking DSL Light",
    category: "ADSL Copper Broadband",
    description:
      "Modem DSL light is flashing continuously; subscriber modem cannot establish physical carrier synchronization with exchange DSLAM port.",
    color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    borderClass: "border-amber-500/30",
    iconName: "Wifi",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Measure copper line DC voltage (-48V), replace lightning-damaged microfilter, and verify Krone jumper at roadside DP box.",
    recommendedAction:
      "Measure copper line DC voltage (-48V), replace lightning-damaged microfilter, and verify Krone jumper at roadside DP box.",
    bestWayToFix: [
      {
        step: 1,
        action: "Check DC Line Voltage & Microfilter",
        detail:
          "Measure DC voltage at master phone socket (should read ~ -48V DC idle). Inspect subscriber ADSL splitter / microfilter for lightning surge damage; replace with new microfilter.",
      },
      {
        step: 2,
        action: "Test Line at Roadside DP Box",
        detail:
          "Connect ADSL handheld test set directly to the subscriber pair at roadside DP (Distribution Point) box. Check if DSL sync locks directly from DP.",
      },
      {
        step: 3,
        action: "Inspect DP Terminal Contacts & Jumper",
        detail:
          "Clean oxidized brass screws or punch down Krone jumper wire on DP block. Replace broken drop lead section if continuity is lost.",
      },
      {
        step: 4,
        action: "Measure SNR Margin & Attenuation",
        detail:
          "Verify downstream SNR margin is > 6dB and downstream attenuation is < 45dB on tester. If SNR is marginal, re-profile DSLAM port at exchange.",
      },
      {
        step: 5,
        action: "Reconnect Subscriber Modem",
        detail:
          "Plug RJ11 line into subscriber modem. Confirm DSL light turns solid green, Internet LED turns green, and PPPoE authentication succeeds.",
      },
    ],
    requiredTools: [
      "Digital Multimeter (DC/AC Volts & Resistance)",
      "ADSL2+ Handheld Tester",
      "Krone Punchdown Tool",
      "Replacement ADSL Microfilters & Splitters",
      "RJ11 Crimp Tool & Plugs",
      "Wire Stripper & Terminal Screwdrivers",
    ],
    safetyPrecautions:
      "Beware 48V-90V DC telecom line voltage on copper pairs. Disconnect equipment during active thunderstorms.",
    estimatedRepairTimeMinutes: 40,
    keywords: [
      "adsl",
      "dsl blinking",
      "broadband down",
      "modem blinking",
      "dsl light",
      "no sync",
      "sync loss",
      "adsl modem",
      "broadband disconnected",
      "microfilter",
      "dslam",
      "adsl haisi kushanda",
      "modem inobwaira",
    ],
  },
  adsl_snr_attenuation: {
    id: "adsl_snr_attenuation",
    key: "adsl_snr_attenuation",
    serviceKey: "adsl",
    serviceLabel: "ADSL Broadband",
    label: "ADSL High Attenuation / Waterlogged Joint / Intermittent Drops",
    category: "ADSL Copper Broadband",
    description:
      "Severe broadband speed degradation (<1Mbps) and frequent line drops during wet weather due to water ingress in cable joints and low SNR margin.",
    color: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10",
    badgeClass:
      "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800",
    borderClass: "border-orange-500/30",
    iconName: "Activity",
    typicalSeverity: "medium",
    defaultRecommendedAction:
      "Run TDR cable analysis to locate waterlogged joint, reseal with gel connectors, or migrate subscriber to clean spare copper pair.",
    recommendedAction:
      "Run TDR cable analysis to locate waterlogged joint, reseal with gel connectors, or migrate subscriber to clean spare copper pair.",
    bestWayToFix: [
      {
        step: 1,
        action: "TDR Copper Fault Distance Analysis",
        detail:
          "Connect Time Domain Reflectometer (TDR) to the copper pair. Locate impedance dips indicating water ingress, bridge taps, or corroded splices in meters.",
      },
      {
        step: 2,
        action: "Inspect Underground Joint Pit / Manhole",
        detail:
          "Open roadside cable manhole/pit. Inspect distribution cable sleeve for water entry. Drain water and re-crimp joints using moisture-proof gel-filled Scotchlok connectors.",
      },
      {
        step: 3,
        action: "Pair Swapping (Clean Spare Pair)",
        detail:
          "If original copper pair loop resistance exceeds 1200 ohms, test and allocate an unused healthy copper pair in the distribution cable at both DP and exchange MDF.",
      },
      {
        step: 4,
        action: "Re-Profile DSLAM Modulation",
        detail:
          "If line length from MSAN is >3.5km, configure DSLAM port to G.DMT or ADSL2 Annex M with target SNR margin of 9dB for maximum noise resilience.",
      },
      {
        step: 5,
        action: "Verify Line Throughput",
        detail:
          "Perform 15-minute speed test and ping monitoring. Confirm SNR margin remains stable above 9dB with 0 packet drops.",
      },
    ],
    requiredTools: [
      "TDR Copper Cable Fault Locator",
      "Gel-filled Scotchlok Crimp Connectors & Pliers",
      "Manhole Cover Lifting Keys",
      "Digital Multimeter / Loop Resistance Tester",
      "ADSL2+ Handheld Tester",
    ],
    safetyPrecautions:
      "Inspect manholes for gas accumulation before entry. Place safety cones and warning barriers around open pits.",
    estimatedRepairTimeMinutes: 60,
    keywords: [
      "adsl slow",
      "broadband dropping",
      "adsl rain",
      "water in cable",
      "snr margin",
      "high attenuation",
      "slow internet adsl",
      "line noise adsl",
      "disconnection adsl",
      "inononoka zvikuru",
    ],
  },

  // -------------------------------------------------------------
  // 4. LTE (Blaze LTE / Wireless)
  // -------------------------------------------------------------
  lte_signal_loss: {
    id: "lte_signal_loss",
    key: "lte_signal_loss",
    serviceKey: "lte",
    serviceLabel: "Blaze LTE / Wireless",
    label: "Blaze LTE Signal Loss / Red LOS LED / Base Station Down",
    category: "LTE Wireless Broadband",
    description:
      "Blaze LTE router displays zero signal bars or red LOS indicator due to base station load shedding power loss, PoE cable damage, or antenna misalignment.",
    color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10",
    badgeClass:
      "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    borderClass: "border-purple-500/30",
    iconName: "Radio",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Verify TelOne base tower power/operational status, inspect outdoor PoE cable (24V), and re-align directional antenna with RF analyzer.",
    recommendedAction:
      "Verify TelOne base tower power/operational status, inspect outdoor PoE cable (24V), and re-align directional antenna with RF analyzer.",
    bestWayToFix: [
      {
        step: 1,
        action: "Verify Base Station Status",
        detail:
          "Check TelOne NOC monitoring console for local LTE eNodeB base station power and backhaul status. Confirm tower is transmitting on 1800MHz/2300MHz.",
      },
      {
        step: 2,
        action: "Inspect Outdoor PoE Cable & Power",
        detail:
          "Measure DC voltage (24V/48V) output from the PoE power injector. Test Cat5e/Cat6 outdoor cable running to the rooftop CPE with an RJ45 cable tester.",
      },
      {
        step: 3,
        action: "RF Signal Measurement & Mast Alignment",
        detail:
          "Use an RF Handheld Analyzer at roof level. Measure RSRP (target > -95dBm), RSRQ (> -12dB), and SINR (> 5dB). Loosen mounting bracket and align antenna to line-of-sight tower.",
      },
      {
        step: 4,
        action: "Weatherproof Outdoor Cable Entry",
        detail:
          "Ensure UV-resistant outdoor cable and drip loop are secured. Apply self-amalgamating waterproof tape over outdoor RJ45 / N-type connectors.",
      },
      {
        step: 5,
        action: "Confirm Data Throughput",
        detail:
          "Reboot router. Verify all green signal LEDs illuminate and run Ookla speed test to confirm package speed tier.",
      },
    ],
    requiredTools: [
      "RF Handheld Spectrum Analyzer / LTE Signal Meter",
      "Outdoor Shielded RJ45 Crimper & Cat6 Cable",
      "Digital Multimeter (PoE Voltage Test)",
      "10mm - 13mm Spanner Set",
      "Rooftop Safety Climbing Harness & Helmet",
      "Self-Amalgamating Waterproof Tape",
    ],
    safetyPrecautions:
      "FALL HAZARD: Always attach safety harness when working on rooftop antenna masts. Keep clear of overhead electrical power lines.",
    estimatedRepairTimeMinutes: 50,
    keywords: [
      "lte",
      "blaze lte",
      "blaze",
      "lte no signal",
      "red los lte",
      "wireless down",
      "cpe router",
      "mifi",
      "signal bars zero",
      "antenna lte",
      "blaze haina signal",
      "inethiwekhi ye-lte",
    ],
  },
  lte_sim_geo_lock: {
    id: "lte_sim_geo_lock",
    key: "lte_sim_geo_lock",
    serviceKey: "lte",
    serviceLabel: "Blaze LTE / Wireless",
    label: "Blaze LTE SIM Unregistered / Geo-Lock Violation / APN Failure",
    category: "LTE Wireless Broadband",
    description:
      "Router indicates good LTE signal but data connectivity is blocked; SIM shows 'Unregistered', 'No Service', or APN authentication rejection.",
    color: "text-pink-600 dark:text-pink-400 border-pink-500/30 bg-pink-500/10",
    badgeClass:
      "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800",
    borderClass: "border-pink-500/30",
    iconName: "Radio",
    typicalSeverity: "medium",
    defaultRecommendedAction:
      "Verify APN configuration (telone.internet), check HSS core for Geo-Lock sector binding, and update registered Cell ID location.",
    recommendedAction:
      "Verify APN configuration (telone.internet), check HSS core for Geo-Lock sector binding, and update registered Cell ID location.",
    bestWayToFix: [
      {
        step: 1,
        action: "Check CPE Admin Interface",
        detail:
          "Log in to router admin portal (`192.168.8.1` or `192.168.0.1`). Verify APN profile is configured as `telone.internet` or `blaze.net` with PDP type IPv4/IPv6.",
      },
      {
        step: 2,
        action: "Verify Geo-Lock & HSS Core Binding",
        detail:
          "If subscriber recently relocated, query TelOne EPC / HSS core database. Update the SIM's authorized Cell ID / Tracking Area Code (TAC) to the current sector.",
      },
      {
        step: 3,
        action: "Test SIM Card Status in Test Terminal",
        detail:
          "Insert subscriber Blaze USIM into TelOne technician test handset. Confirm USIM is not locked, PIN blocked, or deactivated.",
      },
      {
        step: 4,
        action: "SIM Swap / Re-Provisioning",
        detail:
          "If USIM chip is damaged or de-registered, perform a SIM swap in TelOne CRM and bind the new IMSI to the subscriber's account bundle.",
      },
      {
        step: 5,
        action: "Reboot & Validate Data Session",
        detail:
          "Restart router, verify WAN IP is assigned via DHCP, and perform ping test to 8.8.8.8 and local TelOne DNS.",
      },
    ],
    requiredTools: [
      "Diagnostic Laptop with Ethernet Cable",
      "TelOne Test LTE Handset",
      "Fresh TelOne Blaze USIM Replacements",
      "TelOne CRM / HSS Core Admin Access",
    ],
    safetyPrecautions:
      "Ensure CPE is powered down before inserting or removing SIM card to prevent electrostatic chip damage.",
    estimatedRepairTimeMinutes: 30,
    keywords: [
      "sim lock",
      "geo lock",
      "blaze sim",
      "unregistered",
      "apn error",
      "blaze lte sim",
      "no data blaze",
      "sim card blocked",
      "sim swap",
    ],
  },

  // -------------------------------------------------------------
  // 5. VoIP (Voice over IP / SIP)
  // -------------------------------------------------------------
  voip_sip_registration: {
    id: "voip_sip_registration",
    key: "voip_sip_registration",
    serviceKey: "voip",
    serviceLabel: "VoIP / SIP Voice Service",
    label: "VoIP SIP Registration Failed / SIP 403 / SIP 408 Timeout",
    category: "VoIP & IP Telephony",
    description:
      "TelOne IP Phone or Grandstream/Yealink ATA cannot register with TelOne SIP Softswitch; device displays 'Registration Error' or 'Server Unreachable'.",
    color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10",
    badgeClass:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    borderClass: "border-blue-500/30",
    iconName: "PhoneCall",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Disable SIP ALG on router, verify SIP proxy IP (sip.telone.co.zw), open UDP 5060 port, and check digest authentication credentials.",
    recommendedAction:
      "Disable SIP ALG on router, verify SIP proxy IP (sip.telone.co.zw), open UDP 5060 port, and check digest authentication credentials.",
    bestWayToFix: [
      {
        step: 1,
        action: "Disable SIP ALG on Router / Modem",
        detail:
          "Access subscriber router/ONT management page. Navigate to Security / ALG settings and disable 'SIP ALG' (which corrupts SIP packet headers).",
      },
      {
        step: 2,
        action: "Audit IP Phone / ATA SIP Credentials",
        detail:
          "Open IP Phone web interface. Verify SIP Server Outbound Proxy (`sip.telone.co.zw`), SIP Port (UDP 5060), Display Name, User ID, and Digest Password.",
      },
      {
        step: 3,
        action: "Test DNS Resolution & Softswitch Reachability",
        detail:
          "Ping TelOne SIP Call Manager gateway from LAN. Verify DNS servers are set to TelOne primary (`41.221.80.2`) and secondary (`41.221.80.3`).",
      },
      {
        step: 4,
        action: "Verify Firewall UDP 5060 & 5061 Forwarding",
        detail:
          "Ensure router firewall allows outbound UDP traffic on ports 5060-5061. Set SIP Registration Expiry timer to 180 seconds to maintain NAT table state.",
      },
      {
        step: 5,
        action: "Test Inbound & Outbound Voice Calls",
        detail:
          "Verify IP phone LCD displays 'Registered'. Place a test call to TelOne 950 and receive an incoming test call to confirm two-way ringing.",
      },
    ],
    requiredTools: [
      "Technician Diagnostic Laptop",
      "Ethernet Patch Cables",
      "ATA / IP Phone Configuration Toolkit",
      "TelOne Softswitch Admin Console Access",
    ],
    safetyPrecautions:
      "Verify ATA power adapter is connected to a surge-protected socket to avoid power spike damage.",
    estimatedRepairTimeMinutes: 35,
    keywords: [
      "voip",
      "sip",
      "ip phone",
      "sip registration",
      "403 forbidden",
      "408 timeout",
      "ata",
      "grandstream",
      "yealink",
      "sip server",
      "voip haisi kushanda",
      "foni ye-internet",
    ],
  },
  voip_one_way_audio: {
    id: "voip_one_way_audio",
    key: "voip_one_way_audio",
    serviceKey: "voip",
    serviceLabel: "VoIP / SIP Voice Service",
    label: "VoIP One-Way Audio / Dead Air / Jitter & Choppy Speech",
    category: "VoIP & IP Telephony",
    description:
      "Calls connect successfully but only one party can hear (one-way RTP stream), or speech is severely robotic and fragmented due to packet jitter >50ms.",
    color: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
    badgeClass:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
    borderClass: "border-indigo-500/30",
    iconName: "PhoneCall",
    typicalSeverity: "medium",
    defaultRecommendedAction:
      "Configure STUN server / NAT keep-alive, open RTP UDP port range 10000-20000, and configure DSCP 46 (EF) QoS bandwidth prioritization.",
    recommendedAction:
      "Configure STUN server / NAT keep-alive, open RTP UDP port range 10000-20000, and configure DSCP 46 (EF) QoS bandwidth prioritization.",
    bestWayToFix: [
      {
        step: 1,
        action: "Configure STUN & NAT Keep-Alive",
        detail:
          "Configure STUN server (`stun.telone.co.zw`) on the IP phone. Set NAT Keep-Alive interval to 20 seconds to prevent stateful firewall port closure.",
      },
      {
        step: 2,
        action: "Forward RTP Audio Ports (UDP 10000-20000)",
        detail:
          "Set up port forwarding for RTP voice audio stream ports (UDP 10000–20000) on customer router directed to the IP Phone's static LAN IP.",
      },
      {
        step: 3,
        action: "Enable QoS Bandwidth Prioritization",
        detail:
          "Configure Quality of Service (QoS) on router WAN interface with DSCP Expedited Forwarding (DSCP 46 / EF) for Voice packets to eliminate packet jitter.",
      },
      {
        step: 4,
        action: "Select Resilient Voice Codec (G.711a / G.729)",
        detail:
          "Set primary codec on IP Phone / ATA to G.711a (PCMA) for high clarity, with G.729 Annex A as backup for low-bandwidth resilience.",
      },
      {
        step: 5,
        action: "Execute Two-Way Audio Verification",
        detail:
          "Conduct a 3-minute test call. Confirm bidirectional voice audio is clear with zero voice clipping and jitter < 20ms.",
      },
    ],
    requiredTools: [
      "Wireshark Packet Capture Tool on Laptop",
      "VoIP Handheld Call Simulator",
      "Router Admin Toolkit",
    ],
    safetyPrecautions: "No electrical hazard. Ensure network backups are retained.",
    estimatedRepairTimeMinutes: 35,
    keywords: [
      "one way audio",
      "dead air",
      "robotic voice",
      "choppy call",
      "call dropping voip",
      "voip noise",
      "rtp blocked",
      "nat traversal",
      "voip static",
    ],
  },

  // -------------------------------------------------------------
  // 6. Voice (Copper Landline / PSTN)
  // -------------------------------------------------------------
  copper_no_dialtone: {
    id: "copper_no_dialtone",
    key: "copper_no_dialtone",
    serviceKey: "voice",
    serviceLabel: "PSTN Copper Voice Landline",
    label: "Dead Copper Landline / No Dial Tone / Total Line Silence",
    category: "PSTN Copper Voice",
    description:
      "Subscriber lifts landline telephone handset and hears dead silence (zero dial tone); telephone line is completely inoperative.",
    color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10",
    badgeClass:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    borderClass: "border-blue-500/30",
    iconName: "PhoneCall",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Test DC battery voltage (-48V) with butt-in handset at master box and DP, replace blown lightning arrestor fuse, and repair severed copper pair.",
    recommendedAction:
      "Test DC battery voltage (-48V) with butt-in handset at master box and DP, replace blown lightning arrestor fuse, and repair severed copper pair.",
    bestWayToFix: [
      {
        step: 1,
        action: "Test Line with Lineman Butt-In Handset",
        detail:
          "Connect lineman butt-in test telephone directly at subscriber master junction box. Check for standard 400Hz exchange dial tone and measure DC idle voltage (~ -48V DC).",
      },
      {
        step: 2,
        action: "Inspect Lightning Surge Arrestors",
        detail:
          "Inspect gas discharge tube / carbon arrestor fuses in the subscriber protector block. Replace shorted or blown fuses caused by lightning surges.",
      },
      {
        step: 3,
        action: "Test Line at Roadside DP Box",
        detail:
          "If line is dead at master box, test at roadside DP (Distribution Point) box. If dial tone is present at DP, fault is in the overhead drop lead to the house.",
      },
      {
        step: 4,
        action: "Measure Loop Resistance & Replace Drop Wire",
        detail:
          "Measure loop resistance of the 2-pair drop cable with multimeter (must be <1200 ohms). Replace severed or oxidized drop wire with fresh UV-resistant cable.",
      },
      {
        step: 5,
        action: "Verify Ring Trip & Dial Tone",
        detail:
          "Test dial tone clarity, place outgoing call, and verify exchange ring generator rings subscriber handset (75V-90V AC ring pulse).",
      },
    ],
    requiredTools: [
      "Lineman Butt-In Test Telephone (with Monitor / Talk mode)",
      "Digital Multimeter",
      "Krone Punchdown Tool",
      "Gas Discharge Lightning Arrestor Fuses",
      "2-Pair Outdoor UV Copper Drop Wire",
      "Scotchlok Gel Crimps & Pliers",
    ],
    safetyPrecautions:
      "HIGH RING VOLTAGE: Incoming telephone ring voltage is 75V-90V AC at 25Hz. Disconnect test handset during ring cycle.",
    estimatedRepairTimeMinutes: 40,
    keywords: [
      "no dial tone",
      "dead phone",
      "phone silent",
      "landline dead",
      "landline broken",
      "foni yakafa",
      "haina dial tone",
      "inongoti zi-i",
      "ucingo alukhulumi",
      "telephone down",
      "voice line dead",
      "dead landline",
    ],
  },
  copper_earth_fault: {
    id: "copper_earth_fault",
    key: "copper_earth_fault",
    serviceKey: "voice",
    serviceLabel: "PSTN Copper Voice Landline",
    label: "Continuous Busy Tone / Line Grounded (Earth Fault)",
    category: "PSTN Copper Voice",
    description:
      "Telephone gives an immediate rapid busy tone upon lifting handset, or line appears continuously engaged to incoming callers due to an A-wire/B-wire ground fault.",
    color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    borderClass: "border-amber-500/30",
    iconName: "PhoneCall",
    typicalSeverity: "medium",
    defaultRecommendedAction:
      "Measure insulation resistance with 500V Megohmmeter, isolate grounded cable section, and migrate to an ungrounded spare copper pair.",
    recommendedAction:
      "Measure insulation resistance with 500V Megohmmeter, isolate grounded cable section, and migrate to an ungrounded spare copper pair.",
    bestWayToFix: [
      {
        step: 1,
        action: "Megohmmeter Insulation Resistance Test",
        detail:
          "Disconnect line from exchange. Use 250V/500V Megohmmeter (insulation tester) to test A-wire to Earth and B-wire to Earth. Normal insulation resistance must be > 10 Megaohms.",
      },
      {
        step: 2,
        action: "Isolate Internal vs External Network",
        detail:
          "Disconnect internal house wiring at the protector block. If earth fault clears, fault is inside subscriber premises wiring (e.g. crushed cord under carpet).",
      },
      {
        step: 3,
        action: "Trace Earth Fault in Distribution Cable",
        detail:
          "If fault is external, use a copper bridge fault locator to calculate distance of cable insulation breakdown (often waterlogged paper-insulated joint).",
      },
      {
        step: 4,
        action: "Migrate to Clean Spare Copper Pair",
        detail:
          "Transfer subscriber cross-connection at roadside DP box and exchange MDF to a tested, ungrounded spare copper pair in the distribution cable.",
      },
      {
        step: 5,
        action: "Test Exchange Line Card Reset",
        detail:
          "Verify exchange line card clears the off-hook state and returns normal steady dial tone.",
      },
    ],
    requiredTools: [
      "500V Megohmmeter / Insulation Resistance Tester",
      "Copper Bridge Fault Locator",
      "Lineman Butt-In Handset",
      "Terminal Screwdrivers & Krone Tool",
    ],
    safetyPrecautions:
      "Disconnect all subscriber equipment before applying 500V insulation test voltage.",
    estimatedRepairTimeMinutes: 45,
    keywords: [
      "busy tone",
      "earth fault",
      "line grounded",
      "phone engaged",
      "permanent busy",
      "inongorira busy",
      "ucingo olubambekileyo",
      "ground fault copper",
    ],
  },
  copper_static_noise: {
    id: "copper_static_noise",
    key: "copper_static_noise",
    serviceKey: "voice",
    serviceLabel: "PSTN Copper Voice Landline",
    label: "Severe Static & Crackling Noise on Voice Landline / Induction Hum",
    category: "PSTN Copper Voice",
    description:
      "Excessive crackling, scratching noise, or 50Hz electrical hum on voice calls due to oxidized screw terminals, damp joints, or power line induction.",
    color: "text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    badgeClass:
      "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800",
    borderClass: "border-yellow-500/30",
    iconName: "PhoneCall",
    typicalSeverity: "medium",
    defaultRecommendedAction:
      "Clean oxidized DP box terminals with wire brush, replace corroded Scotchlok crimps, and check cable sheath grounding at exchange.",
    recommendedAction:
      "Clean oxidized DP box terminals with wire brush, replace corroded Scotchlok crimps, and check cable sheath grounding at exchange.",
    bestWayToFix: [
      {
        step: 1,
        action: "Inspect & Clean DP Box Terminals",
        detail:
          "Open roadside DP box. Clean oxidized brass screw terminals with a wire brush and electrical contact cleaner. Re-tighten all terminal screws.",
      },
      {
        step: 2,
        action: "Replace Corroded Splices with Gel Crimps",
        detail:
          "Cut back blackened, oxidized copper conductor ends and crimp using new moisture-resistant gel-filled Scotchlok connectors.",
      },
      {
        step: 3,
        action: "Measure Longitudinal Balance",
        detail:
          "Test AC balance with a copper transmission test set (AC balance must exceed 60dB). Check for induction from nearby ZESA electrical power lines.",
      },
      {
        step: 4,
        action: "Verify Cable Sheath Earth Grounding",
        detail:
          "Inspect cable shield grounding at exchange MDF and distribution pillar. Ensure grounding resistance is < 5 ohms.",
      },
      {
        step: 5,
        action: "Conduct Test Voice Call",
        detail:
          "Place a test voice call. Verify crystal clear dial tone with zero background static or crackling.",
      },
    ],
    requiredTools: [
      "Transmission Line Test Set (Noise & Balance)",
      "Brass Wire Brush & Electrical Contact Cleaner",
      "Gel-filled Scotchlok Crimp Connectors & Pliers",
      "Lineman Butt-In Handset",
      "Earth Resistance Tester",
    ],
    safetyPrecautions: "Do not touch exposed copper lines during thunder or lightning storms.",
    estimatedRepairTimeMinutes: 35,
    keywords: [
      "static noise",
      "crackling phone",
      "phone noise",
      "humming line",
      "voice crackle",
      "foni inochema",
      "inonzwika zvakaipa",
      "inomsindo",
      "noisy landline",
      "scratches on line",
    ],
  },

  // -------------------------------------------------------------
  // 7. Core & Auxiliary Network
  // -------------------------------------------------------------
  exchange_outage: {
    id: "exchange_outage",
    key: "exchange_outage",
    serviceKey: "core_auxiliary",
    serviceLabel: "Core Exchange & Power Plant",
    label: "Central Exchange Switching Outage / Substation Down",
    category: "Core Network & Substation",
    description:
      "Regional hub or central exchange switching failure impacting multiple subscriber sectors across an entire zone.",
    color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    borderClass: "border-amber-500/30",
    iconName: "Building2",
    typicalSeverity: "critical",
    defaultRecommendedAction:
      "Inspect central exchange MDF, verify OLT backbone 100G fiber uplink, and reset gateway routing cards.",
    recommendedAction:
      "Inspect central exchange MDF, verify OLT backbone 100G fiber uplink, and reset gateway routing cards.",
    bestWayToFix: [
      {
        step: 1,
        action: "Inspect Central Exchange Power & Uplink",
        detail:
          "Check exchange MDF, core IP/MPLS router chassis, and OLT backbone 100G fiber trunk link status.",
      },
      {
        step: 2,
        action: "Reset Gateway Routing Cards",
        detail:
          "Perform diagnostic failover to redundant control processing card if main processor is frozen.",
      },
      {
        step: 3,
        action: "Verify Sector Line Card Sync",
        detail:
          "Check line cards for all subscriber sectors (ADSL DSLAM, GPON OLT, and Voice Line Interface Cards).",
      },
    ],
    requiredTools: [
      "Exchange Serial Management Console",
      "100G Optical Transceiver Tester",
      "Digital Multimeter",
    ],
    safetyPrecautions:
      "Authorized exchange personnel only. ESD protection mandated inside exchange MDF rooms.",
    estimatedRepairTimeMinutes: 90,
    keywords: [
      "exchange",
      "central exchange",
      "substation",
      "dslam",
      "olt",
      "chassis",
      "hub outage",
      "harare central",
      "bulawayo main",
      "mutare exchange",
    ],
  },
  power_generator: {
    id: "power_generator",
    key: "power_generator",
    serviceKey: "core_auxiliary",
    serviceLabel: "Core Exchange & Power Plant",
    label: "Power Outage / Solar Rectifier / Backup Generator Failure",
    category: "Auxiliary & Energy Plant",
    description:
      "Grid electricity outage, automatic transfer switch trip, solar rectifier fault, or depleted 48V DC battery bank.",
    color: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10",
    badgeClass:
      "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800",
    borderClass: "border-orange-500/30",
    iconName: "BatteryWarning",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Check Automatic Transfer Switch (ATS), measure 48V DC battery bank, and replenish backup diesel generator fuel.",
    recommendedAction:
      "Check Automatic Transfer Switch (ATS), measure 48V DC battery bank, and replenish backup diesel generator fuel.",
    bestWayToFix: [
      {
        step: 1,
        action: "Inspect Automatic Transfer Switch (ATS)",
        detail:
          "Verify ATS contactor position between ZESA mains grid and backup diesel generator.",
      },
      {
        step: 2,
        action: "Test 48V DC Rectifier Bank",
        detail:
          "Measure DC busbar voltage (must be ~53.5V float voltage for telecom DC equipment).",
      },
      {
        step: 3,
        action: "Replenish Generator Diesel & Start Backup",
        detail:
          "Check fuel levels, check battery starter voltage (24V), and manually engage backup generator if ATS failed.",
      },
    ],
    requiredTools: [
      "Heavy-Duty DC/AC Clamp Multimeter",
      "Diesel Fuel Refill Pump",
      "Battery Hydrometer / Internal Resistance Tester",
    ],
    safetyPrecautions:
      "ELECTRICAL MAINS HAZARD: 3-Phase 400V AC and high-current 48V DC battery banks. Wear insulated safety gloves.",
    estimatedRepairTimeMinutes: 45,
    keywords: [
      "power",
      "electricity",
      "generator",
      "battery",
      "solar",
      "rectifier",
      "ups",
      "blackout",
      "load shedding",
      "magetsi",
      "aenda",
      "haapo",
      "amandla",
      "awekho",
      "diesel",
    ],
  },
  hardware_cabinet: {
    id: "hardware_cabinet",
    key: "hardware_cabinet",
    serviceKey: "core_auxiliary",
    serviceLabel: "Core Exchange & Power Plant",
    label: "MSAN Street Cabinet Damage / Roadside Pillar Vandalism",
    category: "Outdoor Plant & Distribution",
    description:
      "Physical impact from vehicle collision, water flooding, or tampering on roadside MSAN distribution cabinet.",
    color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10",
    badgeClass:
      "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    borderClass: "border-purple-500/30",
    iconName: "Cpu",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Inspect physical enclosure, re-punch damaged terminal blocks, re-terminate wiring harnesses, and seal waterproof gasket.",
    recommendedAction:
      "Inspect physical enclosure, re-punch damaged terminal blocks, re-terminate wiring harnesses, and seal waterproof gasket.",
    bestWayToFix: [
      {
        step: 1,
        action: "Structural Integrity Assessment",
        detail:
          "Assess roadside MSAN cabinet enclosure damage, verify no live AC power exposure, and erect barrier cones.",
      },
      {
        step: 2,
        action: "Re-Punch Krone Terminal Blocks",
        detail:
          "Identify severed multi-pair distribution cables and punch down onto new 10-pair Krone disconnection modules.",
      },
      {
        step: 3,
        action: "Waterproof & Lock Enclosure",
        detail:
          "Apply silicone weather sealant along cabinet seams and replace damaged padlocks with high-security TelOne master lock.",
      },
    ],
    requiredTools: [
      "Krone Punchdown Tool",
      "Cabinet Master Key & Padlocks",
      "Multi-pair Cable Splicing Rig",
      "Silicone Weather Sealant",
    ],
    safetyPrecautions:
      "Check cabinet for insect nests / snakes before opening. Beware exposed mains power connections.",
    estimatedRepairTimeMinutes: 90,
    keywords: [
      "cabinet",
      "msan",
      "pillar",
      "pole",
      "box",
      "vandalism",
      "stolen",
      "flooding",
      "water in pillar",
      "burnt",
      "physical damage",
      "roadside box",
    ],
  },
  general_telecom: {
    id: "general_telecom",
    key: "general_telecom",
    serviceKey: "core_auxiliary",
    serviceLabel: "General Telecom Service",
    label: "General Telecom Fault / Diagnostic Triage Required",
    category: "General Operations",
    description:
      "Standard telecom service disruption requiring on-site diagnostic testing by field technician.",
    color: "text-slate-600 dark:text-slate-400 border-slate-500/30 bg-slate-500/10",
    badgeClass:
      "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800",
    borderClass: "border-slate-500/30",
    iconName: "AlertTriangle",
    typicalSeverity: "medium",
    defaultRecommendedAction:
      "Perform line verification test from exchange console, contact subscriber, and conduct field premises visit.",
    recommendedAction:
      "Perform line verification test from exchange console, contact subscriber, and conduct field premises visit.",
    bestWayToFix: [
      {
        step: 1,
        action: "Review Voice Report Transcript",
        detail: "Listen to original customer voice recording and review spoken symptoms.",
      },
      {
        step: 2,
        action: "Execute Exchange Line Diagnostic Test",
        detail:
          "Run automated test-head diagnosis to measure loop resistance, capacitance, and optical Rx power.",
      },
      {
        step: 3,
        action: "Dispatch Field Technician",
        detail:
          "Conduct subscriber premises visit with appropriate specialized equipment (OPM, Multimeter, or LTE Analyzer).",
      },
    ],
    requiredTools: [
      "Digital Multimeter",
      "Optical Power Meter",
      "Lineman Butt-In Handset",
      "Diagnostic Laptop",
    ],
    safetyPrecautions: "Adhere to standard telecom safety protocols.",
    estimatedRepairTimeMinutes: 45,
    keywords: [
      "fault",
      "problem",
      "broken",
      "issue",
      "not working",
      "help",
      "outage",
      "dambudziko",
    ],
  },

  // -------------------------------------------------------------
  // Legacy aliases
  // -------------------------------------------------------------
  fiber_cut: {
    id: "ftth_fiber_cut",
    key: "ftth_fiber_cut",
    serviceKey: "ftth",
    serviceLabel: "FTTH GPON Fiber",
    label: "Fiber Optic Line Cut",
    category: "FTTH Optical Infrastructure",
    description: "Physical fiber optic break, core severance, or backbone trunk link interruption.",
    color: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10",
    badgeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
    borderClass: "border-rose-500/30",
    iconName: "Zap",
    typicalSeverity: "critical",
    defaultRecommendedAction:
      "Dispatch OTDR fusion splicing team to locate fiber attenuation distance and splice severed cable.",
    recommendedAction:
      "Dispatch OTDR fusion splicing team to locate fiber attenuation distance and splice severed cable.",
    bestWayToFix: [
      { step: 1, action: "Locate break with OTDR/VFL", detail: "Measure attenuation distance." },
      {
        step: 2,
        action: "Fusion splice cores",
        detail: "Core alignment fusion splicing with <0.02dB loss.",
      },
    ],
    requiredTools: ["Fusion Splicer", "OTDR", "Optical Power Meter"],
    safetyPrecautions: "Class 1M Laser Safety",
    estimatedRepairTimeMinutes: 45,
    keywords: ["fiber", "fibre", "cable cut"],
  },
  copper_landline: {
    id: "copper_no_dialtone",
    key: "copper_no_dialtone",
    serviceKey: "voice",
    serviceLabel: "PSTN Copper Voice Landline",
    label: "Copper Landline Disruption",
    category: "PSTN Copper Voice",
    description: "PSTN copper pair degradation, dead dial tone, or loop resistance fault.",
    color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10",
    badgeClass:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    borderClass: "border-blue-500/30",
    iconName: "PhoneCall",
    typicalSeverity: "medium",
    defaultRecommendedAction:
      "Measure copper loop resistance with multi-meter at roadside DP box and test dial tone.",
    recommendedAction:
      "Measure copper loop resistance with multi-meter at roadside DP box and test dial tone.",
    bestWayToFix: [
      { step: 1, action: "Measure loop resistance", detail: "Must be <1200 ohms." },
      { step: 2, action: "Test dial tone at DP", detail: "Confirm exchange dial tone." },
    ],
    requiredTools: ["Lineman Handset", "Digital Multimeter"],
    safetyPrecautions: "48V DC Line Voltage",
    estimatedRepairTimeMinutes: 40,
    keywords: ["copper", "landline", "phone dead"],
  },
  broadband_adsl_lte: {
    id: "adsl_sync_loss",
    key: "adsl_sync_loss",
    serviceKey: "adsl",
    serviceLabel: "ADSL Broadband",
    label: "Broadband & LTE Degradation",
    category: "ADSL Copper Broadband",
    description: "Subscriber modem sync failure, high packet loss, or wireless signal attenuation.",
    color: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
    badgeClass:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
    borderClass: "border-indigo-500/30",
    iconName: "Wifi",
    typicalSeverity: "high",
    defaultRecommendedAction:
      "Inspect subscriber gateway RADIUS authentication log and verify SNR margin.",
    recommendedAction:
      "Inspect subscriber gateway RADIUS authentication log and verify SNR margin.",
    bestWayToFix: [
      { step: 1, action: "Check modem sync", detail: "Verify SNR margin > 6dB." },
      { step: 2, action: "Inspect microfilter", detail: "Replace damaged splitter." },
    ],
    requiredTools: ["ADSL Tester", "Multimeter"],
    safetyPrecautions: "48V DC Line Voltage",
    estimatedRepairTimeMinutes: 40,
    keywords: ["broadband", "internet", "wifi", "lte", "adsl"],
  },
};

export interface FaultAnalysisResult {
  fault_type: FaultTypeKey;
  service_key: TelOneServiceKey;
  service_label: string;
  fault_type_label: string;
  category: string;
  technical_summary: string;
  suggested_severity: "low" | "medium" | "high" | "critical";
  recommended_action: string;
  best_way_to_fix: FaultFixStep[];
  required_tools: string[];
  safety_precautions: string;
  estimated_repair_time_minutes: number;
  diagnostic_indicators: string[];
  confidence_score: number;
  voice_reported_message: string;
}

export function analyzeFaultSpeech(
  rawTranscript: string,
  languageHint?: string,
  serviceTypeHint?: string,
): FaultAnalysisResult {
  const text = (rawTranscript || "").trim();
  const lower = text.toLowerCase();

  // Scoring per fault type
  const scores: Partial<Record<FaultTypeKey, { score: number; matches: string[] }>> = {};

  const validKeys: FaultTypeKey[] = [
    "ftth_fiber_cut",
    "ftth_high_loss",
    "xftth_optical_mismatch",
    "xftth_sfp_overload",
    "adsl_sync_loss",
    "adsl_snr_attenuation",
    "lte_signal_loss",
    "lte_sim_geo_lock",
    "voip_sip_registration",
    "voip_one_way_audio",
    "copper_no_dialtone",
    "copper_earth_fault",
    "copper_static_noise",
    "exchange_outage",
    "power_generator",
    "hardware_cabinet",
    "general_telecom",
  ];

  for (const k of validKeys) {
    scores[k] = { score: 0, matches: [] };
  }

  // If a service type hint was provided, boost relevant service fault types
  if (serviceTypeHint) {
    const hintLower = serviceTypeHint.toLowerCase();
    for (const k of validKeys) {
      const def = FAULT_TYPE_DEFINITIONS[k];
      if (def) {
        if (
          hintLower.includes(def.serviceKey) ||
          def.serviceLabel.toLowerCase().includes(hintLower) ||
          hintLower.includes(def.serviceLabel.toLowerCase())
        ) {
          scores[k]!.score += 3;
        }
      }
    }
  }

  // Keyword matching
  for (const k of validKeys) {
    const def = FAULT_TYPE_DEFINITIONS[k];
    if (!def || k === "general_telecom") continue;
    for (const kw of def.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        const weight = kw.length > 8 ? 4 : kw.length > 4 ? 3 : 2;
        scores[k]!.score += weight;
        scores[k]!.matches.push(kw);
      }
    }
  }

  // Find best match
  let bestKey: FaultTypeKey = "general_telecom";
  let maxScore = 0;

  for (const k of validKeys) {
    const s = scores[k]?.score ?? 0;
    if (s > maxScore) {
      maxScore = s;
      bestKey = k;
    }
  }

  const def = FAULT_TYPE_DEFINITIONS[bestKey] || FAULT_TYPE_DEFINITIONS.general_telecom;
  const matchedList = scores[bestKey]?.matches ?? [];

  // Generate clear diagnostic indicators
  const indicators: string[] = [];
  if (matchedList.length > 0) {
    indicators.push(`Detected acoustic keywords: ${matchedList.slice(0, 4).join(", ")}`);
  }
  indicators.push(`Identified TelOne Service: ${def.serviceLabel}`);
  indicators.push(`Standard SLA Repair Window: ~${def.estimatedRepairTimeMinutes} mins`);
  if (def.requiredTools.length > 0) {
    indicators.push(`Primary Equipment: ${def.requiredTools.slice(0, 2).join(" & ")}`);
  }

  // Build technical summary
  let technicalSummary = "";
  if (bestKey === "ftth_fiber_cut") {
    technicalSummary = `[FTTH FIBER CUT] Physical drop cable break detected. Total loss of optical light at subscriber ONT. Splicing team dispatch required.`;
  } else if (bestKey === "ftth_high_loss") {
    technicalSummary = `[FTTH OPTICAL LOSS] High optical attenuation (Rx Power < -27dBm). Cable macro-bend or contaminated SC/APC connector requiring optical cleaning.`;
  } else if (bestKey === "xftth_optical_mismatch" || bestKey === "xftth_sfp_overload") {
    technicalSummary = `[XFTTH 10G FIBER] 10-Gigabit optical carrier synchronization failure. Wavelength attenuation or SFP+ link flap on 10G OLT port.`;
  } else if (bestKey === "adsl_sync_loss") {
    technicalSummary = `[ADSL SYNC LOSS] Modem DSL carrier desynchronization. Copper line open circuit or blown microfilter at subscriber DP box.`;
  } else if (bestKey === "adsl_snr_attenuation") {
    technicalSummary = `[ADSL ATTENUATION] Low SNR margin and high copper attenuation due to water ingress or loop resistance exceeding 1200 ohms.`;
  } else if (bestKey === "lte_signal_loss") {
    technicalSummary = `[BLAZE LTE SIGNAL] Blaze LTE router signal loss. Base station sector outage, PoE cable issue, or antenna misalignment.`;
  } else if (bestKey === "lte_sim_geo_lock") {
    technicalSummary = `[BLAZE LTE GEO-LOCK] Blaze LTE SIM registration blocked or APN mismatch. HSS core sector re-binding required.`;
  } else if (bestKey === "voip_sip_registration") {
    technicalSummary = `[VOIP SIP REGISTRATION] IP Phone / ATA SIP registration failure. SIP ALG interference or UDP 5060 firewall block.`;
  } else if (bestKey === "voip_one_way_audio") {
    technicalSummary = `[VOIP ONE-WAY AUDIO] One-way RTP audio stream blockage. NAT traversal failure on UDP 10000-20000 and missing QoS prioritization.`;
  } else if (bestKey === "copper_no_dialtone") {
    technicalSummary = `[COPPER LANDLINE DEAD] Zero 400Hz dial tone on PSTN copper pair. Blown lightning arrestor or severed drop wire at DP.`;
  } else if (bestKey === "copper_earth_fault") {
    technicalSummary = `[COPPER EARTH FAULT] Ground fault on copper pair causing continuous busy tone and exchange line card off-hook trip.`;
  } else if (bestKey === "copper_static_noise") {
    technicalSummary = `[COPPER STATIC NOISE] Severe line crackling and induction noise caused by oxidized DP terminals and degraded balance.`;
  } else if (bestKey === "exchange_outage") {
    technicalSummary = `[EXCHANGE OUTAGE] Central exchange / OLT hub switching failure impacting multiple subscriber distribution sectors.`;
  } else if (bestKey === "power_generator") {
    technicalSummary = `[POWER AUXILIARY] Substation grid outage or 48V DC rectifier battery trip. ATS / backup generator intervention required.`;
  } else if (bestKey === "hardware_cabinet") {
    technicalSummary = `[MSAN CABINET DAMAGE] Roadside distribution cabinet impact damage or pillar vandalism exposing internal Krone terminal blocks.`;
  } else {
    technicalSummary = `[GENERAL TELECOM FAULT] Standard service interruption reported on ${def.serviceLabel}. Field diagnostic verification scheduled.`;
  }

  const confidenceScore = Math.min(0.98, Math.max(0.65, 0.65 + maxScore * 0.05));

  return {
    fault_type: bestKey,
    service_key: def.serviceKey,
    service_label: def.serviceLabel,
    fault_type_label: def.label,
    category: def.category,
    technical_summary: technicalSummary,
    suggested_severity: def.typicalSeverity,
    recommended_action: def.recommendedAction,
    best_way_to_fix: def.bestWayToFix,
    required_tools: def.requiredTools,
    safety_precautions: def.safetyPrecautions,
    estimated_repair_time_minutes: def.estimatedRepairTimeMinutes,
    diagnostic_indicators: indicators,
    confidence_score: Number(confidenceScore.toFixed(2)),
    voice_reported_message: text,
  };
}

export function getFaultTypeFromRecord(
  fault?: {
    category?: string | null;
    raw_transcript?: string;
    technical_summary?: string;
    fault_type_key?: string | null;
  } | null,
): FaultTypeDefinition {
  if (!fault) return FAULT_TYPE_DEFINITIONS.general_telecom;

  // Direct key check
  if (fault.fault_type_key && FAULT_TYPE_DEFINITIONS[fault.fault_type_key as FaultTypeKey]) {
    return FAULT_TYPE_DEFINITIONS[fault.fault_type_key as FaultTypeKey];
  }

  // Match from technical summary or transcript
  const text = `${fault.category || ""} ${fault.technical_summary || ""} ${fault.raw_transcript || ""}`;
  const analyzed = analyzeFaultSpeech(text);
  return FAULT_TYPE_DEFINITIONS[analyzed.fault_type] || FAULT_TYPE_DEFINITIONS.general_telecom;
}
