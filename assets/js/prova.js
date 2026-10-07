/* =========================================================
   PAS-PROVA
   EXECUÇÃO DA AVALIAÇÃO

   ETAPA 2

   - acesso direto pelo link da prova
   - aluno sem login PAS
   - tentativa automática
   - tentativa registrada no Firestore
   - cronômetro persistente
   - F5 não reinicia tempo
   - monitoramento de saída
   - logs vinculados à tentativa
   - encerramento registrado no Firestore
   ========================================================= */


import { db } from './firebase-config.js';


import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


/* =========================================================
   PARÂMETROS
   ========================================================= */

const urlParams =
  new URLSearchParams(
    window.location.search
  );


const codigoProva =
  String(
    urlParams.get("codigo") || ""
  )
    .trim()
    .toUpperCase();


/* =========================================================
   TENTATIVA
   ========================================================= */

let tentativaId = null;

let provaId = null;


/* =========================================================
   ALUNO
   ========================================================= */

const nomeAluno =
  sessionStorage.getItem("aluno_nome")
  ||
  "Aluno";


/* =========================================================
   ARMAZENAMENTO LOCAL
   ========================================================= */

const chaveTentativa =
  codigoProva
    ? `pas_tentativa_${codigoProva}`
    : null;


let chaveSessao = null;


/* =========================================================
   ESTADO
   ========================================================= */

let dadosProvaAtual = null;

let tempoRestanteSegundos = 0;

let contadorAlertas = 0;

let limiteSaidas = 2;

let intervalId = null;

let horarioFim = null;

let provaIniciada = false;

let provaEncerrada = false;

let cancelarEscutaTentativa = null;

let monitoramentoIniciado = false;

let protecoesIniciadas = false;

let paginaFicouOculta = false;


/* =========================================================
   ELEMENTOS
   ========================================================= */

const elInfoAluno =
  document.getElementById(
    "info-aluno"
  );


const elTitulo =
  document.getElementById(
    "titulo-exame"
  );


const elCronometro =
  document.getElementById(
    "cronometro"
  );


const elContadorAlertas =
  document.getElementById(
    "contador-alertas"
  );


const elIframe =
  document.getElementById(
    "iframe-forms"
  );


const elLoader =
  document.getElementById(
    "loader"
  );


if (elInfoAluno) {

  elInfoAluno.innerText =
    "PAS-PROVA";

}


/* =========================================================
   GERAR ID
   ========================================================= */

function gerarTentativaId() {

  if (
    window.crypto
    &&
    typeof window.crypto.randomUUID === "function"
  ) {

    return window.crypto.randomUUID();

  }


  return (
    Date.now().toString(36)
    +
    "-"
    +
    Math.random()
      .toString(36)
      .substring(2, 12)
  );

}


/* =========================================================
   PREPARAR TENTATIVA
   ========================================================= */

function prepararTentativa() {

  if (!codigoProva) {

    return false;

  }


  try {

    tentativaId =
      localStorage.getItem(
        chaveTentativa
      );

  }

  catch (erro) {

    console.error(
      "Erro ao recuperar tentativa:",
      erro
    );

  }


  if (!tentativaId) {

    tentativaId =
      gerarTentativaId();


    try {

      localStorage.setItem(
        chaveTentativa,
        tentativaId
      );

    }

    catch (erro) {

      console.error(
        "Erro ao salvar tentativa:",
        erro
      );

    }

  }


  chaveSessao =
    `pas_prova_${codigoProva}_${tentativaId}`;


  return true;

}


/* =========================================================
   LOCALSTORAGE
   ========================================================= */

function carregarSessao() {

  if (!chaveSessao) {

    return null;

  }


  try {

    const dados =
      localStorage.getItem(
        chaveSessao
      );


    if (!dados) {

      return null;

    }


    return JSON.parse(
      dados
    );

  }

  catch (erro) {

    console.error(
      "Erro ao recuperar sessão:",
      erro
    );


    return null;

  }

}


