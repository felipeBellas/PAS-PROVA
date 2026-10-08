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
   PAS-PROVA
   ESCUTA EM TEMPO REAL DO ENVIO DO GOOGLE FORMS
   ========================================================= */

function iniciarEscutaTentativa() {

  if (!tentativaId) {
    console.warn(
      "PAS-PROVA: tentativa ainda não disponível para escuta."
    );
    return;
  }

  if (cancelarEscutaTentativa) {
    return;
  }

  const refTentativa =
    doc(db, "tentativas", tentativaId);


  cancelarEscutaTentativa =
    onSnapshot(

      refTentativa,

      (snapshot) => {

        if (!snapshot.exists()) {
          return;
        }

        const dados =
          snapshot.data();


        console.log(
          "PAS-PROVA: status da tentativa:",
          dados.status
        );


        if (
          dados.status === "enviada" &&
          !provaEncerrada
        ) {

          finalizarProvaEnviada(dados);

        }

      },

      (erro) => {

        console.error(
          "PAS-PROVA: erro ao acompanhar tentativa:",
          erro
        );

      }

    );

}


/* =========================================================
   ENCERRAMENTO APÓS ENVIO DO GOOGLE FORMS
   ========================================================= */

function finalizarProvaEnviada(dados = {}) {

  if (provaEncerrada) {
    return;
  }


  console.log(
    "PAS-PROVA: envio confirmado pelo Google Forms."
  );


  provaEncerrada = true;


  /* -------------------------------------------------------
     PARAR CRONÔMETRO
     ------------------------------------------------------- */

  if (intervalId) {

    clearInterval(intervalId);

    intervalId = null;

  }


  /* -------------------------------------------------------
     PARAR ESCUTA
     ------------------------------------------------------- */

  if (cancelarEscutaTentativa) {

    cancelarEscutaTentativa();

    cancelarEscutaTentativa = null;

  }


  /* -------------------------------------------------------
     SALVAR ESTADO LOCAL
     ------------------------------------------------------- */

  salvarSessao({

    iniciada: true,

    encerrada: true,

    status: "enviada",

    motivoEncerramento:
      dados.motivoEncerramento ||
      "Resposta enviada pelo Google Forms.",

    encerradaEm:
      dados.encerradaEm ||
      new Date().toISOString()

  });


  /* -------------------------------------------------------
     REMOVER GOOGLE FORMS
     ------------------------------------------------------- */

  const containerForms =
    document.getElementById(
      "container-forms"
    );


  if (containerForms) {

    containerForms.innerHTML = "";

  }


  /* -------------------------------------------------------
     EXIBIR TELA FINAL
     ------------------------------------------------------- */

  mostrarProvaEnviada();

}


/* =========================================================
   TELA DE PROVA ENVIADA
   ========================================================= */

