module.exports = {
  requireAuth: function (req, res, next) {
    if (req.session && req.session.userId) {
      return next();
    }
    res.redirect("/users/login");
  },

  requireRole: function (acceptedRoles) {
    return function (req, res, next) {
      if (req.session && acceptedRoles.includes(req.session.role)) {
        return next();
      }

      res.status(403).send("Acesso Negado: Não tem permissões para aceder a esta página!");
    };
  },
};