/* =========================================================
   SALVAR SESSÃO LOCAL
   ========================================================= */

function salvarSessao(
  dadosExtras = {}
) {

  if (!chaveSessao) {

    return;

  }


  const anterior =
    carregarSessao()
    ||
    {};


  const atualizada = {

    ...anterior,

    codigoProva,

    tentativaId,

    provaId,

    aluno:
      nomeAluno,

    horarioFim,

    contadorAlertas,

    iniciada:
      provaIniciada,

    encerrada:
      provaEncerrada,

    ...dadosExtras

  };


  try {

    localStorage.setItem(

      chaveSessao,

      JSON.stringify(
        atualizada
      )

    );

  }

  catch (erro) {

    console.error(
      "Erro ao salvar sessão:",
      erro
    );

  }

}


/* =========================================================
   REFERÊNCIA FIRESTORE DA TENTATIVA
   ========================================================= */

function referenciaTentativa() {

  if (!tentativaId) {

    return null;

  }


  return doc(
    db,
    "tentativas",
    tentativaId
  );

}


/* =========================================================
   CRIAR TENTATIVA NO FIRESTORE
   ========================================================= */

async function criarTentativaFirestore() {

  const referencia =
    referenciaTentativa();


  if (!referencia) {

    return;

  }


  const snapshot =
    await getDoc(
      referencia
    );


  /*
    Nunca sobrescrever uma tentativa existente.
  */

  if (snapshot.exists()) {

    return;

  }


  await setDoc(

    referencia,

    {

      tentativaId:
        tentativaId,

      codigoProva:
        codigoProva,

      provaId:
        provaId,

      aluno:
        nomeAluno,

      iniciadaEm:
        new Date()
          .toISOString(),

      horarioFim:
        Math.trunc(
          horarioFim
        ),

      status:
        "em_andamento",

      contadorAlertas:
        0,

      encerradaEm:
        null,

      motivoEncerramento:
        null

    }

  );

}


/* =========================================================
   RECUPERAR TENTATIVA FIRESTORE
   ========================================================= */

async function carregarTentativaFirestore() {

  try {

    const referencia =
      referenciaTentativa();


    if (!referencia) {

      return null;

    }


    const snapshot =
      await getDoc(
        referencia
      );


    if (!snapshot.exists()) {

      return null;

    }


    return snapshot.data();

  }

  catch (erro) {

    console.error(
      "Erro ao carregar tentativa do Firestore:",
      erro
    );


    return null;

  }

}


/* =========================================================
   ATUALIZAR TENTATIVA
   ========================================================= */

async function atualizarTentativaFirestore(
  dados
) {

  try {

    const referencia =
      referenciaTentativa();


    if (!referencia) {

      return;

    }


    await updateDoc(
      referencia,
      dados
    );

  }

  catch (erro) {

    console.error(
      "Erro ao atualizar tentativa:",
      erro
    );

  }

}


/* =========================================================
   INICIALIZAR
   ========================================================= */

