# 📋 Como Ativar Usuários Manualmente

## 🎯 Visão Geral
Quando um cliente se cadastra no sistema, ele fica com status **`ativo = FALSE`** (inativo).
Você precisa entrar no banco de dados e ativar manualmente.

---

## 📝 Passo a Passo

### 1️⃣ **Ver Usuários Pendentes de Aprovação**

```sql
SELECT 
    u.id,
    u.nome,
    u.email,
    u.ativo as usuario_ativo,
    e.nome as empresa,
    e.ativo as empresa_ativa,
    u.data_criacao
FROM usuarios u
INNER JOIN empresas e ON u.empresa_id = e.id
WHERE u.ativo = FALSE OR e.ativo = FALSE
ORDER BY u.data_criacao DESC;
```

### 2️⃣ **Ativar Usuário e Empresa**

**Opção A: Ativar usuário específico por ID**
```sql
-- Ativar usuário
UPDATE usuarios SET ativo = TRUE WHERE id = 1;

-- Ativar empresa do usuário
UPDATE empresas e
INNER JOIN usuarios u ON e.id = u.empresa_id
SET e.ativo = TRUE
WHERE u.id = 1;
```

**Opção B: Ativar usuário por email**
```sql
-- Ativar usuário
UPDATE usuarios SET ativo = TRUE WHERE email = 'cliente@exemplo.com';

-- Ativar empresa do usuário
UPDATE empresas e
INNER JOIN usuarios u ON e.id = u.empresa_id
SET e.ativo = TRUE
WHERE u.email = 'cliente@exemplo.com';
```

**Opção C: Ativar empresa inteira (todos usuários)**
```sql
-- Ativar empresa
UPDATE empresas SET ativo = TRUE WHERE id = 1;

-- Ativar todos usuários da empresa
UPDATE usuarios SET ativo = TRUE WHERE empresa_id = 1;
```

### 3️⃣ **Desativar Usuário (se necessário)**

```sql
-- Desativar usuário específico
UPDATE usuarios SET ativo = FALSE WHERE id = 1;

-- Desativar empresa inteira
UPDATE empresas SET ativo = FALSE WHERE id = 1;
```

---

## 🔗 Credenciais do Banco

**Host:** 147.93.144.135  
**Porta:** 3306  
**Usuário:** mysql  
**Senha:** b5f6a806b69e4908b734  
**Banco:** stoklink  

---

## ⚠️ Importante

- **Usuário só consegue fazer login se:**
  - `usuarios.ativo = TRUE`
  - `empresas.ativo = TRUE`

- **Ao cadastrar, o sistema cria:**
  - Usuário com `ativo = FALSE`
  - Empresa com `ativo = FALSE` (se não existir)

- **Boas práticas:**
  - Sempre ative a empresa E o usuário
  - Verifique os dados antes de ativar
  - Mantenha registro de quem foi ativado

---

## 🛠️ Ferramentas Recomendadas

1. **MySQL Workbench** - Interface gráfica
2. **DBeaver** - Multiplataforma
3. **phpMyAdmin** - Web-based
4. **Linha de comando** - Terminal

```bash
mysql -h 147.93.144.135 -P 3306 -u mysql -p stoklink
# Digite a senha: b5f6a806b69e4908b734
```

---

## 📊 Consultas Úteis

**Ver todos usuários:**
```sql
SELECT u.id, u.nome, u.email, u.ativo, e.nome as empresa, e.ativo as empresa_ativa
FROM usuarios u
INNER JOIN empresas e ON u.empresa_id = e.id
ORDER BY u.data_criacao DESC;
```

**Contar usuários pendentes:**
```sql
SELECT COUNT(*) as pendentes FROM usuarios WHERE ativo = FALSE;
```

**Ver últimos cadastros:**
```sql
SELECT nome, email, data_criacao 
FROM usuarios 
ORDER BY data_criacao DESC 
LIMIT 10;
```
