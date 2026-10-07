/* =========================================================
   PAS-PROVA
   PAINEL DO PROFESSOR
   ========================================================= */

import {
  db,
  auth
} from './firebase-config.js';


import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


/* =========================================================
   PROTEÇÃO DO PAINEL E PERFIL DO USUÁRIO
   ========================================================= */

let usuarioAtual = null;
let perfilAtual = null;
let dadosUsuarioAtual = null;


/* =========================================================
   ELEMENTOS
   ========================================================= */

const formCriar =
  document.getElementById('form-criar-prova');

const listaProvas =
  document.getElementById('lista-provas');

const provaId =
  document.getElementById('prova-id');

const tituloFormulario =
  document.getElementById('titulo-formulario');

const btnSalvar =
  document.getElementById('btn-salvar-prova');

const btnCancelarEdicao =
  document.getElementById('btn-cancelar-edicao');

const btnAtualizarLista =
  document.getElementById('btn-atualizar-lista');

const btnGerenciarUsuarios =
  document.getElementById('btn-gerenciar-usuarios');

const conteudoPainel =
  document.getElementById('conteudo-painel');

/* =========================================================
   ELEMENTOS — ACOMPANHAMENTO
   ========================================================= */

const modalAcompanhamento =
  document.getElementById(
    'modal-acompanhamento'
  );

const acompanhamentoTitulo =
  document.getElementById(
    'acompanhamento-titulo'
  );

const acompanhamentoInfo =
  document.getElementById(
    'acompanhamento-info'
  );

const listaTentativas =
  document.getElementById(
    'lista-tentativas'
  );

const btnFecharAcompanhamento =
  document.getElementById(
    'btn-fechar-acompanhamento'
  );

const btnAtualizarAcompanhamento =
  document.getElementById(
    'btn-atualizar-acompanhamento'
  );

const resumoTotal =
  document.getElementById(
    'resumo-total'
  );

const resumoAndamento =
  document.getElementById(
    'resumo-andamento'
  );

const resumoEnviadas =
  document.getElementById(
    'resumo-enviadas'
  );

const resumoTempo =
  document.getElementById(
    'resumo-tempo'
  );

const resumoEncerradas =
  document.getElementById(
    'resumo-encerradas'
  );

const resumoAlertas =
  document.getElementById(
    'resumo-alertas'
  );

/* =========================================================
   CONTROLE
   ========================================================= */

let provasCarregadas = [];


/* =========================================================
   CONTROLE DO ACOMPANHAMENTO
   ========================================================= */

let cancelarEscutaAcompanhamento = null;

let provaEmAcompanhamento = null;

/* =========================================================
   AUTENTICAÇÃO E PERFIL
   ========================================================= */

onAuthStateChanged(
  auth,
  async (usuario) => {

    /* -----------------------------------------------------
       NÃO AUTENTICADO
       ----------------------------------------------------- */

    if (!usuario) {

      window.location.replace(
        "./login-professor.html"
      );

      return;
    }


    try {

      /* ---------------------------------------------------
         CONSULTAR CADASTRO DO USUÁRIO
         --------------------------------------------------- */

      const referenciaUsuario =
        doc(
          db,
          "usuarios",
          usuario.uid
        );


      const documentoUsuario =
        await getDoc(
          referenciaUsuario
        );


      /* ---------------------------------------------------
         USUÁRIO NÃO CADASTRADO
         --------------------------------------------------- */

      if (!documentoUsuario.exists()) {

        alert(
          "Sua conta não possui autorização para acessar o PAS-PROVA."
        );


        await signOut(auth);


        window.location.replace(
          "./login-professor.html"
        );

        return;
      }


      const dadosUsuario =
        documentoUsuario.data();


      /* ---------------------------------------------------
         USUÁRIO DESATIVADO
         --------------------------------------------------- */

      if (dadosUsuario.ativo !== true) {

        alert(
          "Esta conta está desativada."
        );


        await signOut(auth);


        window.location.replace(
          "./login-professor.html"
        );

        return;
      }


      /* ---------------------------------------------------
         PERFIL PERMITIDO
         --------------------------------------------------- */

      const perfil =
        dadosUsuario.perfil;


      if (
        perfil !== "administrador" &&
        perfil !== "professor"
      ) {

        alert(
          "Perfil de usuário não autorizado."
        );


        await signOut(auth);


        window.location.replace(
          "./login-professor.html"
        );

        return;
      }


      /* ---------------------------------------------------
         USUÁRIO AUTORIZADO
         --------------------------------------------------- */

      usuarioAtual = usuario;

      perfilAtual = perfil;

      dadosUsuarioAtual = dadosUsuario;

      /*
  CONTROLES EXCLUSIVOS DO ADMINISTRADOR
*/

if (
  perfilAtual === "administrador" &&
  btnGerenciarUsuarios
) {

  btnGerenciarUsuarios.classList.remove(
    "hidden"
  );

}
       
/*
  EXIBIR O PAINEL SOMENTE APÓS
  AUTENTICAÇÃO E AUTORIZAÇÃO
*/

if (conteudoPainel) {

  conteudoPainel.classList.remove(
    "hidden"
  );

}

      console.log(
        "PAS-PROVA:",
        dadosUsuario.nome,
        "-",
        perfilAtual
      );


      /* ---------------------------------------------------
         LIBERAR VISUALIZAÇÃO DO PAINEL
         --------------------------------------------------- */

      document.body.classList.remove(
        "painel-bloqueado"
      );


      /* ---------------------------------------------------
         CARREGAR PROVAS APÓS AUTENTICAÇÃO
         --------------------------------------------------- */

      await carregarProvas();

    }

    catch (erro) {

      console.error(
        "Erro ao verificar perfil:",
        erro
      );


      alert(
        "Não foi possível verificar sua autorização."
      );


      await signOut(auth);


      window.location.replace(
        "./login-professor.html"
      );

    }

  }
);


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function escaparHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function normalizarCodigo(valor = "") {

  return String(valor)
    .trim()
    .toUpperCase();

}


