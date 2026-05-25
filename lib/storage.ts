import fs from 'fs';
import path from 'path';
import type { ClinicConfig } from '@/types/config';
import { defaultConfig } from './defaultConfig';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

export function readConfig(): ClinicConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

export function writeConfig(config: ClinicConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
