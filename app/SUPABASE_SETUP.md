# Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase-schema.sql`.
3. Open Project Settings > API.
4. Copy the Project URL and anon public key.
5. Paste them into `supabase-config.js`.

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY",
};
```

The anon key is designed to be public in browser apps. The current policies allow anonymous players to read the leaderboard and upsert player rows. This is suitable for an early public prototype, but it is not strong anti-cheat protection.
