# Master Production Audit Script for ET.TEE Shop
$baseUrl = "http://localhost:8081"

function Get-Token($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
        if ($res.token) { return $res.token }
        if ($res.data -and $res.data.token) { return $res.data.token }
        return $null
    } catch {
        Write-Host "Failed to login for $email"
        return $null
    }
}

Write-Host "--- AUTHENTICATING ALL STAFF ROLES ---"
$adminToken = Get-Token "admin@et.tee" "Check@123"
$sales1Token = Get-Token "sales@et.tee" "Check@123"
$sales2Token = Get-Token "sales_shop2@et.tee" "Check@123"
$whToken = Get-Token "warehouse@et.tee" "Check@123"
$shipToken = Get-Token "shipping@et.tee" "Check@123"
$mktToken = Get-Token "marketing@et.tee" "Check@123"

Write-Host "Admin Token: $([bool]$adminToken)"
Write-Host "Sales 1 (Shop 1) Token: $([bool]$sales1Token)"
Write-Host "Sales 2 (Shop 2) Token: $([bool]$sales2Token)"
Write-Host "Warehouse (Shop 1) Token: $([bool]$whToken)"
Write-Host "Shipping (Shop 1) Token: $([bool]$shipToken)"
Write-Host "Marketing Token: $([bool]$mktToken)"


# ==================================================
# PHASE A: MULTI-SHOP ISOLATION
# ==================================================
Write-Host "`n=================================================="
Write-Host "PHASE A: MULTI-SHOP ISOLATION"
Write-Host "=================================================="

# Check Product -> Shop relationship
$prods = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method Get
Write-Host "Product Catalog is Global: $($prods.data.items.Count -gt 0)"

# Step 1: Query a real variant ID
$firstProd = $prods.data.items[0]
$pDetail = Invoke-RestMethod -Uri "$baseUrl/api/products/$($firstProd.slug)" -Method Get
$variantId = $pDetail.data.variants[0].id
Write-Host "Selected Real Product Variant ID: $variantId"

# Step 2: Add item to cart for guest session
$guestToken = "guest_audit_" + (Get-Random)
$hCart = @{ "X-Guest-Cart-Token" = $guestToken }
$addToCartBody = @{ variantId = $variantId; quantity = 2 } | ConvertTo-Json
$cartRes = Invoke-RestMethod -Uri "$baseUrl/api/cart/items" -Method Post -Body $addToCartBody -ContentType "application/json" -Headers $hCart
Write-Host "Cart Updated. Items Count: $($cartRes.items.Count)"

# Step 3: Checkout Order for Shop 1
$checkoutBody = @{
    customerName = "Audit Customer Shop 1"
    customerPhone = "0987654321"
    customerEmail = "shop1_cust@et.tee"
    shippingAddress = "123 Shop 1 Street, Quan 1, TP HCM"
    paymentMethod = "COD"
} | ConvertTo-Json

$checkoutRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/checkout" -Method Post -Body $checkoutBody -ContentType "application/json" -Headers $hCart
$orderCode1 = $checkoutRes.data.orderCode
Write-Host "Created Order 1 Code: $orderCode1"

# Fetch numeric order ID from sales staff 1
$h1 = @{ Authorization = "Bearer $sales1Token" }
$sales1Orders = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders" -Method Get -Headers $h1
$order1Obj = ($sales1Orders | Where-Object { $_.orderCode -eq $orderCode1 })[0]
if (-not $order1Obj) { $order1Obj = $sales1Orders[0] }
$order1Id = $order1Obj.id
Write-Host "Order 1 ID: $order1Id, Code: $($order1Obj.orderCode), ShopId: $($order1Obj.shopId), Status: $($order1Obj.status)"

# Check Sales 1 access to Order 1
try {
    $resOrder1Sales1 = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders/$order1Id" -Method Get -Headers $h1
    Write-Host "Sales Staff 1 (Shop 1) view Order 1: SUCCESS (ShopId: $($resOrder1Sales1.shopId))"
} catch {
    Write-Host "Sales Staff 1 view Order 1: FAILED"
}

# Check Sales 2 access to Order 1 (Cross-Shop Isolation check)
$h2 = @{ Authorization = "Bearer $sales2Token" }
try {
    $resOrder1Sales2 = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders/$order1Id" -Method Get -Headers $h2
    Write-Host "Cross-Shop Access (Sales 2 -> Order 1): SECURITY FAILURE - ALLOWED!"
} catch {
    Write-Host "Cross-Shop Access (Sales 2 -> Order 1): REJECTED AS EXPECTED (403 Forbidden)"
}


# ==================================================
# PHASE B: ORDER STATE MACHINE
# ==================================================
Write-Host "`n=================================================="
Write-Host "PHASE B: ORDER STATE MACHINE"
Write-Host "=================================================="

