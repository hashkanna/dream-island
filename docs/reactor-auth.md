> ## Documentation Index
> Fetch the complete documentation index at: https://docs.reactor.inc/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Reactor hosts multiple models, each with its own connect slug (modelName) and command/event schema. The catalog of every model — slug, typed SDK package, and links to its schema — is at /model-api-reference/overview. Some models expose one slug per experience (e.g. HappyOyster); always take the slug from the model's own pages, never guess it.
> Fastest path to a working app: `npx create-reactor-app my-app --model=<slug>` scaffolds a complete app with secure auth wired up. Typed TypeScript SDKs are published as @reactor-models/<model>; Python uses the base reactor-sdk package.
> Auth: exchange an API key (rk_...) for a JWT via POST https://api.reactor.inc/tokens from your server. Never put the API key in client-side code.
> Append .md to any docs URL for clean Markdown. Search these docs via the MCP server at https://docs.reactor.inc/mcp.

# Authentication

> How authentication works in Reactor

Reactor uses API keys to authenticate requests. JavaScript apps exchange the key for a short-lived
token; Python apps pass the key directly and the SDK does the exchange for them.

## Get your API key

<Steps>
  <Step title="Create an account">Sign up at [reactor.inc](https://reactor.inc).</Step>

  <Step title="Create an API key">
    Open the **[Dashboard](https://reactor.inc/dashboard)**, click your user icon, then navigate to
    **API Keys** to create a new key.
  </Step>

  <Step title="Copy your key">
    Your key starts with `rk_`. Store it securely and never commit it to source control.
  </Step>
</Steps>

<Tabs>
  <Tab title="JavaScript">
    ## JavaScript

    ### How it works

    Your server exchanges the API key for a short-lived token, which the browser uses to connect. Always
    mint **session-scoped** tokens: pass `authorization_details` naming the models the token may start
    sessions for. A scoped token can only create and operate its own sessions — it cannot touch other
    sessions, other models, or any account API. If it leaks, the blast radius is a handful of sessions
    on the models you listed, for at most the token's lifetime (1 hour by default).

    <Frame>
      <img src="https://mintcdn.com/reactortechnologiesinc/3wrpLd7R1K3eK0X3/diagrams/auth-browser.svg?fit=max&auto=format&n=3wrpLd7R1K3eK0X3&q=85&s=4e4caddf944dcbc4c8982ce040bbf07d" alt="Server exchanges API key for a token, passes token to browser, browser connects to Reactor" width="660" height="224" data-path="diagrams/auth-browser.svg" />
    </Frame>

    ### Generate a session-scoped token

    Exchange your API key for a short-lived token by making a `POST` request to the `/tokens` endpoint
    with your API key in the `Reactor-API-Key` header. **Always scope the token** with
    `authorization_details`, naming the models it may start sessions for:

    ```typescript Session-scoped (1-hour expiry) theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    const result = await fetch("https://api.reactor.inc/tokens", {
      method: "POST",
      headers: {
        "Reactor-API-Key": process.env.REACTOR_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authorization_details: [
          {
            type: "session",
            resources: { models: { match: ["your-model-name"] } },
            constraints: { max_sessions: 5, max_session_duration_seconds: 3600 },
          },
        ],
      }),
    });
    const { jwt, expires_at } = await result.json();
    ```

    ```typescript Custom expiry theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    const result = await fetch("https://api.reactor.inc/tokens", {
      method: "POST",
      headers: {
        "Reactor-API-Key": process.env.REACTOR_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: Number(process.env.TOKEN_LIFETIME_SECONDS),
        authorization_details: [
          {
            type: "session",
            resources: { models: { match: ["your-model-name"] } },
            constraints: { max_sessions: 5 },
          },
        ],
      }),
    });
    const { jwt, expires_at } = await result.json();
    ```

    The `authorization_details` entry has these parts:

    * **`type: "session"`** (required) — the only supported type today. The token can create sessions
      and do everything those sessions need (transport negotiation, uploads, clips, session logs), and
      nothing else.
    * **`resources.models.match`** (required) — a non-empty list of models the token may start sessions
      for. Every listed model must be visible to your API key. There is no wildcard; list each model
      explicitly.
    * **`constraints.max_sessions`** (optional) — how many sessions the token may create in total, from
      1 to 500. Defaults to 5. This counts sessions ever created by the token, not concurrent ones:
      closing a session does not restore capacity.
    * **`constraints.max_session_duration_seconds`** (optional) — cap every session the token creates
      at this many seconds, from 1 to 86 400 (24 hours). Omit for no limit; if the account also has a
      maximum, the lower value wins. See
      [Rate limits](/resources/rate-limits#session-max-duration).
    * **`resources.sessions.bind`** (optional) — a non-empty list of session IDs that already exist,
      created by a different token. A session-scoped token can otherwise only act on sessions it created
      itself; this authorizes it for named sessions it didn't. See [Keeping the token fresh for a whole
      session](#keeping-the-token-fresh-for-a-whole-session) below for the case this is for.

    Session-scoped tokens live for **1 hour** by default. Pass `expires_after` (in seconds) to shorten
    or extend the lifetime, up to the server ceiling of 6 hours; values at or above the ceiling are
    silently clamped. The server still returns 200, so always check `expires_at` (a Unix epoch
    timestamp) on the response to confirm the actual expiry.

    <Warning>
      Omitting `authorization_details` mints an **unscoped** token that can call every API your key's
      roles allow — sessions on any model, account data, key management. Never hand an unscoped token to
      a browser. Reserve unscoped tokens for trusted server-to-server calls (for example the [Platform
      API](/resources/platform-api-overview)), and don't store your API key in client-side code either:
      use your server as a proxy to mint scoped tokens, as shown below.
    </Warning>

    ### Server-side proxy

    Set up an API route on your server that mints a session-scoped token and returns it to your
    frontend:

    <CodeGroup>
      ```typescript Next.js theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
      import { NextResponse } from "next/server";

      export async function POST() {
        const result = await fetch("https://api.reactor.inc/tokens", {
          method: "POST",
          headers: {
            "Reactor-API-Key": process.env.REACTOR_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorization_details: [
              {
                type: "session",
                resources: { models: { match: ["your-model-name"] } },
              },
            ],
          }),
        });
        const { jwt } = await result.json();

        return NextResponse.json({ jwt });
      }
      ```

      ```typescript Express theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
      app.post("/api/token", async (_req, res) => {
        const result = await fetch("https://api.reactor.inc/tokens", {
          method: "POST",
          headers: {
            "Reactor-API-Key": process.env.REACTOR_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorization_details: [
              {
                type: "session",
                resources: { models: { match: ["your-model-name"] } },
              },
            ],
          }),
        });
        const { jwt } = await result.json();

        res.json({ jwt });
      });
      ```
    </CodeGroup>

    Then fetch the token from your frontend and pass it to the SDK:

    ```tsx app/page.tsx theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    "use client";

    import { use } from "react";
    import { ReactorProvider, ReactorView } from "@reactor-team/js-sdk";

    async function getToken() {
      const result = await fetch("/api/token", { method: "POST" });
      const { jwt } = await result.json();
      return jwt;
    }

    const tokenPromise = getToken();

    export default function App() {
      const token = use(tokenPromise);
      return (
        <ReactorProvider modelName="your-model-name" jwtToken={token}>
          <ReactorView className="w-full aspect-video" />
        </ReactorProvider>
      );
    }
    ```

    ### Keeping the token fresh for a whole session

    `jwtToken` also accepts a resolver — a function returning a string or a `Promise<string>` — instead
    of a static value. Pass one whenever a session might outlive a single connect: the SDK calls the
    resolver again for every later request that session makes (uploads, clip manifests, ICE refreshes,
    SDP renegotiation), not just the initial connect.

    A resolver that mints a fresh token on every call breaks the session the moment it runs: a
    session-scoped token can only act on the sessions **it** created, so a newly-minted token has none
    of them bound yet, and the next upload or clip request 403s. Cache the token yourself, and only mint
    again once it's close to expiring:

    ```typescript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    const TOKEN_REFRESH_SKEW_MS = 60_000;
    let cachedToken: { jwt: string; expiresAtMs: number } | null = null;
    let inflightToken: Promise<string> | null = null;

    async function getToken(): Promise<string> {
      if (cachedToken && Date.now() < cachedToken.expiresAtMs - TOKEN_REFRESH_SKEW_MS) {
        return cachedToken.jwt;
      }
      if (inflightToken) return inflightToken; // coalesce parallel hops
      inflightToken = (async () => {
        try {
          const result = await fetch("/api/token", { method: "POST", cache: "no-store" });
          const { jwt, expires_at } = await result.json();
          cachedToken = { jwt, expiresAtMs: expires_at * 1000 };
          return jwt;
        } finally {
          inflightToken = null;
        }
      })();
      return inflightToken;
    }
    ```

    Cache the token in your own code, not in the browser's HTTP cache: fetch with `{ cache: "no-store" }`
    rather than relying on a `Cache-Control` header to do the memoizing for you. The browser cache is
    outside your control — DevTools' "Disable cache", an eviction, or a shared proxy can all miss it
    silently, and the resolver falls back to minting a token with no sessions bound, 403ing every call
    the session makes from then on.

    <Note>
      **Edge case**: a session created moments before the cached token expires is orphaned at the next
      refresh — the freshly-minted token isn't bound to it. Fix it by re-minting with
      `authorization_details.resources.sessions.bind` naming that session's ID, so the new token
      inherits authorization for it.
    </Note>

    ### Tokens for a queue or admission-control server

    If you run an admission-control layer in front of a fixed pool of sessions — a waiting room gating
    limited GPU capacity, for example — mint a separate token per admitted slot instead of one shared
    token for the whole pool. Scope each token to `max_sessions: 1` so it can create exactly the one
    session it is being admitted into:

    ```bash theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    curl -X POST https://api.reactor.inc/tokens \
      -H "Reactor-API-Key: $REACTOR_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "expires_after": 900,
        "authorization_details": [
          {
            "type": "session",
            "resources": { "models": { "match": ["reactor/helios"] } },
            "constraints": { "max_sessions": 1 }
          }
        ]
      }'
    ```

    ```typescript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    async function mintSlotToken(model: string, slotLifetimeSeconds: number) {
      const result = await fetch("https://api.reactor.inc/tokens", {
        method: "POST",
        headers: {
          "Reactor-API-Key": process.env.REACTOR_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expires_after: slotLifetimeSeconds,
          authorization_details: [
            {
              type: "session",
              resources: { models: { match: [model] } },
              constraints: { max_sessions: 1 },
            },
          ],
        }),
      });
      const { jwt, expires_at } = await result.json();
      return { jwt, expires_at };
    }
    ```

    Size `slotLifetimeSeconds` to the slot's whole lifetime: the time an admitted user might take to
    connect, plus the full session duration. Omitting it defaults to 1 hour, and 6 hours is the
    [ceiling](#generate-a-session-scoped-token); a session-scoped token can't be topped up mid-session,
    so undersizing this strands the session it created. Hand the resulting `jwt` to the admitted client
    the same way as the [server-side proxy](#server-side-proxy) above; its `connect()` call creates the
    session and binds it to this token's grant.

    <Note>
      If your API key is compromised, rotate it immediately from the
      **[Dashboard](https://reactor.inc/dashboard)**. Rotating does not affect active sessions. Need
      help? Email us at [support@reactor.inc](mailto:support@reactor.inc).
    </Note>

    <Note>
      **Adopting an existing session.** If your backend creates a session and hands the `sessionId` to a
      client, that client must connect with a token that can access the session. Session-scoped tokens
      are bound to the sessions they create, so the simplest approach is to hand the client the same
      scoped JWT your backend created the session with. See
      [Sessions](/concepts/sessions#multiple-connections-per-session).
    </Note>
  </Tab>

  <Tab title="Python">
    ## Python

    ### How it works

    **Python** runs server-side, so you pass your API key straight to the `Reactor` constructor. On
    `connect()`, the SDK exchanges it for a short-lived, **session-scoped** token — scoped to the model
    you built the `Reactor` with — and authenticates every request with that token, never the raw key.
    If that token leaks, the blast radius is a handful of sessions on that one model, not your whole
    account. Scoping is automatic; there is nothing extra to configure.

    <Frame>
      <img src="https://mintcdn.com/reactortechnologiesinc/3wrpLd7R1K3eK0X3/diagrams/auth-python.svg?fit=max&auto=format&n=3wrpLd7R1K3eK0X3&q=85&s=3ac9a1c883a5e707d2560a9dcad1e853" alt="Your app sends the API key directly to Reactor" width="520" height="96" data-path="diagrams/auth-python.svg" />
    </Frame>

    Pass your API key directly to the `Reactor` constructor:

    ```python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    import os
    from reactor_sdk import Reactor

    reactor = Reactor(
        model_name="your-model-name",
        api_key=os.environ["REACTOR_API_KEY"],
    )

    # Mints a token scoped to "your-model-name", then connects with it.
    await reactor.connect()
    ```

    <Tip>
      Never hardcode `rk_...` values in your code or commit them to source control. Use environment
      variables.
    </Tip>

    ### Minting a token yourself

    Need a token for something other than a `Reactor` connection — a JWT broker that hands tokens to
    browser clients, for instance? Call `fetch_jwt` and scope it with `models`:

    ```python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    import asyncio
    import os
    from reactor_sdk import DEFAULT_API_URL, fetch_jwt

    # fetch_jwt is synchronous — run it in a thread from async code so it doesn't
    # block the event loop.
    jwt = await asyncio.to_thread(
        fetch_jwt,
        api_key=os.environ["REACTOR_API_KEY"],
        api_url=DEFAULT_API_URL,
        models=["your-model-name"],  # session-scoped to these models
    )
    ```

    Pass `max_sessions` to cap how many sessions the token may create (1–500, default 5), and
    `expires_after` (in seconds) to shorten its lifetime below the 6-hour ceiling. Omitting `models`
    mints an **unscoped** token that can call every API your key's roles allow — reserve that for
    trusted server-to-server calls such as the [Platform API](/resources/platform-api-overview), and
    never hand one to a client.

    <Note>
      **Adopting a session someone else created.** `connect(session_id=...)` attaches to a session that
      already exists rather than creating one. Because a session-scoped token can only act on the
      sessions it created itself, the SDK mints an unscoped token for this path. See
      [Sessions](/concepts/sessions#multiple-connections-per-session).
    </Note>

    <Note>Need help? Email us at [support@reactor.inc](mailto:support@reactor.inc).</Note>
  </Tab>

  <Tab title="C++">
    ## C++

    ### How it works

    **C++** runs natively — a desktop client, an engine, a capture pipeline — so you pass your API key
    straight to the `Reactor` constructor for a trusted environment, or a JWT minted elsewhere for
    anything else. With an `ApiKey`, `connect()` exchanges it for a short-lived, **session-scoped**
    token — scoped to the model you built the client with — and authenticates every request with that
    token, never the raw key. If that token leaks, the blast radius is a handful of sessions on that one
    model, not your whole account. Scoping is automatic; there is nothing extra to configure.

    Pass your API key directly to the `Reactor` constructor:

    ```cpp theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    #include <reactor/reactor.hpp>

    reactor::Reactor client{"your-model-name", reactor::ApiKey{std::getenv("REACTOR_API_KEY")}};

    // Mints a token scoped to "your-model-name", then connects with it.
    client.connect().get();
    ```

    <Tip>
      Never hardcode `rk_...` values in your code or commit them to source control. Use environment
      variables.
    </Tip>

    ### Using a token minted elsewhere

    For a client that should never hold the raw API key — a game client, a desktop app distributed to
    end users — construct with a `Jwt` instead, minted by your server the same way the [server-side
    proxy](#server-side-proxy) above does for the browser SDK:

    ```cpp theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    reactor::Reactor client{"your-model-name", reactor::Jwt{token_from_your_backend}};
    client.connect().get();
    ```

    <Note>
      **Adopting a session someone else created.** [`connect()`](/sdk-reference/cpp/reactor#connect)
      takes a `ConnectOptions` with a `session_id`, to attach to a session that already exists rather
      than creating one. The token you connect with must be able to access it — session-scoped tokens
      are bound to the sessions they created, so hand the adopting client the same scoped JWT (or API
      key) that created the session. See
      [Sessions](/concepts/sessions#multiple-connections-per-session).
    </Note>

    <Note>Need help? Email us at [support@reactor.inc](mailto:support@reactor.inc).</Note>
  </Tab>

  <Tab title="Swift">
    ## Swift

    ### How it works

    **Swift** runs natively — a macOS or iOS app — so you pass your API key straight to the `Reactor`
    initializer for a trusted environment, or a JWT minted elsewhere for anything else. With an API key,
    the async initializer exchanges it for a short-lived, **session-scoped** token — scoped to the model
    you built the client with — and authenticates every request with that token, never the raw key. If
    that token leaks, the blast radius is a handful of sessions on that one model, not your whole
    account. Scoping is automatic; there is nothing extra to configure.

    Pass your API key directly to the `Reactor` initializer:

    ```swift theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    import Reactor

    let reactor = try await Reactor(model: "your-model-name", apiKey: apiKey)
    // Mints a token scoped to "your-model-name", then creates the client with it.
    ```

    <Tip>
      Never hardcode `rk_...` values in your code or commit them to source control. Use environment
      variables, or an Xcode scheme's environment for local development.
    </Tip>

    ### Using a token minted elsewhere

    For a client that should never hold the raw API key — an iOS app distributed to end users —
    construct with `jwt:` instead, minted by your server the same way the [server-side
    proxy](#server-side-proxy) above does for the browser SDK:

    ```swift theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
    let reactor = try Reactor(model: "your-model-name", jwt: tokenFromYourBackend)
    try await reactor.connect()
    ```

    <Note>
      **Adopting a session someone else created.** [`connect(sessionID:connectionID:)`](/sdk-reference/swift/reactor#connect-sessionidconnectionid)
      takes a `sessionID` to attach to a session that already exists rather than creating one. The token
      you connect with must be able to access it — session-scoped tokens are bound to the sessions they
      created, so hand the adopting client the same scoped JWT (or API key) that created the session. See
      [Sessions](/concepts/sessions#multiple-connections-per-session).
    </Note>

    <Note>Need help? Email us at [support@reactor.inc](mailto:support@reactor.inc).</Note>
  </Tab>
</Tabs>

***