function mostrarProvaEnviada() {

  const containerForms =
    document.getElementById(
      "container-forms"
    );


  if (!containerForms) {
    return;
  }


  containerForms.innerHTML = `

    <div
      style="
        min-height: 70vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      "
    >

      <div
        style="
          width: 100%;
          max-width: 520px;
          text-align: center;
          background: #ffffff;
          border-radius: 16px;
          padding: 42px 28px;
          box-shadow:
            0 12px 35px
            rgba(0,0,0,0.25);
        "
      >

        <div
          style="
            font-size: 64px;
            margin-bottom: 18px;
          "
        >
          ✓
        </div>


        <h2
          style="
            margin: 0 0 12px;
            font-size: 28px;
            font-weight: 700;
            color: #111827;
          "
        >
          Prova enviada com sucesso
        </h2>


        <p
          style="
            margin: 0;
            font-size: 17px;
            line-height: 1.5;
            color: #4b5563;
          "
        >
          Sua resposta foi registrada.
          <br>
          Avaliação encerrada.
        </p>

      </div>

    </div>

  `;

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

      iniciarEscutaTentativa();


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
    iniciarEscutaTentativa();

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
   PAS-PROVA — GOOGLE FORMS
   PAS-ID DINÂMICO POR FORMULÁRIO
   ========================================================= */

function carregarGoogleForms() {

  if (!elIframe || !dadosProvaAtual) {
    return;
  }

  const linkOriginal = dadosProvaAtual.linkForms;

  if (!linkOriginal) {
    console.error(
      "PAS-PROVA: link do formulário não encontrado."
    );
    return;
  }

  try {

    const urlForms = new URL(linkOriginal);

    // Identificador próprio do formulário,
    // armazenado no documento da prova no Firestore.
    const entryPas = String(
      dadosProvaAtual.entryPas ||
      dadosProvaAtual.pasIdEntry ||
      ""
    ).trim();

    // Não utilizar o identificador fixo antigo.
    urlForms.searchParams.delete("entry.26043389");

    if (!/^entry\.\d+$/.test(entryPas)) {

      console.error(
        "PAS-PROVA: formulário sem entryPas válido.",
        {
          codigoProva,
          provaId,
          entryPas
        }
      );

      if (elLoader) {
        elLoader.classList.add("hidden");
      }

      const container = document.getElementById(
        "container-forms"
      );

      if (container) {
        container.innerHTML = `
          <div style="
            padding: 32px;
            text-align: center;
            color: #f8fafc;
          ">
            <h2>Formulário não configurado</h2>
            <p>
              O PAS-ID deste formulário ainda não
              está vinculado à prova.
            </p>
            <p>
              Solicite ao professor que conclua
              a integração do formulário.
            </p>
          </div>
        `;
      }

      return;
    }

    // Preenchimento automático do PAS-ID.
    urlForms.searchParams.set(
      entryPas,
      tentativaId
    );

    urlForms.searchParams.set(
      "usp",
      "pp_url"
    );

    urlForms.searchParams.set(
      "embedded",
      "true"
    );

    // Preservar interação com o Google Forms.
    elIframe.removeAttribute("sandbox");

    elIframe.style.pointerEvents = "auto";
    elIframe.style.userSelect = "auto";
    elIframe.style.webkitUserSelect = "auto";

    elIframe.src = urlForms.toString();

    console.log(
      "PAS-PROVA: formulário carregado.",
      {
        codigoProva,
        tentativaId,
        entryPas
      }
    );

  } catch (erro) {

    console.error(
      "PAS-PROVA: erro ao carregar formulário:",
      erro
    );

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
   PAS-PROVA — TELA FINAL DE ENCERRAMENTO
   TEMPO ESGOTADO / LIMITE DE SAÍDAS
   ========================================================= */

function mostrarProvaEncerrada(motivo) {

  provaEncerrada = true;

  if (elCronometro) {
    elCronometro.innerText = "00:00";
  }

  const containerForms =
    document.getElementById("container-forms");

  if (!containerForms) {
    return;
  }

  const mensagem = String(
    motivo || "Esta tentativa foi encerrada."
  );

  containerForms.innerHTML = `
    <section
      style="
        min-height: calc(100vh - 65px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8fafc;
        padding: 24px;
      "
    >
      <div
        style="
          width: 100%;
          max-width: 560px;
          padding: 40px 28px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          text-align: center;
          box-shadow: 0 12px 35px rgba(15,23,42,0.06);
        "
      >
        <div
          style="
            width: 72px;
            height: 72px;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #fee2e2;
            font-size: 34px;
          "
          aria-hidden="true"
        >
          🔒
        </div>

        <h2
          style="
            margin: 0 0 18px;
            color: #991b1b;
            font-size: 29px;
            font-weight: 700;
          "
        >
          Prova encerrada
        </h2>

        <p
          style="
            margin: 0 0 20px;
            color: #334155;
            font-size: 18px;
            font-weight: 600;
            line-height: 1.5;
          "
        >
          ${escapeHtml(mensagem)}
        </p>

        <p
          style="
            margin: 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.7;
          "
        >
          Esta tentativa foi finalizada.
          Não é possível continuar ou reiniciar
          esta avaliação.
        </p>

        <div
          style="
            margin-top: 26px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          "
        >
          Procure seu professor caso precise
          de orientação.
        </div>
      </div>
    </section>
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