/* =========================================================
   SALVAR / EDITAR
   ========================================================= */

if (formCriar) {

  formCriar.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();


      /* -----------------------------------------------------
         GARANTIR USUÁRIO AUTENTICADO
         ----------------------------------------------------- */

      if (
        !usuarioAtual ||
        !perfilAtual ||
        !dadosUsuarioAtual
      ) {

        alert(
          "Aguarde a confirmação do usuário antes de salvar a prova."
        );

        return;
      }


      const idAtual =
        provaId.value.trim();


      const codigo =
        normalizarCodigo(
          document.getElementById(
            'codigo-unico'
          ).value
        );


      /* -----------------------------------------------------
         DADOS BÁSICOS DA PROVA
         ----------------------------------------------------- */

      const dadosProva = {

        titulo:
          document.getElementById(
            'titulo-prova'
          ).value.trim(),

        turma:
          document.getElementById(
            'turma-disciplina'
          ).value.trim(),

        linkForms:
          document.getElementById(
            'link-forms'
          ).value.trim(),

        codigo: codigo,

        duracao:
          parseInt(
            document.getElementById(
              'duracao-minutos'
            ).value,
            10
          ),

        limiteSaidas:
          parseInt(
            document.getElementById(
              'limite-saidas'
            ).value,
            10
          ),

        atualizadoEm:
          new Date().toISOString()

      };


      /* -----------------------------------------------------
         VALIDAÇÕES
         ----------------------------------------------------- */

      if (!dadosProva.titulo) {

        alert(
          "Informe o título da avaliação."
        );

        return;
      }


      if (!dadosProva.turma) {

        alert(
          "Informe a turma ou disciplina."
        );

        return;
      }


      if (!dadosProva.linkForms) {

        alert(
          "Informe o link do Google Forms."
        );

        return;
      }


      if (!codigo) {

        alert(
          "Informe um código para a prova."
        );

        return;
      }


      if (
        !Number.isFinite(dadosProva.duracao) ||
        dadosProva.duracao <= 0
      ) {

        alert(
          "Informe uma duração válida."
        );

        return;
      }


      if (
        !Number.isFinite(dadosProva.limiteSaidas) ||
        dadosProva.limiteSaidas < 0
      ) {

        alert(
          "Informe um limite de saídas válido."
        );

        return;
      }


      /* -----------------------------------------------------
         VERIFICAR CÓDIGO DUPLICADO
         ----------------------------------------------------- */

      const codigoJaExiste =
        provasCarregadas.some(
          (prova) => {

            return (
              normalizarCodigo(
                prova.codigo
              ) === codigo &&
              prova.id !== idAtual
            );

          }
        );


      if (codigoJaExiste) {

        alert(
          "Já existe uma prova com esse código."
        );

        return;
      }


      /* -----------------------------------------------------
         GRAVAR
         ----------------------------------------------------- */

      try {

        btnSalvar.disabled = true;

        btnSalvar.innerText =
          idAtual
            ? "SALVANDO ALTERAÇÕES..."
            : "SALVANDO PROVA...";


        /* ===================================================
           EDITAR PROVA EXISTENTE
           =================================================== */

        if (idAtual) {

          const provaExistente =
            provasCarregadas.find(
              (prova) =>
                prova.id === idAtual
            );


          if (!provaExistente) {

            alert(
              "Não foi possível localizar a prova que está sendo editada."
            );

            return;
          }


          /*
            Professor comum somente pode alterar
            uma prova pertencente a ele.

            Administrador pode alterar qualquer prova.
          */

          if (
            perfilAtual === "professor" &&
            provaExistente.professorUid !==
              usuarioAtual.uid
          ) {

            alert(
              "Você não possui permissão para editar esta prova."
            );

            return;
          }


          const referencia =
            doc(
              db,
              "provas",
              idAtual
            );


          /*
            IMPORTANTE:

            dadosProva NÃO contém professorUid,
            professorNome ou professorEmail.

            Portanto, editar título, código,
            duração etc. não muda o proprietário.
          */

          await updateDoc(
            referencia,
            dadosProva
          );


          alert(
            "Prova atualizada com sucesso!"
          );

        }


        /* ===================================================
           CRIAR NOVA PROVA
           =================================================== */

        else {

          dadosProva.criadoEm =
            new Date().toISOString();


          /*
            VÍNCULO DA PROVA COM O PROFESSOR
          */

          dadosProva.professorUid =
            usuarioAtual.uid;


          dadosProva.professorNome =
            dadosUsuarioAtual.nome ||
            usuarioAtual.email ||
            "Professor";


          dadosProva.professorEmail =
            usuarioAtual.email ||
            dadosUsuarioAtual.email ||
            "";


          await addDoc(
            collection(
              db,
              "provas"
            ),
            dadosProva
          );


          alert(
            "Prova criada com sucesso!"
          );

        }


        limparFormulario();

        await carregarProvas();

      }

      catch (err) {

        console.error(
          "Erro ao salvar prova:",
          err
        );


        alert(
          "Erro ao salvar a prova: " +
          err.message
        );

      }

      finally {

        btnSalvar.disabled = false;

      }

    }
  );

}

