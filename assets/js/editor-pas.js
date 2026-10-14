import {
  KEY,modelo,novaQuestao,validar,parseScript,exemplo,COMANDO_IA
}
  
 from './scriptpas.js';

const $=id=>document.getElementById(id);

let prova=modelo();

const aviso=(msg,erro=false)=>{
  $('status').textContent=msg;
  $('status').classList.toggle('error',erro);
  
};

function sync(){
  prova.instituicao=$('instituicao').value.trim();
  prova.titulo=$('titulo').value;
  prova.turma=$('turma').value;
  prova.duracao=Number($('duracao').value);
  prova.instrucoes=$('instrucoes').value;
  
}

function preencher(){
   $('instituicao').value=prova.instituicao || '';
   $('titulo').value=prova.titulo;
  $('turma').value=prova.turma;
  $('duracao').value=prova.duracao;
  $('instrucoes').value=prova.instrucoes;
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

$('visualizar').onclick=()=>{
  try{
    const p=checar();
    const root=$('previewBody');
    root.replaceChildren();
    const escola=document.createElement('p');
    escola.className='preview-school';
    escola.textContent=p.instituicao || '';
    if (escola.textContent) root.append(escola);
    const title=document.createElement('h3');
    title.textContent=p.titulo;
    const info=document.createElement('p');
    info.textContent=`Turma: ${p.turma} · Duração: ${p.duracao} min · ${p.questoes.length} questões`;
    const inst=document.createElement('p');
    inst.textContent=p.instrucoes;
    root.append(title,info,inst);
    $('resultado-preview').textContent='';
    p.questoes.forEach((q,i)=>{
      const div=document.createElement('div');div.className='preview-question';const h=document.createElement('strong');h.textContent=`${i+1}. ${q.enunciado} (${q.pontos} ponto(s))`;div.append(h);q.alternativas.forEach((a,j)=>{
        const l=document.createElement('label');l.className='preview-choice';const radio=document.createElement('input');radio.type='radio';radio.name=`preview-${i}`;radio.value=String(j);l.append(radio,document.createTextNode(`${'abcde'[j]}) ${a}`));div.append(l);
      });root.append(div);
    });
    $('preview').showModal();
    
  }
  catch(e){
    aviso(e.message,true);
    
  }
};

$('corrigir-preview').onclick=()=>{
  const respostas=prova.questoes.map((q,i)=>{
    const marcado=document.querySelector(`input[name=\"preview-${i}\"]:checked`);
    return marcado ? Number(marcado.value) : null;
  });
  const pendentes=respostas.filter(v=>v===null).length;
  if(pendentes && !confirm(`${pendentes} questão(ões) sem resposta. Conferir mesmo assim?`))return;
  const total=prova.questoes.reduce((s,q)=>s+Number(q.pontos),0);
  const obtido=prova.questoes.reduce((s,q,i)=>s+(respostas[i]===q.correta?Number(q.pontos):0),0);
  const acertos=prova.questoes.filter((q,i)=>respostas[i]===q.correta).length;
  $('resultado-preview').textContent=`Simulação: ${acertos}/${prova.questoes.length} acertos · ${obtido.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} pontos. Nenhum resultado foi enviado.`;
};
$('reiniciar-preview').onclick=()=>{
  document.querySelectorAll('#previewBody input[type=radio]').forEach(r=>r.checked=false);
  $('resultado-preview').textContent='Simulação reiniciada.';
};
$('fechar').onclick=()=>$('preview').close();
preencher();
lista();
