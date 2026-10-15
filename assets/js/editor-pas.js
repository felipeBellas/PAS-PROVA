import {
  KEY,modelo,novaQuestao,validar,parseScript,exemplo,COMANDO_IA
}
 from './scriptpas.js';

import {db,auth} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDoc,setDoc,serverTimestamp,getDocs,collection,query,where} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
let professorUid=null;
let turmasCache=[];
async function carregarTurmas(user,admin){
  const base=collection(db,'turmas_pas');
  const snap=await getDocs(admin?base:query(base,where('professorUid','==',user.uid)));
  turmasCache=snap.docs.map(d=>({id:d.id,...d.data()}));
  const sel=$('turma-id');sel.replaceChildren(new Option('Selecione uma turma cadastrada',''));
  turmasCache.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).forEach(t=>sel.add(new Option(t.nome+' ('+t.alunos.length+' alunos)',t.id)));
  if(prova.turmaId)sel.value=prova.turmaId;
  sel.dispatchEvent(new Event('change'));
}
$('turma-id').addEventListener('change',()=>{const t=turmasCache.find(t=>t.id===$('turma-id').value);$('turma').value=t?.nome||'';});
onAuthStateChanged(auth, async user=>{
  professorUid=null;
  if(!user || user.isAnonymous)return;
  try {
    const snap=await getDoc(doc(db,'usuarios',user.uid));
    if(snap.exists() && snap.data().ativo===true && ['professor','administrador'].includes(snap.data().perfil)){professorUid=user.uid;await carregarTurmas(user,snap.data().perfil==='administrador');}
  }catch(e){console.error(e);}
});


let prova=modelo();

const aviso=(msg,erro=false)=>{
  $('status').textContent=msg;
  $('status').classList.toggle('error',erro);
  
};

function sync(){
  prova.instituicao=$('instituicao').value.trim();
  prova.professorNome=$('professor-nome').value.trim();
  prova.titulo=$('titulo').value;
  prova.turma=$('turma').value;
  prova.turmaId=$('turma-id').value;
  prova.duracao=Number($('duracao').value);
  prova.instrucoes=$('instrucoes').value;
  prova.embaralharQuestoes=$('embaralhar-questoes').checked;
  prova.embaralharAlternativas=$('embaralhar-alternativas').checked;
  
}

function preencher(){
   $('instituicao').value=prova.instituicao || '';
   $('professor-nome').value=prova.professorNome||'';
   $('titulo').value=prova.titulo;
  $('turma').value=prova.turma;
  $('turma-id').value=prova.turmaId||'';
  $('duracao').value=prova.duracao;
  $('instrucoes').value=prova.instrucoes;
  $('embaralhar-questoes').checked=prova.embaralharQuestoes!==false;
  $('embaralhar-alternativas').checked=prova.embaralharAlternativas!==false;
  render();
  
}

function btn(txt,cls,fn){
  const b=document.createElement('button');
  b.textContent=txt;
  b.className=cls;
  b.type='button';
  b.addEventListener('click',fn);
  return b;
  
}

