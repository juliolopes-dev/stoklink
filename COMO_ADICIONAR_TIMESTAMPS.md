# 📅 Como Adicionar Timestamps e Status "Recebido"

## 🎯 O que será adicionado:

1. **Novo status:** "Recebido" - quando mercadoria chega no destino
2. **Timestamps:**
   - Data/hora início da separação
   - Data/hora fim da separação  
   - Data/hora do recebimento

---

## 🔧 Passo 1: Executar Migração no Banco

### **No Easypanel (Produção):**

1. Acesse o banco de dados no Easypanel
2. Execute o arquivo: `backend/migration-timestamps.sql`

### **Local (phpMyAdmin):**

1. Abra phpMyAdmin
2. Selecione o banco `stoklink`
3. Vá em "SQL"
4. Copie e cole o conteúdo de `backend/migration-timestamps.sql`
5. Clique em "Executar"

---

## ✅ Como Testar:

Após executar a migração, execute:

```sql
DESCRIBE transferencias;
```

Deve aparecer os novos campos:
- `data_inicio_separacao`
- `data_fim_separacao`
- `data_recebimento`

E o status deve aceitar valor `recebido`.

---

## 📝 Observação:

Após executar a migração, o backend e frontend já vão funcionar automaticamente!
