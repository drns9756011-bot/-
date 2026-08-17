# 픽견적 가전 구독관 운영 인수인계

## 반영 기준

- 원본: 관리자에게 별도로 전달되는 비공개 구독료 자료
- 사용 시트: `전자랜드`
- 노출 조건: 계약기간 `72개월`, 결합유형 `결합없음`
- 노출 가격: `기본요금`만 사용
- 제외: 개별프로모션, 결합할인, 소상공인 할인, 선납 조건
- 같은 모델에 관리 옵션이 여러 개면 기본요금이 가장 낮은 항목 1개를 사용
- 현재 상품 수: 1,309개

## 제품 이미지 기준

- 이미지 원본: `LPLAN_20260816_MULTI_SUBFEST_MODEL_UPDATE_UPLOAD.zip`
- 매칭 결과: 1,309개 전체 연결 완료
- 서버 저장 이미지: 1,309개 상품 전체
- 중복 제거된 공식 이미지 898개를 WebP 아틀라스 9개로 통합
- 이미지 아틀라스 전체 용량: 약 2.1MB
- 연결 순서: 전체 모델 코드 정확 일치, 엘플랜 별칭, 접미부 제외 본체 코드 정확 일치
- 모델명 일부가 비슷하다는 이유만으로 다른 용량이나 크기의 사진을 연결하지 않습니다.
- 이미지 오류 시 공용 가전 이미지를 대신 표시하지 않고 `이미지 준비 중` 상태를 표시합니다.

## 서버 구조

- 공개 조회: `GET /api/subscription-products`
- 상품 이미지: `GET /api/subscription-product-image?model=모델명`
- 전체 교체: `POST /api/subscription-products/replace`
- 전체 교체 API는 `X-Admin-Token` 인증이 필요합니다.
- 원본 엑셀과 변환 중간 JSON은 `public` 및 배포 압축에 포함하지 않습니다.
- 브라우저는 공개 정적 JSON을 읽지 않고 D1 기반 API에서만 상품을 조회합니다.
- D1에는 원본 엑셀이나 개인정보를 저장하지 않고 공개에 필요한 모델, 품목, 72개월 요금, 관리 조건, 이미지 좌표만 저장합니다.
- 새 세트 저장이 모두 끝난 뒤 활성 세트를 전환합니다. 저장 실패 시 기존 활성 목록은 유지됩니다.
- 활성 전환이 끝나면 이전 상품 세트와 상품 행은 서버에서 영구 삭제합니다.
- 엘플랜 배포자료와 LG전자 공식 URL의 사진을 배포 시 서버 자산으로 저장합니다.
- 운영 화면은 외부 이미지 URL이나 네이버 쇼핑 이미지를 사용하지 않습니다.

## 새 엑셀 교체 절차

```powershell
pwsh -File tools/extract_subscription_catalog.ps1 `
  -InputPath "새 구독료 파일.xlsx" `
  -OutputPath "private-data/subscription-products-current.json"

pwsh -File tools/extract_lplan_image_source.ps1 `
  -ZipPath "새 엘플랜 배포자료.zip"

node tools/match_lplan_product_images.mjs

node tools/build_subscription_seed.mjs `
  private-data/subscription-products-20260814.json `
  subscription-products-seed-20260814.sql

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
