/* Arquivo: cnpjLookup.js | Função: consultar e normalizar dados públicos de CNPJ. */
(function (root) {
  "use strict";

  const TEMPO_LIMITE_MS = 10_000;

  /**
   * Cria erros controlados para que a interface nunca precise mostrar detalhes técnicos.
   * @param {string} codigo Identificador estável do erro.
   * @param {string} mensagem Mensagem clara para a pessoa usuária.
   * @returns {Error} Erro com código e mensagem seguros para exibição.
   */
  function criarErro(codigo, mensagem) {
    const erro = new Error(mensagem);
    erro.name = "ErroConsultaCNPJ";
    erro.code = codigo;
    return erro;
  }

  /**
   * Converte valores ausentes da API em texto neutro, sem expor outros campos da resposta.
   * @param {unknown} valor Valor recebido da API.
   * @returns {string} Texto normalizado ou indicação de ausência.
   */
  function textoSeguro(valor) {
    if (typeof valor !== "string" && typeof valor !== "number")
      return "Não informado";
    const texto = String(valor).trim();
    return texto || "Não informado";
  }

  /**
   * Formata datas ISO sem conversão de fuso horário.
   * @param {unknown} valor Data recebida da API.
   * @returns {string} Data no formato brasileiro ou indicação de ausência.
   */
  function formatarData(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return "Não informado";
    }
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Converte o código de situação cadastral da API em uma descrição legível.
   * @param {Record<string, unknown>} dados Resposta pública da BrasilAPI.
   * @returns {string} Situação cadastral.
   */
  function obterSituacao(dados) {
    if (
      typeof dados.descricao_situacao_cadastral === "string" &&
      dados.descricao_situacao_cadastral.trim()
    ) {
      return dados.descricao_situacao_cadastral.trim().toUpperCase();
    }
    const situacoes = {
      1: "NULA",
      2: "ATIVA",
      3: "SUSPENSA",
      4: "INAPTA",
      8: "BAIXADA",
    };
    return situacoes[Number(dados.situacao_cadastral)] || "Não informada";
  }

  /**
   * Seleciona e normaliza apenas os dados empresariais que a tela está autorizada a exibir.
   * QSA, telefones, e-mails e demais campos recebidos são deliberadamente descartados.
   * @param {Record<string, unknown>} dados Resposta pública da BrasilAPI.
   * @returns {object} Dados empresariais normalizados para apresentação.
   */
  function normalizarCNPJ(dados) {
    const cnae = dados.cnae_fiscal;
    const codigoCnae = textoSeguro(cnae);
    const descricaoCnae = textoSeguro(dados.cnae_fiscal_descricao);
    const atividade =
      codigoCnae !== "Não informado"
        ? descricaoCnae !== "Não informado"
          ? `${codigoCnae} - ${descricaoCnae}`
          : codigoCnae
        : descricaoCnae;
    const naturezaJuridica = textoSeguro(dados.natureza_juridica);
    const naturezaParaAviso = naturezaJuridica.toLocaleLowerCase("pt-BR");
    const cidade = textoSeguro(dados.municipio);
    const uf = textoSeguro(dados.uf);

    return {
      razaoSocial: textoSeguro(dados.razao_social),
      nomeFantasia:
        typeof dados.nome_fantasia === "string"
          ? dados.nome_fantasia.trim()
          : "",
      situacaoCadastral: obterSituacao(dados),
      dataInicioAtividade: formatarData(dados.data_inicio_atividade),
      atividadePrincipal: atividade,
      naturezaJuridica,
      porte: textoSeguro(dados.descricao_porte || dados.porte),
      cidadeUf:
        cidade === "Não informado" && uf === "Não informado"
          ? "Não informado"
          : `${cidade}${uf === "Não informado" ? "" : `/${uf}`}`,
      avisoMei:
        dados.opcao_pelo_mei === true ||
        /empres.rio individual|microempreendedor individual/u.test(
          naturezaParaAviso,
        ),
      fonte: "Dados da Receita Federal via BrasilAPI",
    };
  }

  /**
   * Consulta um CNPJ numérico na BrasilAPI com limite de dez segundos.
   * A função não registra nem persiste o documento; CNPJs alfanuméricos não são enviados.
   * @param {string} cnpjLimpo CNPJ limpo ou formatado.
   * @returns {Promise<object>} Dados empresariais normalizados.
   * @throws {Error} Erro controlado com código e mensagem amigável.
   */
  async function consultarCNPJ(cnpjLimpo) {
    const entrada = String(cnpjLimpo ?? "")
      .trim()
      .toUpperCase();
    if (/[A-Z]/.test(entrada)) {
      throw criarErro(
        "CNPJ_ALFANUMERICO",
        "A consulta pela BrasilAPI ainda não aceita CNPJ alfanumérico.",
      );
    }

    const cnpj = entrada.replace(/\D/g, "");
    if (!/^\d{14}$/.test(cnpj)) {
      throw criarErro(
        "CNPJ_INVALIDO",
        "Informe um CNPJ numérico completo para consultar.",
      );
    }

    const controlador = new AbortController();
    let expirou = false;
    const temporizador = setTimeout(() => {
      expirou = true;
      controlador.abort();
    }, TEMPO_LIMITE_MS);

    try {
      const resposta = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
        { signal: controlador.signal },
      );
      if (resposta.status === 404) {
        throw criarErro(
          "NAO_ENCONTRADO",
          "CNPJ não encontrado na base consultada.",
        );
      }
      if (resposta.status === 429) {
        throw criarErro(
          "MUITAS_CONSULTAS",
          "Muitas consultas em pouco tempo. Aguarde e tente novamente.",
        );
      }
      if (!resposta.ok) {
        throw criarErro(
          "INDISPONIVEL",
          "O serviço de consulta está temporariamente indisponível.",
        );
      }
      return normalizarCNPJ(await resposta.json());
    } catch (erro) {
      if (erro && erro.name === "ErroConsultaCNPJ") throw erro;
      if (expirou || (erro && erro.name === "AbortError")) {
        throw criarErro(
          "TIMEOUT",
          "A consulta demorou mais que o esperado. Tente novamente.",
        );
      }
      throw criarErro(
        "REDE",
        "Não foi possível conectar ao serviço de consulta. Verifique sua conexão e tente novamente.",
      );
    } finally {
      clearTimeout(temporizador);
    }
  }

  const api = { consultarCNPJ };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CNPJLookup = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
