// ScriptPAS 1.0: somente dados. Nunca usa eval, Function ou HTML de origem externa.
export const KEY = 'pas_prova_interno_rascunhos_v1';


export const uid = () => globalThis.crypto?.randomUUID?.() || `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const modelo = () => ({
  scriptpas:'1.0',id:uid(),instituicao:'',titulo:'',turma:'',duracao:50,instrucoes:'',embaralharQuestoes:true,embaralharAlternativas:true,questoes:[novaQuestao()]
});

export function novaQuestao(){
  return {
    id:uid(),tipo:'objetiva',enunciado:'',alternativas:['','','','',''],correta:0,pontos:1
  };
  
}

const isString=(x,max)=>typeof x==='string' && x.length<=max;

export function validar(obj){
  
    if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('O ScriptPAS deve ser um objeto JSON.');
  
    if(obj.scriptpas!=='1.0')throw Error('Versão ScriptPAS não suportada. Use 1.0.');
  
    if(!isString(obj.instituicao??'',180))throw Error('Nome da instituição inválido.');

    if(!isString(obj.titulo,180)||!obj.titulo.trim())throw Error('Informe um título (até 180 caracteres).');
  
    if(!isString(obj.turma,100))throw Error('Turma inválida.');
  
    if(!Number.isInteger(obj.duracao)||obj.duracao<1||obj.duracao>300)throw Error('Duração deve ser de 1 a 300 minutos.');
  
    if(!isString(obj.instrucoes??'',2000))throw Error('Instruções inválidas.');
  
    if(!Array.isArray(obj.questoes)||obj.questoes.length<1||obj.questoes.length>100)throw Error('A prova deve ter de 1 a 100 questões.');
  
    const questoes=obj.questoes.map((q,i)=>{
    
        if(!q||q.tipo!=='objetiva')throw Error(`Questão ${i+1}: tipo não suportado.`);
        if(!isString(q.enunciado,4000)||!q.enunciado.trim())throw Error(`Questão ${i+1}: enunciado obrigatório (até 4000 caracteres).`);
        if(!Array.isArray(q.alternativas)||q.alternativas.length!==5||q.alternativas.some(a=>!isString(a,1000)||!a.trim()))throw Error(`Questão ${i+1}: informe cinco alternativas (até 1000 caracteres).`);
        if(!Number.isInteger(q.correta)||q.correta<0||q.correta>4)throw Error(`Questão ${i+1}: correta deve ser 0, 1, 2, 3 ou 4.`);
        if(typeof q.pontos!=='number'||!Number.isFinite(q.pontos)||q.pontos<=0||q.pontos>100)throw Error(`Questão ${i+1}: pontuação deve ser maior que zero e até 100.`);
        return {
      id:uid(),tipo:'objetiva',enunciado:q.enunciado,alternativas:[...q.alternativas],correta:q.correta,pontos:q.pontos
    };
    
  });
  
    return {
    scriptpas:'1.0',id:uid(),instituicao:obj.instituicao??'',titulo:obj.titulo,turma:obj.turma,duracao:obj.duracao,instrucoes:obj.instrucoes??'',embaralharQuestoes:obj.embaralharQuestoes!==false,embaralharAlternativas:obj.embaralharAlternativas!==false,questoes
  };
  
  
}

export function parseScript(text){
  if (typeof text !== 'string' || text.length > 700000) {
    throw Error('PAS-Script vazio ou maior que o permitido.');
  }
  let obj;
  try { obj = JSON.parse(text.trim()); }
  catch { throw Error('JSON inválido. Verifique aspas, vírgulas e colchetes.'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.scriptpas !== '1.0') {
    throw Error('Formato inválido. Use scriptpas: "1.0".');
  }
  if (!Array.isArray(obj.questoes) || !obj.questoes.length || obj.questoes.length > 100) {
    throw Error('O PAS-Script deve conter de 1 a 100 questões.');
  }
  return obj.questoes.map((q, i) => {
    const n = i + 1;
    if (!q || typeof q !== 'object' || Array.isArray(q)) throw Error(`Questão ${n} inválida.`);
    if (!isString(q.enunciado, 4000) || !q.enunciado.trim()) throw Error(`Questão ${n}: enunciado obrigatório.`);
    if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5 || q.alternativas.some(a => !isString(a, 1000) || !a.trim())) {
      throw Error(`Questão ${n}: informe cinco alternativas preenchidas.`);
    }
    if (!Number.isInteger(q.correta) || q.correta < 0 || q.correta > 4) throw Error(`Questão ${n}: correta deve estar entre 0 e 4.`);
    if (typeof q.pontos !== 'number' || !Number.isFinite(q.pontos) || q.pontos <= 0 || q.pontos > 100) throw Error(`Questão ${n}: pontuação inválida.`);
    return { id: uid(), tipo: 'objetiva', enunciado: q.enunciado, alternativas: [...q.alternativas], correta: q.correta, pontos: q.pontos };
  });
}

export function exemplo(){
  return {
    scriptpas: '1.0',
    questoes: [{
      enunciado: 'Qual organela realiza a fotossíntese?',
      alternativas: ['Mitocôndria', 'Cloroplasto', 'Ribossomo', 'Lisossomo', 'Complexo golgiense'],
      correta: 1,
      pontos: 1
    }]
  };
}

export const COMANDO_IA = `COMANDO PAS-SCRIPT 1.0 — PAS-PROVA
Crie [QUANTIDADE] questões objetivas sobre [CONTEÚDOS], para [ANO/SÉRIE], com dificuldade [NÍVEL], no estilo [ESTILO: ENEM, contextualizado ou direto].
Cada questão deve possuir cinco alternativas (a, b, c, d, e), com apenas uma correta.
Retorne exclusivamente JSON válido neste padrão:
{
  "scriptpas": "1.0",
  "questoes": [
    {
      "enunciado": "Texto da questão",
      "alternativas": ["Alternativa a", "Alternativa b", "Alternativa c", "Alternativa d", "Alternativa e"],
      "correta": 0,
      "pontos": 1
    }
  ]
}
Regras: gere exatamente a quantidade solicitada; use correta de 0 a 4 (a=0, b=1, c=2, d=3, e=4); distribua os gabaritos; evite ambiguidades e repetições; não inclua cabeçalho, comentários, cercas Markdown ou texto fora do JSON.`;
