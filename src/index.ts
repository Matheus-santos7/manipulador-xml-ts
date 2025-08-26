import chalk from 'chalk';
import { loadConfig } from './config/configLoader';
import { selectCompany } from './utils/cliUtils';
import { RenamingService } from './core/RenamingService';
import { EditingService } from './core/EditingService';
import { CompanyConfig } from './models/Config';

async function main() {
  console.log(chalk.bold.yellow('==================== INICIANDO GERENCIADOR DE XMLs ===================='));

  try {
    const config = loadConfig();
    const companyConfig: CompanyConfig = await selectCompany(config);
    
    const { configuracao_execucao, caminhos } = companyConfig;

    if (configuracao_execucao.processar_e_renomear) {
      const renamingService = new RenamingService(caminhos.pasta_origem);
      await renamingService.process();
    } else {
      console.log(chalk.gray('\nEtapa de renomeação pulada (desabilitada na configuração).'));
    }

    if (configuracao_execucao.editar_arquivos) {
      const editingService = new EditingService(caminhos.pasta_edicao, companyConfig);
      await editingService.process();
    } else {
        console.log(chalk.gray('Etapa de edição pulada (desabilitada na configuração).'));
    }

  } catch (error: any) {
    console.error(chalk.red.bold('\nOcorreu um erro crítico no processamento:'), error.message);
  } finally {
    console.log(chalk.bold.yellow('\n==================== PROCESSAMENTO FINALIZADO ===================='));
  }
}

main();