function render(){
  const area=$('questoes');
  area.replaceChildren();
  $('total').textContent=`(${prova.questoes.length})`;
  
    prova.questoes.forEach((q,i)=>{
    const card=document.createElement('article');card.className='question';const head=document.createElement('div');head.className='question-head';const h=document.createElement('h3');h.textContent=`Questão ${i+1}`;head.append(h);const pt=document.createElement('label');pt.textContent='Pontos';pt.style.width='105px';const p=document.createElement('input');p.type='number';p.min='0.1';p.max='100';p.step='0.1';p.value=q.pontos;p.addEventListener('input',()=>q.pontos=Number(p.value));pt.append(p);head.append(pt);card.append(head);
      const lab=document.createElement('label');lab.textContent='Enunciado';const en=document.createElement('textarea');en.rows=3;en.value=q.enunciado;en.maxLength=4000;en.addEventListener('input',()=>q.enunciado=en.value);lab.append(en);card.append(lab);
      const choices=document.createElement('div');choices.className='choices';q.alternativas.forEach((a,j)=>{
      const row=document.createElement('div');row.className='choice';const r=document.createElement('input');r.type='radio';r.name=`correta-${i}`;r.checked=q.correta===j;r.title='Marcar alternativa correta';r.addEventListener('change',()=>q.correta=j);const t=document.createElement('input');t.type='text';t.value=a;t.maxLength=1000;t.placeholder=`Alternativa ${'abcde'[j]}`;t.addEventListener('input',()=>q.alternativas[j]=t.value);row.append(r,t);choices.append(row);
    });card.append(choices);
      const actions=document.createElement('div');actions.className='question-actions';actions.append(btn('↑','secondary',()=>mover(i,-1)),btn('↓','secondary',()=>mover(i,1)),btn('Duplicar','secondary',()=>{
      const clone=structuredClone(q);clone.id=globalThis.crypto?.randomUUID?.() || `q-${Date.now()}`;prova.questoes.splice(i+1,0,clone);render();
    }),btn('Excluir','danger',()=>{
      if(prova.questoes.length===1){
        aviso('A prova precisa manter pelo menos uma questão.',true);return;
      }
      if(confirm(`Excluir questão ${i+1}?`)){
        prova.questoes.splice(i,1);render();
      }
    }));card.append(actions);area.append(card);
  });
  
}

function mover(i,delta){
  const j=i+delta;
  if(j<0||j>=prova.questoes.length)return;
  [prova.questoes[i],prova.questoes[j]]=[prova.questoes[j],prova.questoes[i]];
  render();
  
}

function carregarRascunhos(){
  try{
    return JSON.parse(localStorage.getItem(KEY)||'{}');
    
  }
  catch{
    return {
      
    };
    
  }
}

function lista(){
  const area=$('rascunhos');
  area.replaceChildren();
  const entries=Object.entries(carregarRascunhos()).sort((a,b)=>(b[1].at||'').localeCompare(a[1].at||''));
  if(!entries.length){
    area.textContent='Nenhum rascunho salvo.';
    return;
    
  }
  entries.forEach(([id,item])=>{
    const row=document.createElement('div');row.className='draft';const s=document.createElement('span');s.textContent=`${item.prova.titulo} — ${item.prova.turma} (${item.prova.questoes.length} questões)`;const group=document.createElement('div');group.append(btn('Abrir','secondary',()=>{
      if(confirm('Abrir este rascunho? Alterações não salvas serão perdidas.')){
        prova=item.prova;prova.questoes.forEach(q=>{if(q.alternativas?.length===4)q.alternativas.push('');});preencher();aviso('Rascunho carregado.');
      }
    }),btn('Excluir','danger',()=>{
      if(confirm('Excluir rascunho local?')){
        const all=carregarRascunhos();delete all[id];localStorage.setItem(KEY,JSON.stringify(all));lista();
      }
    }));row.append(s,group);area.append(row);
  });
  
}

function checar(){
  sync();
  return validar(prova);
  
}

function download(nome,conteudo){
  const blob=new Blob([conteudo],{
    type:'application/json;charset=utf-8'
  });
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  
}

$('adicionar').onclick=()=>{
  if(prova.questoes.length>=100){
    aviso('Limite de 100 questões.',true);
    return;
    
  }
  prova.questoes.push(novaQuestao());
  render();
  
};

