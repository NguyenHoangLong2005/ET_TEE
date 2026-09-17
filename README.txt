ET.TEE - STAFF ROLE & INVENTORY REDIRECT FIX
Source basis: ET_TEE(2).rar and the user's previous navigation/dashboard patches.
Patch root: extract this ZIP into F:\datn2\ET_TEE (not into F:\datn2\ET_TEE\web).

ROOT CAUSE: the previous patch made /staff/dashboard/warehouse/inventory redirect to
/staff/dashboard/warehouse/invnentory while the existing misspelled page redirected
back to /inventory. These two redirects formed an infinite loop (ERR_TOO_MANY_REDIRECTS).
The /inventory page now renders the actual inventory UI; only the misspelled legacy
route redirects once to /inventory. Clearing browser cookies is not required for this
code-level fix.

CHANGES:
- Original Merchant/Staff dashboard preserved, including four illustrative metrics,
  six old menu items, and three staff navigation cards. Metrics are labeled demo data.
- Three staff portals use the existing /staff/dashboard/{sales,warehouse,shipping}
  route hierarchy from the RAR; warehouse navigation includes new workflow pages.
- Sales orders: all/new/SLA list, verify recipient, confirm/cancel with safeguards,
  add/view notes, request stock reservation; aligns request bodies with StaffSalesController.
- Warehouse: live inventory page, change location, submit adjustment; add reservation
  approve/reject, adjustment approval, replenishment suggestions; receiving stock count
  compares quantities but does NOT persist the count (as the backend does not persist it).
  Packing and handover pages now call corresponding APIs instead of showing an
  unrelated placeholder/product list. Label preview and print come from label GET API.
- Shipping: existing shipment/tracking/handover/proof/COD pages kept; exceptions page
  adds create and resolution actions. Proof-of-delivery accepts an image URL only; it
  does not upload a file.
- Order IDs on older staff pages accept backend JSON field id (Order#getId) as well as
  orderId. Inventory uses backend Inventory#getId, not missing inventoryId.
- Next.js rewrite proxies browser /api/staff/* to backend, removing browser-localhost
  and cross-origin dependency when website is visited via 192.168.x.x:3000.
  Defaults to BACKEND_URL=http://127.0.0.1:8080 ON THE NEXT.JS SERVER.
  If Spring runs on another host, set BACKEND_URL before starting Next.js and restart it.

INSTRUCTIONS (PowerShell, after backing up/committing your current modifications):
  cd F:\datn2\ET_TEE
  Expand-Archive -LiteralPath "<path to ZIP>" -DestinationPath "F:\datn2\ET_TEE" -Force
  cd F:\datn2\ET_TEE\web
  npm run dev
  # Open http://192.168.1.203:3000/staff/dashboard/warehouse/inventory
  # If NEXT_PUBLIC_API_URL was previously used, the patched staff pages no longer need it.
  # If backend differs from localhost:8080, set $env:BACKEND_URL accordingly before npm run dev.

CRITICAL: Spring Boot must stay RUNNING for data to appear. The last startup log in this
conversation still had Spring Data repository errors. This frontend patch does not fix
backend Entity/Repository mappings, database data, authentication, roles, CORS for other
clients, or real API runtime defects.

SECURITY: the staff backend in the supplied RAR does not establish server-side RBAC.
The "approvedBy" ID input is a demo data field, not an authorization check.
Do not expose write endpoints on an untrusted network before adding authentication,
role enforcement, and auditing with actor identity on the backend.

NOTE: backend treats /picking/complete and /packing as alternatives that both change
PICKING -> PACKED. The UI calls the correct existing endpoint but cannot invent a
separate PACKING status. To model a distinct packing stage, update backend state machine.

VERIFICATION: static TypeScript syntax and staff route checks performed in the
assistant's workspace; no full Next.js build or live Spring Boot/database test performed.