# 1. Invalid Transition Check: Try PENDING_CONFIRMATION -> PACKED (Warehouse Staff)
$hWh = @{ Authorization = "Bearer $whToken" }
try {
    $resJump = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/orders/$order1Id/packing" -Method Post -Headers $hWh
    Write-Host "Invalid Transition Test (Pending -> Packed): FAILED TO REJECT"
} catch {
    Write-Host "Invalid Transition Test (Pending -> Packed): REJECTED AS EXPECTED"
}

# 2. Invalid Role Check: Try confirming order as Marketing Staff
$hMkt = @{ Authorization = "Bearer $mktToken" }
try {
    $resMktConfirm = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders/$order1Id/confirm" -Method Post -Headers $hMkt
    Write-Host "Invalid Role Test (Marketing -> Confirm Order): SECURITY FAILURE - ALLOWED!"
} catch {
    Write-Host "Invalid Role Test (Marketing -> Confirm Order): REJECTED AS EXPECTED (403 Forbidden)"
}

# 3. Valid Lifecycle Execution:
# Step 1: PENDING_CONFIRMATION -> CONFIRMED (Sales Staff)
Write-Host "`n--- Step 1: PENDING_CONFIRMATION -> CONFIRMED (Sales Staff) ---"
$resConfirm = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders/$order1Id/confirm" -Method Post -Headers $h1
Write-Host "Confirmed Status: $($resConfirm.status)"

# Step 2: CONFIRMED -> PICKING (Warehouse Staff)
Write-Host "`n--- Step 2: CONFIRMED -> PICKING (Warehouse Staff) ---"
$resPick = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/orders/$order1Id/picking" -Method Post -Headers $hWh
Write-Host "Picking Status: $($resPick.status)"

# Step 3: PICKING -> PACKED (Warehouse Staff)
Write-Host "`n--- Step 3: PICKING -> PACKED (Warehouse Staff) ---"
$resPack = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/orders/$order1Id/packing" -Method Post -Headers $hWh
Write-Host "Packed Status: $($resPack.status)"

# Step 4: PACKED -> HANDED_TO_CARRIER (Warehouse Staff Handover)
Write-Host "`n--- Step 4: PACKED -> HANDED_TO_CARRIER (Warehouse Staff) ---"
$resHandover = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/orders/$order1Id/handover" -Method Post -Headers $hWh
Write-Host "Handover Status: $($resHandover.status)"

# Step 5: HANDED_TO_CARRIER -> SHIPPING (Shipping Staff creates shipment)
Write-Host "`n--- Step 5: HANDED_TO_CARRIER -> SHIPPING (Shipping Staff) ---"
$hShip = @{ Authorization = "Bearer $shipToken" }
$shipmentBody = @{
    orderId = $order1Id
    carrierName = "GIAO_HANG_NHANH"
    trackingCode = "GHN-AUDIT-" + (Get-Random)
    codAmount = 200000
} | ConvertTo-Json

$resShipment = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments" -Method Post -Body $shipmentBody -ContentType "application/json" -Headers $hShip
Write-Host "Shipment Created ID: $($resShipment.id), Tracking: $($resShipment.trackingCode), Status: $($resShipment.status)"
$shipmentId = $resShipment.id

# Step 5b: Handover shipment to carrier & start shipping
$resShipHandover = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments/$shipmentId/handover" -Method Post -Headers $hShip
Write-Host "Shipment Handover Status: $($resShipHandover.status)"

$resShipStart = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments/$shipmentId/shipping" -Method Post -Headers $hShip
Write-Host "Shipment In-Transit Status: $($resShipStart.status), Order Status: $($resShipStart.order.status)"

# Step 6: SHIPPING -> DELIVERED (Shipping Staff Proof of Delivery)
Write-Host "`n--- Step 6: SHIPPING -> DELIVERED (Shipping Staff POD) ---"
$podBody = @{
    receiverName = "Nguyen Van A"
    imageUrl = "https://storage.et.tee/pod/pod_1001.jpg"
    note = "Giao hang thanh cong va da thu tien COD"
} | ConvertTo-Json

$resDelivered = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/shipments/$shipmentId/proof" -Method Post -Body $podBody -ContentType "application/json" -Headers $hShip
Write-Host "Proof of Delivery Saved. Shipment Status: $($resDelivered.shipment.status), Order Status: $($resDelivered.shipment.order.status)"

# Verify History Logging
Write-Host "`n--- Order Status History Verification ---"
$history = Invoke-RestMethod -Uri "$baseUrl/api/staff/sales/orders/$order1Id/history" -Method Get -Headers $h1
Write-Host "Total Status History Records: $($history.Count)"
foreach ($h in $history) {
    Write-Host "  Log: From=$($h.fromStatus) -> To=$($h.status), Action=$($h.reason), ChangedBy=$($h.changedBy), Time=$($h.createdAt)"
}


