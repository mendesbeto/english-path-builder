# Security regression workflow

The database authorization matrix lives at:

`supabase/tests/database/security_role_matrix.sql`

It runs as one transaction, creates temporary Auth/profile/class/lesson fixtures, executes the RLS checks as the `authenticated` role, and rolls everything back.

## Local/test database

Run it only against a dedicated non-production database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database/security_role_matrix.sql
```

The harness intentionally ends with `ROLLBACK`.

## GitHub Actions

The workflow is:

`.github/workflows/security-role-matrix.yml`

It runs for pull requests that change Supabase migrations/tests and can also be started manually.

Configure this repository secret before relying on the workflow:

`SUPABASE_TEST_DATABASE_URL`

The value must point to a dedicated test/staging database. Do not use a production connection string.

The workflow installs only the PostgreSQL client and executes the same SQL harness with `ON_ERROR_STOP=1`. A missing secret fails explicitly instead of silently skipping the security checks.

## Scope

The matrix currently verifies, among other invariants:

- cross-user profile isolation;
- cross-user lesson-progress isolation;
- direct lesson-progress write denial;
- student access to published exercises without answer keys;
- class membership isolation;
- class ownership boundaries;
- approved vs. unapproved teacher access;
- student denial of admin role management;
- self-approval and profile system-field protection;
- controlled admin role changes;
- last-admin protection.

The production project does not currently expose pgTAP, so this regression harness is intentionally plain SQL and is not a pgTAP test suite.
