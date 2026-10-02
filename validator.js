/* Arquivo: validator.js | Função: limpeza, formatação e validação pura de documentos. */
(function (root) {
  "use strict";

  /**
   * Remove apenas os separadores aceitos e normaliza letras para maiúsculas.
   * @param {string} entrada Documento digitado pelo usuário.
   * @returns {string} Documento sem pontuação ou espaços.
   */
  function limparDocumento(entrada) {
    return String(entrada ?? "")
      .replace(/[.\-/\s]/g, "")
      .toUpperCase();
  }

  /**
   * Identifica CPF ou CNPJ pelo comprimento, sem classificar a digitação parcial como erro.
   * @param {string} entrada Documento com ou sem formatação.
   * @returns {"CPF"|"CNPJ"|"incompleto"} Tipo identificado.
   */
  function detectarTipo(entrada) {
    const documento = limparDocumento(entrada);
    if (documento.length === 11) return "CPF";
    if (documento.length === 14) return "CNPJ";
    return "incompleto";
  }

  /**
   * Aplica a máscara correspondente ao tamanho completo do documento.
   * @param {string} entrada Documento com ou sem formatação.
   * @returns {string} Documento formatado, ou a entrada limpa se incompleta.
   */
  function formatarDocumento(entrada) {
    const documento = limparDocumento(entrada);
    if (documento.length === 11 && /^\d+$/.test(documento)) {
      return documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }
    if (documento.length === 14) {
      return documento.replace(
        /^(.{2})(.{3})(.{3})(.{4})(.{2})$/,
        "$1.$2.$3/$4-$5",
      );
    }
    return documento;
  }

  /**
   * Valida o CPF usando os dois dígitos verificadores do módulo 11.
   * @param {string} entrada CPF limpo ou formatado.
   * @returns {boolean} Se os dígitos verificadores conferem.
   */
  function validarCPF(entrada) {
    const cpf = limparDocumento(entrada);
    if (!/^\d{11}$/.test(cpf) || /^([\d])\1{10}$/.test(cpf)) return false;

    const digitos = [...cpf].map(Number);
    for (let posicao = 9; posicao <= 10; posicao += 1) {
      let soma = 0;
      for (let indice = 0; indice < posicao; indice += 1) {
        soma += digitos[indice] * (posicao + 1 - indice);
      }
      // No módulo 11, restos 0 e 1 geram dígito zero; os demais completam a dezena.
      const resto = soma % 11;
      const esperado = resto < 2 ? 0 : 11 - resto;
      if (digitos[posicao] !== esperado) return false;
    }
    return true;
  }

  /**
   * Calcula um dígito verificador CNPJ com os pesos oficiais do módulo 11.
   * @param {string} base Doze caracteres para o primeiro dígito ou treze para o segundo.
   * @returns {number} Dígito verificador calculado.
   */
  function calcularDigitoCNPJ(base) {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((total, caractere, indice) => {
      // O padrão alfanumérico define cada valor como código ASCII menos 48.
      return total + (caractere.charCodeAt(0) - 48) * pesos[indice];
    }, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  /**
   * Valida CNPJ numérico ou alfanumérico pelo módulo 11.
   * @param {string} entrada CNPJ limpo ou formatado.
   * @returns {boolean} Se os dígitos verificadores conferem.
   */
  function validarCNPJ(entrada) {
    const cnpj = limparDocumento(entrada);
    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^([A-Z0-9])\1{13}$/.test(cnpj))
      return false;
    const base = cnpj.slice(0, 12);
    const primeiro = calcularDigitoCNPJ(base);
    if (Number(cnpj[12]) !== primeiro) return false;
    return Number(cnpj[13]) === calcularDigitoCNPJ(`${base}${primeiro}`);
  }

  /**
   * Detecta o tipo, valida o documento e fornece resultado pronto para a interface.
   * @param {string} entrada Documento digitado pelo usuário.
   * @returns {{tipo: string, valido: boolean, formatado: string, motivo: string}} Resultado da validação.
   */
  function validarDocumento(entrada) {
    const documento = limparDocumento(entrada);
    const tipo = detectarTipo(documento);
    const formatado = formatarDocumento(documento);
    if (tipo === "incompleto") {
      return { tipo, valido: false, formatado, motivo: "incompleto" };
    }

    const repetido =
      tipo === "CPF"
        ? /^(\d)\1{10}$/.test(documento)
        : /^([A-Z0-9])\1{13}$/.test(documento);
    if (repetido) {
      return { tipo, valido: false, formatado, motivo: "sequência repetida" };
    }

    const valido =
      tipo === "CPF" ? validarCPF(documento) : validarCNPJ(documento);
    return {
      tipo,
      valido,
      formatado,
      motivo: valido ? "" : "dígito verificador não confere",
    };
  }

  const api = {
    limparDocumento,
    detectarTipo,
    validarCPF,
    validarCNPJ,
    validarDocumento,
    formatarDocumento,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Validator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
