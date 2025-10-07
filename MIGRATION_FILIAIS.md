# 🏢 Migração: Sistema de Filiais e Usuários

## 📋 O Que Foi Implementado

Este sistema adiciona uma hierarquia de **Empresa → Filiais → Usuários**, permitindo que:

1. ✅ **Admin da empresa** cadastra filiais
2. ✅ **Admin da empresa** cadastra usuários em cada filial
3. ✅ **Usuários** são vinculados a filiais específicas
4. ✅ **Controle de acesso** por filial
5. ✅ Interface completa de gerenciamento

---

## 🔧 Como Aplicar a Migração

### **1. Executar Script SQL**

**IMPORTANTE**: Faça backup do banco antes de executar!

```bash
mysql -h 147.93.144.135 -P 3306 -u mysql -p stoklink < backend/migration-filiais.sql
# Senha: b5f6a806b69e4908b734
```

Ou execute manualmente:

1. Abra o arquivo `backend/migration-filiais.sql`
2. Copie todo o conteúdo
3. Execute no seu cliente MySQL (MySQL Workbench, DBeaver, etc.)

### **2. Reiniciar o Backend**

```bash
cd backend
# Parar o servidor (Ctrl+C)
npm start
```

### **3. Ativar Seu Usuário Admin**

Se você já criou um cadastro, precisa:

```sql
-- 1. Encontrar seu usuário
SELECT u.id, u.nome, u.email, u.empresa_id, e.nome as empresa
FROM usuarios u
INNER JOIN empresas e ON u.empresa_id = e.id
WHERE u.email = 'seu@email.com';

-- 2. Ativar usuário e empresa
UPDATE usuarios SET ativo = TRUE, role = 'admin' WHERE email = 'seu@email.com';
UPDATE empresas SET ativo = TRUE WHERE id = (SELECT empresa_id FROM usuarios WHERE email = 'seu@email.com');
```

---

## 🎯 Fluxo de Uso

### **1. Login como Admin**

- Faça login com suas credenciais
- Você verá o botão **"Administração"** na sidebar

### **2. Cadastrar Filiais**

1. Clique em **"Administração"**
2. Clique em **"Nova Filial"**
3. Preencha:
   - Nome (ex: "Filial São Paulo")
   - Código (ex: "SP01")
   - Cidade/Estado
   - Endereço (opcional)
   - Telefone (opcional)
4. Clique em **"Salvar"**

### **3. Cadastrar Usuários nas Filiais**

1. Na página Admin, clique em **"Usuários"**
2. Clique em **"Novo Usuário"**
3. Preencha:
   - Nome completo
   - E-mail
   - Senha
   - **Selecione a Filial**
   - Nível de acesso:
     - **Operador**: Usuário padrão
     - **Gerente**: Permissões de gerente
     - **Administrador**: Acesso total
4. Clique em **"Salvar"**

### **4. Gerenciar Filiais e Usuários**

- **Editar**: Clique no ícone de lápis
- **Deletar**: Clique no ícone de lixeira
- **Filtrar usuários por filial**: Use o select no topo

---

## 🗄️ Estrutura das Tabelas Criadas

### **Tabela: filiais**

```sql
id               INT (PK)
empresa_id       INT (FK) → empresas.id
nome             VARCHAR(100)
codigo           VARCHAR(20)
endereco         VARCHAR(255)
cidade           VARCHAR(100)
estado           VARCHAR(2)
telefone         VARCHAR(20)
ativo            BOOLEAN
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

### **Modificações na Tabela: usuarios**

```sql
-- Novo campo adicionado:
filial_id        INT (FK) → filiais.id
```

### **Modificações na Tabela: transferencias**

```sql
-- Novos campos adicionados:
filial_origem_id   INT (FK) → filiais.id
filial_destino_id  INT (FK) → filiais.id
```

---

## 🔌 Novos Endpoints da API

### **Filiais**

```
GET    /api/filiais              - Listar filiais da empresa
POST   /api/filiais              - Criar filial (admin)
PUT    /api/filiais/:id          - Atualizar filial (admin)
DELETE /api/filiais/:id          - Deletar filial (admin)
```

### **Usuários (Gerenciamento)**

```
GET    /api/usuarios             - Listar usuários (admin/gerente)
GET    /api/usuarios?filial_id=X - Filtrar por filial
POST   /api/usuarios             - Criar usuário (admin)
PUT    /api/usuarios/:id         - Atualizar usuário (admin)
DELETE /api/usuarios/:id         - Deletar usuário (admin)
```

---

## 📄 Novos Arquivos Criados

### **Frontend**
- ✅ `frontend/admin.html` - Interface de administração
- ✅ `frontend/admin.js` - Lógica de gerenciamento

### **Backend**
- ✅ `backend/migration-filiais.sql` - Script de migração

### **Modificados**
- ✅ `backend/server.js` - Endpoints de filiais e usuários
- ✅ `frontend/index.html` - Botão de administração
- ✅ `frontend/app.js` - Mostrar botão para admin

---

## ⚠️ Observações Importantes

### **1. Dados de Exemplo**

A migração cria automaticamente 3 filiais de exemplo para a empresa ID 1:
- Matriz (SP)
- Filial Rio de Janeiro (RJ)
- Filial Minas Gerais (MG)

Se não quiser essas filiais, delete-as na interface admin.

### **2. Permissões**

- **Operador**: Acesso básico ao sistema
- **Gerente**: Pode ver usuários
- **Admin**: Acesso total (gerenciar filiais e usuários)

### **3. Restrições de Exclusão**

- ❌ Não pode deletar filial com usuários vinculados
- ❌ Admin não pode deletar a própria conta
- ❌ Filiais inativas não aparecem no select de usuários

### **4. Compatibilidade**

- ✅ Transferências antigas continuam funcionando
- ✅ Campos `origem` e `destino` (texto) mantidos
- ✅ Novos campos `filial_origem_id` e `filial_destino_id` opcionais

---

## 🐛 Troubleshooting

### **Erro: "Column 'filial_id' doesn't exist"**

Você não executou o script de migração. Execute:

```bash
mysql -h 147.93.144.135 -P 3306 -u mysql -p stoklink < backend/migration-filiais.sql
```

### **Erro: "Duplicate column name 'filial_id'"**

Você já executou a migração. Está tudo OK!

### **Não vejo o botão "Administração"**

Seu usuário não é admin. Execute:

```sql
UPDATE usuarios SET role = 'admin' WHERE email = 'seu@email.com';
```

### **Erro ao criar usuário: "Filial inválida"**

Cadastre pelo menos uma filial antes de criar usuários.

---

## 🎯 Próximos Passos Sugeridos

- [ ] Atualizar formulário de transferências para usar filiais (dropdown)
- [ ] Filtrar transferências por filial do usuário
- [ ] Dashboard com estatísticas por filial
- [ ] Relatórios por filial

---

## ✅ Verificar se Funcionou

1. Faça login como admin
2. Deve aparecer botão "Administração" na sidebar
3. Clique e cadastre uma filial
4. Cadastre um usuário na filial
5. Faça logout e login com o novo usuário

**Tudo funcionando? Sistema completo!** 🎉

---

**Dúvidas? Verifique os logs do console do navegador (F12) e do backend!**
