$baseUrl = "http://localhost:8081"

# Fetch first product from products list
$resProds = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method Get
$firstProd = $resProds.data.items[0]
Write-Host "Product: $($firstProd.name), Slug: $($firstProd.slug)"

# Fetch detail to get variant ID
$resDetail = Invoke-RestMethod -Uri "$baseUrl/api/products/$($firstProd.slug)" -Method Get
$variantId = $resDetail.data.variants[0].id
Write-Host "Real Variant ID: $variantId"

# Add to Cart using X-Guest-Cart-Token
$tokenHeader = @{ "X-Guest-Cart-Token" = "guest_cart_token_777" }
$addBody = @{ variantId = $variantId; quantity = 1 } | ConvertTo-Json
$cartRes = Invoke-RestMethod -Uri "$baseUrl/api/cart/items" -Method Post -Body $addBody -ContentType "application/json" -Headers $tokenHeader
Write-Host "Cart Added! Items Count: $($cartRes.items.Count)"

# Checkout
$coBody = @{
    customerName = "Test Customer"
    customerPhone = "0987654321"
    customerEmail = "cust@et.tee"
    shippingAddress = "456 Test Street"
    paymentMethod = "COD"
} | ConvertTo-Json

$coRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/checkout" -Method Post -Body $coBody -ContentType "application/json" -Headers $tokenHeader
Write-Host "Checkout Success: $($coRes.success), Order Code: $($coRes.data.orderCode)"

# Lookup Order in Sales API
$loginBody = @{ email = "sales@et.tee"; password = "Check@123" } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json").token
$hSales = @{ Authorization = "Bearer $token" }

$salesOrders = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders" -Method Get -Headers $hSales
$target = $salesOrders | Where-Object { $_.orderCode -eq $coRes.data.orderCode }
Write-Host "Target Order ID: $($target.id), Code: $($target.orderCode), ShopId: $($target.shopId), Status: $($target.status)"