const params=new URLSearchParams(location.search);
const editarId=params.get('editar');
async function carregarEdicao(){
  if(!editarId)return;
  try{
    const snap=await getDoc(doc(db,'provas_internas',editarId));
    if(!snap.exists())throw Error('Avaliação não encontrada.');
    const d=snap.data();
    if(!professorUid || (d.professorUid!==professorUid && !(await getDoc(doc(db,'usuarios',professorUid))).data()?.perfil?.includes('administrador')))throw Error('Sem permissão para editar.');
    prova={...d,id:editarId,questoes:d.questoes.map(q=>({...q}))};
    preencher();aviso('Avaliação carregada.');
  }catch(e){aviso('Não foi possível carregar: '+e.message,true);}
}
onAuthStateChanged(auth, u=>{if(u && !u.isAnonymous)setTimeout(carregarEdicao,250);});
$('publicar').onclick=async()=>{
  const botao=$('publicar');
  try{
    if(!professorUid)throw Error('Aguarde a autenticação do professor.');
    checar();
    if(!prova.turmaId)throw Error('Selecione uma turma cadastrada.');
    const id=editarId||prova.id;
    const ref=doc(db,'provas_internas',id);
    const anterior=editarId ? await getDoc(ref) : null;
    if(editarId && !anterior.exists())throw Error('Avaliação para edição não encontrada.');
    if(anterior?.exists() && anterior.data().professorUid!==professorUid){
      const perfil=(await getDoc(doc(db,'usuarios',professorUid))).data()?.perfil;
      if(perfil!=='administrador')throw Error('Esta avaliação pertence a outro professor.');
    }
    botao.disabled=true;
    const payload={scriptpas:'1.0',instituicao:prova.instituicao||'',professorNome:prova.professorNome||'',titulo:prova.titulo.trim(),turma:prova.turma.trim(),turmaId:prova.turmaId,duracao:prova.duracao,instrucoes:prova.instrucoes||'',embaralharQuestoes:prova.embaralharQuestoes!==false,embaralharAlternativas:prova.embaralharAlternativas!==false,questoes:structuredClone(prova.questoes),professorUid:anterior?.exists()?anterior.data().professorUid:professorUid,estado:anterior?.exists()&&anterior.data().estado==='publicada'?'publicada':'preparacao',atualizadoEm:serverTimestamp()};
    if(!editarId)payload.criadoEm=serverTimestamp();
    await setDoc(ref,payload,{merge:!!editarId});
    aviso('Avaliação salva! Você pode gerenciá-la no Painel do Professor.');
  }catch(e){aviso('Erro ao salvar avaliação: '+e.message,true);}finally{botao.disabled=false;}
};
$('nova').onclick=()=>{
  if(confirm('Criar uma nova prova? Salve ou exporte a atual antes de continuar.')){
    prova=modelo();
    preencher();
    aviso('Nova avaliação criada.');
    
  }
};

$('salvar').onclick=()=>{
  try{
    checar();
    const all=carregarRascunhos();
    all[prova.id]={
      at:new Date().toISOString(),prova:structuredClone(prova)
    };
    localStorage.setItem(KEY,JSON.stringify(all));
    lista();
    aviso('Rascunho salvo neste navegador.');
    
  }
  catch(e){
    aviso(e.message,true);
    
  }
};

$('copiar-comando').onclick=async()=>{
  try {
    await navigator.clipboard.writeText(COMANDO_IA);
    aviso('Comando oficial copiado. Preencha os campos entre colchetes e envie à IA.');
  } catch {
    $('script').value=COMANDO_IA;
    $('script').focus();
    $('script').select();
    aviso('Selecione e copie o comando exibido na caixa.');
  }
};

$('exemplo').onclick=()=>{
  $('script').value=JSON.stringify(exemplo(),null,2);
  
};

$('importar').onclick=()=>{
  try {
    const novas=parseScript($('script').value);
    const vazia=prova.questoes.length===1 && !prova.questoes[0].enunciado.trim() && prova.questoes[0].alternativas.every(a=>!a.trim());
    const existentes=vazia?0:prova.questoes.length;
    if (existentes+novas.length>100) throw Error('Limite de 100 questões por avaliação.');
    if (!confirm(`Adicionar ${novas.length} questão(ões) à avaliação? ${vazia?'A questão vazia inicial será substituída.':'As questões atuais serão mantidas.'}`)) return;
    if(vazia) prova.questoes=[];
    prova.questoes.push(...novas);
    render();
    aviso(`${novas.length} questão(ões) importada(s). Revise enunciados e gabaritos antes de salvar.`);
    $('questoes').scrollIntoView({behavior:'smooth',block:'start'});
  } catch(e){ aviso(e.message,true); $('status').scrollIntoView({behavior:'smooth',block:'center'}); }
};

