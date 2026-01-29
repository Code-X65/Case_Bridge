# Payment & Gating V1 Implementation Guide

## Overview
This feature implements the **Case Intake Priority Payment** system, ensuring that:
1.  **Strict Gating**: New cases generally cannot be created without a valid, paid intake plan.
2.  **Payment Flow**: Users select a plan -> Invoice Created -> Payment (Paystack) -> Invoice Paid -> Case Submission Unlocked.
3.  **Security**: Backend triggers prevent API bypass of the payment requirement.
4.  **Visibility**: Intake plans (Basic, Standard, Premium) are visible to Internal Staff for SLA tracking.

## Components Implemented

### Database (PostgreSQL)
*   **`invoices` Table**: Tracks payment status (`draft`, `pending`, `paid`, `failed`).
*   **`payments` Table**: Logs transaction attempts (Paystack refs).
*   **RPC `confirm_invoice_payment`**: Simulates webhook confirmation for development.
*   **Trigger `enforce_case_payment_gate`**: **Critical Security** - Blocks `INSERT` on `case_reports` if no valid paid invoice is linked.

### Frontend (React/Client)
*   **`SelectIntakePlan.tsx`** (`/billing/plans`): UI for choosing intake speed.
*   **`InvoicePaymentPage.tsx`** (`/billing/invoices/:id/pay`): Mock Paystack payment interface.
*   **`InvoicesPage.tsx`** (`/billing/history`): Client billing history table.
*   **`NewCase.tsx`**: Updated with a "Gate Step" that checks for payment before allowing form access.

### Frontend (Internal)
*   **`MatterWorkspace.tsx`**: Updated to show the **Intake Plan Badge** in the matter header.

## Execution Instructions

Please run the following SQL scripts in your Supabase SQL Editor in order:

1.  `c:\dev\Casebridge\casebridge-client\db_payment_v1.sql` (Schema & Basic Logic)
2.  `c:\dev\Casebridge\casebridge-client\db_payment_security.sql` (Strict Enforcement Triggers)

## Verification Steps
1.  **Client**: Go to `/cases/new`. You should be redirected to the **Intake Plan** page.
2.  **Client**: Select "Standard Priority" (₦15,000).
3.  **Client**: On the Payment Page, click "Pay Securely" (Simulated).
4.  **Client**: Upon success, you are redirected back to the Case Form.
5.  **Client**: Submit the case.
6.  **Client**: Check `/billing/history` to see the invoice.
7.  **Internal**: Log in as Case Manager, open the new matter, and verify the **Standard Intake** badge appears next to the status.
