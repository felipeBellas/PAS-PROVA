import {db,auth} from './firebase-config.js';
import {onAuthStateChanged,signInAnonymously} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
const $=id=>document.getElementById(id), codigo=new URLSearchParams(location.search).get('codigo');
let app=null,uid=null,session=null,questions=[],timer=null,busy=false;
const status=(s,bad=false)=>{$('status').textContent=s;$('status').className=bad?'error':'muted'};
const key='pas_interna_v1_'+codigo;
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a;}
function render(){const area=$('questions');area.replaceChildren();questions.forEach((q,i)=>{const box=document.createElement('div');box.className='box';const h=document.createElement('h2');h.textContent=`${i+1}. ${q.enunciado}`;box.append(h);q.alternativas.forEach((a,j)=>{const label=document.createElement('label');label.className='option';const radio=document.createElement('input');radio.type='radio';radio.name='q'+i;radio.value=String(j);radio.checked=session.respostas[q.id]===a.original;radio.onchange=()=>{session.respostas[q.id]=a.original;save();};label.append(radio,document.createTextNode(' '+String.fromCharCode(65+j)+') '+a.texto));box.append(label)});area.append(box)});}
function save(){localStorage.setItem(key,JSON.stringify(session));}
function clock(){const left=Math.max(0,Math.ceil((session.fim-Date.now())/1000));$('clock').textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;if(left===0){clearInterval(timer);submit(true)}}
function mostrarComprovante(){
  $('identify').style.display='none';
  $('exam').style.display='none';
  $('done').style.display='block';
  $('clock').textContent='Encerrada';
  $('receipt').textContent='Aluno: '+session.nome+' | Turma: '+app.turma+' | Protocolo: '+session.id;
  const destino=$('review');destino.replaceChildren();
  const titulo=document.createElement('h3');titulo.textContent='Questões e respostas registradas';destino.append(titulo);
  for(const [i,q] of session.ordem.entries()){
    const bloco=document.createElement('div');bloco.className='box';
    const h=document.createElement('h3');h.textContent=(i+1)+'. '+q.enunciado;bloco.append(h);
    const marcada=session.respostas[q.id];
    q.alternativas.forEach((a,j)=>{
      const p=document.createElement('p');
      const escolhida=marcada===a.original;
      p.textContent=(escolhida?'✓ ':'')+String.fromCharCode(65+j)+') '+a.texto+(escolhida?' — Sua resposta':'');
      if(escolhida){p.style.fontWeight='700';p.style.color='#315b4e';}
      bloco.append(p);
    });
    if(!Number.isInteger(marcada)||marcada<0){const p=document.createElement('p');p.textContent='Não respondida';bloco.append(p);}
    destino.append(bloco);
  }
  status('Avaliação encerrada. Suas respostas foram registradas.');
}
function enter(){ $('identify').style.display='none';$('exam').style.display='block';questions=session.ordem;render();clock();timer=setInterval(clock,1000);status('Avaliação em andamento — '+session.nome+' · '+app.turma);}
async function submit(expired=false){if(busy||!session||session.enviada)return;if(!expired&&!confirm('Confirmar envio definitivo da avaliação?'))return;busy=true;$('submit').disabled=true;
try{const respostas=questions.map(q=>({id:q.id,alternativa:Number.isInteger(session.respostas[q.id])?session.respostas[q.id]:-1}));
await setDoc(doc(db,'respostas_internas',session.id),{alunoUid:uid,codigo,provaId:app.provaId,aluno:session.nome,turma:app.turma,respostas,encerradaEm:serverTimestamp(),status:expired?'tempo_esgotado':'enviada'});
session.enviada=true;save();clearInterval(timer);mostrarComprovante();
}catch(e){status('Falha ao enviar. Verifique sua conexão e tente novamente: '+e.message,true);$('submit').disabled=false;}finally{busy=false;}}
$('submit').onclick=()=>submit(false);
$('start').onclick=()=>{const nome=$('student').value.trim().replace(/\s+/g,' ');if(nome.split(' ').length<2){status('Informe nome e sobrenome.',true);return;}session={id:crypto.randomUUID(),nome,uid,codigo,fim:Date.now()+app.duracao*60000,respostas:{},ordem:(app.embaralharQuestoes?shuffle(app.questoes):[...app.questoes]).map(q=>({id:q.id,enunciado:q.enunciado,alternativas:(app.embaralharAlternativas?shuffle(q.alternativas.map((texto,original)=>({texto,original}))):q.alternativas.map((texto,original)=>({texto,original})))})),enviada:false};save();enter();};
async function boot(user){try{uid=user.uid;if(!codigo||!/^PAS[A-Z0-9]{16}$/.test(codigo))throw Error('Código da avaliação inválido.');const snap=await getDoc(doc(db,'aplicacoes_internas',codigo));if(!snap.exists()||!snap.data().publicada)throw Error('Avaliação não disponível.');app=snap.data();$('exam-title').textContent=app.titulo;$('details').textContent='Turma: '+app.turma+' · Duração: '+app.duracao+' minutos';$('instructions').textContent=app.instrucoes||'';const raw=localStorage.getItem(key);if(raw){try{const old=JSON.parse(raw);if(old.uid===uid&&old.codigo===codigo){session=old;if(session.enviada){mostrarComprovante();return;}enter();return;}}catch{}}
$('start').disabled=false;status('Identifique-se para começar.');}catch(e){status(e.message,true);$('start').disabled=true;}}
onAuthStateChanged(auth,async user=>{if(user){boot(user)}else{try{await signInAnonymously(auth)}catch(e){status('Falha na autenticação anônima: '+e.message,true)}}});
