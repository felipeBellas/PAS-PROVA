# PAS-PROVA Interno — etapa 1

## O que funciona
- Editor visual de questões objetivas (4 alternativas), gabarito e pontuação.
- Reordenação, duplicação, exclusão e pré-visualização.
- Importação e validação de ScriptPAS 1.0 em JSON (até 100 questões).
- Exportação de ScriptPAS JSON.
- Salvamento de rascunhos **somente no navegador local**.
- Layout adaptável a celulares e computadores.

## O que NÃO está implementado
- Login de professor, sincronização com Firebase, publicação de provas para alunos.
- Envio de respostas, cronômetro de aplicação e correção automática segura.
- Integração com o painel atual, GitHub Actions e Firebase Hosting.

Esses recursos precisam ser implementados após o desenho de autenticação, isolamento de gabaritos, autorização de tentativas e correção confiável. **Não disponibilize os arquivos ScriptPAS com gabaritos aos alunos.**

## Como testar
Copie a pasta para o repositório sem substituir arquivos existentes. Abra `editor-pas.html` através de um servidor HTTP local (por exemplo, VS Code Live Server) ou GitHub Pages. O JavaScript utiliza módulos ES.

## Arquivos
- `editor-pas.html`: editor visual.
- `assets/css/pas-interno.css`: estilos.
- `assets/js/editor-pas.js`: interface e armazenamento local.
- `assets/js/scriptpas.js`: especificação, validação e exemplo de ScriptPAS.

## Atenção
Não sobrescreva `professor.html`, `professor.js`, `prova.html`, `prova.js` ou regras do Firestore. Antes da integração, compare com a versão estável do repositório.
