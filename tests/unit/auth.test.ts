import assert from 'node:assert/strict';
import { db } from '../../src/lib/db';
import {
  hashPassword,
  verifyPassword,
  describePasswordProblem,
  INITIAL_ADMIN_PASSWORD,
} from '../../src/lib/auth';

/**
 * Sign-in must actually check the password. An earlier version matched on the
 * email alone, so any password opened a full admin session.
 */

console.log('🔐 Starting Divine Foods authentication tests...\n');

const adminEmail = 'admin@divinefoods.com';

// 1. A wrong password must never sign in.
console.log('Test 1: the password is verified');
{
  db.resetToDemoData();
  await db.ensureInitialCredentials();

  assert.equal(
    await db.verifyCredentials(adminEmail, 'wrong-password'),
    null,
    'a wrong password must be rejected'
  );
  assert.equal(
    await db.verifyCredentials(adminEmail, ''),
    null,
    'an empty password must be rejected'
  );
  assert.equal(
    await db.verifyCredentials(adminEmail, INITIAL_ADMIN_PASSWORD.toLowerCase()),
    null,
    'password checking must be case sensitive'
  );

  const ok = await db.verifyCredentials(adminEmail, INITIAL_ADMIN_PASSWORD);
  assert.ok(ok, 'the correct password must be accepted');
  assert.equal(ok?.role, 'ADMIN');
  console.log('  ✔ Wrong passwords rejected, correct password accepted');
}

// 2. An unknown account must not be distinguishable from a wrong password.
console.log('Test 2: unknown accounts are rejected');
{
  db.resetToDemoData();
  await db.ensureInitialCredentials();
  assert.equal(
    await db.verifyCredentials('nobody@example.com', INITIAL_ADMIN_PASSWORD),
    null,
    'an unknown email must not sign in'
  );
  console.log('  ✔ Unknown account rejected');
}

// 3. Passwords are never stored in a readable form.
console.log('Test 3: passwords are stored hashed, never in the clear');
{
  db.resetToDemoData();
  await db.ensureInitialCredentials();

  const admin = db.getUsers().find(u => u.email === adminEmail)!;
  await db.setUserPassword(admin.id, 'Vadodara7788');

  const exported = db.exportDatabaseBackup();
  assert.ok(
    !exported.includes('Vadodara7788'),
    'the password must not appear anywhere in the stored data'
  );
  assert.ok(
    !exported.includes(INITIAL_ADMIN_PASSWORD),
    'the setup password must not survive in the stored data'
  );

  assert.ok(
    await db.verifyCredentials(adminEmail, 'Vadodara7788'),
    'the new password must work'
  );
  assert.equal(
    await db.verifyCredentials(adminEmail, INITIAL_ADMIN_PASSWORD),
    null,
    'the replaced password must stop working'
  );
  console.log('  ✔ Only a hash is stored; the old password stops working');
}

// 4. Accounts handed to the UI must not carry credentials.
console.log('Test 4: credentials never leave the database service');
{
  db.resetToDemoData();
  await db.ensureInitialCredentials();

  for (const user of db.getUsers()) {
    const record = user as unknown as Record<string, unknown>;
    assert.ok(!('password' in record), 'no readable password may be exposed');
    assert.ok(!('password_hash' in record), 'no password hash may be exposed');
    assert.ok(!('password_salt' in record), 'no password salt may be exposed');
  }
  console.log('  ✔ Listed accounts carry no credentials');
}

// 5. A fresh install must demand a password change before it can be used.
console.log('Test 5: the setup password must be changed at first sign-in');
{
  db.resetToDemoData();
  await db.ensureInitialCredentials();

  const signedIn = await db.verifyCredentials(adminEmail, INITIAL_ADMIN_PASSWORD);
  assert.equal(
    signedIn?.must_change_password,
    true,
    'a new installation must require a password change'
  );

  await db.setUserPassword(signedIn!.id, 'Vadodara7788');
  const after = await db.verifyCredentials(adminEmail, 'Vadodara7788');
  assert.equal(after?.must_change_password, false, 'changing the password clears the requirement');
  console.log('  ✔ First sign-in forces a change, which then clears');
}

