import {db,auth} from './firebase-config.js';

import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDoc,collection,getDocs,query,where} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const provaId=params.get('prova');
let linhas=[],prova=null;
function texto(el,s){el.textContent=s;}
function data(v){if(!v)return '—';const d=v.toDate?.()||new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');}
function nota(respostas){
  const mapa=new Map((Array.isArray(respostas)?respostas:[]).map(r=>[String(r.id),r.alternativa]));
  const questoes=Array.isArray(prova.questoes)?prova.questoes:[];
  const total=questoes.reduce((s,q)=>s+(Number(q.pontos)||1),0);
  if(!total)return '—';
  const pontos=questoes.reduce((s,q,i)=>s+(mapa.get(String(q.id||i))===Number(q.correta)?(Number(q.pontos)||1):0),0);
  return (10*pontos/total).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});
}
function mostrar(){
  const tbody=$('linhas');tbody.replaceChildren();
  for(const r of linhas){const tr=document.createElement('tr');
    for(const valor of [r.aluno||'—',r.turma||'—',r.status==='enviada'?'Enviada':r.status==='tempo_esgotado'?'Tempo esgotado':r.status||'—',nota(r.respostas),data(r.encerradaEm)]){
      const td=document.createElement('td');td.textContent=valor;tr.append(td);
    }tbody.append(tr);
  }
  texto($('total'),String(linhas.length));texto($('enviadas'),String(linhas.filter(r=>r.status==='enviada').length));
  texto($('expiradas'),String(linhas.filter(r=>r.status==='tempo_esgotado').length));
  texto($('status'),linhas.length?'Resultados atualizados.':'Nenhuma resposta recebida para esta avaliação.');
}
async function carregar(){
  texto($('status'),'Carregando resultados...');
  try{
    const snap=await getDocs(query(collection(db,'respostas_internas'),where('codigo','==',prova.codigoPublico)));
    linhas=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.aluno).localeCompare(String(b.aluno),'pt-BR'));
    mostrar();
  }catch(e){texto($('status'),'Não foi possível consultar as respostas: '+e.message);console.error(e);}
}
onAuthStateChanged(auth,async user=>{
  if(!user||user.isAnonymous){texto($('status'),'Entre como professor para acompanhar a avaliação.');return;}
  try{
    const perfil=await getDoc(doc(db,'usuarios',user.uid));
    if(!perfil.exists()||perfil.data().ativo!==true||!['professor','administrador'].includes(perfil.data().perfil))throw Error('Acesso restrito a professores.');
    if(!provaId)throw Error('Avaliação não informada.');
    const snap=await getDoc(doc(db,'provas_internas',provaId));
    if(!snap.exists())throw Error('Avaliação não encontrada.');
    prova={id:snap.id,...snap.data()};
    if(!prova.codigoPublico)throw Error('Publique a avaliação antes de acompanhar os resultados.');
    texto($('titulo'),prova.titulo||'Avaliação');
    texto($('subtitulo'),[prova.instituicao,`Turma ${prova.turma||'—'}`].filter(Boolean).join(' · '));
    await carregar();
    $('atualizar').disabled=false;$('pdf').disabled=false;
  }catch(e){texto($('status'),e.message);console.error(e);}
});
$('atualizar').addEventListener('click',carregar);
$('pdf').addEventListener('click',()=>{if(!prova)return;window.print();});