/* =========================================================
   GERENCIAR USUÁRIOS
   ========================================================= */

if (btnGerenciarUsuarios) {

  btnGerenciarUsuarios.addEventListener(
    "click",

    () => {

      /*
        Segurança adicional no cliente.
        A página usuarios.html também fará
        sua própria verificação.
      */

      if (perfilAtual !== "administrador") {

        alert(
          "Esta área é exclusiva do administrador."
        );

        return;

      }


      window.location.href =
        "./usuarios.html";

    }
  );

}


/* =========================================================
   LOGOUT
   ========================================================= */

const btnSairProfessor =
  document.getElementById(
    'btn-sair-professor'
  );


if (btnSairProfessor) {

  btnSairProfessor.addEventListener(
    'click',
    async () => {

      try {

        await signOut(auth);


        window.location.replace(
          "./login-professor.html"
        );

      }

      catch (erro) {

        console.error(
          "Erro ao sair:",
          erro
        );


        alert(
          "Não foi possível encerrar a sessão."
        );

      }

    }
  );

}

/* =========================================================
   CARREGAR PROVAS
   ========================================================= */

async function carregarProvas() {

  if (!listaProvas) {
    return;
  }


  /*
    Não tenta carregar provas enquanto
    a autenticação ainda não terminou.
  */

  if (
    !usuarioAtual ||
    !perfilAtual
  ) {

    return;
  }


  try {

    listaProvas.innerHTML =
      `
        <p class="text-slate-500">
          Carregando exames...
        </p>
      `;


    const querySnapshot =
      await getDocs(
        collection(
          db,
          "provas"
        )
      );


    provasCarregadas = [];


    /* -------------------------------------------------------
       FILTRAR PROVAS CONFORME O PERFIL
       ------------------------------------------------------- */

    querySnapshot.forEach(
      (documento) => {

        const dados =
          documento.data();


        /*
          ADMINISTRADOR

          Pode visualizar todas as provas.

          Isso inclui também as provas antigas
          criadas antes da implantação do
          professorUid.
        */

        if (
          perfilAtual === "administrador"
        ) {

          provasCarregadas.push({

            id:
              documento.id,

            ...dados

          });

          return;
        }


        /*
          PROFESSOR

          Visualiza somente as provas cujo
          professorUid corresponde ao seu UID.
        */

        if (
          perfilAtual === "professor" &&
          dados.professorUid === usuarioAtual.uid
        ) {

          provasCarregadas.push({

            id:
              documento.id,

            ...dados

          });

        }

      }
    );


    /* -------------------------------------------------------
       ORDENAÇÃO
       ------------------------------------------------------- */

    provasCarregadas.sort(
      (a, b) => {

        return String(
          a.titulo || ""
        ).localeCompare(
          String(
            b.titulo || ""
          ),
          "pt-BR"
        );

      }
    );


    /* -------------------------------------------------------
       LISTA VAZIA
       ------------------------------------------------------- */

    if (
      provasCarregadas.length === 0
    ) {

      listaProvas.innerHTML =
        `
          <p class="text-slate-500">
            Nenhuma prova cadastrada ainda.
          </p>
        `;

      return;
    }


    listaProvas.innerHTML = "";


    /* -------------------------------------------------------
       CRIAR CARTÕES
       ------------------------------------------------------- */

    provasCarregadas.forEach(
      (prova) => {

        const item =
          document.createElement(
            'div'
          );


        item.className =
          `
            bg-slate-900
            p-4
            rounded-lg
            border
            border-slate-700
          `;


        const titulo =
          escaparHTML(
            prova.titulo || "Sem título"
          );


        const turma =
          escaparHTML(
            prova.turma || ""
          );


        const codigo =
          escaparHTML(
            prova.codigo || ""
          );


        const duracao =
          Number(
            prova.duracao || 0
          );


        const limite =
          Number(
            prova.limiteSaidas ?? 0
          );


        item.innerHTML =
          `

            <div
              class="
                flex
                flex-col
                lg:flex-row
                lg:items-center
                justify-between
                gap-4
              "
            >

              <div>

                <h3
                  class="
                    font-bold
                    text-white
                    text-lg
                  "
                >
                  ${titulo}
                </h3>


                <p
                  class="
                    text-sm
                    text-slate-400
                    mt-1
                  "
                >
                  ${turma}
                </p>


                <div
                  class="
                    flex
                    flex-wrap
                    gap-x-4
                    gap-y-1
                    mt-2
                    text-xs
                    text-slate-400
                  "
                >

                  <span>
                    Código:
                    <strong
                      class="
                        text-blue-400
                        font-mono
                      "
                    >
                      ${codigo}
                    </strong>
                  </span>


                  <span>
                    Tempo:
                    ${duracao} min
                  </span>


                  <span>
                    Saídas:
                    ${limite}
                  </span>

                </div>

              </div>


              <div
                class="
                  flex
                  flex-wrap
                  gap-2
                "
              >

                <button
                  type="button"
                  data-acao="editar"
                  data-id="${prova.id}"
                  class="
                    bg-amber-600
                    hover:bg-amber-500
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Editar
                </button>

                                <button
                  type="button"
                  data-acao="copiar-link"
                  data-id="${prova.id}"
                  class="
                    bg-blue-600
                    hover:bg-blue-500
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Copiar link
                </button>


                <button
                  type="button"
                  data-acao="acompanhar"
                  data-id="${prova.id}"
                  class="
                    bg-emerald-700
                    hover:bg-emerald-600
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Acompanhar
                </button>


                <a
                  href="./prova.html?codigo=${encodeURIComponent(
                    prova.codigo || ""
                  )}"
                  target="_blank"
                  rel="noopener"
                  class="
                    bg-slate-700
                    hover:bg-slate-600
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Testar
                </a>


                <button
                  type="button"
                  data-acao="excluir"
                  data-id="${prova.id}"
                  class="
                    bg-red-700
                    hover:bg-red-600
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Excluir
                </button>

              </div>

            </div>

          `;


        listaProvas.appendChild(
          item
        );

      }
    );

  }

  catch (err) {

    console.error(
      "Erro ao carregar provas:",
      err
    );


    listaProvas.innerHTML =
      `
        <p class="text-red-400 text-sm">
          Erro ao carregar provas:
          ${escaparHTML(err.message)}
        </p>
      `;

  }

}

