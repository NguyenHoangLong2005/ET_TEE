# Script to test Gate 4 (Health Check) and Gate 5 (Auth)
$baseUrl = "http://localhost:8081"

Write-Host "=== GATE 4: HEALTH CHECK ==="
try {
    $resHealth = Invoke-RestMethod -Uri "$baseUrl/api/categories" -Method Get
    Write-Host "GATE 4 PASS: Received $($resHealth.Count) categories from $baseUrl/api/categories"
} catch {
    Write-Host "GATE 4 FAIL: Unreachable or error: $_"
    exit 1
}

Write-Host "`n=== GATE 5: AUTHENTICATION ==="
$body = @{ email = "admin@et.tee"; password = "Check@123" } | ConvertTo-Json
try {
    $resLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $token = $resLogin.token
    if (-not $token) {
        Write-Host "GATE 5 FAIL: No token returned in login response"
        exit 1
    }
    Write-Host "GATE 5 PASS: Token extracted successfully for admin@et.tee"
    
    # Test authenticating a protected endpoint
    $headers = @{ Authorization = "Bearer $token" }
    $resProtected = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Method Get -Headers $headers
    Write-Host "GATE 5 PASS: Protected endpoint GET /api/admin/users returned successfully!"
} catch {
    Write-Host "GATE 5 FAIL: Authentication error: $_"
    exit 1
}

Write-Host "`nALL GATES 1-5 PASSED SUCCESSFULLY! PROCEEDING TO FUNCTIONAL TESTS."
