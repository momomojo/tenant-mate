# Edge Functions TODO

## New Edge Functions Needed

### Tenant Screening (P0)
- [ ] `order-screening/index.ts` - Create screening order with TransUnion/Experian
- [ ] `screening-webhook/index.ts` - Handle screening completion callbacks
- [ ] `get-screening-report/index.ts` - Fetch completed screening report

### E-Signatures (P0)
- [ ] `create-signature-request/index.ts` - Send lease for signature (DocuSign/HelloSign)
- [ ] `signature-webhook/index.ts` - Handle signature completion
- [ ] `get-signed-document/index.ts` - Retrieve signed document

### Alternative Payment Processors (P1)
- [ ] `dwolla-payment/index.ts` - Process ACH via Dwolla ($0.25/tx)
- [ ] `dwolla-webhook/index.ts` - Handle Dwolla events
- [ ] `adyen-payment/index.ts` - Process ACH via Adyen ($0.40/tx)
- [ ] `adyen-webhook/index.ts` - Handle Adyen events

### Messaging (P0)
- [ ] `send-push-notification/index.ts` - Push notifications for messages

### Marketing (P2)
- [ ] `syndicate-listing/index.ts` - Post listing to Zillow API
- [ ] `remove-listing/index.ts` - Remove listing from syndication

---

## Existing Functions - Status

### create-checkout-session/
- [x] Deployed
- [x] Uses Deno.serve()
- [x] Updated to Stripe API 2024-11-20
- [ ] TODO: Add support for multiple payment processors

### stripe-webhook/
- [x] Deployed
- [x] Uses Deno.serve()
- [x] Async signature verification fixed
- [ ] TODO: Add Dwolla/Adyen webhook handling

### generate-receipt/
- [x] Deployed
- [x] Uses Deno.serve()
- [ ] TODO: Generate PDF instead of HTML

### send-notification-email/
- [x] Deployed
- [x] Uses Deno.serve()
- [ ] TODO: Add message notification templates
- [ ] TODO: Add application notification templates
- [ ] TODO: Add lease status notification templates

### database-webhook/
- [x] Deployed
- [x] Handles maintenance_requests, tenant_units
- [ ] TODO: Add messages table handler
- [ ] TODO: Add applications table handler
- [ ] TODO: Add leases table handler

---

## Third-Party API Keys Needed

### For Tenant Screening
- TransUnion API credentials OR
- Experian API credentials OR
- Use aggregator like Plaid Identity Verification

### For E-Signatures
- DocuSign API key OR
- HelloSign API key OR
- SignWell API key (cheaper option)

### For Alternative Payments
- Dwolla API key
- Adyen API key

### For Marketing Syndication
- Zillow API (Zillow Rental Manager)
- Apartments.com API
- RentPath API

---

## Configuration

Add to Supabase Dashboard → Edge Functions → Secrets:
```
TRANSUNION_API_KEY=xxx
DOCUSIGN_INTEGRATION_KEY=xxx
DOCUSIGN_SECRET_KEY=xxx
DWOLLA_KEY=xxx
DWOLLA_SECRET=xxx
ZILLOW_API_KEY=xxx
```