async function inicializarProva() {


  /* =======================================================
     VALIDAR CÓDIGO
     ======================================================= */

  if (!codigoProva) {

    alert(
      "Código da prova não fornecido."
    );


    window.location.href =
      "./index.html";


    return;

  }


  /* =======================================================
     PREPARAR TENTATIVA
     ======================================================= */

  if (!prepararTentativa()) {

    alert(
      "Não foi possível iniciar a tentativa."
    );


    return;

  }


  try {


    /* =====================================================
       LOCALIZAR PROVA
       ===================================================== */

    const q =
      query(

        collection(
          db,
          "provas"
        ),

        where(
          "codigo",
          "==",
          codigoProva
        )

      );


    const querySnapshot =
      await getDocs(
        q
      );


    if (
      querySnapshot.empty
    ) {

      alert(
        "Prova não encontrada."
      );


      window.location.href =
        "./index.html";


      return;

    }


    const documentoProva =
      querySnapshot.docs[0];


    provaId =
      documentoProva.id;


    dadosProvaAtual =
      documentoProva.data();


    limiteSaidas =
      Number(
        dadosProvaAtual.limiteSaidas
        ??
        2
      );


    /* =====================================================
       TÍTULO
       ===================================================== */

    if (elTitulo) {

      elTitulo.innerText =
        `${dadosProvaAtual.titulo} (${dadosProvaAtual.turma})`;

    }


    /* =====================================================
       SESSÃO LOCAL
       ===================================================== */

    const sessao =
      carregarSessao();


    if (sessao) {

      contadorAlertas =
        Number(
          sessao.contadorAlertas
          ||
          0
        );


      provaIniciada =
        sessao.iniciada === true;


      provaEncerrada =
        sessao.encerrada === true;


      if (
        sessao.horarioFim
      ) {

        horarioFim =
          Number(
            sessao.horarioFim
          );

      }

    }


    /* =====================================================
       VERIFICAR FIRESTORE
       ===================================================== */

    const tentativaFirebase =
      await carregarTentativaFirestore();


    if (tentativaFirebase) {

      /*
        Se já existe no servidor, usamos o horário
        registrado lá.
      */

      if (
        tentativaFirebase.horarioFim
      ) {

        horarioFim =
          Number(
            tentativaFirebase.horarioFim
          );

      }


      contadorAlertas =
        Number(
          tentativaFirebase.contadorAlertas
          ||
          contadorAlertas
          ||
          0
        );


      /*
        Status terminal.
      */

      if (
        tentativaFirebase.status
        !==
        "em_andamento"
      ) {

        provaIniciada =
          true;


        provaEncerrada =
          true;


        salvarSessao({

          iniciada:
            true,

          encerrada:
            true,

          motivoEncerramento:
            tentativaFirebase.motivoEncerramento
            ||
            "Esta tentativa já foi encerrada."

        });


        atualizarContadorAlertas();


        esconderLoader();


        mostrarProvaEncerrada(

          tentativaFirebase.motivoEncerramento
          ||
          "Esta tentativa já foi encerrada."

        );


        return;

      }


      /*
        Existe no Firestore e está em andamento.
      */

      provaIniciada =
        true;


      provaEncerrada =
        false;


      salvarSessao({

        iniciada:
          true,

        encerrada:
          false

      });

    }


    atualizarContadorAlertas();


    /* =====================================================
       LOCAL JÁ ENCERRADO
       ===================================================== */

    if (
      provaEncerrada
    ) {

      esconderLoader();


      mostrarProvaEncerrada(

        sessao?.motivoEncerramento
        ||
        "Esta prova já foi encerrada."

      );


      return;

    }


    /* =====================================================
       PROVA EM ANDAMENTO
       ===================================================== */

    if (
      provaIniciada
      &&
      horarioFim
    ) {

      if (
        calcularTempoRestante()
        <=
        0
      ) {

        esconderLoader();


        await encerrarProva(
          "Tempo Esgotado!",
          "tempo_esgotado"
        );


        return;

      }


      carregarGoogleForms();


      esconderLoader();


      iniciarCronometro();


      iniciarMonitoramentoSessao();


      iniciarProtecoesContraCopia();


      return;

    }


    /* =====================================================
       NOVA TENTATIVA
       ===================================================== */

    await iniciarNovaTentativa();


  }

  catch (erro) {

    console.error(
      "Erro ao inicializar prova:",
      erro
    );


    alert(
      "Erro ao carregar a prova: "
      +
      erro.message
    );

  }

}


/* =========================================================
   NOVA TENTATIVA
   ========================================================= */

