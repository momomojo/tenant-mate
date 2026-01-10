# Hooks TODO

## New Hooks Needed

### Messaging (P0)
- [ ] `useConversations.ts` - Fetch all conversations for user
- [ ] `useMessages.ts` - Fetch messages in a conversation
- [ ] `useSendMessage.ts` - Send a new message
- [ ] `useUnreadCount.ts` - Get unread message count
- [ ] `useCheckIns.ts` - Manage tenant check-ins

### Screening (P0)
- [ ] `useScreeningOrder.ts` - Create screening order
- [ ] `useScreeningReport.ts` - Fetch screening results
- [ ] `useScreeningProviders.ts` - Available screening providers

### Leases (P0)
- [ ] `useLeases.ts` - Fetch leases for property/tenant
- [ ] `useLeaseTemplates.ts` - Get available templates
- [ ] `useCreateLease.ts` - Create new lease
- [ ] `useSignatureStatus.ts` - Track e-signature status
- [ ] `useDocuSign.ts` - DocuSign integration (if using)

### Applicants (P0)
- [ ] `useApplicants.ts` - Fetch applicants for property
- [ ] `useApplicationForm.ts` - Get application form config
- [ ] `useSubmitApplication.ts` - Submit application
- [ ] `useApproveApplicant.ts` - Approve and convert to tenant

### Payments (P1)
- [ ] `usePaymentProcessors.ts` - Get configured processors
- [ ] `useDwollaPayment.ts` - Dwolla integration
- [ ] `useAdyenPayment.ts` - Adyen integration
- [ ] `useACHPayment.ts` - Generic ACH payment

### Properties (P1)
- [ ] `usePropertyImages.ts` - Manage property images
- [ ] `usePropertyTypes.ts` - Get property type options

### Accounting (P2)
- [ ] `useExpenses.ts` - Fetch expenses
- [ ] `useCreateExpense.ts` - Add new expense
- [ ] `useExpenseCategories.ts` - Get expense categories
- [ ] `useProfitLoss.ts` - Calculate P&L

---

## Existing Hooks - Enhancements

### useAuthenticatedUser.ts
- [x] Fixed: Uses getUser() instead of getSession()
- [ ] Add: User preferences loading
- [ ] Add: Payment processor preference

### useRealtimeSubscription.ts
- [ ] Add: Message notifications
- [ ] Add: Application notifications
- [ ] Add: Lease status notifications

---

## Technical Notes

All hooks should:
1. Use TanStack Query for data fetching
2. Support real-time updates where applicable
3. Handle loading and error states
4. Be properly typed with TypeScript