/* =========================================================
   CLIQUES NA LISTA
   ========================================================= */

if (listaProvas) {

  listaProvas.addEventListener(
    'click',
    async (event) => {

      const botao =
        event.target.closest(
          'button[data-acao]'
        );


      if (!botao) {
        return;
      }


      const acao =
        botao.dataset.acao;


      const id =
        botao.dataset.id;


      const prova =
        provasCarregadas.find(
          (item) =>
            item.id === id
        );


      if (!prova) {

        alert(
          "Não foi possível localizar essa prova."
        );

        return;

      }

             /* =====================================================
         COPIAR LINK DE APLICAÇÃO
         ===================================================== */

      if (acao === "copiar-link") {

        await copiarLinkAplicacao(
          prova
        );

        return;
      }


      /* =====================================================
         ACOMPANHAR TENTATIVAS
         ===================================================== */

      if (acao === "acompanhar") {

        abrirAcompanhamento(
          prova
        );

        return;
      }


      /* =====================================================
         EDITAR
         ===================================================== */

      if (acao === "editar") {

  /*
    Professor comum somente pode editar
    uma prova pertencente ao próprio UID.

    Administrador pode editar qualquer prova,
    inclusive provas antigas sem professorUid.
  */

  if (
    perfilAtual === "professor" &&
    prova.professorUid !== usuarioAtual.uid
  ) {

    alert(
      "Você não possui permissão para editar esta prova."
    );

    return;
  }


  iniciarEdicao(
    prova
  );

  return;

}


      /* =====================================================
         EXCLUIR
         ===================================================== */

      if (acao === "excluir") {

  /*
    Professor comum somente pode excluir
    uma prova pertencente ao próprio UID.

    Administrador pode excluir qualquer prova.
  */

  if (
    perfilAtual === "professor" &&
    prova.professorUid !== usuarioAtual.uid
  ) {

    alert(
      "Você não possui permissão para excluir esta prova."
    );

    return;
  }


  await excluirProva(
    prova
  );

}

    }
  );

}


