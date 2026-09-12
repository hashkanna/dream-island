# Dream Island ✦

A tiny photo safari in a living, AI-generated garden. Wander, make a wish, and collect three little wonders: a tiny friend, a dreamy view, and a little magic.

[Devpost submission](https://devpost.com/software/dream-island-1to34n) · [Play the temporary demo](https://controller-unions-olympus-newark.trycloudflare.com) · [Watch the public backup demo](https://www.youtube.com/watch?v=5DNgQyBvSn4)

Built for WORLDS London. The main experience at `/` and `/dream` uses **Reactor LingBot World 2** to generate the explorable world live. Movement and wishes are sent to the model. The camera captures real received frames; players choose where each discovery belongs in their album. There is no automatic image judging.

## Play

1. Press **Let’s wander**.
2. Tap a direction or use the arrow keys to explore. Each action persists for six seconds unless stopped.
3. Ask for stars, giant flowers, or bubbles. Changes are generated and may take a moment or differ from the request.
4. Press the camera or Space. Label the postcard, complete the three-slot album, and download it.

An original music-box loop and synthesized sound effects play after user interaction. The music button mutes all game audio. Postcards stay in this browser and can be downloaded individually or as an album.

**Record visit** captures the live world, gameplay state, and game audio into a fixed 1920×1080 composition. Visible control highlights, pointer pulses, and CLICK/KEY labels are driven by actual gameplay input events. It does not capture your desktop, microphone, or other apps. Enable it before starting; after ending the visit, download the recording. The model's source video is 1664×960; the recording layout is 1080p, not native 1080p model footage.

## Run locally

```sh
npm install
# Set REACTOR_API_KEY in .env.local.
npm run build
npm run start -- --hostname 127.0.0.1 --port 3003
```

The server exchanges its API key for a token limited to LingBot World 2, one session, and 120 seconds. The app ends each visit after 110 seconds. Keys are never included in client code or committed. The token endpoint enforces an explicit origin, a per-client cooldown, and a process-wide budget of 40 issued sessions (adjustable with `MAX_DEMO_SESSIONS`). These in-memory limits reset on server restart.

For a temporary public demo:

```sh
cloudflared tunnel --url http://127.0.0.1:3003 --no-autoupdate
```

Set `PUBLIC_APP_ORIGIN` in `.env.local` to the printed HTTPS origin, then restart the app. The free tunnel works while this computer, the app server, and cloudflared stay running. Hosting is free; model inference consumes Reactor credits and depends on provider capacity.

## What the model does

LingBot World 2 generates the visible world from an original starting image, persistent movement commands, and updated wish prompts. The interface, music, recording layout, and postcard album are coded. There is no authored navigable 3D scene in the safari. Character consistency and precise navigation can drift. A command acknowledgement confirms receipt, not its visual outcome.

The complete safari was played through twice. Three postcards were collected, and bubbles visibly appeared after a Bubble party wish. The public link connected to a real session after an initial capacity error. The final 95-second playthrough was recorded with game audio, published publicly, and verified playing at 1080p on YouTube. Character drift remains visible. See `evidence/verification.json`.

The earlier conventional hopping prototype is archived at `/arcade` and is not the hackathon entry. No Multic integration is claimed.

## Checks

```sh
npm run typecheck
npm run build
```

## Media and sources

`public/dream-seed.png` is an original image made with the built-in image-generation tool; its prompt is in `docs/dream-prompt.md`. Live world video comes from LingBot World 2. Music and effects are original synthesized audio in `app/dream/DreamSound.ts`.

- [LingBot World 2](https://docs.reactor.inc/model-api-reference/lingbot-world-2/overview)
- [Model command reference](https://docs.reactor.inc/model-api-reference/lingbot-world-2/schema)
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
