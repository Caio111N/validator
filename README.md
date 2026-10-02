# Validator

O Validator é uma página estática para validar matematicamente CPF e CNPJ no navegador. Não usa frameworks, dependências externas, etapa de build ou servidor para abrir.

## Funcionalidades

- Validação de CPF e CNPJ com verificação dos dígitos e rejeição de sequências repetidas.
- Suporte à validação local de CNPJ alfanumérico.
- Consulta opcional de dados empresariais de CNPJ pela API pública BrasilAPI, acionada somente ao clicar em **Consultar CNPJ** e após a validação matemática.
- Atalho para a página oficial da Receita Federal para consulta da situação cadastral de CPF pelo próprio titular.
- Máscara automática, resultado em tempo real, cópia de documento válido e interface responsiva com tema claro/escuro.

## Como abrir

Abra `index.html` diretamente no navegador com duplo clique. Alternativamente, abra a pasta no VS Code e use a extensão Live Server.

## Como rodar os testes

Com Node.js `20.19.0` ou superior instalado, execute na pasta do projeto:

```sh
npm test
```

Os testes usam `node:test` e substituem `fetch` por respostas simuladas; não acessam a internet.

## Exemplos para testar

- CPF válido: `529.982.247-25`
- CPF inválido: `529.982.247-24`
- CNPJ válido: `00.000.000/0001-91`
- CNPJ alfanumérico: digite 12 letras ou números seguidos pelos dois dígitos verificadores para testar a validação local.

Para exercitar a consulta, informe um CNPJ numérico válido e clique em **Consultar CNPJ**. CNPJs alfanuméricos são validados no navegador, mas a consulta da BrasilAPI não os suporta.

## Privacidade e limitações

CPF é validado só no navegador e nunca é enviado pela aplicação a um servidor. O link de CPF abre a consulta oficial da Receita Federal; é necessário que o próprio titular informe o CPF e a data de nascimento. Não existe consulta de titular por CPF neste projeto, por privacidade e em respeito à LGPD.

A consulta de CNPJ envia somente o número do CNPJ à BrasilAPI quando a pessoa clica em **Consultar CNPJ**, e apenas se o documento numérico for matematicamente válido. O projeto não salva nem registra documentos em console, armazenamento local, cookies ou logs. A API pode não aceitar CNPJ alfanumérico e seus dados podem estar indisponíveis ou desatualizados.

A validação matemática confere formato e dígitos verificadores; ela não comprova que o documento existe, está ativo ou pertence a alguém. A consulta empresarial não apresenta quadro societário, telefones ou e-mails.

## Captura de tela

Local reservado para uma captura da interface: adicionar uma imagem do projeto e atualizar esta seção com o caminho correspondente.

## Estrutura

```text
validator/
├── index.html
├── style.css
├── app.js
├── validator.js
├── cnpjLookup.js
├── package.json
├── README.md
├── LICENSE
├── .gitignore
├── .gitattributes
├── .editorconfig
└── test/
	├── validator.test.js
	└── cnpjLookup.test.js
```

## Licença

Este projeto está disponível sob a licença MIT. Consulte o arquivo `LICENSE`.