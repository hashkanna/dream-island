# Dream Island release

- Public demo: https://controller-unions-olympus-newark.trycloudflare.com
- Public video: https://www.youtube.com/watch?v=5DNgQyBvSn4
- Public repository: https://github.com/hashkanna/dream-island
- Local MP4: `recordings/Dream-Island-Demo.mp4` (95.43 seconds, 1920x1080, H.264/AAC stereo)
- Model: Reactor LingBot World 2; source frames 1664x960. Recording includes real generated video and live gameplay state in a 1080p composition.

The Cloudflare address is a temporary tunnel. Keep the app server, cloudflared, and Mac running. Reactor availability and credits are separate from free hosting. No permanent Cloudflare Pages/Workers deployment was created.

YouTube: public on @kannappansirchabesan8577, AI disclosure enabled, Science and technology category, not made for kids. Title and description explain the game, model, recording, and temporary demo link. YouTube copyright checks found no issues at upload. Public playback reached 1080p. Custom thumbnails and clickable external description links require the channel's phone/advanced verification; an automatic frame thumbnail was selected instead.

The earlier arcade prototype is retained at /arcade as an archive; Dream Island is the main entry. Submitted to WORLDS London on Devpost: https://devpost.com/software/dream-island-1to34n (Reactor - Best Use of Real-Time Interactive Models). Devpost showed Project submitted and 5/5 steps done.

## Visible-input recording revision

The recorder now draws controls, event-driven pointer pulses, and prominent CLICK/KEY captions. Movement taps last six seconds; camera turn speed is 2 degrees per model frame. Active controls also highlight in the game UI. The build passed and changes were pushed; the repository was later made public with user authorization after secret scans.

A new live session produced 229 chunks. After forward and right inputs, the camera view visibly changed from the rainbow bridge to the side garden. Three postcards were collected, but the last label was selected at/after session expiry, so a complete-album ending in the video is not verified. The new recording remains in the in-app browser at the Download my adventure link. Automated downloads did not save a new file; the user was asked to save it to Downloads. Do not refresh that browser tab until the recording is saved. The public video above is still the previous take.

## Repository publication audit

On 2026-09-12, gitleaks 8.30.1 scanned all six commits and an archive of current tracked files. The single initial finding was verified as the literal browser storage name `dream-island-album-v1`, then narrowly allowlisted for the audit. Both scans found no remaining secrets. All 43 historical Git blobs were also checked for the actual local API key value, private-key headers, and credential filenames; no matches. `.env.local` remains untracked. The user explicitly authorized public visibility.
