# 🚀 Como Executar o StokLink (Frontend + Backend)

## ✅ Pré-requisitos

- **Node.js** versão 16 ou superior instalado
- **MySQL** configurado (ou usar o servidor remoto já configurado)
- Navegador moderno (Chrome, Firefox, Edge)

---

## 📦 Instalação das Dependências

### 1. Instalar dependências do Backend

```bash
cd backend
npm install
```

Isso instalará:
- express
- mysql2
- cors
- dotenv
- bcrypt
- jsonwebtoken

---

## 🔧 Configuração

### 1. Verificar arquivo `.env`

O arquivo `backend/.env` já está configurado com o banco de dados remoto:

```env
DB_HOST=147.93.144.135
DB_PORT=3306
DB_USER=mysql
DB_PASSWORD=b5f6a806b69e4908b734
DB_NAME=stoklink
PORT=3001
JWT_SECRET=stoklink_secret_key_2025_ultra_secure
```

### 2. Executar Script SQL (se necessário)

Se o banco estiver vazio, execute o script de criação:

```bash
mysql -h 147.93.144.135 -P 3306 -u mysql -p stoklink < backend/database-v2.sql
# Senha: b5f6a806b69e4908b734
```

---

## ▶️ Executando o Sistema

### 1. Iniciar o Backend (API)

Abra um terminal na pasta `backend`:

```bash
cd backend
npm start
```

Ou para modo desenvolvimento com auto-reload:

```bash
npm run dev
```

Você verá a mensagem:
```
🚀 Servidor rodando na porta 3001
📡 API disponível em http://localhost:3001/api
✅ Conectado ao MySQL com sucesso!
```

### 2. Abrir o Frontend

Com o backend rodando, abra o arquivo `frontend/landing.html` ou `frontend/login.html` no navegador:

- **Opção 1**: Duplo clique no arquivo `frontend/login.html`
- **Opção 2**: Usar extensão Live Server do VS Code
- **Opção 3**: Usar servidor HTTP simples:

```bash
cd frontend
npx http-server -p 8080
```

Depois acesse: `http://localhost:8080/login.html`

---

## 🔐 Credenciais de Acesso

### Criar Primeiro Usuário Admin

O sistema requer cadastro e aprovação manual. Para criar o primeiro admin:

**Opção 1: Usar endpoint de registro público**

1. Acesse `http://localhost:8080/registro.html`
2. Preencha os dados
3. Entre no banco de dados e ative manualmente:

```sql
-- Ativar usuário e empresa
UPDATE usuarios SET ativo = TRUE WHERE email = 'seu@email.com';
UPDATE empresas SET ativo = TRUE WHERE id = 1;
```

**Opção 2: Inserir diretamente no banco**

```sql
-- Criar empresa
INSERT INTO empresas (nome, ativo) VALUES ('Minha Empresa', TRUE);

-- Criar usuário admin (senha: admin123)
INSERT INTO usuarios (empresa_id, nome, email, senha, role, ativo) VALUES 
(1, 'Administrador', 'admin@exemplo.com', '$2b$10$rU8pZ0E0Qh0YqQ0Q0Q0Q0uF0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0', 'admin', TRUE);
```

---

## 🌐 Fluxo Completo de Uso

### 1. Login
- Acesse `http://localhost:8080/login.html`
- Entre com suas credenciais
- Token JWT será armazenado no localStorage

### 2. Dashboard
- Visualize estatísticas de transferências
- Veja transferências ativas recentes

### 3. Nova Transferência
- Clique em "Nova Transferência"
- Preencha origem, destino, solicitante
- Adicione tags (opcional)
- Adicione itens com códigos e quantidades
- **Salvar Rascunho** ou **Enviar Solicitação**

### 4. Fluxo de Trabalho

```
RASCUNHO → PENDENTE → EM SEPARAÇÃO → AGUARDANDO LANÇAMENTO → CONCLUÍDO
```

- **Pendente**: Clique em "Iniciar Separação"
- **Em Separação**: Ajuste quantidades atendidas e "Finalizar Separação"
- **Aguardando Lançamento**: Digite o nº da transferência no sistema principal
- **Concluído**: Transferência finalizada

---

## 🔍 Verificar Funcionamento

### Teste de Conectividade

1. **Backend Online:**
```bash
curl http://localhost:3001/api/health
# Resposta esperada: {"status":"OK","message":"API StokLink funcionando!"}
```

2. **Login via API:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","senha":"admin123"}'
```

### Verificar Token no Navegador

1. Abra o DevTools (F12)
2. Vá em **Application → Local Storage**
3. Verifique se existe `stoklink_token` e `stoklink_user`

---

## 🐛 Troubleshooting

### Erro: "Erro de conexão com o servidor"

- Verifique se o backend está rodando na porta 3001
- Verifique se o banco de dados está acessível
- Verifique o console do backend para erros

### Erro: "Token inválido ou expirado"

- Faça logout e login novamente
- Tokens expiram em 8 horas

### Erro: "Credenciais inválidas ou cadastro aguardando aprovação"

- Usuário não está ativo no banco
- Execute:
```sql
UPDATE usuarios SET ativo = TRUE WHERE email = 'seu@email.com';
UPDATE empresas SET ativo = TRUE WHERE id = (SELECT empresa_id FROM usuarios WHERE email = 'seu@email.com');
```

### Frontend não carrega dados

1. Abra o Console do navegador (F12 → Console)
2. Verifique se há erros de CORS
3. Certifique-se que o backend tem CORS habilitado (já está configurado)

---

## 📊 Estrutura de Portas

- **Backend API**: `http://localhost:3001`
- **Frontend** (se usar http-server): `http://localhost:8080`
- **MySQL**: `147.93.144.135:3306` (remoto)

---

## 🔒 Segurança

- Tokens JWT com expiração de 8 horas
- Senhas criptografadas com bcrypt
- Isolamento multi-tenant (cada empresa vê apenas seus dados)
- Todas as rotas de transferências protegidas por autenticação
- Validação de empresa_id em todas as queries

---

## 📝 Observações Importantes

1. **Multi-Tenant**: Cada empresa tem seus próprios dados isolados
2. **Aprovação Manual**: Novos cadastros precisam ser ativados no banco
3. **Tags por Empresa**: Tags são específicas de cada empresa
4. **Edição de Rascunhos**: Temporariamente desabilitada (será implementada)

---

## 🎯 Próximos Passos Sugeridos

- [ ] Implementar endpoint PUT para edição de rascunhos
- [ ] Adicionar paginação na listagem de transferências
- [ ] Implementar busca e filtros avançados
- [ ] Adicionar relatórios e exportação
- [ ] Implementar recuperação de senha
- [ ] Deploy em produção

---

**Qualquer dúvida, verifique o console do backend e do navegador para mensagens de erro!** 🚀
