import { AttackEvent, randomAttackEvent } from "@ddos/shared";

export interface SimulatorConfig {
  baseRatePerSec: number;
  burstIntervalMs: number;
  burstMultiplier: number;
  burstDurationMs: number;
  hotSourceCountries: string[];
}

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  baseRatePerSec: 50,
  burstIntervalMs: 8000,
  burstMultiplier: 4,
  burstDurationMs: 1500,
  hotSourceCountries: ["CN", "US", "RU"],
};

export interface Simulator {
  onEvent: (event: AttackEvent) => void;
  start: () => void;
  stop: () => void;
}

export function createSimulator(
  config: Partial<SimulatorConfig> = {},
  onEvent: (event: AttackEvent) => void,
): Simulator {
  const cfg: SimulatorConfig = { ...DEFAULT_SIMULATOR_CONFIG, ...config };
  let timer: ReturnType<typeof setInterval> | null = null;
  let burstTimer: ReturnType<typeof setTimeout> | null = null;
  let burst = false;
  let burstActiveAt = 0;

  function emit() {
    onEvent(randomAttackEvent());
  }

  function tick() {
    const now = Date.now();
    const rate = burst && now - burstActiveAt < cfg.burstDurationMs
      ? cfg.baseRatePerSec * cfg.burstMultiplier
      : cfg.baseRatePerSec;
    const count = Math.max(1, Math.round(rate / 10)); // ~10 ticks/sec
    for (let i = 0; i < count; i++) emit();
  }

  function scheduleBurst() {
    burst = true;
    burstActiveAt = Date.now();
    burstTimer = setTimeout(() => {
      burst = false;
      burstTimer = setTimeout(scheduleBurst, cfg.burstIntervalMs);
    }, cfg.burstDurationMs);
  }

  return {
    onEvent,
    start() {
      if (timer) return;
      timer = setInterval(tick, 100);
      scheduleBurst();
    },
    stop() {
      if (timer) clearInterval(timer);
      if (burstTimer) clearTimeout(burstTimer);
      timer = null;
      burstTimer = null;
      burst = false;
    },
  };
}
