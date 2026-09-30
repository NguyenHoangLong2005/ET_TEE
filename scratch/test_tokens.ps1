$baseUrl = "http://localhost:8081"

function Get-Token($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
        if ($res.PSObject.Properties['token']) { return $res.token }
        if ($res.PSObject.Properties['data']) { return $res.data.token }
        return $null
    } catch {
        Write-Host "Failed to login for $email: $_"
        return $null
    }
}

Write-Host "Admin: $([bool](Get-Token 'admin@et.tee' 'Check@123'))"
Write-Host "Sales: $([bool](Get-Token 'sales@et.tee' 'Check@123'))"
Write-Host "Warehouse: $([bool](Get-Token 'warehouse@et.tee' 'Check@123'))"
Write-Host "Shipping: $([bool](Get-Token 'shipping@et.tee' 'Check@123'))"
Write-Host "Marketing: $([bool](Get-Token 'marketing@et.tee' 'Check@123'))"
