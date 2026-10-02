/* Arquivo: test/validator.test.js | Função: testes da lógica pura com node:test. */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  limparDocumento,
  detectarTipo,
  validarCPF,
  validarCNPJ,
  validarDocumento,
  formatarDocumento,
} = require("../validator.js");

/**
 * Gera os dois dígitos do CNPJ alfanumérico pelo mesmo algoritmo especificado.
 * @param {string} base Doze caracteres alfanuméricos.
 * @returns {string} CNPJ completo com os verificadores.
 */
function gerarCNPJAlfanumerico(base) {
  const calcular = (parte) => {
    const pesos =
      parte.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...parte].reduce(
      (total, caractere, indice) =>
        total + (caractere.charCodeAt(0) - 48) * pesos[indice],
      0,
    );
    const resto = soma % 11;
    return String(resto < 2 ? 0 : 11 - resto);
  };
  const primeiro = calcular(base);
  return `${base}${primeiro}${calcular(`${base}${primeiro}`)}`;
}

test("limpa separadores e normaliza letras", () => {
  assert.equal(limparDocumento("ab.12-3/ x"), "AB123X");
});

test("detecta o tipo pelo tamanho e mantém entradas parciais incompletas", () => {
  assert.equal(detectarTipo("529.982.247-25"), "CPF");
  assert.equal(detectarTipo("11.222.333/0001-81"), "CNPJ");
  assert.equal(detectarTipo("529.982"), "incompleto");
  assert.equal(validarDocumento("529.982").motivo, "incompleto");
});

test("valida CPF válido e rejeita dígito incorreto ou sequência repetida", () => {
  assert.equal(validarCPF("529.982.247-25"), true);
  assert.equal(validarDocumento("529.982.247-25").valido, true);
  assert.equal(
    validarDocumento("529.982.247-24").motivo,
    "dígito verificador não confere",
  );
  assert.equal(validarDocumento("111.111.111-11").motivo, "sequência repetida");
});

test("valida CNPJ válido e rejeita dígito incorreto ou sequência repetida", () => {
  assert.equal(validarCNPJ("11.222.333/0001-81"), true);
  assert.equal(
    validarDocumento("11.222.333/0001-82").motivo,
    "dígito verificador não confere",
  );
  assert.equal(
    validarDocumento("00.000.000/0000-00").motivo,
    "sequência repetida",
  );
});

test("aceita entrada com pontuação e sem pontuação", () => {
  assert.equal(validarDocumento("52998224725").valido, true);
  assert.equal(validarDocumento("11.222.333/0001-81").valido, true);
  assert.equal(validarDocumento("11222333000181").valido, true);
});

test("formata CPF e CNPJ", () => {
  assert.equal(formatarDocumento("52998224725"), "529.982.247-25");
  assert.equal(formatarDocumento("11222333000181"), "11.222.333/0001-81");
});

test("valida CNPJ alfanumérico gerado pelo algoritmo", () => {
  const cnpj = gerarCNPJAlfanumerico("12ABC34501DE");
  assert.match(cnpj, /^[A-Z0-9]{12}\d{2}$/);
  assert.equal(validarCNPJ(cnpj), true);
  assert.equal(validarDocumento(cnpj.toLowerCase()).valido, true);
});