# ==================================================
# PHASE C: WAREHOUSE OPERATIONS
# ==================================================
Write-Host "`n=================================================="
Write-Host "PHASE C: WAREHOUSE OPERATIONS"
Write-Host "=================================================="

# 1. Inbound Stock
Write-Host "`n--- 1. Inbound Stock ---"
$inboundBody = @{ productId = $firstProd.id; productName = $firstProd.name; quantity = 50; location = "A1-01" } | ConvertTo-Json
$resInbound = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/inbound" -Method Post -Body $inboundBody -ContentType "application/json" -Headers $hWh
Write-Host "Inbound Record ID: $($resInbound.id), Location: $($resInbound.warehouseLocation), QtyOnHand: $($resInbound.quantityOnHand)"
$invId = $resInbound.id

# 2. Count Inbound
Write-Host "`n--- 2. Count Inbound ---"
$countBody = @{ actualQuantity = 50 } | ConvertTo-Json
$resCount = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/inbound/$invId/count" -Method Post -Body $countBody -ContentType "application/json" -Headers $hWh
Write-Host "Counted Inbound Inventory ID: $($resCount.inventory.id), Actual: $($resCount.actualQuantity), Diff: $($resCount.difference)"

# 3. View Inventory
Write-Host "`n--- 3. View Inventory ---"
$invList = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/inventory" -Method Get -Headers $hWh
Write-Host "Total Warehouse Inventory Items: $($invList.Count)"

# 4. Stock Adjustment & Approval
Write-Host "`n--- 4. Stock Adjustment & Approval ---"
$adjBody = @{ difference = 5; reason = "Diem danh du hang kho"; requestedBy = 1 } | ConvertTo-Json
$resAdj = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/inventory/$invId/adjustments" -Method Post -Body $adjBody -ContentType "application/json" -Headers $hWh
Write-Host "Adjustment Request Created ID: $($resAdj.id), Diff: $($resAdj.difference), Status: $($resAdj.status)"

$apprBody = @{ approvedBy = 1 } | ConvertTo-Json
$resApprAdj = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/adjustments/$($resAdj.id)/approve" -Method Post -Body $apprBody -ContentType "application/json" -Headers $hWh
Write-Host "Adjustment Approved ID: $($resApprAdj.id), Status: $($resApprAdj.status)"

# 5. Stocktake
Write-Host "`n--- 5. Stocktake ---"
$stBody = @{ warehouseLocation = "A1-01"; createdBy = 1 } | ConvertTo-Json
$resSt = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/stocktakes" -Method Post -Body $stBody -ContentType "application/json" -Headers $hWh
Write-Host "Stocktake Session ID: $($resSt.id), Location: $($resSt.warehouseLocation), Status: $($resSt.status)"

$stResultBody = @{ actualQuantity = 55 } | ConvertTo-Json
$resStUpd = Invoke-RestMethod -Uri "$baseUrl/api/staff/warehouse/stocktakes/$($resSt.id)" -Method Put -Body $stResultBody -ContentType "application/json" -Headers $hWh
Write-Host "Stocktake Result Updated -> Actual: $($resStUpd.actualQuantity), Status: $($resStUpd.status)"


# ==================================================
# PHASE D: CONCURRENCY
# ==================================================
Write-Host "`n=================================================="
Write-Host "PHASE D: CONCURRENCY"
Write-Host "=================================================="
Write-Host "Testing concurrent stock reservation requests..."

$jobs = @()
1..5 | ForEach-Object {
    $scriptBlock = {
        param($url, $token, $orderId, $prodId)
        $h = @{ Authorization = "Bearer $token" }
        $body = @{ productId = $prodId; quantity = 10 } | ConvertTo-Json
        try {
            return Invoke-RestMethod -Uri "$url/api/staff/sales/orders/$orderId/reservations" -Method Post -Body $body -ContentType "application/json" -Headers $h
        } catch {
            return "REJECTED"
        }
    }
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $baseUrl, $sales1Token, $order1Id, $firstProd.id
}

$results = $jobs | Wait-Job | Receive-Job
Write-Host "Concurrent Reservation Results:"
$results | ForEach-Object { Write-Host "  - $_" }


# ==================================================
# PHASE E: SHIPPING EXCEPTION & COD RECONCILIATION
# ==================================================
Write-Host "`n=================================================="
Write-Host "PHASE E: SHIPPING & COD RECONCILIATION"
Write-Host "=================================================="

# Exception test
$exBody = @{ shipmentId = $shipmentId; type = "ADDRESS_NOT_FOUND"; description = "Khong tim thay so nha" } | ConvertTo-Json
$resEx = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/exceptions" -Method Post -Body $exBody -ContentType "application/json" -Headers $hShip
Write-Host "Shipment Exception Created ID: $($resEx.id), Type: $($resEx.exceptionType), Status: $($resEx.status)"

