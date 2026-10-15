import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario || usuario.isAnonymous) {
    location.replace('./login-professor.html');
    return;
  }
  try {
    const snap = await getDoc(doc(db, 'usuarios', usuario.uid));
    const perfil = snap.exists() ? snap.data() : null;
    if (!perfil || perfil.ativo !== true || !['professor','administrador'].includes(perfil.perfil)) {
      location.replace('./login-professor.html');
      return;
    }
    document.body.style.visibility = 'visible';
  } catch (erro) {
    console.error('Falha ao validar professor:', erro);
    location.replace('./login-professor.html');
  }
});
