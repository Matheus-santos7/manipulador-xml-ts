export type XmlEntityType = 'nfe' | 'cte' | 'cancelamento' | 'inutilizacao' | 'desconhecido';

export interface BaseXmlInfo {
  tipo: XmlEntityType;
  caminhoCompleto: string;
}

export interface NFeInfo extends BaseXmlInfo {
  tipo: 'nfe';
  numeroNFe: string;
  cfop: string;
  natOp: string;
  refNFe: string | null;
  xTexto: string;
  chave: string;
  cnpjEmitente: string;
}

export interface EventoCancelamentoInfo extends BaseXmlInfo {
  tipo: 'cancelamento';
  chaveCancelada: string;
}

export interface CTeInfo extends BaseXmlInfo {
  tipo: 'cte';
  chave: string;
  cnpjEmitente: string;
  chavesNFeReferenciadas: string[];
}