# H2. Supabase Edge Function Specifications

## 1. `sendInviteEmail()`

**Trigger**: Admin Manager clicks "Invite User" in dashboard.

```typescript
interface InvitePayload {
  email: string;
  role: 'case_manager' | 'associate_lawyer';
  firm_id: string;
  invited_by: string;
}

export async function sendInviteEmail(payload: InvitePayload) {
  // 1. Validate permissions
  const caller = await getUser(payload.invited_by);
  if (!isFirmAdmin(caller)) throw new Error("Unauthorized");

  // 2. Generate Secret Token
  const token = crypto.randomUUID() + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 3. Insert into Database
  const { error } = await supabase
    .from('invitations')
    .insert({
      firm_id: payload.firm_id,
      email: payload.email,
      role_preassigned: payload.role,
      token: token,
      expires_at: expiresAt,
      status: 'pending'
    });

  if (error) throw error;

  // 4. Send Email (e.g. Resend / SendGrid)
  await emailService.send({
    to: payload.email,
    subject: "You're invited to CaseBridge Internal",
    html: renderInviteTemplate({
      link: `https://internal.casebridge.com/accept-invite/${token}`,
      firmName: caller.firm_name
    })
  });

  // 5. Audit Log
  await logAction('USER_INVITED', payload);
}
```

---

## 2. `acceptInvite()`

**Trigger**: User submits the "Set Password" form on `AcceptInvitePage`.

```typescript
interface AcceptPayload {
  token: string;
  password: string;
  first_name: string;
  last_name: string;
}

export async function acceptInvite(payload: AcceptPayload) {
  // 1. Validate Token
  const invite = await supabase
    .from('invitations')
    .select('*')
    .eq('token', payload.token)
    .single();

  if (!invite || new Date() > new Date(invite.expires_at)) {
    throw new Error("Invalid or expired token");
  }

  // 2. Create Auth User (Supabase Admin API)
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: invite.email,
    password: payload.password,
    email_confirm: true // Auto-confirm since they had the token
  });

  // 3. Create Profile & Role Binding
  await supabase.rpc('complete_user_onboarding', {
    user_id: user.id,
    firm_id: invite.firm_id,
    role: invite.role_preassigned,
    full_name: `${payload.first_name} ${payload.last_name}`
  });

  // 4. Invalidate Token
  await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date() })
    .eq('id', invite.id);

  return { success: true };
}
```

---

## 3. `lockAccount()`

**Trigger**: Failed login attempt webhook / database trigger.

```typescript
export async function lockAccount(email: string) {
  // 1. Increment Count
  const attempts = await incrementLoginAttempts(email);

  // 2. Check Threshold
  if (attempts >= 3) {
    const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
    
    // 3. Update Database
    await supabase
      .from('profiles')
      .update({ status: 'locked' })
      .eq('email', email);

    await supabase
      .from('login_attempts')
      .update({ locked_until: lockedUntil })
      .eq('email', email);

    // 4. Log Security Event
    await logAction('ACCOUNT_LOCKED', { email, reason: 'Brute force protection' });
  }
}
```

---

## 4. `enforceRoleAccess()`

**Trigger**: Middleware on protected routes.

```typescript
export async function enforceRoleAccess(req: Request) {
  // 1. Get User
  const user = await getUserFromHeader(req);
  
  // 2. Get Required Role for Route
  const requiredRoles = getRoutePermissions(req.url);

  // 3. Fetch User Role
  const { data: profile } = await supabase
    .from('user_firm_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  // 4. Validate
  if (!requiredRoles.includes(profile.role)) {
    throw new Error("403 Forbidden: Role Mismatch");
  }

  return next();
}
```