/* =========================================================
   INICIAR EDIÇÃO
   ========================================================= */

function iniciarEdicao(prova) {

  provaId.value =
    prova.id;


  document.getElementById(
    'titulo-prova'
  ).value =
    prova.titulo || "";


  document.getElementById(
    'turma-disciplina'
  ).value =
    prova.turma || "";


  document.getElementById(
    'link-forms'
  ).value =
    prova.linkForms || "";


  document.getElementById(
    'codigo-unico'
  ).value =
    prova.codigo || "";


  document.getElementById(
    'duracao-minutos'
  ).value =
    prova.duracao ?? 50;


  document.getElementById(
    'limite-saidas'
  ).value =
    prova.limiteSaidas ?? 2;


  tituloFormulario.innerText =
    "Editar Prova";


  btnSalvar.innerText =
    "SALVAR ALTERAÇÕES";


  btnCancelarEdicao.classList.remove(
    'hidden'
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   CANCELAR EDIÇÃO
   ========================================================= */

if (btnCancelarEdicao) {

  btnCancelarEdicao.addEventListener(
    'click',
    () => {

      limparFormulario();

    }
  );

}


/* =========================================================
   LIMPAR FORMULÁRIO
   ========================================================= */

function limparFormulario() {

  formCriar.reset();


  provaId.value = "";


  document.getElementById(
    'duracao-minutos'
  ).value = 50;


  document.getElementById(
    'limite-saidas'
  ).value = 2;


  tituloFormulario.innerText =
    "Cadastrar Nova Prova";


  btnSalvar.innerText =
    "SALVAR E GERAR PROVA";


  btnCancelarEdicao.classList.add(
    'hidden'
  );

}


/* =========================================================
   EXCLUIR PROVA
   ========================================================= */

async function excluirProva(prova) {

  const confirmar =
    window.confirm(
      `Deseja realmente excluir a prova "${prova.titulo}"?\n\n` +
      `Código: ${prova.codigo}\n\n` +
      `Esta ação não poderá ser desfeita.`
    );


  if (!confirmar) {
    return;
  }


  try {

    await deleteDoc(
      doc(
        db,
        "provas",
        prova.id
      )
    );


    /*
      Se o professor estiver editando
      justamente a prova excluída,
      cancela a edição.
    */

    if (
      provaId.value === prova.id
    ) {

      limparFormulario();

    }


    alert(
      "Prova excluída com sucesso!"
    );


    await carregarProvas();

  }

  catch (err) {

    console.error(
      "Erro ao excluir prova:",
      err
    );


    alert(
      "Erro ao excluir a prova: " +
      err.message
    );

  }

}


/* =========================================================
   ATUALIZAR LISTA
   ========================================================= */

if (btnAtualizarLista) {

  btnAtualizarLista.addEventListener(
    'click',
    () => {

      carregarProvas();

    }
  );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

/*
  O carregamento das provas será realizado
  somente após a autenticação e a confirmação
  do perfil do usuário.
*/