// 6. An account created by an admin starts with a temporary password.
console.log('Test 6: newly created accounts must change their password');
{
  db.resetToDemoData();
  const created = db.addUser({
    name: 'Stall Staff',
    email: 'stall@divinefoods.com',
    role: 'EXHIBITION_USER',
    is_active: true,
  });
  await db.resetUserPassword(created.id, 'Temporary123');

  const signedIn = await db.verifyCredentials('stall@divinefoods.com', 'Temporary123');
  assert.ok(signedIn, 'the temporary password must work once');
  assert.equal(signedIn?.must_change_password, true, 'the new account must be forced to change it');
  console.log('  ✔ Temporary password works once and forces a change');
}

// 7. Hashing basics: same password, different salts, no reuse.
console.log('Test 7: hashing uses a per-account salt');
{
  const a = await hashPassword('SamePassword1');
  const b = await hashPassword('SamePassword1');
  assert.notEqual(a.password_salt, b.password_salt, 'each account gets its own salt');
  assert.notEqual(a.password_hash, b.password_hash, 'the same password must not produce one hash');

  assert.ok(await verifyPassword('SamePassword1', a), 'a correct password verifies');
  assert.ok(!(await verifyPassword('SamePassword2', a)), 'a wrong password does not verify');
  assert.ok(!(await verifyPassword('SamePassword1', undefined)), 'a missing record never verifies');
  console.log('  ✔ Salted hashing verified');
}

// 8. Weak passwords are refused at the point of entry.
console.log('Test 8: weak passwords are refused');
{
  assert.ok(describePasswordProblem('short1'), 'a short password is refused');
  assert.ok(describePasswordProblem('allletters'), 'letters alone are refused');
  assert.ok(describePasswordProblem('12345678'), 'digits alone are refused');
  assert.ok(describePasswordProblem('divine2026'), 'the old shared password is refused');
  assert.equal(describePasswordProblem('Vadodara7788'), null, 'a reasonable password is accepted');
  console.log('  ✔ Weak passwords refused');
}

// 9. Changing your own password requires the current one.
console.log('Test 9: changing your own password requires the current password');
{
  db.resetToDemoData();
  await db.ensureInitialCredentials();

  const admin = db.getUsers().find(u => u.email === adminEmail)!;
  await db.setUserPassword(admin.id, 'Vadodara7788');

  // The check the Settings screen performs before changing anything.
  const wrong = await db.verifyCredentials(adminEmail, 'NotMyPassword9');
  assert.equal(wrong, null, 'a wrong current password must not be accepted');

  const right = await db.verifyCredentials(adminEmail, 'Vadodara7788');
  assert.ok(right, 'the real current password is accepted');

  await db.setUserPassword(admin.id, 'FinalPass2026');
  assert.ok(
    await db.verifyCredentials(adminEmail, 'FinalPass2026'),
    'the replacement password works'
  );
  assert.equal(
    await db.verifyCredentials(adminEmail, 'Vadodara7788'),
    null,
    'the previous password stops working'
  );
  console.log('  \u2714 Own-password change verified against the current password');
}

// 10. An administrator can reset any account's password.
console.log('Test 10: an administrator can reset another account');
{
  db.resetToDemoData();
  await db.ensureInitialCredentials();

  const staff = db.addUser({
    name: 'Stall Operator',
    email: 'stall@divinefoods.com',
    role: 'EXHIBITION_USER',
    is_active: true,
  });
  await db.resetUserPassword(staff.id, 'StartPass123');
  assert.ok(
    await db.verifyCredentials('stall@divinefoods.com', 'StartPass123'),
    'the first password works'
  );

  // The administrator issues a new temporary password.
  await db.resetUserPassword(staff.id, 'Stall9182Temp');

  assert.equal(
    await db.verifyCredentials('stall@divinefoods.com', 'StartPass123'),
    null,
    'the replaced password must stop working'
  );
  const reset = await db.verifyCredentials('stall@divinefoods.com', 'Stall9182Temp');
  assert.ok(reset, 'the administrator-set password works');
  assert.equal(
    reset?.must_change_password,
    true,
    'the account must choose its own password at next sign-in'
  );

  // Resetting one account must not disturb another.
  assert.ok(
    await db.verifyCredentials(adminEmail, INITIAL_ADMIN_PASSWORD),
    'the administrator account is unaffected'
  );
  console.log('  \u2714 Administrator reset works and forces the user to choose their own');
}

db.resetToDemoData();
console.log('\n✅ Authentication tests passed.');
