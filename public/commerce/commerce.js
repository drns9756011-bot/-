const commercePage = document.body.dataset.commercePage || "products";

const categories = {
  subscription: ["TV", "냉장고", "세탁기·건조기", "정수기", "공기청정기", "주방가전"],
  products: ["TV", "냉장고", "세탁기·건조기", "김치냉장고", "청소기", "주방가전"],
};

// 관리자 상품 연동 전에는 빈 배열을 유지합니다. 허위 상품이나 가격을 노출하지 않습니다.
const commerceItems = [];

const categoryGrid = document.querySelector("#commerceCategories");
const productGrid = document.querySelector("#commerceProductGrid");
const searchInput = document.querySelector("#commerceSearch");
const brandFilter = document.querySelector("#commerceBrand");
let activeCategory = "전체";

function renderCategories() {
  if (!categoryGrid) return;
  const list = ["전체", ...(categories[commercePage] || categories.products)];
  categoryGrid.innerHTML = list.map((category, index) => `
    <button class="commerce-category${index === 0 ? " is-active" : ""}" type="button" data-category="${category}">
      <b>${String(index + 1).padStart(2, "0")}</b>
      <strong>${category}</strong>
    </button>
  `).join("");
}

function renderProducts() {
  if (!productGrid) return;
  const query = (searchInput?.value || "").trim().toLowerCase();
  const brand = brandFilter?.value || "";
  const items = commerceItems.filter((item) => {
    const categoryMatches = activeCategory === "전체" || item.category === activeCategory;
    const brandMatches = !brand || item.brand === brand;
    const searchMatches = !query || `${item.brand} ${item.name} ${item.model || ""}`.toLowerCase().includes(query);
    return categoryMatches && brandMatches && searchMatches;
  });

  if (!items.length) {
    const isSubscription = commercePage === "subscription";
    productGrid.innerHTML = `
      <div class="commerce-empty">
        <div>
          <span class="commerce-empty-mark">P</span>
          <h3>${isSubscription ? "구독 상품을 준비하고 있습니다." : "단품 구매 상품을 준비하고 있습니다."}</h3>
          <p>${isSubscription ? "월 구독료와 계약 조건을 정확히 확인한 상품부터 순차적으로 공개합니다." : "공식 상품 정보와 쿠팡 파트너스 링크가 확인된 제품부터 순차적으로 공개합니다."}</p>
          <a class="commerce-primary" href="${isSubscription ? "https://pf.kakao.com/_PxlUfX" : "/quote"}"${isSubscription ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${isSubscription ? "구독 상담 문의" : "가전 견적 비교하기"}</a>
        </div>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = items.map((item) => `
    <article class="commerce-product-card">
      <div class="commerce-product-image"><img src="${item.image}" alt="${item.name}" loading="lazy" /></div>
      <div class="commerce-product-body">
        <span class="commerce-product-meta">${item.brand} · ${item.category}</span>
        <h3>${item.name}</h3>
        <p>${item.summary}</p>
        <strong class="commerce-product-price">${item.priceLabel}</strong>
        <a class="commerce-product-action" href="${item.link}" target="_blank" rel="sponsored noopener noreferrer">${commercePage === "subscription" ? "구독 조건 확인" : "최신 가격 확인"}</a>
      </div>
    </article>
  `).join("");
}

categoryGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category || "전체";
  categoryGrid.querySelectorAll(".commerce-category").forEach((item) => item.classList.toggle("is-active", item === button));
  renderProducts();
  document.querySelector("#commerceCatalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
searchInput?.addEventListener("input", renderProducts);
brandFilter?.addEventListener("change", renderProducts);

renderCategories();
renderProducts();
