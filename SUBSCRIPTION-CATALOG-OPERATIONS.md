# 픽견적 가전 구독관 운영 인수인계

## 반영 기준

- 원본: `전자랜드 8월14일 기준 구독료 최신화.xlsx`
- 사용 시트: `전자랜드`
- 노출 조건: 계약기간 `72개월`, 결합유형 `결합없음`
- 노출 가격: `기본요금`만 사용
- 제외: 개별프로모션, 결합할인, 소상공인 할인, 선납 조건
- 같은 모델에 관리 옵션이 여러 개면 기본요금이 가장 낮은 항목 1개를 사용
- 현재 상품 수: 1,309개

## 서버 구조

- 공개 조회: `GET /api/subscription-products`
- 상품 이미지: `GET /api/subscription-product-image?model=모델명`
- 전체 교체: `POST /api/subscription-products/replace`
- 전체 교체 API는 `X-Admin-Token` 인증이 필요합니다.
- 새 세트 저장이 모두 끝난 뒤 활성 세트를 전환합니다. 저장 실패 시 기존 활성 목록은 유지됩니다.
- 활성 전환이 끝나면 이전 상품 세트와 상품 행은 서버에서 영구 삭제합니다.
- 모델 이미지는 최초 노출 시 네이버 쇼핑의 정확 모델 검색 결과를 사용하고 `image_url`에 캐시합니다.

## 새 엑셀 교체 절차

```powershell
pwsh -File tools/extract_subscription_catalog.ps1 `
  -InputPath "새 구독료 파일.xlsx" `
  -OutputPath "public/assets/subscription-products-current.json"

pwsh -File tools/publish_subscription_catalog.ps1 `
  -CatalogPath "public/assets/subscription-products-current.json" `
  -AdminToken "관리자 API 토큰"
```

배포 시 이번 초기 데이터는 `subscription-products-seed-20260814.sql`로 D1에 반영할 수 있습니다.

```powershell
wrangler d1 execute ga-pick-db --remote --file subscription-products-seed-20260814.sql
wrangler deploy
```

## 화면 동작

- 브랜드관의 `가전 구독관` 메뉴에서 진입합니다.
- 품목 필터, 브랜드 필터, 모델명 검색을 지원합니다.
- 최초 24개를 표시하고 `상품 더 보기`로 24개씩 추가합니다.
- 월 요금에는 `72개월 기준 월 구독료`를 명시합니다.
- API 장애 시 배포본의 2026-08-14 목록을 임시 폴백으로 사용합니다.
