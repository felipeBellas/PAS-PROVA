import {db,auth} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDoc,collection,getDocs,query,where,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
const $=id=>document.getElementById(id), provaId=new URLSearchParams(location.search).get('prova');
let prova=null,uid=null,linhas=[],vagas=new Map(),alunos=[];
function data(v){if(!v)return '—';const d=v.toDate?.()||new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');}
function nota(respostas){const mapa=new Map((Array.isArray(respostas)?respostas:[]).map(r=>[String(r.id),r.alternativa]));const qs=prova.questoes||[];const total=qs.reduce((s,q)=>s+(Number(q.pontos)||1),0);const pontos=qs.reduce((s,q,i)=>s+(mapa.get(String(q.id||i))===Number(q.correta)?Number(q.pontos)||1:0),0);return total?(10*pontos/total).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2}):'—';}
async function liberar(aluno, vaga){if(!vaga){alert('Não há tentativa para liberar.');return;}if(!confirm('Liberar uma nova tentativa para '+aluno.nome+'? A resposta anterior permanecerá no histórico.'))return;try{const batch=writeBatch(db);batch.delete(doc(db,'vagas_pas',prova.codigoPublico+'_'+aluno.id));batch.set(doc(collection(db,'liberacoes_pas')),{codigo:prova.codigoPublico,provaId:prova.id,alunoId:aluno.id,aluno:aluno.nome,professorUid:uid,tentativaAnterior:vaga.tentativaId,liberadoEm:serverTimestamp()});await batch.commit();await carregar();$('status').textContent='Nova tentativa liberada. A anterior foi preservada.';}catch(e){alert('Falha ao liberar: '+e.message);}}
function criarLinha(destino, valores, acao=null){
 const tr=document.createElement('tr');
 for(const valor of valores){const td=document.createElement('td');td.textContent=String(valor??'—');tr.append(td);}
 if(destino.id==='linhas'){const td=document.createElement('td');if(acao)td.append(acao);else td.textContent='—';tr.append(td);}
 destino.append(tr);
}
function mostrar(){
 const oficial=$('linhas'),historico=$('historico'),impressao=$('linhas-impressao');
 oficial.replaceChildren();historico.replaceChildren();impressao.replaceChildren();
 const porId=new Map(linhas.map(r=>[r.id,r]));
 const ativos=new Set();let concluidas=0;
 const ordenados=[...alunos].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'}));
 for(const aluno of ordenados){
  const vaga=vagas.get(aluno.id);
  const resposta=vaga?porId.get(vaga.tentativaId):null;
  if(resposta)ativos.add(resposta.id);
  const situacao=!vaga?'Disponível':vaga.status==='concluida'?(resposta?'Concluída':'Concluída — resposta indisponível'):'Em andamento';
  const valido=!!(vaga?.status==='concluida'&&resposta&&['enviada','tempo_esgotado'].includes(resposta.status));
  const b=vaga?document.createElement('button'):null;
  if(b){b.textContent='Liberar nova tentativa';b.onclick=()=>liberar(aluno,vaga);}
  criarLinha(oficial,[aluno.nome,prova.turma||'—',situacao,valido?nota(resposta.respostas):'—',valido?data(resposta.encerradaEm):'—'],b);
  if(valido){concluidas++;criarLinha(impressao,[aluno.nome,prova.turma||'—',nota(resposta.respostas),data(resposta.encerradaEm)]);}
 }
 const antigos=linhas.filter(r=>!ativos.has(r.id)).sort((a,b)=>String(a.aluno||'').localeCompare(String(b.aluno||''),'pt-BR',{sensitivity:'base'}));
 for(const r of antigos){criarLinha(historico,[r.aluno||'—',r.turma||'—',r.alunoId?'Substituída / sem reserva atual':'Registro anterior sem vínculo',nota(r.respostas),data(r.encerradaEm)]);}
 $('sem-historico').textContent=antigos.length?'':'Nenhuma tentativa substituída.';
 $('resumo-impressao').textContent=`${prova.titulo} · ${prova.instituicao||''} · Turma ${prova.turma||''} · ${concluidas} avaliações concluídas`;
 $('total').textContent=String(linhas.length);
 $('enviadas').textContent=String(linhas.filter(r=>r.status==='enviada').length);
 $('expiradas').textContent=String(linhas.filter(r=>r.status==='tempo_esgotado').length);
 $('status').textContent=`Turma: ${alunos.length} alunos cadastrados · ${concluidas} resultados válidos para impressão · ${antigos.length} registros históricos.`;
}
async function carregar(){if(!prova)return;$('status').textContent='Carregando resultados...';try{const [resp,vs,lista]=await Promise.all([getDocs(query(collection(db,'respostas_internas'),where('codigo','==',prova.codigoPublico))),getDocs(query(collection(db,'vagas_pas'),where('codigo','==',prova.codigoPublico))),getDoc(doc(db,'listas_publicas',prova.codigoPublico))]);vagas=new Map(vs.docs.map(d=>[d.data().alunoId,d.data()]));alunos=(lista.exists()?lista.data().alunos:[]).slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));linhas=resp.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.aluno).localeCompare(String(b.aluno),'pt-BR'));mostrar();}catch(e){$('status').textContent='Erro: '+e.message;console.error(e);}}
onAuthStateChanged(auth,async user=>{if(!user||user.isAnonymous){$('status').textContent='Entre como professor.';return;}try{const perfil=await getDoc(doc(db,'usuarios',user.uid));if(!perfil.exists()||perfil.data().ativo!==true||!['professor','administrador'].includes(perfil.data().perfil))throw Error('Acesso negado.');uid=user.uid;const snap=await getDoc(doc(db,'provas_internas',provaId));if(!snap.exists())throw Error('Avaliação não encontrada.');prova={id:snap.id,...snap.data()};if(!prova.codigoPublico)throw Error('Avaliação não publicada.');$('titulo').textContent=prova.titulo;$('subtitulo').textContent=[prova.instituicao,prova.turma].filter(Boolean).join(' · ');$('atualizar').disabled=false;$('pdf').disabled=false;await carregar();}catch(e){$('status').textContent=e.message;}});
$('atualizar').onclick=carregar;$('pdf').onclick=()=>window.print();
