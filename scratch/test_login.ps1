$baseUrl = "http://localhost:8081"
$body = @{ email = "sales@et.tee"; password = "Check@123" } | ConvertTo-Json
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    Write-Host "TYPE:" $res.GetType().FullName
    Write-Host "PROPERTIES:" ($res.PSObject.Properties.Name -join ", ")
    Write-Host "TOKEN VALUE:" $res.token
} catch {
    Write-Host "ERROR:" $_.Exception.Message
}