$resResolveEx = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/exceptions/$($resEx.id)/resolve" -Method Put -Body (@{ note = "Da goi khach xac nhan dia chi" } | ConvertTo-Json) -ContentType "application/json" -Headers $hShip
Write-Host "Shipment Exception Resolved Status: $($resResolveEx.status)"

# Pending COD check
$pendingCod = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/cod" -Method Get -Headers $hShip
Write-Host "Pending COD Shipments Count: $($pendingCod.Count)"

# Single COD Reconciliation
if ($pendingCod.Count -gt 0) {
    $codShipmentId = $pendingCod[0].id
    $resReconcile = Invoke-RestMethod -Uri "$baseUrl/api/staff/shipping/cod/$codShipmentId/reconcile" -Method Post -Headers $hShip
    Write-Host "COD Reconciled Shipment ID: $($resReconcile.id), CodReconciled: $($resReconcile.codReconciled)"
}


# ==================================================
# PHASE F: MARKETING
# ==================================================
Write-Host "`n=================================================="
Write-Host "PHASE F: MARKETING"
Write-Host "=================================================="

# Public Banners
$banners = Invoke-RestMethod -Uri "$baseUrl/api/marketing/banners" -Method Get
Write-Host "Public Banners fetched: $($banners.data.Count)"

# Public Vouchers
$vouchers = Invoke-RestMethod -Uri "$baseUrl/api/marketing/vouchers" -Method Get
Write-Host "Public Vouchers fetched: $($vouchers.data.Count)"

# Validate Voucher
$activeCode = if ($vouchers.data.Count -gt 0) { $vouchers.data[0].code } else { "WELCOME10" }
$valBody = @{ code = $activeCode; subtotal = 500000; isNewCustomer = $true } | ConvertTo-Json
try {
    $resValVoucher = Invoke-RestMethod -Uri "$baseUrl/api/marketing/vouchers/validate" -Method Post -Body $valBody -ContentType "application/json"
    Write-Host "Voucher Validation ($activeCode) SUCCESS -> Discount: $($resValVoucher.data.discountAmount), FinalTotal: $($resValVoucher.data.finalTotal)"
} catch {
    Write-Host "Voucher Validation ($activeCode): FAILED"
}

# Expired / Invalid Voucher Test
$invalidValBody = @{ code = "EXPIRED999"; subtotal = 100000 } | ConvertTo-Json
try {
    $resValInv = Invoke-RestMethod -Uri "$baseUrl/api/marketing/vouchers/validate" -Method Post -Body $invalidValBody -ContentType "application/json"
    Write-Host "Invalid Voucher Test: FAILED TO REJECT"
} catch {
    Write-Host "Invalid Voucher Test: REJECTED AS EXPECTED (404/400)"
}


# ==================================================
# PHASE G: STAFF DATA FIX & USER CREATION
# ==================================================
Write-Host "`n=================================================="
Write-Host "PHASE G: STAFF DATA FIX & USER CREATION"
Write-Host "=================================================="

$hAdmin = @{ Authorization = "Bearer $adminToken" }

# Test creating staff without shopId (Should be rejected with 400 Bad Request)
$invalidStaffBody = @{
    email = "test_invalid_staff_" + (Get-Random) + "@et.tee"
    fullName = "Invalid Staff No Shop"
    phone = "0912345678"
    roleCode = "SALES_STAFF"
    shopId = $null
    initialPassword = "Check@123"
} | ConvertTo-Json

try {
    $resInvStaff = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Method Post -Body $invalidStaffBody -ContentType "application/json" -Headers $hAdmin
    Write-Host "Staff Creation without shopId: SECURITY FAILURE - ALLOWED!"
} catch {
    Write-Host "Staff Creation without shopId: REJECTED AS EXPECTED (400 Bad Request)"
}

# Test creating staff with shopId = 1 (Should succeed)
$validStaffBody = @{
    email = "test_valid_sales_" + (Get-Random) + "@et.tee"
    fullName = "Valid Sales Staff Shop 1"
    phone = "0912345679"
    roleCode = "SALES_STAFF"
    shopId = 1
    initialPassword = "Check@123"
} | ConvertTo-Json

try {
    $resValidStaff = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Method Post -Body $validStaffBody -ContentType "application/json" -Headers $hAdmin
    Write-Host "Staff Creation with shopId=1: SUCCESS (User Email: $($resValidStaff.data.email), Role: $($resValidStaff.data.role), ShopId: $($resValidStaff.data.shopId))"
} catch {
    Write-Host "Staff Creation with shopId=1: FAILED"
}

Write-Host "`n=== MASTER PRODUCTION AUDIT SUITE COMPLETE ==="
