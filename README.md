# Manipulador XML TS

[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue.svg)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/) [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

Ferramenta CLI robusta para automação de manipulação, edição e renomeação de arquivos XML de NFe, CTe e eventos fiscais, desenvolvida em TypeScript. Ideal para escritórios contábeis, empresas de logística e desenvolvedores que precisam processar grandes volumes de XMLs fiscais de forma padronizada e auditável.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Exemplos](#exemplos)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Contribuição](#contribuição)
- [Licença](#licença)

## Funcionalidades

- Renomeação automática de arquivos XML de NFe, CTe e eventos, conforme regras fiscais e de negócio.
- Edição em lote de campos como emitente, produtos, impostos, datas, referências e chaves de acesso.
- Manipulação de múltiplas empresas via configuração.
- Processamento seguro, com logs detalhados e resumo de operações.
- Suporte a regras fiscais (CFOP, CST, IPI, etc) e geração de novas chaves de acesso.

## Instalação

Requisitos:

- Node.js 18+
- npm

```bash
npm install
```

## Configuração

Crie ou edite o arquivo `constantes.json` na raiz do projeto, seguindo o modelo abaixo:

```json
{
  "MinhaEmpresa": {
    "caminhos": {
      "pasta_origem": "./xmls/origem",
      "pasta_edicao": "./xmls/edicao"
    },
    "configuracao_execucao": {
      "processar_e_renomear": true,
      "editar_arquivos": true
    },
    "emitente": { "CNPJ": "12345678000199", "xNome": "EMPRESA LTDA" },
    "produto": { "NCM": "12345678" },
    "impostos": {},
    "data": { "nova_data": "22/08/2025" },
    "alterar": {
      "emitente": true,
      "produtos": true,
      "impostos": false,
      "data": true,
      "refNFe": false,
      "cst": false,
      "zerar_ipi_remessa_retorno": false
    },
    "mapeamento_cst": {}
  }
}
```

## Uso

```bash
npm start
```

O CLI irá:

1. Solicitar a empresa a ser processada.
2. Renomear arquivos XML conforme regras fiscais e de negócio.
3. Editar campos dos XMLs em lote, conforme configuração.

## Exemplos

- Renomeação automática:
  - `12345 - Venda.xml`
  - `CAN-12345.xml`
  - `12345 - Remessa simbólica da venda 54321.xml`
- Edição de campos:
  - Alteração de CNPJ do emitente, datas de emissão, CFOP, CST, etc.

## Estrutura do Projeto

```
├── src/
│   ├── index.ts                # Entrada principal CLI
│   ├── config/                 # Loader de configuração
│   ├── constants/              # Constantes fiscais (CFOP, XML)
│   ├── core/                   # Serviços principais (Renomeação, Edição)
│   ├── models/                 # Tipos e interfaces
│   ├── services/               # Serviços utilitários (FS, XML)
│   └── utils/                  # Utilitários CLI e fiscais
├── constantes.json             # Configuração das empresas
├── package.json
├── tsconfig.json
```

## Scripts

- `npm start` — Executa o CLI em modo desenvolvimento (ts-node)
- `npm run build` — Compila para JavaScript em `dist/`

## Contribuição

Contribuições são bem-vindas! Siga o padrão de código, escreva commits claros e abra um Pull Request.

## Licença

ISC. Veja o arquivo [LICENSE](LICENSE).
