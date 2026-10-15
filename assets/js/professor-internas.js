import {db,auth} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {collection,getDocs,doc,getDoc,deleteDoc,query,where,setDoc,serverTimestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const area=document.getElementById('lista-internas');
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let usuario=null,admin=false;

async function carregar(){
  if(!usuario||!area)return;
  area.textContent='Carregando avaliações...';
  try{
    const base=collection(db,'provas_internas');
    const snap=await getDocs(admin?base:query(base,where('professorUid','==',usuario.uid)));
    const dados=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.titulo).localeCompare(String(b.titulo),'pt-BR'));
    area.replaceChildren();
    if(!dados.length){area.textContent='Nenhuma avaliação interna salva no Firebase.';return;}
    for(const prova of dados){
      const card=document.createElement('div');card.style='border:1px solid #dbe4df;border-radius:12px;padding:16px;margin:12px 0';
      const titulo=document.createElement('div');titulo.innerHTML=`<strong>${esc(prova.titulo)}</strong> <span style="color:#64748b">— ${esc(prova.turma)} · ${prova.questoes?.length||0} questões · ${prova.estado==='publicada'?'Publicada':'Em preparação'}</span>`;
      const botoes=document.createElement('div');botoes.style='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';
      const editar=document.createElement('a');editar.href='./editor-pas.html?editar='+encodeURIComponent(prova.id);editar.textContent='Editar';editar.style='padding:9px 14px;border-radius:7px;background:#e4eee8;color:#234c3e';
      const excluir=document.createElement('button');excluir.type='button';excluir.textContent='Excluir';excluir.style='padding:9px 14px;border-radius:7px;background:#fce8e8;color:#8b2020';
      excluir.onclick=async()=>{if(!confirm('Excluir esta avaliação interna do Firebase?'))return;try{await deleteDoc(doc(db,'provas_internas',prova.id));await carregar();}catch(e){alert('Erro: '+e.message)}};
      const publicar=document.createElement('button');publicar.type='button';publicar.textContent=prova.estado==='publicada'?'Atualizar publicação':'Publicar avaliação';publicar.style='padding:9px 14px;border-radius:7px;background:#d9efe3;color:#17523c';
      publicar.onclick=async()=>{
        if(!confirm('Publicar as questões para acesso dos alunos? O gabarito ficará somente no documento privado do professor.'))return;
        publicar.disabled=true;
        try{
          const codigo=prova.codigoPublico||('PAS'+crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase());
          if(!prova.turmaId)throw Error('Esta avaliação é anterior ao cadastro de turmas. Abra Editar, selecione a turma cadastrada e salve antes de publicar.');
          const turmaSnap=await getDoc(doc(db,'turmas_pas',prova.turmaId));
          if(!turmaSnap.exists())throw Error('Turma cadastrada não encontrada.');
          const turma=turmaSnap.data();
          if(turma.professorUid!==prova.professorUid && !admin)throw Error('Turma de outro professor.');
          const dados={
            provaId:prova.id,
            professorUid:prova.professorUid,
            codigo,
            titulo:prova.titulo,
            turma:turma.nome,
            turmaId:prova.turmaId,
            instituicao:prova.instituicao||'',
            duracao:prova.duracao,
            instrucoes:prova.instrucoes||'',
            embaralharQuestoes:prova.embaralharQuestoes!==false,
            embaralharAlternativas:prova.embaralharAlternativas!==false,
            questoes:prova.questoes.map((q,i)=>({
              id:String(q.id||i),
              enunciado:q.enunciado,
              alternativas:q.alternativas.map(String)
            })),
            estado:'publicada',
            publicada:true,
            atualizadoEm:serverTimestamp()
          };
          const batch=writeBatch(db);
          batch.set(doc(db,'aplicacoes_internas',codigo),dados);
          batch.set(doc(db,'listas_publicas',codigo),{codigo,provaId:prova.id,professorUid:prova.professorUid,turmaId:prova.turmaId,alunos:turma.alunos.map(a=>({id:a.id,nome:a.nome})),ids:turma.alunos.map(a=>a.id),atualizadoEm:serverTimestamp()});
          batch.set(doc(db,'provas_internas',prova.id),{codigoPublico:codigo,estado:'publicada',atualizadoEm:serverTimestamp()},{merge:true});
          await batch.commit();
          await carregar();
        }catch(e){console.error('Falha ao publicar avaliação:',e);alert('Erro ao publicar: '+e.message);publicar.disabled=false;}
      };
      const link=document.createElement('button');link.type='button';link.textContent='Copiar link';link.disabled=prova.estado!=='publicada'||!prova.codigoPublico;link.style='padding:9px 14px;border-radius:7px;background:#e7edf4;color:#274b67';
      link.onclick=async()=>{const url=new URL('./prova-interna.html?codigo='+encodeURIComponent(prova.codigoPublico),location.href).href;try{await navigator.clipboard.writeText(url);alert('Link copiado: '+url);}catch(e){prompt('Copie o link da avaliação:',url);}};
      const acompanhar=document.createElement('a');acompanhar.href='./acompanhar-interna.html?prova='+encodeURIComponent(prova.id);acompanhar.textContent='Acompanhar prova';acompanhar.style='padding:9px 14px;border-radius:7px;background:#e3eaf4;color:#274b67';acompanhar.style.pointerEvents=prova.codigoPublico?'auto':'none';acompanhar.style.opacity=prova.codigoPublico?'1':'.45';botoes.append(editar,publicar,link,acompanhar,excluir);card.append(titulo,botoes);area.append(card);
    }
  }catch(e){area.textContent='Erro ao consultar avaliações: '+e.message;console.error(e)}
}

onAuthStateChanged(auth,async u=>{
  if(!u||u.isAnonymous)return;
  try{
    const perfil=await getDoc(doc(db,'usuarios',u.uid));
    if(!perfil.exists()||perfil.data().ativo!==true||!['professor','administrador'].includes(perfil.data().perfil))return;
    usuario=u;admin=perfil.data().perfil==='administrador';await carregar();
  }catch(e){if(area)area.textContent='Falha de autenticação: '+e.message}
});
document.getElementById('atualizar-internas')?.addEventListener('click',carregar);
