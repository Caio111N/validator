/* Arquivo: app.js | Função: eventos, máscara e apresentação dos resultados. */
(function () {
  "use strict";

  const campo = document.querySelector("#document-input");
  const formulario = document.querySelector("#validator-form");
  const tipoBadge = document.querySelector("#document-type");
  const inputWrap = document.querySelector(".input-wrap");
  const resultado = document.querySelector("#result");
  const iconeResultado = document.querySelector("#result-icon");
  const tituloResultado = document.querySelector("#result-title");
  const mensagemResultado = document.querySelector("#result-message");
  const botaoLimpar = document.querySelector("#clear-button");
  const botaoCopiar = document.querySelector("#copy-button");
  const mensagemCopia = document.querySelector("#copy-message");
  const painelCPF = document.querySelector("#cpf-official-lookup");
  const painelCNPJ = document.querySelector("#cnpj-lookup-card");
  const botaoConsultarCNPJ = document.querySelector("#cnpj-lookup-button");
  const rotuloConsultarCNPJ = document.querySelector("#cnpj-lookup-label");
  const indicadorConsulta = document.querySelector("#cnpj-lookup-spinner");
  const botaoNovaConsulta = document.querySelector("#cnpj-new-lookup-button");
  const statusConsulta = document.querySelector("#cnpj-lookup-status");
  const dadosEmpresa = document.querySelector("#cnpj-company-data");
  let sequenciaConsulta = 0;
  let ultimoResultado = Validator.validarDocumento("");

  /**
   * Atualiza o estado visual da página a partir do resultado puro do validador.
   * @param {{tipo: string, valido: boolean, formatado: string, motivo: string}} dados Resultado da validação.
   */
  function exibirResultado(dados) {
    ultimoResultado = dados;
    const completo = dados.tipo !== "incompleto";
    sequenciaConsulta += 1;
    painelCPF.hidden = !(dados.tipo === "CPF" && dados.valido);
    painelCNPJ.hidden = !(dados.tipo === "CNPJ" && dados.valido);
    botaoConsultarCNPJ.disabled = !(dados.tipo === "CNPJ" && dados.valido);
    botaoConsultarCNPJ.setAttribute("aria-busy", "false");
    rotuloConsultarCNPJ.textContent = "Consultar CNPJ";
    indicadorConsulta.hidden = true;
    botaoNovaConsulta.hidden = true;
    statusConsulta.hidden = true;
    statusConsulta.textContent = "";
    dadosEmpresa.hidden = true;
    tipoBadge.textContent = completo ? dados.tipo : "";
    campo.placeholder =
      dados.tipo === "CNPJ" ? "00.000.000/0000-00" : "000.000.000-00";
    campo.inputMode = "text";
    botaoCopiar.disabled = !(completo && dados.valido);
    mensagemCopia.textContent = "";

    if (!completo) {
      inputWrap.dataset.state = "neutral";
      resultado.dataset.state = "neutral";
      iconeResultado.innerHTML = "";
      tituloResultado.textContent = "Aguardando documento";
      mensagemResultado.textContent = campo.value
        ? "Continue digitando para validar."
        : "Digite um CPF ou CNPJ para começar.";
      return;
    }

    if (dados.valido) {
      inputWrap.dataset.state = "valid";
      resultado.dataset.state = "valid";
      iconeResultado.innerHTML =
        '<svg viewBox="0 0 20 20" focusable="false"><path d="m4 10 4 4 8-8" /></svg>';
      tituloResultado.textContent = "VÁLIDO";
      mensagemResultado.textContent = `${dados.tipo} validado com sucesso.`;
      return;
    }

    inputWrap.dataset.state = "invalid";
    resultado.dataset.state = "invalid";
    iconeResultado.innerHTML =
      '<svg viewBox="0 0 20 20" focusable="false"><path d="m5 5 10 10M15 5 5 15" /></svg>';
    tituloResultado.textContent = "INVÁLIDO";
    mensagemResultado.textContent = dados.motivo;
    inputWrap.classList.remove("shake");
    // Reinicia a animação para cada documento completo inválido, sem tremer durante a digitação parcial.
    void inputWrap.offsetWidth;
    inputWrap.classList.add("shake");
  }

  /**
   * Formata parcialmente o documento sem impedir que um CNPJ seja digitado antes de completo.
   * @param {string} documento Documento limpo em edição.
   * @param {boolean} cnpj Se a entrada já deve usar o agrupamento de CNPJ.
   * @returns {string} Trecho digitado com a máscara correspondente.
   */
  function formatarParcial(documento, cnpj) {
    if (cnpj) {
      if (documento.length <= 2) return documento;
      if (documento.length <= 5)
        return `${documento.slice(0, 2)}.${documento.slice(2)}`;
      if (documento.length <= 8)
        return `${documento.slice(0, 2)}.${documento.slice(2, 5)}.${documento.slice(5)}`;
      if (documento.length <= 12) {
        return `${documento.slice(0, 2)}.${documento.slice(2, 5)}.${documento.slice(5, 8)}/${documento.slice(8)}`;
      }
      return `${documento.slice(0, 2)}.${documento.slice(2, 5)}.${documento.slice(5, 8)}/${documento.slice(8, 12)}-${documento.slice(12)}`;
    }
    if (documento.length <= 3) return documento;
    if (documento.length <= 6)
      return `${documento.slice(0, 3)}.${documento.slice(3)}`;
    if (documento.length <= 9)
      return `${documento.slice(0, 3)}.${documento.slice(3, 6)}.${documento.slice(6)}`;
    return `${documento.slice(0, 3)}.${documento.slice(3, 6)}.${documento.slice(6, 9)}-${documento.slice(9)}`;
  }

  /**
   * Limpa a entrada, aplica a máscara e atualiza a validação em tempo real.
   * @param {boolean} formatar Se deve inserir separadores enquanto a pessoa digita.
   */
  function atualizarCampo(formatar) {
    const inicio = campo.selectionStart;
    const valorAnterior = campo.value;
    const caracteresAntesDoCursor = Validator.limparDocumento(
      valorAnterior.slice(0, inicio ?? valorAnterior.length),
    ).replace(/[^A-Z0-9]/g, "").length;
    const limpo = Validator.limparDocumento(valorAnterior);
    const documento = limpo.replace(/[^A-Z0-9]/g, "").slice(0, 14);
    const cnpjEmEdicao = documento.length > 11 || /[A-Z]/.test(documento);
    const formatado = formatar
      ? formatarParcial(documento, cnpjEmEdicao)
      : documento;
    campo.value = formatado;

    if (inicio !== null && valorAnterior !== formatado) {
      let novaPosicao = 0;
      let caracteresEncontrados = 0;
      while (
        novaPosicao < formatado.length &&
        caracteresEncontrados < caracteresAntesDoCursor
      ) {
        if (/[A-Z0-9]/.test(formatado[novaPosicao])) caracteresEncontrados += 1;
        novaPosicao += 1;
      }
      campo.setSelectionRange(novaPosicao, novaPosicao);
    }
    exibirResultado(Validator.validarDocumento(documento));
  }

  /**
   * Copia o documento formatado; usa fallback para páginas locais sem Clipboard API.
   * @returns {Promise<void>} Conclusão da tentativa de cópia.
   */
  async function copiarDocumento() {
    if (botaoCopiar.disabled) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ultimoResultado.formatado);
      } else {
        const temporario = document.createElement("textarea");
        temporario.value = ultimoResultado.formatado;
        temporario.setAttribute("readonly", "");
        temporario.style.position = "fixed";
        temporario.style.opacity = "0";
        document.body.append(temporario);
        temporario.select();
        const copiado = document.execCommand("copy");
        temporario.remove();
        if (!copiado) throw new Error("Cópia indisponível");
      }
      mensagemCopia.textContent = "Documento copiado.";
    } catch {
      mensagemCopia.textContent = "Não foi possível copiar neste navegador.";
    }
  }

  /**
   * Apresenta somente os campos empresariais normalizados, sem inserir HTML vindo da API.
   * @param {object} empresa Resultado normalizado pelo módulo de consulta.
   */
  function exibirEmpresa(empresa) {
    document.querySelector("#company-legal-name").textContent =
      empresa.razaoSocial;
    const nomeFantasia = document.querySelector("#company-trade-name");
    nomeFantasia.textContent = empresa.nomeFantasia;
    nomeFantasia.hidden = !empresa.nomeFantasia;
    document.querySelector("#company-start-date").textContent =
      empresa.dataInicioAtividade;
    document.querySelector("#company-activity").textContent =
      empresa.atividadePrincipal;
    document.querySelector("#company-legal-nature").textContent =
      empresa.naturezaJuridica;
    document.querySelector("#company-size").textContent = empresa.porte;
    document.querySelector("#company-location").textContent = empresa.cidadeUf;

    const selo = document.querySelector("#company-status-badge");
    selo.textContent = empresa.situacaoCadastral;
    const situacao = empresa.situacaoCadastral.toLocaleUpperCase("pt-BR");
    selo.dataset.state =
      situacao === "ATIVA"
        ? "active"
        : ["BAIXADA", "INAPTA", "NULA"].includes(situacao)
          ? "inactive"
          : "attention";
    document.querySelector("#mei-notice").hidden = !empresa.avisoMei;
    dadosEmpresa.hidden = false;
    statusConsulta.hidden = true;
    botaoNovaConsulta.hidden = false;
  }

  /**
   * Consulta a BrasilAPI somente após o clique e com o CNPJ validado matematicamente.
   * @returns {Promise<void>} Conclusão da consulta solicitada.
   */
  async function consultarCNPJ() {
    if (ultimoResultado.tipo !== "CNPJ" || !ultimoResultado.valido) return;
    const identificador = ++sequenciaConsulta;
    botaoConsultarCNPJ.disabled = true;
    botaoConsultarCNPJ.setAttribute("aria-busy", "true");
    rotuloConsultarCNPJ.textContent = "Consultando...";
    indicadorConsulta.hidden = false;
    statusConsulta.textContent = "Consultando CNPJ...";
    statusConsulta.hidden = false;
    dadosEmpresa.hidden = true;
    botaoNovaConsulta.hidden = true;

    try {
      const empresa = await CNPJLookup.consultarCNPJ(
        Validator.limparDocumento(campo.value),
      );
      if (identificador !== sequenciaConsulta) return;
      exibirEmpresa(empresa);
    } catch (erro) {
      if (identificador !== sequenciaConsulta) return;
      const mensagens = {
        CNPJ_ALFANUMERICO:
          "A consulta pela BrasilAPI ainda não aceita CNPJ alfanumérico.",
        CNPJ_INVALIDO: "Informe um CNPJ numérico completo para consultar.",
        NAO_ENCONTRADO: "CNPJ não encontrado na base consultada.",
        MUITAS_CONSULTAS:
          "Muitas consultas em pouco tempo. Aguarde e tente novamente.",
        TIMEOUT: "A consulta demorou mais que o esperado. Tente novamente.",
        REDE: "Não foi possível conectar ao serviço de consulta. Verifique sua conexão e tente novamente.",
        INDISPONIVEL:
          "O serviço de consulta está temporariamente indisponível.",
      };
      statusConsulta.textContent =
        mensagens[erro?.code] || mensagens.INDISPONIVEL;
      statusConsulta.hidden = false;
      botaoNovaConsulta.hidden = false;
    } finally {
      if (identificador === sequenciaConsulta) {
        botaoConsultarCNPJ.disabled = false;
        botaoConsultarCNPJ.setAttribute("aria-busy", "false");
        rotuloConsultarCNPJ.textContent = "Consultar CNPJ";
        indicadorConsulta.hidden = true;
      }
    }
  }

  /** Limpa os dados exibidos para permitir uma nova tentativa, mantendo o documento digitado. */
  function novaConsulta() {
    sequenciaConsulta += 1;
    dadosEmpresa.hidden = true;
    statusConsulta.hidden = true;
    statusConsulta.textContent = "";
    botaoNovaConsulta.hidden = true;
    botaoConsultarCNPJ.disabled = !(
      ultimoResultado.tipo === "CNPJ" && ultimoResultado.valido
    );
    botaoConsultarCNPJ.focus();
  }

  campo.addEventListener("input", () => atualizarCampo(true));
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    atualizarCampo(true);
  });
  botaoLimpar.addEventListener("click", () => {
    campo.value = "";
    exibirResultado(Validator.validarDocumento(""));
    campo.focus();
  });
  botaoCopiar.addEventListener("click", copiarDocumento);
  botaoConsultarCNPJ.addEventListener("click", consultarCNPJ);
  botaoNovaConsulta.addEventListener("click", novaConsulta);
})();
