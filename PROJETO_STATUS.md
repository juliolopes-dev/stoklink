# Status do Projeto

## 1. Visão Geral

- **Stack**: Node.js + Express + MySQL + Vanilla JavaScript (SPA)
- **Arquitetura**: Multi-tenant com isolamento por empresa_id, API RESTful + Frontend SPA
- **Objetivo**: Sistema de gestão logística para transferências de mercadorias entre filiais com controle hierárquico (Empresa → Filiais → Usuários)

## 2. Estado Atual

### ✅ Funcionalidades Implementadas e Validadas

- **Autenticação JWT** com expiração de 8 horas
- **Sistema Multi-tenant** com isolamento total por empresa
- **Hierarquia completa**: Empresas → Filiais → Usuários
- **Níveis de acesso**: Admin, Gerente, Operador
- **CRUD de Filiais** (admin only)
- **CRUD de Usuários** com vinculação a filiais
- **Sistema de Transferências** com workflow completo:
  - Criação com itens e tags
  - Estados: Pendente → Em Separação → Aguardando Lançamento → Concluído
  - Ajuste de quantidades atendidas
  - Registro de número de transferência
- **Sistema de Tags** com cores personalizadas
- **Chat interno** com reações e respostas
- **Painel administrativo** completo
- **Sistema de recebimento** de fábrica
- **Controle de divergências**

### 🗄️ Banco de Dados

- **Host**: 147.93.144.135:3306
- **Database**: stoklink
- **Tabelas principais**: empresas, filiais, usuarios, transferencias, transferencias_itens, tags, mensagens_chat

## 3. Última Sessão

- **Data**: 22/12/2025
- **Mudanças**:
  - Criação do arquivo PROJETO_STATUS.md para persistência de contexto
  - **Implementação de upload de XML de NF-e no módulo de recebimento**
  - **Novo fluxo de recebimento em 4 etapas:**
    1. Lançamento da NF (status: aguardando)
    2. Confirmação de Recebimento - volumes e divergência de volumes (status: recebido)
    3. Conferência de Produtos - códigos faltando/sobrando (status: conferido)
    4. Filial Origem Confirma - finalização (status: finalizado)
  - Criada migração SQL: `migration-novo-fluxo-recebimento.sql`
  - Novos modais no frontend para cada etapa
  - Endpoints atualizados para suportar novo fluxo
- **Testes**: Executar migração SQL e testar fluxo completo

## 4. Próximos Passos (Priorizado)

- [ ] Aguardando solicitação do usuário para próxima funcionalidade
- [ ] Sistema está funcional e em produção

## 5. Ponto de Retomada

**Iniciar por**: O sistema está completo e funcional. Aguardar solicitação específica do usuário para implementar novas funcionalidades, correções de bugs ou melhorias. Sempre consultar este arquivo antes de iniciar qualquer trabalho.

## 6. Contexto Técnico Completo

**Backend (Node.js + Express)**: API RESTful na porta 3001 com autenticação JWT (jsonwebtoken v9.0.2), bcrypt para hash de senhas, mysql2 v3.6.5 para conexão com pool, CORS habilitado. Arquivo principal `server.js` (73KB) contém todos os endpoints. Conexão MySQL configurada em `db.js` com pool de 10 conexões. Variáveis de ambiente em `.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, PORT).

**Frontend (Vanilla JS SPA)**: Arquivos principais `index.html` (sistema), `admin.html` (painel admin), `login.html` (autenticação), `registro.html` (cadastro público), `landing.html` (página inicial). Lógica em `app.js` (162KB) e `admin.js` (51KB). Estilos em `styles.css` (24KB). Usa Lucide Icons para ícones. Sem framework, JavaScript puro com manipulação DOM.

**Endpoints críticos**: `/api/auth/login` (POST), `/api/filiais` (GET/POST/PUT/DELETE - admin), `/api/usuarios` (GET/POST/PUT/DELETE - admin/gerente), `/api/transferencias` (GET/POST/PUT), `/api/transferencias/:id/status` (PUT), `/api/transferencias/:id/finalizar` (PUT), `/api/tags` (GET), `/api/health` (GET).

**Modelo de dados**: Multi-tenant com `empresa_id` em todas as tabelas. Relacionamentos: Empresa 1:N Filiais, Filial 1:N Usuários, Transferência N:1 Filial Origem, Transferência N:1 Filial Destino, Transferência 1:N Itens. Campos de auditoria: `created_at`, `updated_at` em tabelas principais.

**Migrações disponíveis**: `migration-filiais.sql`, `migration-chat-v5-reply.sql`, `migration-timestamps.sql`, `migration-recebimento-fabrica.sql`, `migration-divergencias.sql`, `migration-status-transferencias.sql`. Setup inicial em `setup-completo.sql`.

**Execução**: Backend via `npm start` na pasta backend. Frontend via Live Server, duplo clique em HTML ou http-server. Script `INICIAR_SISTEMA.bat` automatiza inicialização no Windows. Usuário padrão: <juliofranlopes10@gmail.com> (role: admin).

**Segurança**: JWT com expiração 8h, senhas com bcrypt (10 rounds), `.env` no `.gitignore`, validação de empresa_id em todas as queries, middleware de autenticação em rotas protegidas, transações MySQL para operações críticas.

**Estrutura de pastas**: `/backend` (API), `/frontend` (SPA), `/xlsx` (arquivos temporários), documentação em arquivos `.md` na raiz (EXECUTAR_AGORA.md, MIGRATION_FILIAIS.md, COMO_*.md).
