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
  onSnapshot,
  writeBatch
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
      "titulo-prova"
    ).value.trim(),

  turma:
    document.getElementById(
      "turma-disciplina"
    ).value.trim(),

  linkForms:
    document.getElementById(
      "link-forms"
    ).value.trim(),

  codigo: codigo,

  duracao:
    parseInt(
      document.getElementById(
        "duracao-minutos"
      ).value,
      10
    ),

  limiteSaidas:
    parseInt(
      document.getElementById(
        "limite-saidas"
      ).value,
      10
    ),

  atualizadoEm:
    new Date().toISOString()

};

// Somente avaliações novas começam aguardando integração.
// Na edição, preservamos o estado já existente.
if (!idAtual) {
  dadosProva.integracaoPas = "pendente";
}

       
/* =========================================================
   PAS-PROVA — LINK DE EDIÇÃO DO GOOGLE FORMS
   ========================================================= */

const campoLinkEdicao = document.getElementById(
  "link-edicao-forms"
);

const linkEdicaoForms = String(
  campoLinkEdicao?.value || ""
).trim();

if (linkEdicaoForms) {

  let urlEdicao;

  try {
    urlEdicao = new URL(linkEdicaoForms);
  } catch (erro) {
    alert("Informe um link de edição válido.");
    return;
  }

  if (
    urlEdicao.hostname !== "docs.google.com" ||
    !/^\/forms\/d\/[^/]+\/edit\/?$/.test(
      urlEdicao.pathname
    )
  ) {
    alert(
      "Informe o endereço de edição do Google Forms, terminado em /edit."
    );
    return;
  }

  dadosProva.linkEdicaoForms = urlEdicao.origin +
    urlEdicao.pathname.replace(/\/$/, "");

} else if (!idAtual) {

  alert(
    "Informe o link de edição do Google Forms."
  );

  return;

}


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

/* =====================================================
   PAS-PROVA — LINK DE EDIÇÃO DO GOOGLE FORMS
   ===================================================== */

const campoEdicaoForms = document.getElementById(
  "link-edicao-forms"
);

if (campoEdicaoForms) {
  campoEdicaoForms.value =
    prova.linkEdicaoForms || "";
}


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
   PAS-PROVA
   EXCLUIR AVALIAÇÃO E TENTATIVAS VINCULADAS
   ========================================================= */

