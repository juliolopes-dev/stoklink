const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware para verificar token JWT
function verificarToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded; // Adiciona dados do usuário à requisição
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

// Middleware para verificar role (nível de acesso)
function verificarRole(...rolesPermitidas) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        if (!rolesPermitidas.includes(req.usuario.role)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        next();
    };
}

module.exports = { verificarToken, verificarRole };
