const commercePage = document.body.dataset.commercePage || "shopping";

const defaultCategories = {
  subscription: ["TV", "냉장고", "김치냉장고", "세탁기·건조기", "정수기", "공기청정기", "주방가전", "에어컨", "청소기", "생활가전"],
  shopping: ["TV", "냉장고", "세탁기·건조기", "김치냉장고", "청소기", "주방가전"],
};

let commerceItems = [];
let sourceInfo = null;
let activeCategory = "전체";
let visibleCount = 24;

const categoryGrid = document.querySelector("#commerceCategories");
const productGrid = document.querySelector("#commerceProductGrid");
const searchInput = document.querySelector("#commerceSearch");
const brandFilter = document.querySelector("#commerceBrand");
const catalogSection = document.querySelector("#commerceCatalog");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function sortCommerceItems() {
  const order = defaultCategories.subscription;
  commerceItems.sort((a, b) => {
    const ai = order.indexOf(a.category);
    const bi = order.indexOf(b.category);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
      || String(a.sourceCategory || "").localeCompare(String(b.sourceCategory || ""), "ko")
      || String(a.model || "").localeCompare(String(b.model || ""), "en");
  });
}

function getCategoryList() {
  if (commercePage !== "subscription" || !commerceItems.length) return defaultCategories[commercePage] || defaultCategories.shopping;
  const order = defaultCategories.subscription;
  return [...new Set(commerceItems.map((item) => item.category).filter(Boolean))]
    .sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b, "ko");
    });
}

function renderCategories() {
  if (!categoryGrid) return;
  const list = ["전체", ...getCategoryList()];
  categoryGrid.innerHTML = list.map((category, index) => `
    <button class="commerce-category${category === activeCategory ? " is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
      <b>${String(index + 1).padStart(2, "0")}</b>
      <strong>${escapeHtml(category)}</strong>
    </button>
  `).join("");
}

function filteredItems() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const brand = brandFilter?.value || "";
  return commerceItems.filter((item) => {
    const categoryMatches = activeCategory === "전체" || item.category === activeCategory;
    const brandMatches = !brand || item.brand === brand;
    const searchMatches = !query || `${item.brand} ${item.name} ${item.sourceCategory || ""} ${item.model || ""}`.toLowerCase().includes(query);
    return categoryMatches && brandMatches && searchMatches;
  });
}

function renderEmpty(isSubscription, message = "") {
  productGrid.innerHTML = `
    <div class="commerce-empty">
      <div>
        <span class="commerce-empty-mark">P</span>
        <h3>${message || (isSubscription ? "조건에 맞는 구독 상품이 없습니다." : "쇼핑 상품을 준비하고 있습니다.")}</h3>
        <p>${isSubscription ? "다른 품목이나 모델명으로 다시 검색해보세요." : "공식 상품 정보와 쿠팡 파트너스 링크가 확인된 제품부터 순차적으로 공개합니다."}</p>
        <a class="commerce-primary" href="${isSubscription ? "https://pf.kakao.com/_PxlUfX" : "/quote"}"${isSubscription ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${isSubscription ? "구독 상담 문의" : "가전 견적 비교하기"}</a>
      </div>
    </div>`;
}