async function iniciarNovaTentativa() {

  if (!dadosProvaAtual) {

    return;

  }


  const duracaoMinutos =
    Number(
      dadosProvaAtual.duracao
      ||
      50
    );


  horarioFim =
    Date.now()
    +
    (
      duracaoMinutos
      *
      60
      *
      1000
    );


  provaIniciada =
    true;


  provaEncerrada =
    false;


  contadorAlertas =
    0;


  salvarSessao({

    criadaEm:
      new Date()
        .toISOString(),

    iniciada:
      true,

    iniciadaEm:
      new Date()
        .toISOString(),

    encerrada:
      false

  });


  /* =======================================================
     FIRESTORE
     ======================================================= */

  try {

    await criarTentativaFirestore();

  }

  catch (erro) {

    console.error(
      "Não foi possível registrar a tentativa no Firestore:",
      erro
    );

    /*
      Não interrompemos a prova.

      O armazenamento local continua preservando
      a tentativa.
    */

  }


  iniciarCronometro();


  carregarGoogleForms();


  esconderLoader();


  iniciarMonitoramentoSessao();


  iniciarProtecoesContraCopia();

}


/* =========================================================
   GOOGLE FORMS
   ETAPA 3B — CORREÇÃO DO IFRAME

   - mantém PAS-ID automático
   - utiliza modo incorporado do Google Forms
   - preserva a interação com os campos
   ========================================================= */

function carregarGoogleForms() {

  if (
    !elIframe ||
    !dadosProvaAtual
  ) {
    return;
  }


  const linkOriginal =
    dadosProvaAtual.linkForms;


  if (!linkOriginal) {

    console.error(
      "Link do Google Forms não encontrado."
    );

    return;
  }


  try {

    const urlForms =
      new URL(linkOriginal);


    /* =====================================================
       PAS-ID
       ===================================================== */

    urlForms.searchParams.set(
      "entry.26043389",
      tentativaId
    );


    /* =====================================================
       PREFILL
       ===================================================== */

    urlForms.searchParams.set(
      "usp",
      "pp_url"
    );


    /* =====================================================
       MODO INCORPORADO
       ===================================================== */

    urlForms.searchParams.set(
      "embedded",
      "true"
    );


    /* =====================================================
       CONFIGURAÇÃO DO IFRAME
       ===================================================== */

    elIframe.removeAttribute(
      "sandbox"
    );

    elIframe.style.pointerEvents =
      "auto";

    elIframe.style.userSelect =
      "auto";

    elIframe.style.webkitUserSelect =
      "auto";


    /* =====================================================
       CARREGAR FORMULÁRIO
       ===================================================== */

    elIframe.src =
      urlForms.toString();


    console.log(
      "Google Forms carregado."
    );

    console.log(
      "Tentativa:",
      tentativaId
    );

  }

  catch (erro) {

    console.error(
      "Erro ao preparar Google Forms:",
      erro
    );


    elIframe.style.pointerEvents =
      "auto";


    elIframe.src =
      linkOriginal;

  }

}

/* =========================================================
   TEMPO
   ========================================================= */

function calcularTempoRestante() {

  if (!horarioFim) {

    return 0;

  }


  return Math.max(

    0,

    Math.ceil(

      (
        horarioFim
        -
        Date.now()
      )

      /

      1000

    )

  );

}


/* =========================================================
   ATUALIZAR CRONÔMETRO
   ========================================================= */

function atualizarCronometro() {

  tempoRestanteSegundos =
    calcularTempoRestante();


  const minutos =
    String(

      Math.floor(
        tempoRestanteSegundos
        /
        60
      )

    ).padStart(
      2,
      "0"
    );


  const segundos =
    String(
      tempoRestanteSegundos
      %
      60
    ).padStart(
      2,
      "0"
    );


  if (elCronometro) {

    elCronometro.innerText =
      `${minutos}:${segundos}`;

  }

}


/* =========================================================
   CRONÔMETRO
   ========================================================= */