async function excluirProva(prova) {

  if (
    !usuarioAtual ||
    !prova ||
    !prova.id
  ) {
    alert("Não foi possível identificar a avaliação.");
    return;
  }

  // Verificar autorização no painel.
  if (
    perfilAtual !== "administrador" &&
    (
      perfilAtual !== "professor" ||
      prova.professorUid !== usuarioAtual.uid
    )
  ) {
    alert("Você não possui permissão para excluir esta avaliação.");
    return;
  }

  const confirmar = window.confirm(
    `EXCLUIR AVALIAÇÃO\n\n` +
    `Título: ${prova.titulo || "Sem título"}\n` +
    `Código: ${prova.codigo || "—"}\n\n` +
    `Também serão excluídos:\n` +
    `• Todas as tentativas vinculadas;\n` +
    `• Notas e resultados dessas tentativas;\n` +
    `• Histórico de acompanhamento armazenado nas tentativas.\n\n` +
    `O Google Forms original será preservado.\n\n` +
    `Esta operação não poderá ser desfeita.\n\n` +
    `Deseja continuar?`
  );

  if (!confirmar) {
    return;
  }

  try {

    // Confirmar que a avaliação ainda existe.
    const referenciaProva = doc(
      db,
      "provas",
      prova.id
    );

    const documentoProva = await getDoc(
      referenciaProva
    );

    if (!documentoProva.exists()) {
      alert("Esta avaliação já foi excluída.");
      await carregarProvas();
      return;
    }

    const dadosAtuais = documentoProva.data();

    // Revalidar a propriedade antes da exclusão.
    if (
      perfilAtual !== "administrador" &&
      dadosAtuais.professorUid !== usuarioAtual.uid
    ) {
      throw new Error(
        "Você não possui autorização para excluir esta avaliação."
      );
    }

    // Localizar somente as tentativas desta prova.
    const consultaTentativas = query(
      collection(db, "tentativas"),
      where("provaId", "==", prova.id)
    );

    const snapshotTentativas = await getDocs(
      consultaTentativas
    );

    const referenciasTentativas = snapshotTentativas.docs.map(
      documento => documento.ref
    );

    const quantidadeTentativas =
      referenciasTentativas.length;

    const confirmarQuantidade = window.confirm(
      `CONFIRMAÇÃO FINAL\n\n` +
      `Avaliação: ${prova.titulo || "Sem título"}\n` +
      `Tentativas encontradas: ${quantidadeTentativas}\n\n` +
      `Todos esses registros, incluindo notas e resultados, serão apagados.\n\n` +
      `Confirmar exclusão definitiva?`
    );

    if (!confirmarQuantidade) {
      return;
    }

    /*
      Firestore permite até 500 gravações
      por lote. Usamos 400 por segurança.

      Para avaliações pequenas, o último lote
      pode excluir as tentativas e a prova
      na mesma operação.
    */

    const TAMANHO_LOTE = 400;

    let excluidas = 0;

    for (
      let indice = 0;
      indice < referenciasTentativas.length;
      indice += TAMANHO_LOTE
    ) {

      const grupo = referenciasTentativas.slice(
        indice,
        indice + TAMANHO_LOTE
      );

      const lote = writeBatch(db);

      grupo.forEach(referencia => {
        lote.delete(referencia);
      });

      const ultimoGrupo =
        indice + TAMANHO_LOTE >=
        referenciasTentativas.length;

      if (ultimoGrupo) {
        lote.delete(referenciaProva);
      }

      await lote.commit();

      excluidas += grupo.length;
    }

    // Caso não existam tentativas.
    if (quantidadeTentativas === 0) {
      const lote = writeBatch(db);
      lote.delete(referenciaProva);
      await lote.commit();
    }

    // Se a quantidade for múltipla exata
    // de 400, o último lote já excluiu a prova.

    if (
      provaEmAcompanhamento?.id === prova.id
    ) {
      fecharAcompanhamento();
    }

    if (provaId?.value === prova.id) {
      limparFormulario();
    }

    await carregarProvas();

    alert(
      `Exclusão concluída!\n\n` +
      `Avaliação: ${prova.titulo || "Sem título"}\n` +
      `Tentativas excluídas: ${excluidas}\n\n` +
      `Os resultados associados também foram removidos.`
    );

  } catch (erro) {

    console.error(
      "PAS-PROVA — Erro na exclusão:",
      erro
    );

    alert(
      "Não foi possível concluir a exclusão.\n\n" +
      erro.message +
      "\n\nConfira os registros no Firebase antes de tentar novamente."
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
   COPIAR LINK DE APLICAÇÃO
   ========================================================= */

async function copiarLinkAplicacao(prova) {

  const codigo =
    normalizarCodigo(
      prova.codigo || ""
    );


  if (!codigo) {

    alert(
      "Esta prova não possui código de aplicação."
    );

    return;
  }


  const link =
    new URL(
      `./prova.html?codigo=${encodeURIComponent(codigo)}`,
      window.location.href
    ).href;


  try {

    await navigator.clipboard.writeText(
      link
    );


    alert(
      "Link da prova copiado!\n\n" +
      link
    );

  }

  catch (erro) {

    console.warn(
      "Clipboard indisponível:",
      erro
    );


    window.prompt(
      "Copie o link da prova:",
      link
    );

  }

}



/* =========================================================
   ABRIR ACOMPANHAMENTO
   ========================================================= */

function abrirAcompanhamento(prova) {

  if (!modalAcompanhamento) {

    alert(
      "O painel de acompanhamento não foi encontrado."
    );

    return;
  }


  provaEmAcompanhamento =
    prova;


  if (acompanhamentoTitulo) {

    acompanhamentoTitulo.textContent =
      prova.titulo ||
      "Avaliação";

  }


  if (acompanhamentoInfo) {

    acompanhamentoInfo.textContent =
      `${prova.turma || ""} • Código: ${prova.codigo || ""}`;

  }


  modalAcompanhamento.classList.remove(
    "hidden"
  );


  iniciarEscutaTentativas(
    prova
  );

}



/* =========================================================
   ESCUTAR TENTATIVAS EM TEMPO REAL
   ========================================================= */

function iniciarEscutaTentativas(prova) {

  if (
    !prova ||
    !prova.id
  ) {

    return;
  }


  /* -------------------------------------------------------
     CANCELAR ESCUTA ANTERIOR
     ------------------------------------------------------- */

  if (cancelarEscutaAcompanhamento) {

    cancelarEscutaAcompanhamento();

    cancelarEscutaAcompanhamento =
      null;

  }


  /* -------------------------------------------------------
     MOSTRAR CARREGAMENTO
     ------------------------------------------------------- */

  if (listaTentativas) {

    listaTentativas.innerHTML =
      `
        <tr>

          <td
            colspan="5"
            class="
              p-6
              text-center
              text-slate-500
            "
          >
            Carregando tentativas...
          </td>

        </tr>
      `;

  }


  /* -------------------------------------------------------
     CONSULTA
     ------------------------------------------------------- */

  const consulta =
    query(

      collection(
        db,
        "tentativas"
      ),

      where(
        "provaId",
        "==",
        prova.id
      )

    );


  /* -------------------------------------------------------
     TEMPO REAL
     ------------------------------------------------------- */

  cancelarEscutaAcompanhamento =
    onSnapshot(

      consulta,

      (snapshot) => {

        const tentativas = [];


        snapshot.forEach(
          (documento) => {

            tentativas.push({

              id:
                documento.id,

              ...documento.data()

            });

          }
        );


        renderizarTentativas(
          tentativas
        );

      },


      (erro) => {

        console.error(
          "Erro ao acompanhar tentativas:",
          erro
        );


        if (listaTentativas) {

          listaTentativas.innerHTML =
            `
              <tr>

                <td
                  colspan="5"
                  class="
                    p-6
                    text-center
                    text-red-400
                  "
                >
                  Não foi possível carregar as tentativas.
                  <br>
                  ${escaparHTML(erro.message)}
                </td>

              </tr>
            `;

        }

      }

    );

}



/* =========================================================
   PAS-PROVA — EXCLUIR RESULTADO INDIVIDUAL
   ========================================================= */

async function excluirResultadoAluno(tentativaId) {

  if (
    !usuarioAtual ||
    !provaEmAcompanhamento?.id ||
    !tentativaId
  ) {
    alert("Não foi possível identificar o resultado.");
    return;
  }

  const prova = provaEmAcompanhamento;

  if (
    perfilAtual !== "administrador" &&
    (
      perfilAtual !== "professor" ||
      prova.professorUid !== usuarioAtual.uid
    )
  ) {
    alert("Você não possui permissão para excluir este resultado.");
    return;
  }

  try {

    const referencia = doc(
      db,
      "tentativas",
      tentativaId
    );

    const documento = await getDoc(referencia);

    if (!documento.exists()) {
      alert("Este resultado já foi excluído.");
      return;
    }

    const dados = documento.data();

    if (dados.provaId !== prova.id) {
      throw new Error(
        "Esta tentativa não pertence à avaliação selecionada."
      );
    }

    if (dados.status !== "enviada") {
      throw new Error(
        "Somente resultados de provas enviadas podem ser excluídos aqui."
      );
    }

    const nome = String(
      dados.nome || dados.nomeAluno || "Aluno não identificado"
    );

    const confirmar = window.confirm(
      `EXCLUIR RESULTADO DO ALUNO?\n\n` +
      `Aluno: ${nome}\n` +
      `Avaliação: ${prova.titulo}\n\n` +
      `A tentativa e sua nota serão removidas permanentemente.\n\n` +
      `O Google Forms original não será alterado.\n\n` +
      `Deseja continuar?`
    );

    if (!confirmar) return;

    await deleteDoc(referencia);

    alert(
      `Resultado de ${nome} excluído com sucesso.`
    );

    // O acompanhamento será atualizado pelo onSnapshot.

  } catch (erro) {

    console.error(
      "Erro ao excluir resultado:",
      erro
    );

    alert(
      "Não foi possível excluir o resultado:\n" +
      erro.message
    );

  }

}


function renderizarTentativas(tentativas) {

  // CONTADORES DO ACOMPANHAMENTO

  const total = tentativas.length;

  const emAndamento = tentativas.filter(
    t => t.status === "em_andamento"
  ).length;

  const enviadas = tentativas.filter(
    t => t.status === "enviada"
  ).length;

  const tempoEsgotado = tentativas.filter(
    t => t.status === "tempo_esgotado"
  ).length;

  const outrasEncerradas = tentativas.filter(
    t => ![
      "em_andamento",
      "enviada",
      "tempo_esgotado"
    ].includes(t.status)
  ).length;

  const totalAlertas = tentativas.reduce(
    (soma, t) => soma + (Number(t.contadorAlertas) || 0),
    0
  );

  if (resumoTotal) {
    resumoTotal.textContent = String(total);
  }

  if (resumoAndamento) {
    resumoAndamento.textContent = String(emAndamento);
  }

  if (resumoEnviadas) {
    resumoEnviadas.textContent = String(enviadas);
  }

  if (resumoTempo) {
    resumoTempo.textContent = String(tempoEsgotado);
  }

  if (resumoEncerradas) {
    resumoEncerradas.textContent = String(outrasEncerradas);
  }

  if (resumoAlertas) {
    resumoAlertas.textContent = String(totalAlertas);
  }


  // PAINEL DE RESULTADOS DOS ALUNOS

  let painelResultados = document.getElementById(
    "pas-painel-resultados"
  );

  if (
    !painelResultados &&
    listaTentativas &&
    modalAcompanhamento
  ) {

    painelResultados = document.createElement("section");

    painelResultados.id = "pas-painel-resultados";

    painelResultados.className =
      "mt-5 mb-5 rounded-lg border border-slate-700 bg-slate-900 p-4";

    const tabelaMonitoramento =
      listaTentativas.closest("table");

    const alvo =
      tabelaMonitoramento?.parentElement || listaTentativas;

    alvo.parentElement.insertBefore(
      painelResultados,
      alvo
    );
  }


  if (painelResultados) {

    // SOMENTE PROVAS ENVIADAS
    // ORDEM ALFABÉTICA PELO NOME

    const resultados = tentativas
      .filter(t => t.status === "enviada")
      .sort((a, b) => {

        const nomeA = String(
          a.nome || a.nomeAluno || ""
        );

        const nomeB = String(
          b.nome || b.nomeAluno || ""
        );

        return nomeA.localeCompare(
          nomeB,
          "pt-BR",
          { sensitivity: "base" }
        ) || (
          obterTimestamp(a.encerradaEm) -
          obterTimestamp(b.encerradaEm)
        );

      });


    const linhas = resultados.map(t => {

      const nome = String(
        t.nome || t.nomeAluno || ""
      ).trim();

      const turma = String(
        t.turma || ""
      ).trim();

      const notaBruta = t.nota;

      const temNota =
        notaBruta !== undefined &&
        notaBruta !== null &&
        notaBruta !== "" &&
        Number.isFinite(Number(notaBruta));

      const nota = temNota
        ? Number(notaBruta).toLocaleString(
            "pt-BR",
            { maximumFractionDigits: 2 }
          )
        : "Aguardando correção";
       const idTentativa = escaparHTML(t.id || "");


      return `
        <tr class="border-t border-slate-700">
        

          <td class="p-3 text-slate-100">
            ${escaparHTML(nome || "Não informado")}
          </td>

          <td class="p-3 text-slate-300">
            ${escaparHTML(turma || "—")}
          </td>

          <td class="p-3 text-right text-slate-100">
            ${escaparHTML(nota)}
          </td>

          
<td class="p-3 text-center">
  <button
    type="button"
    data-excluir-resultado="${idTentativa}"
    class="
      bg-red-700
      hover:bg-red-600
      text-white
      text-xs
      font-bold
      px-3
      py-2
      rounded
    "
  >
    Excluir
  </button>
</td>


        </tr>
      `;

    }).join("");


    painelResultados.innerHTML = `

      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">

        <h3 class="text-lg font-bold text-white">
          Resultados dos alunos — A a Z
        </h3>

        <span class="text-sm text-slate-400">
          ${resultados.length} prova(s) enviada(s)
        </span>

      </div>

      <div class="overflow-x-auto">

        <table class="w-full text-left text-sm">

          <thead class="bg-slate-800 text-slate-200">

            <tr>
              <th class="p-3">Nome do aluno</th>
              <th class="p-3">Turma</th>
              <th class="p-3 text-right">Nota</th>
            </tr>

          </thead>

          <tbody>

            ${
              linhas ||
              `<tr>
                <td colspan="3"
                    class="p-4 text-center text-slate-400">
                  Nenhuma prova enviada até o momento.
                </td>
              </tr>`
            }

          </tbody>

        </table>

      </div>
    `;

  }


  // MANTER MONITORAMENTO ORIGINAL

  if (!listaTentativas) {
    return;
  }

  if (tentativas.length === 0) {

    listaTentativas.innerHTML = `
      <tr>
        <td colspan="5"
            class="p-6 text-center text-slate-500">
          Nenhuma tentativa registrada nesta prova.
        </td>
      </tr>
    `;

    return;
  }


  // TENTATIVAS MAIS RECENTES PRIMEIRO

  tentativas.sort(
    (a, b) =>
      obterTimestamp(b.iniciadaEm) -
      obterTimestamp(a.iniciadaEm)
  );


  listaTentativas.innerHTML = tentativas.map(item => {

    const tentativaId = escaparHTML(
      item.tentativaId || item.id || "—"
    );

    const status = formatarStatusTentativa(
      item.status
    );

    const inicio = formatarDataHoraTentativa(
      item.iniciadaEm
    );

    const encerramento = formatarDataHoraTentativa(
      item.encerradaEm
    );

    const alertas = Number(
      item.contadorAlertas
    ) || 0;


    return `

      <tr class="hover:bg-slate-800/60 transition">

        <td class="p-3 font-mono text-xs text-slate-300 whitespace-nowrap">
          ${tentativaId}
        </td>

        <td class="p-3">
          ${criarBadgeStatus(item.status, status)}
        </td>

        <td class="p-3 text-slate-400 whitespace-nowrap">
          ${escaparHTML(inicio)}
        </td>

        <td class="p-3 text-slate-400 whitespace-nowrap">
          ${escaparHTML(encerramento)}
        </td>

        <td class="p-3 text-center font-bold ${
          alertas > 0
            ? "text-red-400"
            : "text-slate-500"
        }">
          ${alertas}
        </td>

      </tr>
    `;

  }).join("");

}



/* =========================================================
   BADGE DE STATUS
   ========================================================= */

function criarBadgeStatus(
  status,
  texto
) {

  let classes =
    `
      bg-slate-700
      text-slate-200
    `;


  if (
    status ===
    "em_andamento"
  ) {

    classes =
      `
        bg-blue-950
        text-blue-300
        border
        border-blue-800
      `;

  }


  else if (
    status ===
    "enviada"
  ) {

    classes =
      `
        bg-emerald-950
        text-emerald-300
        border
        border-emerald-800
      `;

  }


  else if (
    status ===
    "tempo_esgotado"
  ) {

    classes =
      `
        bg-amber-950
        text-amber-300
        border
        border-amber-800
      `;

  }


  else {

    classes =
      `
        bg-red-950
        text-red-300
        border
        border-red-800
      `;

  }


  return `
    <span
      class="
        inline-flex
        px-2
        py-1
        rounded
        text-xs
        font-bold
        ${classes}
      "
    >
      ${escaparHTML(texto)}
    </span>
  `;

}



/* =========================================================
   FORMATAR STATUS
   ========================================================= */

function formatarStatusTentativa(
  status = ""
) {

  const mapa = {

    em_andamento:
      "Em andamento",

    enviada:
      "Enviada",

    tempo_esgotado:
      "Tempo esgotado",

    limite_saidas:
      "Limite de saídas",

    encerrada:
      "Encerrada"

  };


  return (
    mapa[status] ||
    status ||
    "Sem status"
  );

}



/* =========================================================
   CONVERTER DATA PARA TIMESTAMP
   ========================================================= */

function obterTimestamp(valor) {

  if (!valor) {

    return 0;

  }


  /* Timestamp do Firestore */

  if (
    typeof valor === "object" &&
    typeof valor.toDate === "function"
  ) {

    return valor
      .toDate()
      .getTime();

  }


  /* Número */

  if (
    typeof valor === "number"
  ) {

    return valor;

  }


  /* ISO / string */

  const data =
    new Date(valor);


  if (
    Number.isNaN(
      data.getTime()
    )
  ) {

    return 0;

  }


  return data.getTime();

}



/* =========================================================
   FORMATAR DATA/HORA
   ========================================================= */

function formatarDataHoraTentativa(
  valor
) {

  if (!valor) {

    return "—";

  }


  let data;


  if (
    typeof valor === "object" &&
    typeof valor.toDate === "function"
  ) {

    data =
      valor.toDate();

  }


  else {

    data =
      new Date(valor);

  }


  if (
    Number.isNaN(
      data.getTime()
    )
  ) {

    return "—";

  }


  return data.toLocaleString(
    "pt-BR",
    {

      dateStyle:
        "short",

      timeStyle:
        "medium"

    }
  );

}



/* =========================================================
   FECHAR ACOMPANHAMENTO
   ========================================================= */

function fecharAcompanhamento() {

  if (cancelarEscutaAcompanhamento) {

    cancelarEscutaAcompanhamento();

    cancelarEscutaAcompanhamento =
      null;

  }


  provaEmAcompanhamento =
    null;


  if (modalAcompanhamento) {

    modalAcompanhamento.classList.add(
      "hidden"
    );

  }

}



/* =========================================================
   BOTÃO FECHAR
   ========================================================= */

if (btnFecharAcompanhamento) {

  btnFecharAcompanhamento.addEventListener(
    "click",
    () => {

      fecharAcompanhamento();

    }
  );

}



/* =========================================================
   BOTÃO ATUALIZAR
   ========================================================= */

if (btnAtualizarAcompanhamento) {

  btnAtualizarAcompanhamento.addEventListener(
    "click",
    () => {

      if (
        provaEmAcompanhamento
      ) {

        iniciarEscutaTentativas(
          provaEmAcompanhamento
        );

      }

    }
  );

}



/* =========================================================
   FECHAR AO CLICAR FORA DA JANELA
   ========================================================= */

if (modalAcompanhamento) {

  modalAcompanhamento.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        modalAcompanhamento
      ) {

        fecharAcompanhamento();

      }

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
