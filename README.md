# 📦 StokLink - Sistema de Gestão Logística

Sistema completo multi-tenant para gerenciamento de transferências de mercadorias entre filiais.

## 🎯 Funcionalidades

✅ **Multi-tenant** - Isolamento total de dados por empresa  
✅ **Hierarquia** - Empresa → Filiais → Usuários  
✅ **Níveis de Acesso** - Admin, Gerente, Operador  
✅ **Gestão de Filiais** - Cadastro e gerenciamento completo  
✅ **Gestão de Usuários** - Vinculação a filiais específicas  
✅ **Transferências** - Controle completo do fluxo logístico  
✅ **Autenticação JWT** - Segura com expiração de 8 horas  

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Lucide Icons
- SPA (Single Page Application)

### Backend
- Node.js + Express
- MySQL2
- JWT (jsonwebtoken)
- Bcrypt
- CORS

## 📋 Pré-requisitos

- Node.js 16+ instalado
- MySQL Client (MySQL Workbench, DBeaver, etc.)
- Navegador moderno

## ⚡ INÍCIO RÁPIDO

### **OPÇÃO 1: Atalho Automático (Windows)**

Duplo clique em: `INICIAR_SISTEMA.bat`

### **OPÇÃO 2: Manual**

1. **Instalar dependências:**
```bash
cd backend
npm install
```

2. **Executar migração do banco:**
   - Abra `backend/setup-completo.sql` no MySQL Workbench
   - Execute o script (ajuste o email do usuário)

3. **Iniciar backend:**
```bash
cd backend
npm start
```

4. **Abrir frontend:**
   - Duplo clique em `frontend/login.html`
   - Ou use Live Server no VS Code

## 📚 Documentação Completa

📖 **[EXECUTAR_AGORA.md](EXECUTAR_AGORA.md)** - Guia passo a passo completo  
📖 **[MIGRATION_FILIAIS.md](MIGRATION_FILIAIS.md)** - Detalhes da migração  
📖 **[COMO_EXECUTAR.md](COMO_EXECUTAR.md)** - Instruções de execução  

## 📡 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login (retorna JWT)
- `POST /api/auth/registrar-publico` - Cadastro público

### Filiais (Admin)
- `GET /api/filiais` - Listar filiais da empresa
- `POST /api/filiais` - Criar filial
- `PUT /api/filiais/:id` - Atualizar filial
- `DELETE /api/filiais/:id` - Deletar filial

### Usuários (Admin/Gerente)
- `GET /api/usuarios` - Listar usuários
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Deletar usuário

### Transferências
- `GET /api/transferencias` - Listar todas
- `GET /api/transferencias/:id` - Buscar por ID
- `POST /api/transferencias` - Criar nova
- `PUT /api/transferencias/:id/status` - Atualizar status
- `PUT /api/transferencias/:id/itens` - Atualizar quantidades
- `PUT /api/transferencias/:id/finalizar` - Finalizar transferência

### Tags
- `GET /api/tags` - Listar tags da empresa

### Health Check
- `GET /api/health` - Verificar se a API está online

## 📁 Estrutura do Projeto

```
StokLink/
├── frontend/
│   ├── index.html              # Sistema principal
│   ├── admin.html              # Painel administrativo
│   ├── login.html              # Tela de login
│   ├── registro.html           # Cadastro público
│   ├── landing.html            # Página inicial
│   ├── app.js                  # Lógica do sistema
│   ├── admin.js                # Lógica do admin
│   └── styles.css              # Estilos globais
│
├── backend/
│   ├── server.js               # API Express
│   ├── db.js                   # Conexão MySQL
│   ├── .env                    # Configurações
│   ├── package.json            # Dependências
│   ├── migration-filiais.sql   # Migração de filiais
│   ├── setup-completo.sql      # Setup inicial
│   ├── delete-exemplo-filiais.sql
│   └── verificar-banco.sql     # Verificação
│
├── EXECUTAR_AGORA.md           # 📖 GUIA PRINCIPAL
├── MIGRATION_FILIAIS.md        # Docs da migração
├── COMO_EXECUTAR.md            # Instruções detalhadas
├── INICIAR_SISTEMA.bat         # Atalho Windows
└── README.md                   # Este arquivo
```

## 🔄 Fluxo de Trabalho

1. **Criar** nova transferência com itens e tags
2. **Iniciar separação** (status: Pendente → Em Separação)
3. **Ajustar quantidades** atendidas
4. **Finalizar separação** (status: Em Separação → Aguardando Lançamento)
5. **Registrar número** da transferência no sistema principal
6. **Concluir** (status: Aguardando Lançamento → Concluído)

## 📊 Status Disponíveis

- `pendente` - Aguardando início da separação
- `em_separacao` - Em processo de separação
- `aguardando_lancamento` - Separação concluída, aguardando lançamento
- `concluido` - Transferência finalizada

## 🔒 Segurança

- Arquivo `.env` com credenciais está no `.gitignore`
- Conexão MySQL com pool de conexões
- Transações para garantir integridade dos dados

## 👤 Autor

Sistema desenvolvido para gestão logística de transferências entre filiais.
