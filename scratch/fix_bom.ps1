$path = "c:\userdata\fashion-recommendation-system\backend\src\main\java\com\nguyenhoanglong\service\impl\StoreOwnerServiceImpl.java"
$text = [System.IO.File]::ReadAllText($path)
# Remove any zero width no-break space (U+FEFF)
$text = $text.TrimStart([char]0xFEFF)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
Write-Host "Re-saved without BOM. Length:" $text.Length
