document.addEventListener("DOMContentLoaded", () => {
  // --- LÓGICA DE FILTRO DE PRODUTOS ---
  const categorySelect = document.getElementById("categorySelect");
  const searchInput = document.getElementById("productSearch");
  const btnApplyFilter = document.getElementById("btnApplyFilter");
  const clearSearchBtn = document.getElementById("clearProductSearch");
  const productRows = document.querySelectorAll("tr[data-product-row]");
  const visibleCounter = document.getElementById("visibleProductsCounter");
  const noProductsAlert = document.getElementById("noProductsMatch");

  function filterProducts() {
    const activeCategory = categorySelect ? categorySelect.value : "all";
    const searchTerm = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";
    let visibleCount = 0;

    productRows.forEach((row) => {
      const rowCategory = row.getAttribute("data-category");
      const rowSearchStr = row.getAttribute("data-search");

      const matchesCategory =
        activeCategory === "all" || rowCategory === activeCategory;
      const matchesSearch =
        searchTerm === "" || rowSearchStr.includes(searchTerm);

      if (matchesCategory && matchesSearch) {
        row.style.display = "";
        visibleCount++;
      } else {
        row.style.display = "none";
      }
    });

    if (visibleCounter) visibleCounter.textContent = visibleCount + " visíveis";
    if (visibleCount === 0) {
      if (noProductsAlert) noProductsAlert.classList.remove("d-none");
    } else {
      if (noProductsAlert) noProductsAlert.classList.add("d-none");
    }
  }


  if (btnApplyFilter) {
    btnApplyFilter.addEventListener("click", filterProducts);
  }

  // Botão Limpar
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "all";
      filterProducts();
    });
  }

  // --- LÓGICA DO MODAL (CLIENTE NOVO VS EXISTENTE) ---
  const radioNovo = document.getElementById("btnNew");
  const radioExistente = document.getElementById("btnExisting");
  const zoneNovo = document.getElementById("newCustomerZone");
  const zoneExistente = document.getElementById("existingCustomerZone");

  function toggleCustomerZones() {
    const isNew = radioNovo.checked;
    zoneNovo.classList.toggle("d-none", !isNew);
    zoneExistente.classList.toggle("d-none", isNew);
    document.getElementById("inputName").required = isNew;
    document.getElementById("inputEmail").required = isNew;
    document.getElementById("inputAddress").required = isNew;
    document.getElementById("inputPhone").required = isNew;
    document.getElementById("selectExistingCustomer").required = !isNew;
  }

  if (radioNovo && radioExistente) {
    radioNovo.addEventListener("change", toggleCustomerZones);
    radioExistente.addEventListener("change", toggleCustomerZones);
    toggleCustomerZones();
  }

  // --- LÓGICA DO TOTAL EM TEMPO REAL ---
  function calculateTotal() {
    let total = 0;
    const rows = document.querySelectorAll("tr[data-product-row]");

    rows.forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const qtyInput = row.querySelector('input[type="number"]');
      const priceAttr = row.getAttribute("data-price");

      if (checkbox && checkbox.checked && qtyInput && priceAttr) {
        const price = parseFloat(priceAttr);
        const qty = parseInt(qtyInput.value);

        if (!isNaN(price) && !isNaN(qty) && qty > 0) {
          total += price * qty;
        }
      }
    });

    const liveTotalEl = document.getElementById("liveTotal");
    if (liveTotalEl) {
      liveTotalEl.textContent = "€ " + total.toFixed(2);
    }
  }

  document.querySelectorAll("tr[data-product-row] input").forEach((input) => {
    input.addEventListener("change", calculateTotal);
    input.addEventListener("click", calculateTotal);
    input.addEventListener("keyup", calculateTotal);
  });

  // --- LÓGICA DO LEITOR DE CÓDIGO DE BARRAS ---
  const barcodeInput = document.getElementById("barcodeInput");
  if (barcodeInput) {
    barcodeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = barcodeInput.value.trim();
        if (!code) return;

        const row = document.querySelector(`tr[data-product-id="${code}"]`);

        if (row) {
          const checkbox = row.querySelector('input[type="checkbox"]');
          const qtyInput = row.querySelector('input[type="number"]');

          if (!checkbox.disabled) {
            checkbox.checked = true;
            qtyInput.value = parseInt(qtyInput.value) + 1;
            calculateTotal();

            const originalColor = row.style.backgroundColor;
            row.style.backgroundColor = "#d1e7dd";
            setTimeout(() => (row.style.backgroundColor = originalColor), 400);
          } else {
            alert("Produto sem stock!");
          }
        } else {
          alert("Código de barras (ID) não encontrado!");
        }
        barcodeInput.value = "";
      }
    });
  }

  calculateTotal();
});
