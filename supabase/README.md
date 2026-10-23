# Supabase setup

## 1. Create the tables and policies

In the Supabase Dashboard, open **SQL Editor**, create a query, paste all of `schema.sql`, and run it. It creates player profiles, progress, Endless records, friends, and the RPC functions used to write campaign rewards and scores. Row level security is enabled by the script.

## 2. Turn off email confirmation

Open **Authentication → Sign In / Providers → Email** and disable **Confirm email**. The game asks players for a username and password only. Supabase Auth still expects an email-shaped login identifier internally, so the client maps each username to a reserved, non-deliverable address under `accounts.wastelanddefense.invalid`; it does not ask for or send email. Because there is no real email on the account, forgotten passwords cannot be recovered through email.

## 3. Browser key

`supabase-config.js` contains this project's URL and its **publishable** key. The publishable key is designed to be visible in a browser. Never replace it with a secret or service-role key. Keep the SQL policies and functions in place; they restrict profile/progress writes to the signed-in player and allow public reads for the leaderboard.

## 4. Existing local saves

The first account used on a browser imports its current local coins, unlocked survivors, campaign clears, Endless records, username, and portrait through the one-time `import_legacy_progress` function. After that, the cloud save is authoritative and syncs across devices. A different account on the same browser starts from its own cloud save instead of copying the previous account's cached data.

## Notes

- Friends need accounts and must accept each other's username requests before their scores appear in the Friends board.
- Endless scores and campaign awards are written through authenticated database functions. Since the game itself runs in the browser, a determined player can still alter client-side gameplay or submit an invented score. Use a trusted server-side game verifier before treating leaderboard results as cheat-proof.
- This browser client loads `supabase-js` from jsDelivr at runtime. The game remains playable from its local save if Supabase or the CDN is unavailable.
