$baseUrl = "http://localhost:8081"

# Login as Sales 1 (Shop 1)
$body = @{ email = "sales@et.tee"; password = "Check@123" } | ConvertTo-Json
$resLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $resLogin.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Calling GET /api/staff/sales/orders..."
try {
    $rawRes = Invoke-WebRequest -Uri "$baseUrl/api/staff/sales/orders" -Method Get -Headers $headers -UseBasicParsing
    $content = $rawRes.Content
    Write-Host "RAW CONTENT TYPE:" $rawRes.Headers["Content-Type"]
    Write-Host "RAW CONTENT PREFIX:" $content.Substring(0, [Math]::Min(100, $content.Length))
    $parsed = $content | ConvertFrom-Json
    Write-Host "PARSED COUNT:" $parsed.Count
    Write-Host "FIRST ORDER ID:" $parsed[0].id "CODE:" $parsed[0].orderCode "SHOPID:" $parsed[0].shopId "STATUS:" $parsed[0].status
} catch {
    Write-Host "Error calling GET /api/staff/sales/orders:" $_.Exception.Message
}
