import {
  KEY,modelo,novaQuestao,validar,parseScript,exemplo
}
 from './scriptpas.js';

const $=id=>document.getElementById(id);

let prova=modelo();

const aviso=(msg,erro=false)=>{
  $('status').textContent=msg;
  $('status').classList.toggle('error',erro);
  
};

function sync(){
  prova.titulo=$('titulo').value;
  prova.turma=$('turma').value;
  prova.duracao=Number($('duracao').value);
  prova.instrucoes=$('instrucoes').value;
  
}

function preencher(){
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
      const row=document.createElement('div');row.className='choice';const r=document.createElement('input');r.type='radio';r.name=`correta-${i}`;r.checked=q.correta===j;r.title='Marcar alternativa correta';r.addEventListener('change',()=>q.correta=j);const t=document.createElement('input');t.type='text';t.value=a;t.maxLength=1000;t.placeholder=`Alternativa ${'ABCD'[j]}`;t.addEventListener('input',()=>q.alternativas[j]=t.value);row.append(r,t);choices.append(row);
    });card.append(choices);
      const actions=document.createElement('div');actions.className='question-actions';actions.append(btn('↑','secondary',()=>mover(i,-1)),btn('↓','secondary',()=>mover(i,1)),btn('Duplicar','secondary',()=>{
      const clone=structuredClone(q);clone.id=crypto.randomUUID();prova.questoes.splice(i+1,0,clone);render();
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
        prova=item.prova;preencher();aviso('Rascunho carregado.');
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

$('exportar').onclick=()=>{
  try{
    const p=checar();
    const {
      id,...semId
    }
    =p;
    semId.questoes=p.questoes.map(({
      id,...q
    })=>q);
    download(`scriptpas-${Date.now()}.json`,JSON.stringify(semId,null,2));
    aviso('ScriptPAS exportado. Guarde o arquivo em local seguro: ele contém o gabarito.');
    
  }
  catch(e){
    aviso(e.message,true);
    
  }
};

$('exemplo').onclick=()=>{
  $('script').value=JSON.stringify(exemplo(),null,2);
  
};

$('importar').onclick=()=>{
  try{
    const p=parseScript($('script').value);
    if(!confirm('Importar ScriptPAS? O conteúdo atual não salvo será substituído.'))return;
    prova=p;
    preencher();
    aviso('ScriptPAS importado. Revise as questões e o gabarito.');
    
  }
  catch(e){
    aviso(e.message,true);
    
  }
};

$('visualizar').onclick=()=>{
  try{
    const p=checar();
    const root=$('previewBody');
    root.replaceChildren();
    const title=document.createElement('h3');
    title.textContent=p.titulo;
    const info=document.createElement('p');
    info.textContent=`Turma: ${p.turma} · Duração: ${p.duracao} min · ${p.questoes.length} questões`;
    const inst=document.createElement('p');
    inst.textContent=p.instrucoes;
    root.append(title,info,inst);
    p.questoes.forEach((q,i)=>{
      const div=document.createElement('div');div.className='preview-question';const h=document.createElement('strong');h.textContent=`${i+1}. ${q.enunciado} (${q.pontos} ponto(s))`;div.append(h);q.alternativas.forEach((a,j)=>{
        const l=document.createElement('label');l.className='preview-choice';const radio=document.createElement('input');radio.type='radio';radio.name=`preview-${i}`;radio.disabled=true;l.append(radio,document.createTextNode(`${'ABCD'[j]}) ${a}`));div.append(l);
      });root.append(div);
    });
    $('preview').showModal();
    
  }
  catch(e){
    aviso(e.message,true);
    
  }
};

$('fechar').onclick=()=>$('preview').close();
preencher();
lista();