// Fisher-Yates com aleatoriedade criptografica do navegador.
// O sorteio no editor e apenas uma SIMULACAO; nao publica gabaritos.
function misturar(vetor){
  const itens=[...vetor];
  for(let i=itens.length-1;i>0;i--){
    const limite=Math.floor(4294967296/(i+1))*(i+1);
    let sorteio;
    do { sorteio=crypto.getRandomValues(new Uint32Array(1))[0]; } while(sorteio>=limite);
    const j=sorteio%(i+1);
    [itens[i],itens[j]]=[itens[j],itens[i]];
  }
  return itens;
}

let simulacao=null;
function criarOrdem(p){
  const originais=p.questoes.map((q,indice)=>({q,indice}));
  const ordenadas=p.embaralharQuestoes?misturar(originais):originais;
  return ordenadas.map(({q,indice})=>{
    const alternativas=q.alternativas.map((texto,original)=>({texto,original}));
    const exibidas=p.embaralharAlternativas?misturar(alternativas):alternativas;
    return {indiceOriginal:indice,enunciado:q.enunciado,pontos:q.pontos,
      alternativas:exibidas.map(a=>a.texto),
      corretaExibida:exibidas.findIndex(a=>a.original===q.correta)};
  });
}

function mostrarSimulacao(){
  const p=checar();
  const root=$('previewBody');
  root.replaceChildren();
  const escola=document.createElement('p');
  escola.className='preview-school';
  escola.textContent=p.instituicao||'';
  if(escola.textContent)root.append(escola);
  const title=document.createElement('h3');title.textContent=p.titulo;
  const info=document.createElement('p');
  info.textContent=`Turma: ${p.turma} · Duração: ${p.duracao} min · ${p.questoes.length} questões`;
  const inst=document.createElement('p');inst.textContent=p.instrucoes;
  root.append(title,info,inst);
  simulacao=criarOrdem(p);
  $('resultado-preview').textContent='';
  simulacao.forEach((q,i)=>{
    const div=document.createElement('div');div.className='preview-question';
    const h=document.createElement('strong');
    h.textContent=`Questão ${i+1}. ${q.enunciado} (${q.pontos} ponto(s))`;
    div.append(h);
    q.alternativas.forEach((a,j)=>{
      const l=document.createElement('label');l.className='preview-choice';
      const radio=document.createElement('input');radio.type='radio';
      radio.name=`preview-${i}`;radio.value=String(j);
      l.append(radio,document.createTextNode(`${'abcde'[j]}) ${a}`));
      div.append(l);
    });
    root.append(div);
  });
}

$('visualizar').onclick=()=>{
  try {mostrarSimulacao();$('preview').showModal();}
  catch(e){aviso(e.message,true);}
};
$('nova-ordem-preview').onclick=()=>{
  try {mostrarSimulacao();} catch(e){aviso(e.message,true);}
};
$('corrigir-preview').onclick=()=>{
  if(!simulacao)return;
  const respostas=simulacao.map((q,i)=>{
    const marcado=$('previewBody').querySelector(`input[name="preview-${i}"]:checked`);
    return marcado?Number(marcado.value):null;
  });
  const pendentes=respostas.filter(v=>v===null).length;
  if(pendentes&&!confirm(`${pendentes} questão(ões) sem resposta. Conferir mesmo assim?`))return;
  const total=simulacao.reduce((s,q)=>s+Number(q.pontos),0);
  const obtido=simulacao.reduce((s,q,i)=>s+(respostas[i]===q.corretaExibida?Number(q.pontos):0),0);
  const acertos=simulacao.filter((q,i)=>respostas[i]===q.corretaExibida).length;
  $('resultado-preview').textContent=`Simulação: ${acertos}/${simulacao.length} acertos · ${obtido.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} pontos. Nenhum resultado foi enviado.`;
};
$('reiniciar-preview').onclick=()=>{
  $('previewBody').querySelectorAll('input[type=radio]').forEach(r=>r.checked=false);
  $('resultado-preview').textContent='Simulação reiniciada. A ordem foi mantida.';
};
$('fechar').onclick=()=>$('preview').close();
preencher();
lista();
