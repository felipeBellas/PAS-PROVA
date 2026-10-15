import {db,auth} from './firebase-config.js';
import {onAuthStateChanged,signInAnonymously} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDoc,collection,query,where,onSnapshot,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const codigo=new URLSearchParams(location.search).get('codigo');
let app=null,uid=null,session=null,questions=[],timer=null,busy=false,roster=[],statuses=new Map(),unsubscribe=null;
let saidaRegistrada=false;
let encerrandoPorSaidas=false;
const key='pas_interna_v2_'+codigo;
const status=(s,bad=false)=>{$('status').textContent=s;$('status').className=bad?'error':'muted';};
const vagaId=alunoId=>codigo+'_'+alunoId;
const situacaoRef=alunoId=>doc(db,'situacoes_pas',codigo,'alunos',alunoId);
let avisoTimer=null;
function avisoSeguranca(texto){
 const el=$('security-alert');if(!el)return;
 el.textContent=texto;el.hidden=false;
 clearTimeout(avisoTimer);
 avisoTimer=setTimeout(()=>{if(el.textContent===texto)el.hidden=true;},6500);
}
function mostrarConfiguracao(){
 const el=$('security-notice');if(!el)return;
 const regras=[];
 if(app?.bloquearCopia)regras.push('Seleção e cópia de texto bloqueadas.');
 if(app?.monitorarSaidas)regras.push('Saídas de tela monitoradas. Limite permitido: '+Math.max(0,Number(app.limiteSaidas)||0)+'.');
 el.textContent=regras.join(' ');el.hidden=!regras.length;
}

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}
function save(){localStorage.setItem(key,JSON.stringify(session));}
// Proteção de interface: não impede fotografia, captura de tela ou ferramentas externas.
function protegerCopia(e){
  if(!app?.bloquearCopia||!session||session.enviada||$('exam').hidden)return;
  if(e.type==='keydown'){
    const k=e.key.toLowerCase();
    if(!((e.ctrlKey||e.metaKey)&&['c','x','a','s','p'].includes(k)))return;
  }
  if(e.target?.closest?.('input,textarea,select'))return;
  e.preventDefault();
  if(e.type==='copy'||e.type==='cut'||e.type==='contextmenu'||e.type==='keydown'){
    avisoSeguranca('Atenção: a cópia do conteúdo desta avaliação está bloqueada pelo professor.');
  }
}
for(const evento of ['copy','cut','contextmenu','selectstart','dragstart','keydown'])document.addEventListener(evento,protegerCopia,true);
function aplicarProtecao(){
  const ativo=!!(app?.bloquearCopia&&session&&!session.enviada&&!$('exam').hidden);
  $('questions').style.userSelect=ativo?'none':'';
  $('questions').style.webkitUserSelect=ativo?'none':'';
  $('instructions').style.userSelect=ativo?'none':'';
  $('instructions').style.webkitUserSelect=ativo?'none':'';
  $('questions').classList.toggle('pas-no-copy',ativo);
  mostrarConfiguracao();
}
function registrarSaida(){
  if(saidaRegistrada||!app?.monitorarSaidas||!session||session.enviada||$('exam').hidden)return;
  saidaRegistrada=true;
  session.saidas=(Number(session.saidas)||0)+1;
  const limite=Math.max(0,Number(app.limiteSaidas)||0);
  if(session.saidas>limite)session.limiteSaidasExcedido=true;
  save();
}
function conferirSaidas(){
  if(!session||session.enviada||!app?.monitorarSaidas)return;
  const limite=Math.max(0,Number(app.limiteSaidas)||0);
  if(session.limiteSaidasExcedido||Number(session.saidas||0)>limite){
    session.limiteSaidasExcedido=true;save();
    if(!encerrandoPorSaidas){encerrandoPorSaidas=true;status('Limite de saídas ultrapassado. Encerrando a avaliação...',true);avisoSeguranca('Limite de saídas ultrapassado! A avaliação será encerrada.');submit(true,'limite_saidas').finally(()=>{encerrandoPorSaidas=false;});}
  }else if(session.saidas>0){
    status(`Atenção: ${session.saidas} saída(s) registrada(s). Limite permitido: ${limite}.`,true);avisoSeguranca(`Atenção! Saída de tela registrada: ${session.saidas} de ${limite} permitida(s).`);
  }
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)registrarSaida();
  else{saidaRegistrada=false;conferirSaidas();}
});
window.addEventListener('pagehide',registrarSaida);
window.addEventListener('pageshow',()=>{saidaRegistrada=false;conferirSaidas();});
function renderLista(){const sel=$('student');const current=sel.value;sel.replaceChildren(new Option('Selecione seu nome completo',''));for(const a of roster){const st=statuses.get(a.id);const label=st?.status==='concluida'?' ✓ Concluída':st?.status==='em_andamento'?' ⏳ Em andamento':'';const o=new Option(a.nome+label,a.id);if(st?.status==='concluida'||(st?.status==='em_andamento'))o.disabled=true;sel.add(o);}sel.value=current;}
function render(){const area=$('questions');area.replaceChildren();questions.forEach((q,i)=>{const box=document.createElement('div');box.className='box';const h=document.createElement('h2');h.textContent=`${i+1}. ${q.enunciado}`;box.append(h);q.alternativas.forEach((a,j)=>{const label=document.createElement('label');label.className='option';const radio=document.createElement('input');radio.type='radio';radio.name='q'+i;radio.checked=session.respostas[q.id]===a.original;radio.onchange=()=>{session.respostas[q.id]=a.original;save();};label.append(radio,document.createTextNode(' '+String.fromCharCode(65+j)+') '+a.texto));box.append(label);});area.append(box);});}
function showDone(){clearInterval(timer);$('identify').hidden=true;$('exam').hidden=true;$('done').hidden=false;aplicarProtecao();$('clock').textContent='Encerrada';$('receipt').textContent=`Aluno: ${session.nome} | Turma: ${app.turma} | Protocolo: ${session.id}`;const area=$('review');area.replaceChildren();for(const [i,q] of session.ordem.entries()){const box=document.createElement('div');box.className='box';const h=document.createElement('h3');h.textContent=(i+1)+'. '+q.enunciado;box.append(h);const chosen=session.respostas[q.id];for(const [j,a] of q.alternativas.entries()){const p=document.createElement('p');p.textContent=String.fromCharCode(65+j)+') '+a.texto+(chosen===a.original?' — Sua resposta':'');if(chosen===a.original){p.style.fontWeight='700';p.style.color='#315b4e';}box.append(p);}area.append(box);}status('Avaliação encerrada. Respostas registradas.');}
function clock(){if(!session||session.enviada)return;const sec=Math.max(0,Math.ceil((session.fim-Date.now())/1000));$('clock').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(!sec){clearInterval(timer);submit(true);}}
function enter(){ $('identify').hidden=true;$('done').hidden=true;$('exam').hidden=false;questions=session.ordem;render();aplicarProtecao();clearInterval(timer);clock();timer=setInterval(clock,1000);status('Avaliação em andamento — '+session.nome);conferirSaidas();}
async function submit(expired=false,motivo='tempo_esgotado'){
  if(busy||!session||session.enviada)return;
  if(!expired&&!confirm('Enviar definitivamente a avaliação?'))return;
  busy=true;
  $('submit').disabled=true;
  try{
    const respostas=session.ordem.map(q=>({
      id:q.id,
      alternativa:Number.isInteger(session.respostas[q.id])?session.respostas[q.id]:-1
    }));
    const batch=writeBatch(db);
    // Preserva exatamente o formato previamente aceito pelas regras do Firestore.
    batch.set(doc(db,'respostas_internas',session.id),{
      alunoUid:uid,
      codigo,
      provaId:app.provaId,
      aluno:session.nome,
      alunoId:session.alunoId,
      turma:app.turma,
      respostas,
      encerradaEm:serverTimestamp(),
      status:expired?'tempo_esgotado':'enviada'
    });
    batch.update(doc(db,'vagas_pas',vagaId(session.alunoId)),{
      status:'concluida',
      encerradaEm:serverTimestamp()
    });
    batch.update(situacaoRef(session.alunoId),{status:'concluida'});
    await batch.commit();
    session.enviada=true;
    session.motivoEncerramento=expired?motivo:'envio_aluno';
    save();
    showDone();
    if(motivo==='limite_saidas'){
      status('Avaliação encerrada: limite de saídas ultrapassado. Respostas registradas.',true);
    }
  }catch(e){
    console.error('Erro ao encerrar avaliação:',e);
    status('Falha ao enviar: '+e.message,true);
    $('submit').disabled=false;
  }finally{
    busy=false;
  }
}
$('submit').onclick=()=>submit(false);
$('start').onclick=async()=>{if(busy)return;const alunoId=$('student').value;const aluno=roster.find(a=>a.id===alunoId);if(!aluno){status('Selecione seu nome na lista.',true);return;}busy=true;$('start').disabled=true;try{const ref=doc(db,'vagas_pas',vagaId(alunoId));const existing=await getDoc(ref);if(existing.exists()){const v=existing.data();if(v.status==='concluida')throw Error('Avaliação já concluída para este aluno.');if(v.alunoUid!==uid)throw Error('Avaliação em andamento para este aluno.');const local=JSON.parse(localStorage.getItem(key)||'null');if(!local||local.id!==v.tentativaId)throw Error('A tentativa está reservada neste navegador, mas o progresso não foi encontrado. Solicite auxílio ao professor.');session=local;enter();return;}const id=crypto.randomUUID();const fim=Date.now()+Number(app.duracao)*60000;const ordem=(app.embaralharQuestoes?shuffle(app.questoes):[...app.questoes]).map(q=>({id:q.id,enunciado:q.enunciado,alternativas:app.embaralharAlternativas?shuffle(q.alternativas.map((texto,original)=>({texto,original}))):q.alternativas.map((texto,original)=>({texto,original}))}));const nova={id,nome:aluno.nome,alunoId,uid,codigo,fim,respostas:{},ordem,enviada:false,saidas:0,limiteSaidasExcedido:false};const batch=writeBatch(db);batch.set(ref,{codigo,provaId:app.provaId,alunoId,alunoUid:uid,tentativaId:id,status:'em_andamento',iniciadaEm:serverTimestamp()});batch.set(situacaoRef(alunoId),{codigo,alunoId,status:'em_andamento'});await batch.commit();session=nova;save();enter();}catch(e){status(e.message,true);}finally{busy=false;$('start').disabled=false;}};
async function boot(user){try{uid=user.uid;if(!user.isAnonymous)throw Error('Abra a avaliação em uma janela anônima, sem a sessão de professor.');if(!codigo||!/^PAS[A-Z0-9]{16}$/.test(codigo))throw Error('Código inválido.');const [ap,lista]=await Promise.all([getDoc(doc(db,'aplicacoes_internas',codigo)),getDoc(doc(db,'listas_publicas',codigo))]);if(!ap.exists()||ap.data().estado!=='publicada')throw Error('Avaliação indisponível.');if(!lista.exists())throw Error('Esta avaliação ainda não tem turma vinculada. Solicite ao professor que atualize a publicação.');app=ap.data();roster=lista.data().alunos||[];$('exam-title').textContent=app.titulo;$('details').textContent=`Turma: ${app.turma} · Duração: ${app.duracao} minutos`;$('instructions').textContent=app.instrucoes||'';$('professor').textContent=app.professorNome?'Professor(a): '+app.professorNome:'';unsubscribe?.();unsubscribe=onSnapshot(query(collection(db,'situacoes_pas',codigo,'alunos')),snap=>{statuses=new Map(snap.docs.map(d=>[d.data().alunoId,d.data()]));renderLista();},e=>status('Falha ao atualizar situação dos alunos: '+e.message,true));const local=JSON.parse(localStorage.getItem(key)||'null');if(local&&local.uid===uid&&local.codigo===codigo){const v=await getDoc(doc(db,'vagas_pas',vagaId(local.alunoId)));if(v.exists()&&v.data().tentativaId===local.id){session=local;if(v.data().status==='concluida'){session.enviada=true;showDone();return;}if(session.enviada){showDone();return;}enter();return;}}$('start').disabled=false;status('Selecione seu nome para começar.');}catch(e){status(e.message,true);$('start').disabled=true;}}
onAuthStateChanged(auth,async u=>{if(u)await boot(u);else{try{await signInAnonymously(auth);}catch(e){status('Erro de autenticação: '+e.message,true);}}});
