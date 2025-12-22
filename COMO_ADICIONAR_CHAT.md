# 💬 Como Ativar o Chat entre Filiais

## 🎯 O que foi implementado:

- ✅ Chat em tempo quase real (polling a cada 3 segundos)
- ✅ Botão flutuante no canto inferior direito
- ✅ Badge de notificação de novas mensagens
- ✅ Interface moderna com bolhas de chat
- ✅ Isolado por empresa (cada empresa só vê suas mensagens)
- ✅ Histórico das últimas 50 mensagens
- ✅ Responsivo (funciona bem no celular)

---

## 🔧 Passo 1: Executar Migração no Banco

### **No Easypanel (Produção):**

1. Acesse o banco de dados no Easypanel
2. Execute o arquivo: `backend/migration-chat.sql`

### **Local (phpMyAdmin):**

1. Abra phpMyAdmin
2. Selecione o banco `stoklink`
3. Vá em "SQL"
4. Copie e cole o conteúdo de `backend/migration-chat.sql`
5. Clique em "Executar"

---

## ✅ Como Testar:

Após executar a migração, execute:

```sql
DESCRIBE mensagens;
```

Deve aparecer a tabela com os campos:
-  id`
- `empresa_id`
- `usuario_id`
- `mensagem`
- `created_at`

---

## 📱 Como Usar:

1. **Abrir Chat:** Clique no botão azul flutuante (canto inferior direito)
2. **Enviar Mensagem:** Digite e pressione Enter ou clique no botão de enviar
3. **Receber Mensagens:** A cada 3 segundos o chat busca mensagens novas
4. **Notificações:** Badge vermelho aparece quando tem mensagens novas (chat fechado)
5. **Fechar Chat:** Clique no X no topo do chat

---

## 🔄 Como Funciona (Técnico):

### **Polling:**
- Chat aberto: busca novas mensagens a cada **3 segundos**
- Chat fechado: busca novas mensagens a cada **10 segundos** (para atualizar badge)

### **Segurança:**
- Apenas usuários autenticados podem acessar
- Mensagens isoladas por empresa
- Limite de 1000 caracteres por mensagem

### **Performance:**
- Busca apenas mensagens novas (usando `ultimoId`)
- Histórico limitado a 50 mensagens (otimização)
- Índice no banco para buscas rápidas

---

## 🚀 Próximas Evoluções Possíveis:

Se quiser melhorar no futuro:

1. **WebSocket (Socket.io):** Mensagens instantâneas
2. **Filtros:** Chat por filial específica
3. **Anexos:** Enviar imagens/documentos
4. **Reações:** Curtir mensagens
5. **Menções:** @usuário para marcar alguém
6. **Histórico:** Ver mensagens mais antigas

---

## 📝 Observação:

O chat está funcionando! Depois de executar a migração e fazer o deploy, o botão flutuante vai aparecer automaticamente para todos os usuários logados.
