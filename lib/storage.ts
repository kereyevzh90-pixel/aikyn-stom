import { supabase } from './supabase';
import type { ClinicConfig } from '@/types/config';
import { defaultConfig } from './defaultConfig';

export async function readConfig(): Promise<ClinicConfig> {
  const { data, error } = await supabase
    .from('clinic_config')
    .select('data')
    .eq('id', 1)
    .single();

  if (error || !data) return defaultConfig;
  return { ...defaultConfig, ...data.data };
}

export async function writeConfig(config: ClinicConfig): Promise<void> {
  const { error } = await supabase
    .from('clinic_config')
    .upsert({ id: 1, data: config });

  if (error) throw new Error(error.message);
}
