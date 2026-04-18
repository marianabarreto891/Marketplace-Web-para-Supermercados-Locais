const Supermarket = require("../models/Supermarket");

exports.listSupermarkets = async (req, res) => {
  try {
    let query = {};
    if (req.session.role === "cliente") query = { isApproved: true };
    else if (req.session.role === "supermercado")
      query = { manager: req.session.userId };

    const supermarkets = await Supermarket.find(query).populate(
      "manager",
      "name email",
    );
    res.render("supermarkets/list", {
      supermarkets,
      userRole: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    res.status(500).send("Erro ao listar supermercados!");
  }
};

exports.renderCreateForm = async (req, res) => {
  res.render("supermarkets/create");
};

exports.createSupermarket = async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      lat,
      lon,
      hours,
      deliveryMethods,
      deliveryCost,
    } = req.body;
    const methods = Array.isArray(deliveryMethods)
      ? deliveryMethods
      : [deliveryMethods];

    const newSupermarket = new Supermarket({
      name,
      description,
      location,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      hours,
      deliveryMethods: methods,
      deliveryCost,
      manager: req.session.userId,
      isApproved: false,
    });
    await newSupermarket.save();
    res.redirect(`/supermarket/${newSupermarket._id}`);
  } catch (error) {
    res.status(500).send("Erro ao criar supermercado: " + error.message);
  }
};

exports.showSupermarket = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id).populate(
      "manager",
      "name email",
    );
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");
    res.render("supermarkets/show", {
      supermarket,
      userRole: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar o supermercado!");
  }
};

exports.renderEditForm = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id);
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");
    if (
      req.session.role !== "admin" &&
      supermarket.manager.toString() !== req.session.userId
    ) {
      return res
        .status(403)
        .send("Acesso Negado: Só pode editar o seu próprio supermercado!");
    }
    res.render("supermarkets/edit", { supermarket });
  } catch (error) {
    res.status(500).send("Erro ao carregar formulário de edição!");
  }
};

exports.updateSupermarket = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id);
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");
    if (
      req.session.role !== "admin" &&
      supermarket.manager.toString() !== req.session.userId
    ) {
      return res.status(403).send("Acesso Negado!");
    }

    const {
      name,
      description,
      location,
      lat,
      lon,
      hours,
      deliveryMethods,
      deliveryCost,
    } = req.body;
    supermarket.name = name;
    supermarket.description = description;
    supermarket.location = location;
    supermarket.lat = lat;
    supermarket.lon = lon;
    supermarket.hours = hours;
    supermarket.deliveryMethods = Array.isArray(deliveryMethods)
      ? deliveryMethods
      : [deliveryMethods];
    supermarket.deliveryCost = deliveryCost;
    supermarket.toApprove = false;
    supermarket.isApproved = false;

    await supermarket.save();
    res.redirect(`/supermarket/${req.params.id}`);
  } catch (error) {
    res.status(500).send("Erro ao atualizar supermercado!");
  }
};
