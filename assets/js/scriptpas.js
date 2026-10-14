// ScriptPAS 1.0: somente dados. Nunca usa eval, Function ou HTML de origem externa.
export const KEY = 'pas_prova_interno_rascunhos_v1';

export const uid = () => globalThis.crypto?.randomUUID?.() || `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const modelo = () => ({
  scriptpas:'1.0',id:uid(),titulo:'',turma:'',duracao:50,instrucoes:'',questoes:[novaQuestao()]
});

export function novaQuestao(){
  return {
    id:uid(),tipo:'objetiva',enunciado:'',alternativas:['','','',''],correta:0,pontos:1
  };
  
}

const isString=(x,max)=>typeof x==='string' && x.length<=max;

export function validar(obj){
  
    if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('O ScriptPAS deve ser um objeto JSON.');
  
    if(obj.scriptpas!=='1.0')throw Error('Versão ScriptPAS não suportada. Use 1.0.');
  
    if(!isString(obj.titulo,180)||!obj.titulo.trim())throw Error('Informe um título (até 180 caracteres).');
  
    if(!isString(obj.turma,100))throw Error('Turma inválida.');
  
    if(!Number.isInteger(obj.duracao)||obj.duracao<1||obj.duracao>300)throw Error('Duração deve ser de 1 a 300 minutos.');
  
    if(!isString(obj.instrucoes??'',2000))throw Error('Instruções inválidas.');
  
    if(!Array.isArray(obj.questoes)||obj.questoes.length<1||obj.questoes.length>100)throw Error('A prova deve ter de 1 a 100 questões.');
  
    const questoes=obj.questoes.map((q,i)=>{
    
        if(!q||q.tipo!=='objetiva')throw Error(`Questão ${i+1}: tipo não suportado.`);
        if(!isString(q.enunciado,4000)||!q.enunciado.trim())throw Error(`Questão ${i+1}: enunciado obrigatório (até 4000 caracteres).`);
        if(!Array.isArray(q.alternativas)||q.alternativas.length!==4||q.alternativas.some(a=>!isString(a,1000)||!a.trim()))throw Error(`Questão ${i+1}: informe quatro alternativas (até 1000 caracteres).`);
        if(!Number.isInteger(q.correta)||q.correta<0||q.correta>3)throw Error(`Questão ${i+1}: correta deve ser 0, 1, 2 ou 3.`);
        if(typeof q.pontos!=='number'||!Number.isFinite(q.pontos)||q.pontos<=0||q.pontos>100)throw Error(`Questão ${i+1}: pontuação deve ser maior que zero e até 100.`);
        return {
      id:uid(),tipo:'objetiva',enunciado:q.enunciado,alternativas:[...q.alternativas],correta:q.correta,pontos:q.pontos
    };
    
  });
  
    return {
    scriptpas:'1.0',id:uid(),titulo:obj.titulo,turma:obj.turma,duracao:obj.duracao,instrucoes:obj.instrucoes??'',questoes
  };
  
  
}

export function parseScript(text){
  if(text.length>700000)throw Error('ScriptPAS excede o tamanho permitido.');
  let parsed;
  try{
    parsed=JSON.parse(text);
    
  }
  catch{
    throw Error('JSON inválido. Verifique vírgulas, aspas e colchetes.');
    
  }
  return validar(parsed);
  
}

export function exemplo(){
  return {
    scriptpas:'1.0',titulo:'Avaliação de Biologia',turma:'3º ano',duracao:50,instrucoes:'Leia com atenção e marque uma alternativa por questão.',questoes:[{
      tipo:'objetiva',enunciado:'Qual organela realiza a fotossíntese?',alternativas:['Mitocôndria','Cloroplasto','Ribossomo','Lisossomo'],correta:1,pontos:1
    },{
      tipo:'objetiva',enunciado:'Qual molécula armazena informação genética?',alternativas:['ATP','Glicose','DNA','Água'],correta:2,pontos:1
    }]
  };
  
}
