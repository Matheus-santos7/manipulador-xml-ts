import * as path from 'path';
import chalk from 'chalk';
import Decimal from 'decimal.js';
import { format, parseISO, parse as parseDate } from 'date-fns';
import { FileSystemService } from '../services/FileSystemService';
import { XmlParserService, parseXmlFile, writeXmlFile, getElement } from '../services/XmlParserService';
import { CompanyConfig } from '../models/Config';
import { NFeInfo, CTeInfo, BaseXmlInfo } from '../models/XML';
import { calcularDvChave } from '../utils/nfeUtils';
import { REMESSAS_CFOP, RETORNOS_CFOP } from '../constants/cfopConstants';

// Helpers
const setText = (element: any, text: string | number) => { if (element) element._text = String(text); };
const getText = (element: any): string => element?._text ?? '';

export class EditingService {
  private fileSystem = new FileSystemService();
  private xmlParser = new XmlParserService();
  private totalEdited = 0;
  private totalErrors = 0;
  private alterations: string[] = [];

  constructor(private readonly editPath: string, private readonly config: CompanyConfig) {}

  public async process(): Promise<void> {
    console.log(chalk.bold.blue('\n========== ETAPA 2: MANIPULAÇÃO E EDIÇÃO DOS ARQUIVOS =========='));
    const xmlFiles = this.fileSystem.getXmlFilePaths(this.editPath);
    if (xmlFiles.length === 0) {
      console.log('Nenhum arquivo XML encontrado para editar.');
      return;
    }

    const allDocsInfo = xmlFiles.map(file => this.xmlParser.getXmlInfo(file)).filter(info => info.tipo !== 'desconhecido');
    const keyMapping = this.buildKeyMapping(allDocsInfo);
    const referenceMap = this.buildReferenceMap(allDocsInfo);

    for (const file of xmlFiles) {
        this.alterations = [];
        try {
            const jsObj = parseXmlFile(file);
            if (!jsObj) continue;

            const originalJsObjStr = JSON.stringify(jsObj);
            
            if (getElement(jsObj, 'nfeProc.NFe.infNFe') || getElement(jsObj, 'NFe.infNFe')) {
                this.editNFe(jsObj, keyMapping, referenceMap);
            } else if (getElement(jsObj, 'cteProc.CTe.infCte') || getElement(jsObj, 'CTe.infCte')) {
                this.editCTe(jsObj, keyMapping);
            } else if (getElement(jsObj, 'procEventoNFe')) {
                this.editEvento(jsObj, keyMapping);
            } else if (getElement(jsObj, 'procInutNFe')) {
                this.editInutilizacao(jsObj);
            }

            if (originalJsObjStr !== JSON.stringify(jsObj)) {
              writeXmlFile(file, jsObj);
              console.log(chalk.green(`\n[OK] Editado: ${path.basename(file)}`));
              [...new Set(this.alterations)].forEach(alt => console.log(`   - ${alt}`));
              this.totalEdited++;
            }
        } catch (e: any) {
            console.error(chalk.red(`\n[ERRO] Falha ao editar ${path.basename(file)}: ${e.message}`));
            this.totalErrors++;
        }
    }
    
    console.log(chalk.green(`\nResumo Edição: ${this.totalEdited} editados, ${this.totalErrors} erros.`));
  }

  // A F T E R
  private editNFe(jsObj: any, keyMapping: Map<string, string>, referenceMap: Map<string, string>): void {
    const infNFe = getElement(jsObj, 'nfeProc.NFe.infNFe') || getElement(jsObj, 'NFe.infNFe');
    if (!infNFe) return;

    const originalKey = infNFe._attributes?.Id?.replace('NFe', '');
    const { alterar, emitente, produto, impostos, data, mapeamento_cst } = this.config;

    if (alterar.emitente) this.updateEmitente(infNFe);
    
    const dets = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
    for (const det of dets) {
        if (alterar.produtos) this.updateProduto(det);
        if (alterar.impostos) this.updateImpostos(det);
        if (alterar.cst) this.updateCST(det, mapeamento_cst);
        if (alterar.zerar_ipi_remessa_retorno) this.zerarIPIRemessaRetorno(det);
    }

    if (alterar.zerar_ipi_remessa_retorno) this.recalculateTotals(infNFe);
    if (alterar.data) this.updateDate(jsObj, data.nova_data);
    if (alterar.refNFe) this.updateRefNFe(infNFe, originalKey, keyMapping, referenceMap);
    
    const newKey = keyMapping.get(originalKey);
    if (newKey) this.updateChave(jsObj, newKey);
  }

