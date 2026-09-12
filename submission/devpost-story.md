## Inspiration

What if exploring a world model felt like a tiny holiday? Dream Island gives a generative world a gentle, playable purpose: follow your curiosity and bring home three little wonders.

## What it does

You enter a candy-coloured garden, click directions to wander, and wish for stars, giant flowers, or bubbles. Photograph a tiny friend, a dreamy view, and a little magic. Choose where each discovery belongs, complete your postcard album, and download it as a souvenir. Original music-box melodies and playful camera and collection sounds accompany the visit.

The world model is the world you explore. Reactor's LingBot World 2 receives the starting image, movement commands, and wish prompts, then generates the video streamed into the game. The scenery is not an authored 3D level or a prerecorded background.

## How we built it

Built solo with TypeScript, React, and Next.js. A server endpoint exchanges the Reactor API key for short-lived, model-scoped session tokens; the secret stays off the client. The Reactor SDK receives the live WebRTC video and sends movement and prompt controls. Canvas captures postcards directly from received frames. The album lives in browser storage, and Web Audio synthesizes original music and sound effects. An in-app recorder combines actual model video, live gameplay state, and game audio into a shareable demo.

The cover is the original AI-generated starting image. Characters and scenery in the live session can evolve away from it.

## Challenges we ran into

World-model capacity, generation delay, and character drift all affect a live experience. We built short visits, clear connection states, visible input feedback, and a recorded backup. Postcard categories are chosen by the player; we do not claim automatic image recognition, deterministic wishes, or stable character identity.

## Accomplishments that we're proud of

We completed live photo-safari playthroughs, collected three-postcard albums, and saw bubbles appear after a Bubble party wish. A later session visibly changed the camera view after movement and turning. The result gives generative exploration a small, understandable goal and a keepsake you can take away.

## What we learned

A world model becomes more approachable when players know what to try and what to keep. Curiosity, wishes, and collecting moments work with its surprises, while input feedback makes the interaction easier to understand.

## What's next for Dream Island

More reliable session availability, stronger visual continuity, more discovery challenges, and persistent hosting beyond the hackathon demo.

## Try it

Live demo: https://controller-unions-olympus-newark.trycloudflare.com

Recorded playthrough: https://www.youtube.com/watch?v=5DNgQyBvSn4

The live link is a temporary Cloudflare tunnel and requires the demo computer to remain online. If Reactor has no capacity, use the recorded playthrough. The published video is an earlier build; the latest game adds clearer control highlights and input cues. Source code: https://github.com/hashkanna/dream-island
