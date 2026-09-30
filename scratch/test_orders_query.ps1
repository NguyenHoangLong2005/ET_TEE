$baseUrl = "http://localhost:8081"
$body = @{ email = "sales@et.tee"; password = "Check@123" } | ConvertTo-Json
try {
    $resLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $resLogin | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Login error: $_"
}
