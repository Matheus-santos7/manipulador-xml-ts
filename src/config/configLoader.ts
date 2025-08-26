import { AppConfig } from '../models/Config';
import * as fs from 'fs';
import * as path from 'path';

export function loadConfig(filePath = 'constantes.json'): AppConfig {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo de configuração '${absolutePath}' não encontrado.`);
  }
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(fileContent) as AppConfig;
}