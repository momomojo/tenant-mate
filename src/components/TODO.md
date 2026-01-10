# Components TODO

## New Component Folders Needed

### messaging/ (P0)
- [ ] `MessageList.tsx` - Display conversation messages
- [ ] `MessageInput.tsx` - Compose and send messages
- [ ] `ConversationList.tsx` - List of all conversations
- [ ] `CheckInCard.tsx` - Periodic tenant satisfaction check-in
- [ ] `MessageBubble.tsx` - Individual message display

### screening/ (P0)
- [ ] `ScreeningOrder.tsx` - Order a new screening
- [ ] `ScreeningReport.tsx` - Display screening results
- [ ] `CreditScore.tsx` - Credit score visualization
- [ ] `BackgroundCheck.tsx` - Background check results
- [ ] `EvictionHistory.tsx` - Eviction records display

### lease/ (P0)
- [ ] `LeaseBuilder.tsx` - Create/edit lease from template
- [ ] `LeasePreview.tsx` - Preview lease document
- [ ] `SignatureRequest.tsx` - Request e-signature
- [ ] `SignatureStatus.tsx` - Track signature status
- [ ] `LeaseCard.tsx` - Lease summary card

### applicants/ (P0)
- [ ] `ApplicantCard.tsx` - Applicant summary
- [ ] `ApplicationForm.tsx` - Rental application form
- [ ] `ApplicantPipeline.tsx` - Kanban-style pipeline view
- [ ] `InviteToApply.tsx` - Send application invitation

---

## Existing Components - Enhancements

### property/
- [ ] Add `PropertyImageUpload.tsx` - Image upload component
- [ ] Add `PropertyImageGallery.tsx` - Image gallery display
- [ ] Add `PropertyTypeSelector.tsx` - Property type dropdown
- [ ] Update `PropertyOverview.tsx` - Show images and type

### payment/
- [ ] Add `PaymentProcessorSelect.tsx` - Choose payment processor
- [ ] Add `ACHPaymentForm.tsx` - ACH-specific payment form
- [ ] Add `FeeComparison.tsx` - Show processing fees
- [ ] Update `StripeConnect.tsx` - Support multiple processors

### tenant/
- [ ] Add `TenantMessaging.tsx` - Quick message from profile
- [ ] Add `TenantScreeningReport.tsx` - View screening
- [ ] Add `TenantLeases.tsx` - Associated leases

### notifications/
- [ ] Add `MessageNotification.tsx` - New message alerts
- [ ] Add `ApplicationNotification.tsx` - New application alerts
- [ ] Add `LeaseNotification.tsx` - Lease status alerts

---

## UI Components Needed

### ui/
- [ ] `Kanban.tsx` - Kanban board for applicant pipeline
- [ ] `FileUpload.tsx` - Generic file/image upload
- [ ] `ImageGallery.tsx` - Lightbox image gallery
- [ ] `RichTextEditor.tsx` - For lease editing
- [ ] `Signature.tsx` - Signature capture/display
- [ ] `ChatBubble.tsx` - Chat message styling
- [ ] `EmojiPicker.tsx` - For check-in responses
