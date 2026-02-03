# Staff Invitation Email System

## Overview
This document explains how the automatic email sending system works for staff invitations in CaseBridge.

## Architecture

### Components

1. **Edge Function**: `supabase/functions/send-invite-email/index.ts`
   - Handles actual email sending via Resend API
   - Falls back to console logging if no API key is configured
   - Sends beautifully formatted HTML emails

2. **Frontend Integration**:
   - `InviteUserModal.tsx` - Calls edge function after creating invitation
   - `StaffManagementPage.tsx` - Calls edge function when resending invitations

3. **Database Trigger** (Optional): `20260131_STAFF_INVITATION_EMAIL_SYSTEM.sql`
   - Automatically queues emails when invitations are created
   - Logs email attempts in audit_logs table

## Email Flow

### Creating a New Invitation

```
Admin Manager → InviteUserModal → create_secure_invitation RPC
                                          ↓
                                   Generate Token
                                          ↓
                                   Return to Frontend
                                          ↓
                              Call send-invite-email Edge Function
                                          ↓
                                   Send Email via Resend
```

### Resending an Invitation

```
Admin Manager → StaffManagementPage → resend_secure_invitation RPC
                                              ↓
                                       Generate New Token
                                              ↓
                                       Return to Frontend
                                              ↓
                                  Call send-invite-email Edge Function
                                              ↓
                                       Send Email via Resend
```

## Setup Instructions

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create a new API key (re_2RQ6N66M_LgzgboYBhd3TFMTPU5RGhbgT)
3. Verify your domain (or use their test domain for development)

### 2. Configure Supabase Edge Function

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Add environment variable:
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxx` (your Resend API key)

### 3. Deploy Edge Function

Run the following command to deploy the edge function:

```bash
npx supabase functions deploy send-invite-email
```

### 4. Test the System

1. Create a new staff invitation
2. Check the browser console for email sending logs
3. Check the recipient's inbox for the invitation email

## Email Template

The email includes:
- **Professional Header**: CaseBridge branding with gradient background
- **Personalized Greeting**: Uses first name if provided
- **Firm Name**: Shows which firm they're being invited to
- **Role Information**: Displays their assigned role
- **CTA Button**: Prominent "Accept Invitation" button
- **Fallback Link**: Plain text link for email clients that don't support buttons
- **Expiration Notice**: Mentions 72-hour expiration
- **Professional Footer**: Copyright and branding

## Development Mode

If `RESEND_API_KEY` is not set, the system will:
- Log email details to console
- Return success response (simulation mode)
- Not actually send emails

This allows development without requiring email service setup.

## Production Mode

When `RESEND_API_KEY` is configured:
- Emails are sent via Resend API
- Email ID is returned for tracking
- Errors are logged but don't break the invitation flow
- Invitation is created successfully even if email fails

## Error Handling

The system is designed to be resilient:
- If email sending fails, the invitation is still created
- Users can manually copy and share the invitation link
- Errors are logged to console for debugging
- User-friendly error messages are displayed

## Monitoring

### Check Email Sending Status

1. **Browser Console**: Look for "✅ Invitation email sent" messages
2. **Resend Dashboard**: View sent emails and delivery status
3. **Supabase Logs**: Check edge function logs for errors

### Audit Trail

All invitation activities are logged in the `audit_logs` table:
- `staff_invited` - When invitation is created
- `invitation_email_queued` - When email is queued (if using triggers)
- `staff_invite_resent` - When invitation is resent

## Customization

### Update Email Template

Edit `supabase/functions/send-invite-email/index.ts`:
- Modify the `emailHtml` variable
- Update colors, fonts, or layout
- Add your company logo

### Change Email Sender

Update the `from` field in the edge function:
```typescript
from: 'CaseBridge <invitations@yourdomain.com>',
```

**Note**: You must verify this domain in Resend first.

### Modify Email Subject

Update the `subject` field:
```typescript
subject: `Custom subject line - ${firm_name}`,
```

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `RESEND_API_KEY` is set in Supabase Edge Functions settings
2. **Check Domain**: Ensure sender domain is verified in Resend
3. **Check Logs**: Review Supabase edge function logs for errors
4. **Check Console**: Look for error messages in browser console

### Emails Going to Spam

1. Verify your domain in Resend
2. Set up SPF, DKIM, and DMARC records
3. Use a professional sender address
4. Avoid spam trigger words in subject/body

### Edge Function Not Deploying

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `npx supabase login`
3. Link project: `npx supabase link --project-ref your-project-ref`
4. Deploy: `npx supabase functions deploy send-invite-email`

## Security Considerations

- Invitation tokens are UUIDs (cryptographically secure)
- Tokens expire after 72 hours
- Email addresses are validated and sanitized
- Edge function uses SECURITY DEFINER for RLS bypass
- CORS headers restrict function access
- API keys are stored securely in Supabase secrets

## Future Enhancements

Potential improvements:
- [ ] Email templates with multiple languages
- [ ] Customizable email templates per firm
- [ ] Email delivery tracking and analytics
- [ ] Automatic retry on email failure
- [ ] Webhook for email delivery status
- [ ] SMS notifications as alternative to email
- [ ] In-app notification system

## Support

For issues or questions:
1. Check Supabase edge function logs
2. Review Resend dashboard for delivery status
3. Check browser console for client-side errors
4. Review audit_logs table for invitation history
