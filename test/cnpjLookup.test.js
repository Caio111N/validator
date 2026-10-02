/* Arquivo: test/cnpjLookup.test.js | Função: testar consulta CNPJ com fetch simulado. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { consultarCNPJ } = require("../cnpjLookup.js");

const CNPJ = "19131243000197";

/**
 * Substitui fetch durante um único teste e restaura o ambiente mesmo se houver falha.
 * @param {Function} simulacao Resposta que o fetch simulado deve produzir.
 * @param {Function} executar Verificações do cenário.
 * @returns {Promise<void>} Conclusão das verificações.
 */
async function comFetch(simulacao, executar) {
  const fetchOriginal = global.fetch;
  global.fetch = simulacao;
  try {
    await executar();
  } finally {
    global.fetch = fetchOriginal;
  }
}

test("consulta com sucesso e retorna somente dados empresariais normalizados", async () => {
  const resposta = {
    razao_social: "OPEN KNOWLEDGE BRASIL",
    nome_fantasia: "REDE PELO CONHECIMENTO LIVRE",
    descricao_situacao_cadastral: "ATIVA",
    situacao_cadastral: 2,
    data_inicio_atividade: "2013-10-03",
    cnae_fiscal: 9430800,
    cnae_fiscal_descricao: "Atividades de associações",
    natureza_juridica: "Associação Privada",
    descricao_porte: "DEMAIS",
    municipio: "SÃO PAULO",
    uf: "SP",
    qsa: [{ nome_socio: "Dado que não deve ser retornado" }],
    email: "nao-exibir@example.com",
    ddd_telefone_1: "11999999999",
  };

  await comFetch(
    async (url, opcoes) => {
      assert.equal(url, `https://brasilapi.com.br/api/cnpj/v1/${CNPJ}`);
      assert.ok(opcoes.signal instanceof AbortSignal);
      return { ok: true, status: 200, json: async () => resposta };
    },
    async () => {
      const empresa = await consultarCNPJ(CNPJ);
      assert.deepEqual(empresa, {
        razaoSocial: "OPEN KNOWLEDGE BRASIL",
        nomeFantasia: "REDE PELO CONHECIMENTO LIVRE",
        situacaoCadastral: "ATIVA",
        dataInicioAtividade: "03/10/2013",
        atividadePrincipal: "9430800 - Atividades de associações",
        naturezaJuridica: "Associação Privada",
        porte: "DEMAIS",
        cidadeUf: "SÃO PAULO/SP",
        avisoMei: false,
        fonte: "Dados da Receita Federal via BrasilAPI",
      });
      assert.equal("qsa" in empresa, false);
      assert.equal("email" in empresa, false);
      assert.equal("ddd_telefone_1" in empresa, false);
    },
  );
});

test("traduz resposta 404 para mensagem de CNPJ não encontrado", async () => {
  await comFetch(
    async () => ({ ok: false, status: 404 }),
    async () => {
      await assert.rejects(consultarCNPJ(CNPJ), {
        code: "NAO_ENCONTRADO",
        message: "CNPJ não encontrado na base consultada.",
      });
    },
  );
});

test("traduz resposta 429 para mensagem de muitas consultas", async () => {
  await comFetch(
    async () => ({ ok: false, status: 429 }),
    async () => {
      await assert.rejects(consultarCNPJ(CNPJ), {
        code: "MUITAS_CONSULTAS",
        message: "Muitas consultas em pouco tempo. Aguarde e tente novamente.",
      });
    },
  );
});

test("encerra a consulta no prazo de dez segundos", async () => {
  const setTimeoutOriginal = global.setTimeout;
  const clearTimeoutOriginal = global.clearTimeout;
  global.setTimeout = (callback, atraso) => {
    assert.equal(atraso, 10_000);
    queueMicrotask(callback);
    return 1;
  };
  global.clearTimeout = () => {};

  try {
    await comFetch(
      (_url, opcoes) =>
        new Promise((resolve, reject) => {
          opcoes.signal.addEventListener("abort", () => {
            const erro = new Error("mensagem técnica que não deve ser exibida");
            erro.name = "AbortError";
            reject(erro);
          });
        }),
      async () => {
        await assert.rejects(consultarCNPJ(CNPJ), {
          code: "TIMEOUT",
          message: "A consulta demorou mais que o esperado. Tente novamente.",
        });
      },
    );
  } finally {
    global.setTimeout = setTimeoutOriginal;
    global.clearTimeout = clearTimeoutOriginal;
  }
});

test("traduz falha de rede sem expor erro técnico", async () => {
  await comFetch(
    async () => {
      throw new Error("detalhe técnico privado");
    },
    async () => {
      await assert.rejects(consultarCNPJ(CNPJ), {
        code: "REDE",
        message:
          "Não foi possível conectar ao serviço de consulta. Verifique sua conexão e tente novamente.",
      });
    },
  );
});

test("não envia CNPJ alfanumérico à API", async () => {
  await comFetch(
    async () => {
      assert.fail("fetch não deve ser chamado para CNPJ alfanumérico");
    },
    async () => {
      await assert.rejects(consultarCNPJ("12ABC34501DE00"), {
        code: "CNPJ_ALFANUMERICO",
        message:
          "A consulta pela BrasilAPI ainda não aceita CNPJ alfanumérico.",
      });
    },
  );
});
