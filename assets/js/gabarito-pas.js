import {db,auth} from './firebase-config.js';

import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const provaId=new URLSearchParams(location.search).get('prova');
const erro=msg=>{$('status').textContent=msg;$('status').className='error';};
const texto=(tag,conteudo,classe='')=>{const e=document.createElement(tag);e.textContent=String(conteudo??'');if(classe)e.className=classe;return e;};
$('imprimir').onclick=()=>window.print();
$('voltar').onclick=()=>{if(history.length>1)history.back();else location.href='./professor.html';};
onAuthStateChanged(auth,async user=>{
 if(!user||user.isAnonymous){erro('Entre com uma conta de professor para acessar o gabarito.');return;}
 try{
  if(!provaId)throw Error('Identificador da avaliação ausente.');
  const perfil=await getDoc(doc(db,'usuarios',user.uid));
  if(!perfil.exists()||perfil.data().ativo!==true||!['professor','administrador'].includes(perfil.data().perfil))throw Error('Acesso restrito ao professor.');
  const snap=await getDoc(doc(db,'provas_internas',provaId));
  if(!snap.exists())throw Error('Avaliação não encontrada ou sem permissão.');
  const p=snap.data();
  if(p.professorUid!==user.uid&&perfil.data().perfil!=='administrador')throw Error('Este gabarito pertence a outro professor.');
  const qs=p.questoes||[];
  if(!qs.length)throw Error('Esta avaliação não possui questões.');
  const cab=$('cabecalho');
  for(const [titulo,valor] of [['Instituição',p.instituicao],['Avaliação',p.titulo],['Professor(a)',p.professorNome],['Turma',p.turma],['Total de questões',qs.length]]){
   const linha=texto('p',titulo+': '+(valor??'—'));cab.append(linha);
  }
  const resumo=$('resumo'),detalhes=$('questoes');
  qs.forEach((q,i)=>{
   const correta=Number(q.correta),alts=Array.isArray(q.alternativas)?q.alternativas:[];
   const valido=Number.isInteger(correta)&&correta>=0&&correta<alts.length;
   const letra=valido?String.fromCharCode(65+correta):'Não definida';
   const tr=document.createElement('tr');
   for(const val of [i+1,letra,Number(q.pontos)||1])tr.append(texto('td',val));
   resumo.append(tr);
   const sec=document.createElement('section');sec.className='questao';
   sec.append(texto('h3',(i+1)+'. '+(q.enunciado||'')));
   alts.forEach((alt,j)=>sec.append(texto('p',String.fromCharCode(65+j)+') '+alt+(j===correta?' — CORRETA':''),j===correta?'certa':'')));
   detalhes.append(sec);
  });
  $('conteudo').hidden=false;$('imprimir').disabled=false;$('status').textContent='Gabarito carregado. Clique em Imprimir / Salvar como PDF e escolha “Salvar como PDF” no navegador.';
 }catch(e){erro('Não foi possível abrir o gabarito: '+e.message);}
});
