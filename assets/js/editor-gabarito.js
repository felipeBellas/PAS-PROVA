// Abre o gabarito protegido de uma avaliação já salva no Firebase.

const botao=document.getElementById('gerar-gabarito');
botao?.addEventListener('click',()=>{
  const id=new URLSearchParams(location.search).get('editar');
  if(!id){alert('Primeiro salve a avaliação no Firebase. Depois abra-a pelo botão Editar no Painel do Professor e gere o gabarito.');return;}
  window.open('./gabarito-pas.html?prova='+encodeURIComponent(id),'_blank','noopener');
});