function renderProducts() {
  if (!productGrid) return;
  const allItems = filteredItems();
  const items = allItems.slice(0, visibleCount);
  const isSubscription = commercePage === "subscription";

  if (!items.length) {
    renderEmpty(isSubscription, commerceItems.length ? "조건에 맞는 구독 상품이 없습니다." : "구독 상품을 불러오지 못했습니다.");
    updateCatalogMeta(0, 0);
    return;
  }

  productGrid.innerHTML = items.map((item) => {
    const image = item.imageUrl;
    const atlasMatch = /^atlas:(.+)#(\d+),(\d+)$/.exec(image || "");
    const imageMarkup = atlasMatch
      ? `<span class="commerce-product-atlas" role="img" aria-label="${escapeHtml(item.model)} 제품 이미지" style="--atlas-url:url('${escapeHtml(atlasMatch[1])}');--atlas-x:${Number(atlasMatch[2])};--atlas-y:${Number(atlasMatch[3])}"></span>`
      : image
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.model)} 제품 이미지" loading="lazy" data-product-image />`
        : `<span class="commerce-product-image-missing">이미지 준비 중</span>`;
    const care = [item.careType, item.careDetail, item.visitCycle ? `${item.visitCycle} 주기` : ""].filter(Boolean).join(" · ");
    return `
      <article class="commerce-product-card">
        <div class="commerce-product-image">${imageMarkup}</div>
        <div class="commerce-product-body">
          <span class="commerce-product-meta">${escapeHtml(item.brand)} · ${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.sourceCategory || item.name)}</h3>
          <strong class="commerce-product-model">${escapeHtml(item.model)}</strong>
          <p>${escapeHtml(care || "72개월 구독")}</p>
          <span class="commerce-contract-label">72개월 기준 월 구독료</span>
          <strong class="commerce-product-price">월 ${formatWon(item.monthlyFee72)}</strong>
          <a class="commerce-product-action" href="https://pf.kakao.com/_PxlUfX" target="_blank" rel="noopener noreferrer">구독 상담하기</a>
        </div>
      </article>`;
  }).join("");

  productGrid.querySelectorAll("[data-product-image]").forEach((image) => {
    image.addEventListener("error", () => {
      image.parentElement.innerHTML = '<span class="commerce-product-image-missing">이미지 준비 중</span>';
    }, { once: true });
  });
  updateCatalogMeta(items.length, allItems.length);
}

function ensureCatalogMeta() {
  let meta = document.querySelector("#commerceCatalogMeta");
  if (meta || !catalogSection) return meta;
  meta = document.createElement("div");
  meta.id = "commerceCatalogMeta";
  meta.className = "commerce-catalog-meta";
  catalogSection.append(meta);
  return meta;
}

function updateCatalogMeta(shown, total) {
  const meta = ensureCatalogMeta();
  if (!meta) return;
  const sourceDate = sourceInfo?.date ? ` · ${escapeHtml(sourceInfo.date)} 기준` : "";
  meta.innerHTML = `
    <p><strong>${total.toLocaleString("ko-KR")}개</strong> 상품 중 ${shown.toLocaleString("ko-KR")}개 표시${sourceDate}</p>
    ${shown < total ? '<button type="button" id="commerceLoadMore">상품 더 보기</button>' : ""}`;
  meta.querySelector("#commerceLoadMore")?.addEventListener("click", () => {
    visibleCount += 24;
    renderProducts();
  });
}

async function loadSubscriptionProducts() {
  const response = await fetch("/api/subscription-products", { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("subscription api unavailable");
  const payload = await response.json();
  if (!payload.ok || !Array.isArray(payload.items) || !payload.items.length) throw new Error("subscription data empty");
  commerceItems = payload.items;
  sourceInfo = payload.source || null;
  sortCommerceItems();
}

async function loadStaticSubscriptionFallback() {
  const response = await fetch("/assets/subscription-products-20260814.json", { cache: "no-store" });
  if (!response.ok) throw new Error("subscription fallback unavailable");
  const payload = await response.json();
  commerceItems = Array.isArray(payload.items) ? payload.items : [];
  sourceInfo = { name: payload.sourceName, date: payload.sourceDate };
  sortCommerceItems();
}

categoryGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category || "전체";
  visibleCount = 24;
  renderCategories();
  renderProducts();
  catalogSection?.scrollIntoView({ behavior: "smooth", block: "start" });
});
searchInput?.addEventListener("input", () => { visibleCount = 24; renderProducts(); });
brandFilter?.addEventListener("change", () => { visibleCount = 24; renderProducts(); });

async function initCommerce() {
  renderCategories();
  if (commercePage === "subscription") {
    try {
      await loadSubscriptionProducts();
    } catch (error) {
      try { await loadStaticSubscriptionFallback(); } catch (fallbackError) { commerceItems = []; }
    }
  }
  renderCategories();
  renderProducts();
}

initCommerce();