function iniciarCronometro() {

  if (intervalId) {

    clearInterval(
      intervalId
    );

  }


  atualizarCronometro();


  if (
    tempoRestanteSegundos
    <=
    0
  ) {

    encerrarProva(
      "Tempo Esgotado!",
      "tempo_esgotado"
    );


    return;

  }


  intervalId =
    setInterval(

      async () => {

        atualizarCronometro();


        if (
          tempoRestanteSegundos
          <=
          0
        ) {

          clearInterval(
            intervalId
          );


          intervalId =
            null;


          await encerrarProva(
            "Tempo Esgotado!",
            "tempo_esgotado"
          );

        }

      },

      1000

    );

}


/* =========================================================
   CONTADOR
   ========================================================= */

function atualizarContadorAlertas() {

  if (elContadorAlertas) {

    elContadorAlertas.innerText =
      contadorAlertas;

  }

}


/* =========================================================
   MONITORAMENTO
   ========================================================= */

function iniciarMonitoramentoSessao() {

  if (monitoramentoIniciado) {

    return;

  }


  monitoramentoIniciado =
    true;


  document.addEventListener(

    "visibilitychange",

    () => {

      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {

        return;

      }


      if (
        document.hidden
      ) {

        paginaFicouOculta =
          true;


        return;

      }


      if (
        paginaFicouOculta
      ) {

        paginaFicouOculta =
          false;


        registrarSaidaDeTela();

      }

    }

  );

}


/* =========================================================
   SAÍDA DE TELA
   ========================================================= */

async function registrarSaidaDeTela() {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {

    return;

  }


  contadorAlertas++;


  atualizarContadorAlertas();


  salvarSessao();


  /*
    Atualiza somente quando há ocorrência.

    Não fazemos gravações a cada segundo.
  */

  await atualizarTentativaFirestore({

    contadorAlertas:
      contadorAlertas

  });


  salvarLogViolacao(
    "Troca de Aba / Janela Minimizada"
  );


  if (
    contadorAlertas
    >
    limiteSaidas
  ) {

    await encerrarProva(

      "Você excedeu o limite máximo de trocas de tela permitido!",

      "limite_saidas"

    );

  }

  else {

    alert(

      `ATENÇÃO: Você saiu da tela da prova! Alerta ${contadorAlertas} de ${limiteSaidas}.`

    );

  }

}


/* =========================================================
   PROTEÇÕES
   ========================================================= */

function iniciarProtecoesContraCopia() {

  if (protecoesIniciadas) {

    return;

  }


  protecoesIniciadas =
    true;


  document.addEventListener(

    "contextmenu",

    (evento) => {

      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {

        return;

      }


      evento.preventDefault();


      salvarLogViolacao(
        "Tentativa de abrir menu de contexto"
      );

    }

  );


  document.addEventListener(

    "copy",

    (evento) => {

      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {

        return;

      }


      evento.preventDefault();


      salvarLogViolacao(
        "Tentativa de copiar conteúdo"
      );

    }

  );


  document.addEventListener(

    "cut",

    (evento) => {

      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {

        return;

      }


      evento.preventDefault();


      salvarLogViolacao(
        "Tentativa de recortar conteúdo"
      );

    }

  );


  document.addEventListener(

    "dragstart",

    (evento) => {

      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {

        return;

      }


      evento.preventDefault();

    }

  );


  document.addEventListener(

    "keydown",

    (evento) => {

      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {

        return;

      }


      const tecla =
        evento.key.toLowerCase();


      const modificador =
        evento.ctrlKey
        ||
        evento.metaKey;


      if (
        modificador
        &&
        [
          "c",
          "x",
          "a",
          "s",
          "p",
          "u"
        ].includes(tecla)
      ) {

        evento.preventDefault();


        salvarLogViolacao(
          `Atalho bloqueado: ${tecla.toUpperCase()}`
        );


        return;

      }


      if (
        evento.key
        ===
        "F12"
      ) {

        evento.preventDefault();


        salvarLogViolacao(
          "Tentativa de usar F12"
        );


        return;

      }


      if (
        evento.ctrlKey
        &&
        evento.shiftKey
        &&
        [
          "i",
          "j",
          "c"
        ].includes(tecla)
      ) {

        evento.preventDefault();


        salvarLogViolacao(
          "Tentativa de usar atalho de inspeção"
        );

      }

    }

  );

}


