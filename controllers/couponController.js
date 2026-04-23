const Coupon = require("../models/Coupon");
const Supermarket = require("../models/Supermarket");

const COUPON_TYPE_LABELS = {
  percent: "Percentagem",
  fixed: "Valor fixo",
  free_shipping: "Portes gratis",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCouponCode(value) {
  return normalizeText(value).toUpperCase();
}

function parseNumber(value, defaultValue = 0) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFormData(body = {}) {
  return {
    code: normalizeCouponCode(body.code),
    description: normalizeText(body.description),
    type: normalizeText(body.type || "percent"),
    value: body.value || "",
    minOrderValue: body.minOrderValue || "0",
    maxDiscount: body.maxDiscount || "",
    usageLimit: body.usageLimit || "",
    validFrom: body.validFrom || "",
    validUntil: body.validUntil || "",
    supermarketId: normalizeText(body.supermarketId),
    isActive: body.isActive !== undefined ? body.isActive === "on" : true,
  };
}

exports.listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate("supermarket", "name")
      .sort({ createdAt: -1 });
    const supermarkets = await Supermarket.find({ isApproved: true }).sort({
      name: 1,
    });

    return res.render("admin/coupons", {
      coupons,
      supermarkets,
      couponTypeLabels: COUPON_TYPE_LABELS,
      errorMessage: req.query.error || null,
      successMessage: req.query.success || null,
      formData: buildFormData(),
    });
  } catch (error) {
    console.error("Erro ao carregar cupoes:", error);
    return res.status(500).send("Erro ao carregar cupoes.");
  }
};

exports.createCoupon = async (req, res) => {
  const formData = buildFormData(req.body);

  try {
    if (!formData.code) {
      throw new Error("Indique um código de cupão.");
    }

    if (!["percent", "fixed", "free_shipping"].includes(formData.type)) {
      throw new Error("Selecione um tipo de cupão válido.");
    }

    const value = parseNumber(formData.value);

    if (value < 0) {
      throw new Error("O valor do cupão não pode ser negativo.");
    }

    if (formData.type !== "free_shipping" && value <= 0) {
      throw new Error("O valor do cupão tem de ser superior a zero!");
    }

    const validFrom = formData.validFrom ? new Date(formData.validFrom) : null;
    const validUntil = formData.validUntil
      ? new Date(formData.validUntil)
      : null;

    if (validFrom && !Number.isFinite(validFrom.getTime())) {
      throw new Error("A data inicial do cupão não é válida!");
    }

    if (validUntil && !Number.isFinite(validUntil.getTime())) {
      throw new Error("A data final do cupão não é válida!");
    }

    if (
      validFrom &&
      validUntil &&
      Number.isFinite(validFrom.getTime()) &&
      Number.isFinite(validUntil.getTime()) &&
      validUntil < validFrom
    ) {
      throw new Error("A data final não pode ser anterior a data inicial!");
    }

    const existingCoupon = await Coupon.findOne({ code: formData.code });

    if (existingCoupon) {
      throw new Error("Ja existe um cupão com esse código!");
    }

    await Coupon.create({
      code: formData.code,
      description: formData.description,
      type: formData.type,
      value,
      minOrderValue: parseNumber(formData.minOrderValue, 0),
      maxDiscount: parseNullableNumber(formData.maxDiscount),
      usageLimit: parseNullableNumber(formData.usageLimit),
      validFrom,
      validUntil,
      supermarket: formData.supermarketId || null,
      isActive: formData.isActive,
    });

    return res.redirect("/admin/coupons?success=Cupão criado com sucesso.");
  } catch (error) {
    try {
      const coupons = await Coupon.find()
        .populate("supermarket", "name")
        .sort({ createdAt: -1 });
      const supermarkets = await Supermarket.find({ isApproved: true }).sort({
        name: 1,
      });

      return res.status(400).render("admin/coupons", {
        coupons,
        supermarkets,
        couponTypeLabels: COUPON_TYPE_LABELS,
        errorMessage: error.message || "Erro ao criar cupão.",
        successMessage: null,
        formData,
      });
    } catch (renderError) {
      console.error("Erro ao criar cupão:", error);
      console.error("Erro adicional ao renderizar a pagina de cupões:", renderError);
      return res.status(500).send("Erro ao criar cupão!");
    }
  }
};

exports.toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).send("Cupão não encontrado!");
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.redirect("/admin/coupons?success=Estado do cupão atualizado.");
  } catch (error) {
    console.error("Erro ao atualizar cupão:", error);
    return res.status(500).send("Erro ao atualizar cupão!");
  }
};
