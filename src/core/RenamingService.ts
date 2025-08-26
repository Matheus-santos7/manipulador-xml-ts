import * as path from 'path';
import chalk from 'chalk';
import { FileSystemService } from '../services/FileSystemService';
import { XmlParserService } from '../services/XmlParserService';
import { NFeInfo, EventoCancelamentoInfo, BaseXmlInfo } from '../models/XML';
import { VENDAS_CFOP, DEVOLUCOES_CFOP, RETORNOS_CFOP, REMESSAS_CFOP } from '../constants/cfopConstants';

export class RenamingService {
  private fileSystem = new FileSystemService();
  private xmlParser = new XmlParserService();
  private totalRenamed = 0;
  private totalSkipped = 0;
  private totalErrors = 0;

  constructor(private readonly sourcePath: string) {}
  
  public async process(): Promise<void> {
    console.log(chalk.bold.blue('\n========== ETAPA 1: ORGANIZAÇÃO E RENOMEAÇÃO DOS ARQUIVOS =========='));
    const xmlFiles = this.fileSystem.getXmlFilePaths(this.sourcePath);
    if (xmlFiles.length === 0) {
      console.log('Nenhum arquivo XML encontrado para processar.');
      return;
    }

    const allInfos = xmlFiles.map(file => this.xmlParser.getXmlInfo(file));
    const nfeInfos = allInfos.filter(info => info.tipo === 'nfe') as NFeInfo[];
    const eventInfos = allInfos.filter(info => info.tipo === 'cancelamento') as EventoCancelamentoInfo[];
    
    this.renameNFeFiles(nfeInfos);
    this.renameEventFiles(eventInfos, nfeInfos);
    
    console.log(chalk.green(`\nResumo Renomeação: ${this.totalRenamed} renomeados, ${this.totalSkipped} pulados, ${this.totalErrors} erros.`));
  }

  private renameNFeFiles(nfeInfos: NFeInfo[]): void {
    for (const info of nfeInfos) {
        let newName = '';
        const { cfop, natOp, refNFe, xTexto, numeroNFe } = info;

        if (DEVOLUCOES_CFOP.includes(cfop) && refNFe) {
            const refNfeNum = refNFe.substring(25, 34).replace(/^0+/, '');
            if (natOp === "Retorno de mercadoria nao entregue") newName = `${numeroNFe} - Insucesso de entrega da venda ${refNfeNum}.xml`;
            else if (natOp === "Devolucao de mercadorias") {
                if (xTexto?.includes("DEVOLUTION_PLACES") || xTexto?.includes("SALE_DEVOLUTION")) newName = `${numeroNFe} - Devolução pro Mercado Livre da venda - ${refNfeNum}.xml`;
                else if (xTexto?.includes("DEVOLUTION_devolution")) newName = `${numeroNFe} - Devolucao da venda ${refNfeNum}.xml`;
            }
        } else if (VENDAS_CFOP.includes(cfop)) newName = `${numeroNFe} - Venda.xml`;
        else if (RETORNOS_CFOP.includes(cfop) && refNFe) {
            const refNfeNum = refNFe.substring(25, 34).replace(/^0+/, '');
            if (natOp === "Outras Entradas - Retorno Simbolico de Deposito Temporario") newName = `${numeroNFe} - Retorno da remessa ${refNfeNum}.xml`;
            else if (natOp === "Outras Entradas - Retorno de Deposito Temporario") newName = `${numeroNFe} - Retorno Efetivo da remessa ${refNfeNum}.xml`;
        } else if (REMESSAS_CFOP.includes(cfop)) {
            newName = refNFe ? `${numeroNFe} - Remessa simbólica da venda ${refNFe.substring(25, 34).replace(/^0+/, '')}.xml` : `${numeroNFe} - Remessa.xml`;
        }
        
        if (newName) this.executeRename(info.caminhoCompleto, newName);
    }
  }

  private renameEventFiles(eventInfos: EventoCancelamentoInfo[], nfeInfos: NFeInfo[]): void {
      const keyToNfeNumMap = new Map(nfeInfos.map(nfe => [nfe.chave, nfe.numeroNFe]));
      for (const eventInfo of eventInfos) {
          const nfeNumber = keyToNfeNumMap.get(eventInfo.chaveCancelada);
          if (nfeNumber) {
              const newName = `CAN-${nfeNumber}.xml`;
              this.executeRename(eventInfo.caminhoCompleto, newName);
          }
      }
  }

  private executeRename(oldPath: string, newName: string): void {
    const newPath = path.join(path.dirname(oldPath), newName);
    const oldFileName = path.basename(oldPath);

    if (this.fileSystem.fileExists(newPath) && oldFileName.toLowerCase() !== newName.toLowerCase()) {
      console.log(chalk.yellow(`  [PULADO] O arquivo de destino '${newName}' já existe.`));
      this.totalSkipped++;
      return;
    }
    if (oldFileName.toLowerCase() === newName.toLowerCase()) return; // Already correctly named

    try {
      this.fileSystem.renameFile(oldPath, newPath);
      console.log(`  [OK] ${chalk.dim(oldFileName)} -> ${chalk.green(newName)}`);
      this.totalRenamed++;
    } catch (e: any) {
      console.error(chalk.red(`  [ERRO] Falha ao renomear ${oldFileName}: ${e.message}`));
      this.totalErrors++;
    }
  }
}