/* =========================================================
   LOG
   ========================================================= */

async function salvarLogViolacao(
  tipo
) {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {

    return;

  }


  try {

    await addDoc(

      collection(
        db,
        "logs_violacao"
      ),

      {

        aluno:
          nomeAluno,

        codigoProva:
          codigoProva,

        tentativaId:
          tentativaId,

        tipoViolacao:
          tipo,

        timestamp:
          new Date()
            .toISOString()

      }

    );

  }

  catch (erro) {

    console.error(
      "Erro ao salvar log:",
      erro
    );

  }

}


/* =========================================================
   ENCERRAR
   ========================================================= */

async function encerrarProva(
  motivo,
  status = "tempo_esgotado"
) {

  if (provaEncerrada) {

    return;

  }


  provaEncerrada =
    true;


  if (intervalId) {

    clearInterval(
      intervalId
    );


    intervalId =
      null;

  }


  const encerradaEm =
    new Date()
      .toISOString();


  salvarSessao({

    iniciada:
      true,

    encerrada:
      true,

    status:
      status,

    motivoEncerramento:
      motivo,

    encerradaEm:
      encerradaEm

  });


  /* =======================================================
     FIRESTORE
     ======================================================= */

  await atualizarTentativaFirestore({

    status:
      status,

    contadorAlertas:
      contadorAlertas,

    encerradaEm:
      encerradaEm,

    motivoEncerramento:
      motivo

  });


  mostrarProvaEncerrada(
    motivo
  );

}


/* =========================================================
   TELA FINAL
   ========================================================= */

function mostrarProvaEncerrada(
  motivo
) {

  provaEncerrada =
    true;


  if (elCronometro) {

    elCronometro.innerText =
      "00:00";

  }


  const containerForms =
    document.getElementById(
      "container-forms"
    );


  if (!containerForms) {

    return;

  }


  containerForms.innerHTML = `

    <div
      class="
        flex
        flex-col
        items-center
        justify-center
        min-h-[calc(100vh-65px)]
        p-8
        text-center
        space-y-4
        bg-slate-950
      "
    >

      <div
        class="
          w-16
          h-16
          rounded-full
          bg-red-950
          border
          border-red-800
          flex
          items-center
          justify-center
        "
      >

        <span class="text-3xl">
          🔒
        </span>

      </div>


      <h2
        class="
          text-3xl
          font-bold
          text-red-500
        "
      >
        Prova Encerrada
      </h2>


      <p
        class="
          text-slate-300
          max-w-md
        "
      >
        ${escapeHtml(motivo)}
      </p>


      <p
        class="
          text-sm
          text-slate-500
          max-w-md
        "
      >
        Esta tentativa foi finalizada.
        Atualizar a página não reiniciará
        a avaliação.
      </p>


      <a
        href="./index.html"
        class="
          bg-blue-600
          hover:bg-blue-500
          px-6
          py-3
          rounded-lg
          text-white
          font-semibold
        "
      >
        Voltar ao Início
      </a>

    </div>

  `;

}


/* =========================================================
   LOADER
   ========================================================= */

function esconderLoader() {

  if (elLoader) {

    elLoader
      .classList
      .add(
        "hidden"
      );

  }

}


/* =========================================================
   ESCAPE
   ========================================================= */

function escapeHtml(
  valor
) {

  return String(
    valor
    ??
    ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   INICIAR
   ========================================================= */

inicializarProva();
