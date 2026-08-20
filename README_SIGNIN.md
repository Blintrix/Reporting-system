Developer notes — Sign up / Technician-ID login

Overview

- The app removed demo quick-signin presets. Users must create accounts with their own credentials.
- During signup the user chooses an account type: `reporter`, `technician`, or `admin`.
- For convenience, technicians can sign in using a Technician ID (e.g. `tech-001`) by checking "Use Technician ID" on the Sign In form — the client maps `tech-001` → `tech-001@telone.co.zw` when authenticating.

Create example users (admin script)

- Use the included script `scripts/create_example_users.js` to create example users in your Supabase project.
- This script requires the Supabase service role key and URL, set as env vars:

```powershell
setx SUPABASE_URL "https://..."
setx SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
```

- Run the script from the project root:

```bash
node scripts/create_example_users.js
```

Notes

- The admin script uses the Supabase Admin API to create user accounts and also inserts a `user_roles` record for each user so the app recognizes their role.
- If you prefer manual creation, create users in the Supabase Auth panel with emails like `tech-001@telone.co.zw` and chosen passwords.

Test signup/signin (non-admin)

- The test script `scripts/test_signup_signin.js` demonstrates signing up and signing in using the public anon key. It requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars and will abort with an instruction if they are not set.

```bash
node scripts/test_signup_signin.js
```

Security

- Never commit service role keys to source control. Use environment variables and CI secret storage.
