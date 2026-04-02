// middlewares/auth.js
module.exports = {
  checkAuth: function (req, res, next) {
    if (req.session && req.session.userId) {
      return next();
    }
    res.redirect('/users/login');
  },
  
  // Verifica se é gestor de supermercado ou administrador
  isSupermarket: function (req, res, next) {
    if (req.session && (req.session.role === 'supermercado' || req.session.role === 'admin')) {
      return next();
    }
    // Se for cliente ou estafeta, bloqueia!
    res.status(403).send("Acesso Negado: Apenas gestores e administradores podem fazer isto.");
  }
};