(() => {
  const state = { seller: null, sellerId: "", password: "", packages: [], leads: [], coverDataUrl: "" };
  const money = new Intl.NumberFormat("ko-KR");
  const loginPanel = document.querySelector("#loginPanel");
  const authForm = document.querySelector("#sellerAuthForm");
  const authMessage = document.querySelector("#authMessage");
  const workspace = document.querySelector("#workspace");
  const sellerHeading = document.querySelector("#sellerHeading");
  const sellerMeta = document.querySelector("#sellerMeta");
  const packageForm = document.querySelector("#packageForm");
  const packageFormTitle = document.querySelector("#packageFormTitle");
  const packageMessage = document.querySelector("#packageMessage");
  const coverPreview = document.querySelector("#coverPreview");
  const myPackageList = document.querySelector("#myPackageList");
  const myPackageCount = document.querySelector("#myPackageCount");
  const leadList = document.querySelector("#leadList");
  const leadCountBadge = document.querySelector("#leadCountBadge");
  const packagesPanel = document.querySelector("#packagesPanel");
  const leadsPanel = document.querySelector("#leadsPanel");

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const price = (value) => `${money.format(Number(value || 0))}원`;
  const digits = (value) => Number(String(value || "").replace(/[^0-9]/g, "") || 0);
  const formatDateTime = (value) => value ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year:"numeric", month:"numeric", day:"numeric", hour:"numeric", minute:"2-digit" }).format(new Date(value)) : "";

  async function apiJson(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.message || "서버 요청을 처리하지 못했습니다.");
    return payload;
  }
  async function sellerAction(action, extra = {}) {
    return apiJson("/api/brand-seller-packages", { method: "POST", body: JSON.stringify({ action, sellerId: state.sellerId, password: state.password, ...extra }) });
  }

  function resetPackageForm() {
    packageForm.reset();
    packageForm.elements.packageId.value = "";
    packageForm.elements.status.value = "active";
    state.coverDataUrl = "";
    coverPreview.innerHTML = "<span>대표 이미지 미리보기</span>";
    packageFormTitle.textContent = "새 패키지 등록";
    packageMessage.textContent = "";
    packageMessage.classList.remove("is-success");
  }

  async function compressImage(file) {
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl; });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .86);
  }

  function renderPackages() {
    myPackageCount.textContent = `${state.packages.length}개`;
    if (!state.packages.length) { myPackageList.innerHTML = `<div class="brand-manage-empty">아직 등록한 패키지가 없습니다.<br />왼쪽에서 첫 패키지를 등록해주세요.</div>`; return; }
    myPackageList.innerHTML = state.packages.map((row) => `<article class="brand-my-package-card">
      <div class="brand-my-package-thumb">${row.coverImage ? `<img src="${escapeHtml(row.coverImage)}" alt="" />` : "PICK"}</div>
      <div class="brand-my-package-info"><span class="brand-package-status ${row.status === "hidden" ? "is-hidden" : ""}">${row.status === "hidden" ? "숨김" : "공개"}</span><h3>${escapeHtml(row.title)}</h3><div class="brand-my-package-meta">${escapeHtml(row.brand)} · ${(row.items || []).length}개 제품 · ${formatDateTime(row.updatedAt)}</div><div class="brand-my-package-price">${price(row.salePrice)}~</div><div class="brand-my-package-actions"><button type="button" data-edit-package="${escapeHtml(row.id)}">수정</button><button type="button" class="is-danger" data-delete-package="${escapeHtml(row.id)}">삭제</button></div></div>
    </article>`).join("");
  }

  function renderLeads() {
    leadCountBadge.textContent = state.leads.length;
    if (!state.leads.length) { leadList.innerHTML = `<div class="brand-manage-empty">아직 상담 신청 고객이 없습니다.</div>`; return; }
    leadList.innerHTML = state.leads.map((row) => `<article class="brand-lead-card"><div><span class="brand-hall-kicker">${escapeHtml(formatDateTime(row.createdAt))}</span><h3>${escapeHtml(row.packageTitle || "브랜드관 상담")}</h3><dl><dt>고객님</dt><dd>${escapeHtml(row.customerName)}</dd><dt>연락처</dt><dd>${escapeHtml(row.customerPhoneFormatted || row.customerPhone)}</dd><dt>설치 지역</dt><dd>${escapeHtml(row.customerRegion)}</dd><dt>희망 시간</dt><dd>${escapeHtml(row.preferredTime)}</dd><dt>문의 내용</dt><dd>${escapeHtml(row.memo || "-")}</dd></dl></div><div class="brand-lead-actions"><a href="tel:${escapeHtml(row.customerPhone)}">전화하기</a><a href="sms:${escapeHtml(row.customerPhone)}">문자 보내기</a></div></article>`).join("");
  }

  async function refreshSellerData() {
    const [packages, leads] = await Promise.all([sellerAction("list"), sellerAction("consultations")]);
    state.packages = packages.rows || [];
    state.leads = leads.rows || [];
    renderPackages();
    renderLeads();
  }

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage.textContent = "";
    const data = new FormData(authForm);
    const sellerId = String(data.get("sellerId") || "").trim();
    const password = String(data.get("password") || "");
    const submit = authForm.querySelector("button[type='submit']");
    submit.disabled = true; submit.textContent = "로그인 중...";
    try {
      const login = await apiJson("/api/seller-login", { method:"POST", body: JSON.stringify({ sellerId, password }) });
      state.sellerId = sellerId; state.password = password; state.seller = login.row;
      sessionStorage.setItem("pickquoteBrandSellerId", sellerId);
      sellerHeading.textContent = `${login.row.branch || "내 지점"} 브랜드관`;
      sellerMeta.textContent = [login.row.channel, login.row.branchRegion, login.row.manager].filter(Boolean).join(" · ");
      loginPanel.hidden = true; workspace.hidden = false;
      await refreshSellerData();
    } catch (error) { authMessage.textContent = error.message; }
    finally { submit.disabled = false; submit.textContent = "판매자 로그인"; }
  });

  packageForm?.elements.coverImage?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { state.coverDataUrl = await compressImage(file); coverPreview.innerHTML = `<img src="${state.coverDataUrl}" alt="대표 이미지 미리보기" />`; }
    catch { packageMessage.textContent = "이미지를 처리하지 못했습니다. JPG·PNG 이미지로 다시 시도해주세요."; }
  });
  [packageForm?.elements.originalPrice, packageForm?.elements.salePrice].filter(Boolean).forEach((input) => input.addEventListener("input", () => { const n = digits(input.value); input.value = n ? money.format(n) : ""; }));

  packageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(packageForm).entries());
    const items = String(data.items || "").split(/\n+/).map((v) => v.trim()).filter(Boolean).slice(0,12);
    const payload = { id: data.packageId || "", brand: data.brand, title: data.title, items, originalPrice: digits(data.originalPrice), salePrice: digits(data.salePrice), benefits: data.benefits || "", status: data.status || "active", coverImageDataUrl: state.coverDataUrl || "" };
    const submit = packageForm.querySelector("button[type='submit']");
    submit.disabled = true; submit.textContent = "저장 중..."; packageMessage.textContent = "";
    try {
      await sellerAction(payload.id ? "update" : "create", { package: payload });
      packageMessage.classList.add("is-success"); packageMessage.textContent = "브랜드관 패키지가 서버에 저장되었습니다.";
      await refreshSellerData(); resetPackageForm(); packageMessage.classList.add("is-success"); packageMessage.textContent = "브랜드관 패키지가 서버에 저장되었습니다.";
    } catch (error) { packageMessage.classList.remove("is-success"); packageMessage.textContent = error.message; }
    finally { submit.disabled = false; submit.textContent = "패키지 저장"; }
  });

  myPackageList?.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-package]");
    const del = event.target.closest("[data-delete-package]");
    if (edit) {
      const row = state.packages.find((item) => String(item.id) === String(edit.dataset.editPackage)); if (!row) return;
      resetPackageForm(); packageForm.elements.packageId.value = row.id; packageForm.elements.brand.value = row.brand || ""; packageForm.elements.status.value = row.status || "active"; packageForm.elements.title.value = row.title || ""; packageForm.elements.items.value = (row.items || []).join("\n"); packageForm.elements.originalPrice.value = row.originalPrice ? money.format(row.originalPrice) : ""; packageForm.elements.salePrice.value = row.salePrice ? money.format(row.salePrice) : ""; packageForm.elements.benefits.value = row.benefits || ""; packageFormTitle.textContent = "패키지 수정"; state.coverDataUrl = ""; coverPreview.innerHTML = row.coverImage ? `<img src="${escapeHtml(row.coverImage)}" alt="" />` : "<span>대표 이미지 미리보기</span>"; packageForm.scrollIntoView({ behavior:"smooth", block:"start" });
    }
    if (del) {
      const row = state.packages.find((item) => String(item.id) === String(del.dataset.deletePackage)); if (!row) return;
      if (!confirm(`“${row.title}” 패키지를 브랜드관에서 삭제하시겠습니까?`)) return;
      try { await sellerAction("delete", { packageId: row.id }); await refreshSellerData(); if (packageForm.elements.packageId.value === row.id) resetPackageForm(); }
      catch (error) { alert(error.message); }
    }
  });

  document.querySelector("#resetPackageBtn")?.addEventListener("click", resetPackageForm);
  document.querySelector("#refreshLeadsBtn")?.addEventListener("click", async () => { try { const result = await sellerAction("consultations"); state.leads = result.rows || []; renderLeads(); } catch (error) { alert(error.message); } });
  document.querySelector("#logoutBtn")?.addEventListener("click", () => { state.seller = null; state.sellerId = ""; state.password = ""; workspace.hidden = true; loginPanel.hidden = false; authForm.reset(); authForm.elements.sellerId.value = sessionStorage.getItem("pickquoteBrandSellerId") || sessionStorage.getItem("pickquoteActiveSellerId") || ""; });
  document.querySelectorAll("[data-manage-tab]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-manage-tab]").forEach((item) => item.classList.toggle("is-active", item === button)); const leads = button.dataset.manageTab === "leads"; packagesPanel.hidden = leads; leadsPanel.hidden = !leads; }));

  authForm.elements.sellerId.value = sessionStorage.getItem("pickquoteBrandSellerId") || sessionStorage.getItem("pickquoteActiveSellerId") || "";
})();
