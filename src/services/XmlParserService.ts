import * as fs from 'fs';
import * as xmljs from 'xml-js';
import { NFeInfo, CTeInfo, EventoCancelamentoInfo, BaseXmlInfo } from '../models/XML';
import { DS_NAMESPACE, NFE_NAMESPACE } from '../constants/xmlConstants';

const XML_OPTIONS: xmljs.Options.JS2XML = { compact: true, spaces: 0 };

const getText = (element: any): string | null => element?._text ?? null;

export const getElement = (obj: any, path: string): any | null => {
  return path.split('.').reduce((acc, part) => acc && acc[part] ? acc[part] : null, obj);
};

export function parseXmlFile(filePath: string): any {
  try {
    const xmlFile = fs.readFileSync(filePath, 'utf8');
    return xmljs.xml2js(xmlFile, { compact: true, ignoreComment: true });
  } catch (error) {
    console.error(`Erro ao analisar o arquivo XML: ${filePath}`, error);
    return null;
  }
}

export function writeXmlFile(filePath: string, jsObject: any): void {
  let xmlString = xmljs.js2xml(jsObject, XML_OPTIONS);
  
  // Garante namespaces e formata a assinatura
  xmlString = xmlString.replace(/<NFe>/, `<NFe xmlns="${NFE_NAMESPACE}">`);
  xmlString = xmlString.replace(/<CTe>/, `<CTe xmlns="${NFE_NAMESPACE}">`);
  xmlString = xmlString.replace(/<Signature>/, `<Signature xmlns="${DS_NAMESPACE}">`);
  
  xmlString = xmlString.replace(/>\s+</g, '><');
  fs.writeFileSync(filePath, xmlString, 'utf8');
}

export class XmlParserService {
  public getXmlInfo(filePath: string): BaseXmlInfo {
    const jsObj = parseXmlFile(filePath);
    if (!jsObj) return { tipo: 'desconhecido', caminhoCompleto: filePath };
    
    const infNFe = getElement(jsObj, 'nfeProc.NFe.infNFe') || getElement(jsObj, 'NFe.infNFe');
    if (infNFe) return this.parseNFeInfo(infNFe, filePath);

    const infCTe = getElement(jsObj, 'cteProc.CTe.infCte') || getElement(jsObj, 'CTe.infCte');
    if (infCTe) return this.parseCTeInfo(infCTe, filePath);
    
    const infEvento = getElement(jsObj, 'procEventoNFe.evento.infEvento');
    if (infEvento && getText(getElement(infEvento, 'tpEvento')) === '110111') {
      return this.parseEventoCancelamentoInfo(infEvento, filePath);
    }

    if (getElement(jsObj, 'procInutNFe')) return { tipo: 'inutilizacao', caminhoCompleto: filePath };

    return { tipo: 'desconhecido', caminhoCompleto: filePath };
  }
  
  private parseNFeInfo(infNFe: any, filePath: string): NFeInfo {
    const ide = getElement(infNFe, 'ide');
    const emit = getElement(infNFe, 'emit');
    const det = Array.isArray(infNFe.det) ? infNFe.det[0] : infNFe.det;
    const detProd = getElement(det, 'prod');
    const infAdic = getElement(infNFe, 'infAdic.obsCont');

    return {
      tipo: 'nfe',
      caminhoCompleto: filePath,
      numeroNFe: getText(getElement(ide, 'nNF')) ?? '',
      cfop: getText(getElement(detProd, 'CFOP')) ?? '',
      natOp: getText(getElement(ide, 'natOp')) ?? '',
      refNFe: getText(getElement(ide, 'NFref.refNFe')) ?? null,
      xTexto: getText(getElement(infAdic, 'xTexto')) ?? '',
      chave: infNFe._attributes?.Id?.replace('NFe', '') ?? '',
      cnpjEmitente: getText(getElement(emit, 'CNPJ')) ?? '',
    };
  }

  private parseCTeInfo(infCTe: any, filePath: string): CTeInfo {
    const emit = getElement(infCTe, 'emit');
    const infNFeRefs = getElement(infCTe, 'infCTeNorm.infDoc.infNFe');
    let chavesNFeReferenciadas: string[] = [];

    if (infNFeRefs) {
      const refs = Array.isArray(infNFeRefs) ? infNFeRefs : [infNFeRefs];
      chavesNFeReferenciadas = refs.map(ref => getText(getElement(ref, 'chave'))).filter(Boolean) as string[];
    }
    
    return {
      tipo: 'cte',
      caminhoCompleto: filePath,
      chave: infCTe._attributes?.Id?.replace('CTe', '') ?? '',
      cnpjEmitente: getText(getElement(emit, 'CNPJ')) ?? '',
      chavesNFeReferenciadas,
    };
  }

  private parseEventoCancelamentoInfo(infEvento: any, filePath: string): EventoCancelamentoInfo {
    return {
      tipo: 'cancelamento',
      caminhoCompleto: filePath,
      chaveCancelada: getText(getElement(infEvento, 'chNFe')) ?? '',
    };
  }
}