// Site do Brandoc: carrossel das telas e formulário da lista de espera. Sem dependências.
"use strict";

(function carrossel() {
  const raiz = document.querySelector("[data-carrossel]");
  if (!raiz) return;
  const telas = [...raiz.querySelectorAll(".tela")];
  const titulo = raiz.querySelector("[data-titulo]");
  const legenda = raiz.querySelector("[data-legenda]");
  const pontos = raiz.querySelector("[data-pontos]");
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)");
  let atual = 0;
  let pausadoPeloUsuario = reduzir.matches; // com movimento reduzido, só troca pelos pontos
  let pausadoPorPerto = false;

  const botoes = telas.map((tela, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Mostrar a tela " + tela.dataset.titulo);
    b.innerHTML = '<span class="ponto"></span>';
    b.addEventListener("click", () => mostrar(i, true));
    pontos.append(b);
    return b;
  });

  const pausa = document.createElement("button");
  pausa.type = "button";
  pausa.className = "pausa";
  pausa.addEventListener("click", () => {
    pausadoPeloUsuario = !pausadoPeloUsuario;
    atualizarPausa();
  });
  pontos.append(pausa);

  function atualizarPausa() {
    pausa.setAttribute("aria-label", pausadoPeloUsuario ? "Continuar a troca das telas" : "Pausar a troca das telas");
    pausa.innerHTML = pausadoPeloUsuario
      ? '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/></svg>';
  }

  function mostrar(i, peloUsuario) {
    atual = i;
    telas.forEach((t, j) => t.classList.toggle("ativa", j === i));
    botoes.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    // Só anuncia ao leitor de tela quando a pessoa escolheu; a troca automática fica em silêncio.
    titulo.setAttribute("aria-live", peloUsuario ? "polite" : "off");
    titulo.textContent = telas[i].dataset.titulo;
    legenda.textContent = telas[i].dataset.legenda;
  }

  raiz.addEventListener("mouseenter", () => (pausadoPorPerto = true));
  raiz.addEventListener("mouseleave", () => (pausadoPorPerto = raiz.contains(document.activeElement)));
  raiz.addEventListener("focusin", () => (pausadoPorPerto = true));
  raiz.addEventListener("focusout", (e) => (pausadoPorPerto = raiz.contains(e.relatedTarget) || raiz.matches(":hover")));
  reduzir.addEventListener("change", () => {
    pausadoPeloUsuario = reduzir.matches;
    atualizarPausa();
  });

  // setInterval não roda com a aba em segundo plano no ritmo normal; o teste de visibilidade garante a pausa.
  setInterval(() => {
    if (pausadoPeloUsuario || pausadoPorPerto || document.hidden) return;
    mostrar((atual + 1) % telas.length, false);
  }, 5000);

  atualizarPausa();
  mostrar(0, false);
})();

(function listaDeEspera() {
  const form = document.querySelector("[data-lista]");
  if (!form) return;
  const erro = form.querySelector("[data-erro]");
  const caixa = form.querySelector("[data-verificacao]");
  const botao = form.querySelector("button[type=submit]");
  const pronto = document.querySelector("[data-pronto]");
  let widget = null;
  let carregando = null;

  const MENSAGENS = {
    email: "Confira o e-mail.",
    especialidade: "Escolha a sua especialidade.",
    consentimento: "Marque a caixa de concordância para entrar na lista.",
    verificacao: "Não conseguimos confirmar que você não é um robô. Tente de novo.",
    limite: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
  };

  // O Turnstile só carrega quando a pessoa começa a preencher: quem só lê a página não chama ninguém de fora.
  function carregarVerificacao() {
    if (carregando) return carregando;
    carregando = new Promise((ok, falha) => {
      window.brandocTurnstile = () => {
        widget = window.turnstile.render(caixa, { sitekey: form.dataset.sitekey, language: "pt-br", theme: "light" });
        ok();
      };
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=brandocTurnstile";
      s.async = true;
      s.onerror = () => { carregando = null; falha(); };
      document.head.append(s);
    });
    return carregando;
  }
  form.addEventListener("focusin", () => carregarVerificacao().catch(() => {}), { once: true });

  function mostrarErro(texto) {
    erro.textContent = texto;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarErro("");
    if (!form.email.value.trim() || !form.email.checkValidity()) { mostrarErro(MENSAGENS.email); form.email.focus(); return; }
    if (!form.especialidade.value) { mostrarErro(MENSAGENS.especialidade); form.especialidade.focus(); return; }
    if (!form.consentimento.checked) { mostrarErro(MENSAGENS.consentimento); form.consentimento.focus(); return; }

    botao.disabled = true;
    try {
      await carregarVerificacao();
      const token = window.turnstile.getResponse(widget);
      if (!token) { mostrarErro("Espere a verificação terminar e tente de novo."); return; }
      const r = await fetch(form.action, { method: "POST", body: new URLSearchParams(new FormData(form)) });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        mostrarErro(MENSAGENS[corpo.erro] || "Não deu certo agora. Tente de novo em alguns minutos.");
        window.turnstile.reset(widget);
        return;
      }
      const link = pronto.querySelector("[data-saida]");
      link.href = corpo.saida;
      link.textContent = corpo.saida;
      form.hidden = true;
      pronto.hidden = false;
      pronto.focus();
    } catch {
      mostrarErro("Sem conexão com o site agora. Tente de novo em alguns minutos.");
    } finally {
      botao.disabled = false;
    }
  });

  pronto.querySelector("[data-copiar]").addEventListener("click", async () => {
    const aviso = pronto.querySelector("[data-copiado]");
    try {
      await navigator.clipboard.writeText(pronto.querySelector("[data-saida]").href);
      aviso.textContent = "Link copiado.";
    } catch {
      aviso.textContent = "Não deu para copiar. Selecione o link e copie à mão.";
    }
  });
})();
