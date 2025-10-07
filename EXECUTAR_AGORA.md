# ⚡ EXECUTAR AGORA - Passo a Passo

Execute estes comandos na ordem para deixar tudo funcionando:

---

## 1️⃣ EXECUTAR MIGRAÇÃO DO BANCO DE DADOS

### **Opção A: MySQL Workbench (Recomendado)**

1. Abra **MySQL Workbench**
2. Conecte ao servidor:
   - Host: `147.93.144.135`
   - Port: `3306`
   - Username: `mysql`
   - Password: `b5f6a806b69e4908b734`
3. Abra o arquivo: `backend/migration-filiais.sql`
4. Clique em **Execute** (⚡ raio)
5. Depois abra: `backend/setup-completo.sql`
6. Clique em **Execute** novamente

### **Opção B: Linha de Comando (se MySQL estiver instalado)**

```bash
# Na pasta do projeto
cd "C:\Users\julio\Desktop\Sistemas em Produção\StokLink\backend"

# Executar migração
mysql -h 147.93.144.135 -P 3306 -u mysql -p stoklink < migration-filiais.sql
# Senha: b5f6a806b69e4908b734

# Executar setup
mysql -h 147.93.144.135 -P 3306 -u mysql -p stoklink < setup-completo.sql
```

### **Opção C: Copiar e Colar SQL**

Copie e execute manualmente no MySQL:

```sql
USE stoklink;

-- Deletar dados de exemplo
DELETE FROM filiais 
WHERE nome IN ('Matriz', 'Filial Rio de Janeiro', 'Filial Minas Gerais', 'SP-Matriz', 'RJ-Filial', 'MG-Filial');

-- Ativar seu usuário como admin
UPDATE usuarios 
SET ativo = TRUE, role = 'admin' 
WHERE email = 'juliofranlopes10@gmail.com';

-- Ativar sua empresa
UPDATE empresas 
SET ativo = TRUE 
WHERE id = (SELECT empresa_id FROM usuarios WHERE email = 'juliofranlopes10@gmail.com');
```

---

## 2️⃣ INICIAR O BACKEND

Abra um terminal e execute:

```bash
cd "C:\Users\julio\Desktop\Sistemas em Produção\StokLink\backend"
npm start
```

Deve aparecer:
```
🚀 Servidor rodando na porta 3001
✅ Conectado ao MySQL com sucesso!
```

---

## 3️⃣ ABRIR O FRONTEND

### **Opção A: Live Server (VS Code)**

1. Clique com botão direito em `frontend/login.html`
2. Selecione **"Open with Live Server"**
3. Abre automaticamente no navegador

### **Opção B: Duplo Clique**

1. Vá em `frontend/login.html`
2. Clique duas vezes para abrir no navegador

### **Opção C: Servidor HTTP (PowerShell)**

```bash
cd "C:\Users\julio\Desktop\Sistemas em Produção\StokLink\frontend"
npx http-server -p 8080
```

Depois abra: `http://localhost:8080/login.html`

---

## 4️⃣ FAZER LOGIN

- **Email**: juliofranlopes10@gmail.com
- **Senha**: (sua senha cadastrada)

---

## 5️⃣ CADASTRAR FILIAIS

1. Após login, clique em **"Administração"** (deve aparecer na sidebar)
2. Clique em **"Nova Filial"**
3. Cadastre suas filiais:
   - Nome: "Filial São Paulo"
   - Código: "SP01"
   - Cidade: "São Paulo"
   - Estado: "SP"

---

## 6️⃣ CADASTRAR USUÁRIOS

1. Na página Admin, clique em **"Usuários"**
2. Clique em **"Novo Usuário"**
3. Preencha os dados e selecione a filial

---

## ✅ VERIFICAR SE FUNCIONOU

### **Teste 1: Backend Rodando**
Abra no navegador: `http://localhost:3001/api/health`

Deve mostrar:
```json
{"status":"OK","message":"API StokLink funcionando!"}
```

### **Teste 2: Login Funciona**
Faça login no sistema

### **Teste 3: Botão Admin Aparece**
Se for admin, deve ver botão "Administração" na sidebar

### **Teste 4: Cadastrar Filial**
Vá em Administração → Nova Filial

### **Teste 5: Selects de Filiais**
Vá em "Nova Transferência", os selects devem mostrar as filiais cadastradas

---

## 🐛 PROBLEMAS COMUNS

### **"Erro de conexão com servidor"**
→ Backend não está rodando. Execute `npm start` na pasta backend

### **"Token inválido ou expirado"**
→ Faça logout e login novamente

### **"Não vejo botão Administração"**
→ Usuário não é admin. Execute SQL do passo 1 novamente

### **"Selects de filiais vazios"**
→ Cadastre filiais em Administração primeiro

### **"Erro 500 ao criar filial"**
→ Migração não foi executada. Execute SQL do passo 1

---

## 📝 RESUMO DO QUE FOI FEITO

✅ Script SQL para criar tabela `filiais`
✅ Script SQL para deletar dados de exemplo
✅ Script SQL para ativar seu usuário como admin
✅ Interface de administração completa
✅ Endpoints da API para filiais e usuários
✅ Selects dinâmicos carregando da API

---

## 🎯 PRÓXIMO PASSO

Depois que tudo estiver funcionando:

1. Faça login
2. Vá em "Administração"
3. Cadastre suas filiais
4. Cadastre usuários (estoquistas) em cada filial
5. Volte ao sistema e crie transferências

**Pronto! Sistema completo e funcionando!** 🚀
