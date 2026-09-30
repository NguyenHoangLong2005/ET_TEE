$baseUrl = "http://localhost:8081"

function Get-Token([string]$email, [string]$password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return [string]$res.token
}

# 1. Login as Guest & Create Order
$guestToken = "guest_ship_test_" + (Get-Random)
$hCart = @{ "X-Guest-Cart-Token" = $guestToken }
$prods = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method Get
$variantId = $prods.data.items[0].variants[0].id

$addToCartBody = @{ variantId = $variantId; quantity = 1 } | ConvertTo-Json
$cartRes = Invoke-RestMethod -Uri "$baseUrl/api/cart/items" -Method Post -Body $addToCartBody -ContentType "application/json" -Headers $hCart

$checkoutBody = @{
    customerName = "Shipment Flow Customer"
    customerPhone = "0988776655"
    customerEmail = "shipflow@et.tee"
    shippingAddress = "456 Shipping Lane, Quan 3, TP HCM"
    paymentMethod = "COD"
} | ConvertTo-Json

$checkoutRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/checkout" -Method Post -Body $checkoutBody -ContentType "application/json" -Headers $hCart
$orderCode = $checkoutRes.data.orderCode
Write-Host "Created Order Code: $orderCode"

# 2. Login Staff
$salesToken = Get-Token "sales@et.tee" "Check@123"
$whToken = Get-Token "warehouse@et.tee" "Check@123"
$shipToken = Get-Token "shipping@et.tee" "Check@123"

Write-Host "Sales Token:" $salesToken

try {
    Write-Host "About to call GET /api/staff/sales/orders..."
    $hSales = @{ Authorization = "Bearer $salesToken" }
    $res = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders" -Method Get -Headers $hSales
    Write-Host "Fetch orders success. Count:" $res.Count
    $orderObj = ($res | Where-Object { $_.orderCode -eq $orderCode })[0]
    $orderId = $orderObj.id
    Write-Host "Order ID: $orderId"

    # 3. Transitions
    # Confirm
    $hWh = @{ Authorization = "Bearer $whToken" }
    $hShip = @{ Authorization = "Bearer $shipToken" }

    Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders/$orderId/confirm" -Method Post -Headers $hSales | Out-Null
    Write-Host "Confirmed Order"

    # Picking
    Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/orders/$orderId/picking" -Method Post -Headers $hWh | Out-Null
    Write-Host "Picking Started"

    # Packing
    Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/orders/$orderId/packing" -Method Post -Headers $hWh | Out-Null
    Write-Host "Packed Order"

    # Handover (Warehouse -> Handed to carrier)
    Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/orders/$orderId/handover" -Method Post -Headers $hWh | Out-Null
    Write-Host "Handover to Carrier completed in Warehouse"

    # 4. Create Shipment
    $shipBody = @{
        orderId = $orderId
        carrierName = "GIAO_HANG_NHANH"
        trackingCode = "GHN-TEST-" + (Get-Random)
        codAmount = 299000
    } | ConvertTo-Json

    $shipRes = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments" -Method Post -Body $shipBody -ContentType "application/json" -Headers $hShip
    Write-Host "CREATED SHIPMENT ID:" $shipRes.id "Tracking:" $shipRes.trackingCode "Status:" $shipRes.status
    $shipmentId = $shipRes.id

    # Shipment Handover
    $resHand = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments/$shipmentId/handover" -Method Post -Headers $hShip
    Write-Host "Shipment Handover Status:" $resHand.status

    # Start Shipping
    $resStart = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments/$shipmentId/shipping" -Method Post -Headers $hShip
    Write-Host "Shipment In-Transit Status:" $resStart.status

    # Proof of Delivery
    $podBody = @{
        receiverName = "Shipment Flow Customer"
        imageUrl = "https://storage.et.tee/pod/pod_test.jpg"
        note = "Giao hang va nhan thanh toan COD thanh cong"
    } | ConvertTo-Json
    $resPod = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments/$shipmentId/proof" -Method Post -Body $podBody -ContentType "application/json" -Headers $hShip
    Write-Host "Delivered Status:" $resPod.shipment.status "Order Status:" $resPod.shipment.order.status
    Write-Host "COMPLETE SHIPPING FLOW TEST PASSED!"
} catch {
    Write-Host "ERROR IN SHIPPING FLOW:" $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "RESPONSE BODY:" $reader.ReadToEnd()
    }
}
