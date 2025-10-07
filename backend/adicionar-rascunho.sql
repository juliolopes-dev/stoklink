-- Atualizar ENUM de status para incluir 'rascunho'
ALTER TABLE transferencias 
MODIFY COLUMN status ENUM('rascunho', 'pendente', 'em_separacao', 'aguardando_lancamento', 'concluido') 
DEFAULT 'rascunho';
