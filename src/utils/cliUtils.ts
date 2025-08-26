import inquirer from 'inquirer';
import { AppConfig, CompanyConfig } from '../models/Config';

export async function selectCompany(config: AppConfig): Promise<CompanyConfig> {
  const companies = Object.keys(config);
  const { chosenCompany } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosenCompany',
      message: 'Selecione a empresa para processar:',
      choices: companies,
    },
  ]);
  return config[chosenCompany];
}