param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$categoryMap = @{
  'TV' = 'TV'
  '스탠바이미' = 'TV'
  '냉장고 (일반)' = '냉장고'
  '냉장고 (상냉장)' = '냉장고'
  '냉장고 (양문형)' = '냉장고'
  '냉장고 (얼음정수기)' = '냉장고'
  '냉장고 (김치냉장고)' = '김치냉장고'
  '세탁기 (드럼)' = '세탁기·건조기'
  '세탁기 (건조기)' = '세탁기·건조기'
  '세탁기 (워시타워)' = '세탁기·건조기'
  '세탁기 (워시콤보)' = '세탁기·건조기'
  '세탁기 (미니워시)' = '세탁기·건조기'
  '세탁기 (통돌이)' = '세탁기·건조기'
  '정수기' = '정수기'
  '얼음정수기' = '정수기'
  '공기청정기' = '공기청정기'
  '전기레인지' = '주방가전'
  '식기세척기' = '주방가전'
  '광파오븐' = '주방가전'
  '로봇청소기' = '청소기'
  '청소기' = '청소기'
  '에어컨 (스탠드)' = '에어컨'
  '에어컨 (2in1)' = '에어컨'
  '에어컨 (벽걸이)' = '에어컨'
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
  $workbook = $excel.Workbooks.Open($InputPath, 0, $true)
  $sheet = $workbook.Worksheets.Item('전자랜드')
  $values = $sheet.UsedRange.Value2
  $bestByModel = @{}

  for ($row = 2; $row -le $values.GetLength(0); $row++) {
    $term = [string]$values[$row, 8]
    $bundleType = ([string]$values[$row, 9]).Trim()
    $model = ([string]$values[$row, 2]).Trim().ToUpperInvariant()
    $fee = $values[$row, 13]

    if ($term -ne '72' -or $bundleType -ne '결합없음' -or -not $model -or $fee -isnot [double]) {
      continue
    }

    $sourceCategory = ([string]$values[$row, 1]).Trim()
    $category = if ($categoryMap.ContainsKey($sourceCategory)) { $categoryMap[$sourceCategory] } else { '생활가전' }
    $item = [ordered]@{
      brand = 'LG전자'
      category = $category
      sourceCategory = $sourceCategory
      model = $model
      name = "LG $sourceCategory"
      monthlyFee72 = [int]$fee
      careType = ([string]$values[$row, 5]).Trim()
      careDetail = ([string]$values[$row, 6]).Trim()
      visitCycle = ([string]$values[$row, 7]).Trim()
      imageUrl = ''
    }

    if (-not $bestByModel.ContainsKey($model) -or $item.monthlyFee72 -lt $bestByModel[$model].monthlyFee72) {
      $bestByModel[$model] = $item
    }
  }

  $items = @($bestByModel.Values | Sort-Object category, sourceCategory, model)
  $payload = [ordered]@{
    sourceName = [System.IO.Path]::GetFileName($InputPath)
    sourceDate = '2026-08-14'
    contractMonths = 72
    pricePolicy = '72개월·결합없음·기본요금·모델별 최저 관리옵션'
    excluded = @('개별프로모션', '결합할인', '소상공인할인', '선납')
    count = $items.Count
    items = $items
  }

  $parent = Split-Path -Parent $OutputPath
  if ($parent) { New-Item -ItemType Directory -Force $parent | Out-Null }
  $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
  Write-Output "Extracted $($items.Count) subscription products to $OutputPath"
}
finally {
  if ($workbook) { $workbook.Close($false) }
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
