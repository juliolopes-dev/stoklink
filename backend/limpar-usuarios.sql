-- Limpar todos os usuários
DELETE FROM usuarios;

-- Resetar auto_increment
ALTER TABLE usuarios AUTO_INCREMENT = 1;
