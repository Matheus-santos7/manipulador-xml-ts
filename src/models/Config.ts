export interface CompanyConfig {
  caminhos: {
    pasta_origem: string;
    pasta_edicao: string;
  };
  configuracao_execucao: {
    processar_e_renomear: boolean;
    editar_arquivos: boolean;
  };
  emitente: { [key: string]: string };
  produto: { [key: string]: string };
  impostos: { [key: string]: string };
  data: {
    nova_data: string;
  };
  alterar: {
    emitente: boolean;
    produtos: boolean;
    impostos: boolean;
    data: boolean;
    refNFe: boolean;
    cst: boolean;
    zerar_ipi_remessa_retorno: boolean;
  };
  mapeamento_cst: {
    [cfop: string]: { [imposto: string]: string };
  };
}

export interface AppConfig {
  [companyName: string]: CompanyConfig;
}