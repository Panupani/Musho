export interface GrowStep {
  key: string;
  name: string;
  emoji: string;
  durationDays: number;
  description: string;
  conditions: string;
  tips: string[];
  yieldPerBagKg?: number; // only for harvest steps
}

export const WOOD_EAR_STEPS: GrowStep[] = [
  {
    key: 'culture',
    name: 'Tissue Culture (from Cap)',
    emoji: '🔬',
    durationDays: 14,
    description: 'Isolate mycelium from the Wood Ear cap onto PDA agar.',
    conditions: 'Temperature 25–28 °C, dark, clean room',
    tips: [
      'Use a fresh mature cap, wipe with 70% alcohol',
      'Cut a small piece from inside the cap (not the surface)',
      'Work inside a still-air box or near flame',
      'Wait until white mycelium covers the plate (14 days)',
    ],
  },
  {
    key: 'grain_spawn',
    name: 'Grain Spawn',
    emoji: '🌾',
    durationDays: 14,
    description: 'Transfer agar culture to sterilised wheat or sorghum grain.',
    conditions: 'Temperature 25–28 °C, dark',
    tips: [
      'Boil grain, drain, dry surface until no sticking',
      'Autoclave 121 °C × 90 min',
      'Cool completely before inoculating',
      'Shake jars daily to spread mycelium faster',
    ],
  },
  {
    key: 'substrate',
    name: 'Substrate Bags',
    emoji: '🛍️',
    durationDays: 2,
    description: 'Mix sawdust formula, fill bags, sterilise, then inoculate with grain spawn.',
    conditions: 'Mix ratio: 78% sawdust · 20% rice bran · 2% lime',
    tips: [
      'Moisture content ~65 % (squeeze test: drips 1–2 drops)',
      'Sterilise 121 °C × 2.5 hours, cool to room temp',
      'Inoculate in clean area — add 15–20 g spawn per bag',
      'Seal bags tightly with poly-cotton filter plugs',
    ],
  },
  {
    key: 'incubation',
    name: 'Mycelium Incubation',
    emoji: '🌑',
    durationDays: 25,
    description: 'Bags colonise fully — white mycelium fills the entire bag.',
    conditions: 'Temperature 25–30 °C, dark, no need for misting',
    tips: [
      'Check bags daily for green/black spots (contamination — discard those)',
      'Fully white and firm = ready for fruiting',
      'Do NOT open bags during this stage',
    ],
  },
  {
    key: 'fruiting_induction',
    name: 'Fruiting Induction',
    emoji: '💧',
    durationDays: 7,
    description: 'Score holes in bags and raise humidity to trigger ear pins.',
    conditions: 'Humidity > 85 %, Temperature 20–25 °C, indirect light',
    tips: [
      'Cut 3–4 small X slits (~1 cm) evenly around each bag',
      'Mist the slit area (not the bag surface) 3–4 times/day',
      'Soak bags in clean water for 30 min if no pins after 5 days',
      'Small brown bumps at slits = pinning started ✅',
    ],
  },
  {
    key: 'harvest_1',
    name: '1st Harvest',
    emoji: '🌻',
    durationDays: 7,
    description: 'Harvest Wood Ears when edges start to curl upward and colour deepens.',
    conditions: 'Keep misting 3–4×/day during harvest window',
    tips: [
      'Harvest before the edges fully flatten out (best texture)',
      'Twist and pull gently — do not cut, to avoid stump rot',
      'Fresh yield ≈ 0.10 kg per bag',
      'Rinse and sell fresh, or dry at 50–60 °C for 6–8 h',
    ],
    yieldPerBagKg: 0.10,
  },
  {
    key: 'rest_1',
    name: 'Rest Period',
    emoji: '😴',
    durationDays: 7,
    description: 'Let bags recover — mycelium rebuilds energy for next flush.',
    conditions: 'Reduce misting, keep clean, temperature 22–26 °C',
    tips: [
      'Remove all old stems and debris from slits',
      'Wipe any leftover pieces to prevent mould',
      'Resume heavy misting only when new pins appear',
    ],
  },
  {
    key: 'harvest_2',
    name: '2nd Harvest',
    emoji: '🌻',
    durationDays: 10,
    description: 'Second flush — resume full misting cycle.',
    conditions: 'Humidity > 85 %, mist 3–4×/day',
    tips: [
      'This flush usually yields 80 % of the first',
      'Fresh yield ≈ 0.08 kg per bag',
      'Add a 30-min soak if pins are slow to form',
    ],
    yieldPerBagKg: 0.08,
  },
  {
    key: 'rest_2',
    name: 'Rest Period 2',
    emoji: '😴',
    durationDays: 7,
    description: 'Second rest before the final flush.',
    conditions: 'Same as Rest 1',
    tips: [
      'Clean up slits thoroughly',
      'If bags feel light (dry), soak in water 1 hour',
    ],
  },
  {
    key: 'harvest_3',
    name: '3rd Harvest',
    emoji: '🌻',
    durationDays: 10,
    description: 'Final flush — bags are usually exhausted after this.',
    conditions: 'Humidity > 85 %, mist 3–4×/day',
    tips: [
      'Fresh yield ≈ 0.06 kg per bag',
      'Discard or compost bags after this harvest',
      'Total yield over 3 flushes ≈ 0.24 kg/bag (fresh)',
    ],
    yieldPerBagKg: 0.06,
  },
];

export const TOTAL_DAYS = WOOD_EAR_STEPS.reduce((s, step) => s + step.durationDays, 0);

export interface GrowPlan {
  id: string;
  label: string;
  startDate: string;   // YYYY-MM-DD (date user has the cap)
  bags: number;
  pricePerKg: number;
  createdAt: string;
}