  private updateEmitente(infNFe: any): void {
      const emit = getElement(infNFe, 'emit');
      if (!emit) return;
      const enderEmit = getElement(emit, 'enderEmit');
      for (const [key, value] of Object.entries(this.config.emitente)) {
          const target = ['xLgr', 'nro', 'xCpl', 'xBairro', 'xMun', 'UF', 'fone'].includes(key) ? enderEmit : emit;
          if (getElement(target, key)) {
              setText(getElement(target, key), value);
              this.alterations.push(`Emitente: <${key}> alterado`);
          }
      }
  }

  private updateProduto(det: any): void {
    const prod = getElement(det, 'prod');
    if (!prod) return;
    for (const [key, value] of Object.entries(this.config.produto)) {
        if (getElement(prod, key)) {
            setText(getElement(prod, key), value);
            this.alterations.push(`Produto: <${key}> alterado`);
        }
    }
  }

  private zerarIPIRemessaRetorno(det: any): void {
      const cfop = getText(getElement(det, 'prod.CFOP'));
      if (REMESSAS_CFOP.includes(cfop) || RETORNOS_CFOP.includes(cfop)) {
          const ipi = getElement(det, 'imposto.IPITrib');
          if (ipi) {
              setText(getElement(ipi, 'vIPI'), '0.00');
              this.alterations.push("IPI do item: Valor (vIPI) zerado");
              setText(getElement(ipi, 'pIPI'), '0.0000');
              this.alterations.push("IPI do item: Alíquota (pIPI) zerada");
          }
      }
  }
  
  // Implement other edit methods: updateImpostos, updateCST, recalculateTotals, updateDate, updateRefNFe, updateChave
  // ... editCTe, editEvento, editInutilizacao
  // ... buildKeyMapping, buildReferenceMap

  private buildKeyMapping(allDocs: BaseXmlInfo[]): Map<string, string> {
      const keyMapping = new Map<string, string>();
      const { alterar, emitente, data } = this.config;
      if (!alterar.emitente && !alterar.data) return keyMapping;

      const newDate = parseDate(data.nova_data, 'dd/MM/yyyy', new Date());
      const newAnoMes = format(newDate, 'yyMM');

      for (const doc of allDocs) {
          if (doc.tipo === 'nfe' || doc.tipo === 'cte') {
              const info = doc as NFeInfo | CTeInfo;
              const originalKey = info.chave;
              if (!originalKey) continue;
              
              const novoCnpj = alterar.emitente ? emitente.CNPJ.replace(/\D/g, '') : info.cnpjEmitente.replace(/\D/g, '');
              const anoMes = alterar.data ? newAnoMes : originalKey.substring(2, 6);

              const newKeyWithoutDV = originalKey.substring(0, 2) + anoMes + novoCnpj.padStart(14, '0') + originalKey.substring(20, 43);
              const newKey = newKeyWithoutDV + calcularDvChave(newKeyWithoutDV);
              keyMapping.set(originalKey, newKey);
          }
      }
      return keyMapping;
  }

  private buildReferenceMap(allDocs: BaseXmlInfo[]): Map<string, string> {
      const refMap = new Map<string, string>();
      const nfeInfos = allDocs.filter(d => d.tipo === 'nfe') as NFeInfo[];
      for (const info of nfeInfos) {
          if (info.refNFe) {
              refMap.set(info.chave, info.refNFe);
          }
      }
      return refMap;
  }

  private updateDate(jsObj: any, newDateStr: string): void {
      const newDate = parseDate(newDateStr, 'dd/MM/yyyy', new Date());
      const newTimestamp = format(newDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

      const ideNFe = getElement(jsObj, 'nfeProc.NFe.infNFe.ide') || getElement(jsObj, 'NFe.infNFe.ide');
      if (ideNFe) {
          setText(getElement(ideNFe, 'dhEmi'), newTimestamp); this.alterations.push("Data: <dhEmi> alterada");
          if(getElement(ideNFe, 'dhSaiEnt')) {
            setText(getElement(ideNFe, 'dhSaiEnt'), newTimestamp); this.alterations.push("Data: <dhSaiEnt> alterada");
          }
      }

      const infProtNFe = getElement(jsObj, 'nfeProc.protNFe.infProt');
      if (infProtNFe) {
          setText(getElement(infProtNFe, 'dhRecbto'), newTimestamp); this.alterations.push("Protocolo: <dhRecbto> alterado");
      }
  }

  private updateChave(jsObj: any, newKey: string): void {
      const infNFe = getElement(jsObj, 'nfeProc.NFe.infNFe') || getElement(jsObj, 'NFe.infNFe');
      if (infNFe) {
          infNFe._attributes.Id = 'NFe' + newKey;
          this.alterations.push(`Chave de Acesso ID alterada para: ${newKey}`);
      }

      const infProt = getElement(jsObj, 'nfeProc.protNFe.infProt');
      if (infProt) {
          setText(getElement(infProt, 'chNFe'), newKey);
          this.alterations.push("Chave de Acesso do Protocolo alterada");
      }
  }
}