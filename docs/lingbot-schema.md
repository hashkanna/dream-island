> ## Documentation Index
> Fetch the complete documentation index at: https://docs.reactor.inc/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Reactor hosts multiple models, each with its own connect slug (modelName) and command/event schema. The catalog of every model — slug, typed SDK package, and links to its schema — is at /model-api-reference/overview. Some models expose one slug per experience (e.g. HappyOyster); always take the slug from the model's own pages, never guess it.
> Fastest path to a working app: `npx create-reactor-app my-app --model=<slug>` scaffolds a complete app with secure auth wired up. Typed TypeScript SDKs are published as @reactor-models/<model>; Python uses the base reactor-sdk package.
> Auth: exchange an API key (rk_...) for a JWT via POST https://api.reactor.inc/tokens from your server. Never put the API key in client-side code.
> Append .md to any docs URL for clean Markdown. Search these docs via the MCP server at https://docs.reactor.inc/mcp.

# LingBot World 2 schema reference

> The complete LingBot World 2 track, command, and event schema, with an end-to-end example.

This page documents the complete LingBot World 2 wire surface: the media track it produces, the
session lifecycle, every command you can send, and the messages the model emits back. For what
LingBot World 2 is and a quick start, see the
[overview](/model-api-reference/lingbot-world-2/overview).

## Tracks

| Direction | Name         | Type  | Format                   | Rate                                |
| --------- | ------------ | ----- | ------------------------ | ----------------------------------- |
| Outbound  | `main_video` | Video | `(N, H, W, 3)` uint8 RGB | Adaptive, paced to model throughput |

The default resolution is 1664 × 960 (960P), and delivered `main_video` runs at 48 fps. There are no
inbound tracks; all client-to-model communication is through commands.

## Session lifecycle

Once the connection reaches **ready**, the session begins in `WAITING`. `start` transitions to
`GENERATING` (provided a prompt **and** a reference image are set); `pause` moves to `PAUSED`;
`resume` returns to `GENERATING`; `reset` clears state and returns to `WAITING` from any state. See
[Sessions](/concepts/sessions#connection-lifecycle) for the connection-level lifecycle
(`disconnected → connecting → waiting → ready`) the session passes through first.

When all `chunk_num` chunks of a run complete and the session is still `started`, the server kicks
off the next run on its own, with the same prompt and image. Call `reset` to stop the loop and
re-stage with new conditions.

## Commands

Send commands with `reactor.sendCommand()` on the base SDK, or the typed methods on
[`LingbotWorld2Model`](/sdk-reference/typed-model-sdk) / `useLingbotWorld2()`. The setter commands
(`set_*`) take effect at the next chunk boundary. Below are all available commands:

| Command                  | Description                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| `set_prompt`             | Set or hot-swap the scene prompt (valid before and during generation)         |
| `set_image`              | Set the reference image that anchors generation (required before `start`)     |
| `set_seed`               | Set the RNG seed for the next run                                             |
| `set_move_longitudinal`  | Forward / back camera translation (W / S)                                     |
| `set_move_lateral`       | Strafe left / right camera translation (A / D)                                |
| `set_look_horizontal`    | Yaw: look left / right                                                        |
| `set_look_vertical`      | Pitch: look up / down                                                         |
| `set_rotation_speed_deg` | How fast the camera rotates while a look axis is active                       |
| `set_camera_pose`        | Native per-frame camera motion deltas (advanced)                              |
| `set_attn_window`        | Override the DiT self-attention window: `auto` / `small` / `large` (advanced) |
| `set_kv_cache_reset`     | KV-cache / RoPE reset mode: `auto` / `manual` / `off` (advanced)              |
| `trigger_kv_cache_reset` | Force a one-shot KV-cache reset on the next chunk (advanced)                  |
| `start`                  | Begin generation (requires a prompt **and** a reference image)                |
| `pause`                  | Pause after the current chunk                                                 |
| `resume`                 | Resume from a pause                                                           |
| `reset`                  | Clear all session state and return to `WAITING`                               |

### `set_prompt`

Set the scene prompt. Valid at any time: call before `start` to arm generation, or hot-swap during
generation to steer the next chunk. Replaces the previously active prompt; applied on the next chunk
when generating, otherwise when `start` fires. Emits `prompt_accepted`, `conditions_ready`, and
`state`.

**Parameters:**

| Parameter | Type   | Required | Description                               |
| --------- | ------ | -------- | ----------------------------------------- |
| `prompt`  | string | Yes      | Natural-language description of the scene |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_prompt", {
    prompt: "A reddish-brown ant on a dirt path between tall green grass blades, macro nature.",
  });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setPrompt } = useLingbotWorld2();
  await setPrompt({
    prompt: "A reddish-brown ant on a dirt path between tall green grass blades, macro nature.",
  });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_prompt", {
      "prompt": "A reddish-brown ant on a dirt path between tall green grass blades, macro nature.",
  })
  ```
</CodeGroup>

### `set_image`

Provide a reference image that anchors generation (image-to-video). Call before `start`; the image
is **required** for generation to begin. Changes during generation have no effect until `reset` is
issued and `start` is called again. Upload the file first with `uploadFile()`, then pass the
returned [`FileRef`](/sdk-reference/types#fileref). Emits `image_accepted`, `conditions_ready`, and
`state`, or `command_error` if the file is missing, not an image, or cannot be decoded.

**Parameters:**

| Parameter | Type    | Required | Description                                                  |
| --------- | ------- | -------- | ------------------------------------------------------------ |
| `image`   | FileRef | Yes      | A reference to an uploaded image, returned by `uploadFile()` |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const ref = await reactor.uploadFile(seedImageFile);
  await reactor.sendCommand("set_image", { image: ref });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { uploadFile, setImage } = useLingbotWorld2();
  const ref = await uploadFile(seedImageFile);
  await setImage({ image: ref });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  ref = await reactor.upload_file("seed.png")
  await reactor.send_command("set_image", {"image": ref})
  ```
</CodeGroup>

### `set_seed`

RNG seed for the next run. Must be a non-negative integer; the model never draws its own seed. Read
once when `start` fires; later changes take effect only after `reset` and a new `start`.

**Parameters:**

| Parameter | Type | Required | Description                              |
| --------- | ---- | -------- | ---------------------------------------- |
| `seed`    | int  | No       | ≥ 0. Same seed → same output. Default 42 |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_seed", { seed: 42 });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setSeed } = useLingbotWorld2();
  await setSeed({ seed: 42 });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_seed", {"seed": 42})
  ```
</CodeGroup>

### `set_move_longitudinal`

Forward / back camera translation (W / S). One of two independent movement axes; it combines with
`set_move_lateral`, so holding W+A drives diagonally. Persistent state: the value holds across
chunks until you send a new one, including `"idle"`. Applies at the next chunk boundary.

**Parameters:**

| Parameter           | Value                           | Default  |
| ------------------- | ------------------------------- | -------- |
| `move_longitudinal` | `"idle" \| "forward" \| "back"` | `"idle"` |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_move_longitudinal", { move_longitudinal: "forward" });

  // The value persists across chunks; idle it to stop.
  await reactor.sendCommand("set_move_longitudinal", { move_longitudinal: "idle" });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setMoveLongitudinal } = useLingbotWorld2();
  await setMoveLongitudinal({ move_longitudinal: "forward" });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_move_longitudinal", {"move_longitudinal": "forward"})
  ```
</CodeGroup>

### `set_move_lateral`

Strafe left / right camera translation (A / D). The second movement axis; combines with
`set_move_longitudinal` for diagonal motion. Persistent state, holding across chunks until changed.
Applies at the next chunk boundary.

**Parameters:**

| Parameter      | Value                                       | Default  |
| -------------- | ------------------------------------------- | -------- |
| `move_lateral` | `"idle" \| "strafe_left" \| "strafe_right"` | `"idle"` |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  // Combine with longitudinal for a diagonal (W+A).
  await reactor.sendCommand("set_move_lateral", { move_lateral: "strafe_left" });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setMoveLateral } = useLingbotWorld2();
  await setMoveLateral({ move_lateral: "strafe_left" });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_move_lateral", {"move_lateral": "strafe_left"})
  ```
</CodeGroup>

### `set_look_horizontal`

Yaw: rotate the camera to look left / right while held. Persistent state; applies at the next chunk
boundary. Rotation speed comes from `set_rotation_speed_deg`.

**Parameters:**

| Parameter         | Value                         | Default  |
| ----------------- | ----------------------------- | -------- |
| `look_horizontal` | `"idle" \| "left" \| "right"` | `"idle"` |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_look_horizontal", { look_horizontal: "left" });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setLookHorizontal } = useLingbotWorld2();
  await setLookHorizontal({ look_horizontal: "left" });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_look_horizontal", {"look_horizontal": "left"})
  ```
</CodeGroup>

### `set_look_vertical`

Pitch: look up / down while held. Persistent state; applies at the next chunk boundary.

**Parameters:**

| Parameter       | Value                      | Default  |
| --------------- | -------------------------- | -------- |
| `look_vertical` | `"idle" \| "up" \| "down"` | `"idle"` |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_look_vertical", { look_vertical: "up" });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setLookVertical } = useLingbotWorld2();
  await setLookVertical({ look_vertical: "up" });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_look_vertical", {"look_vertical": "up"})
  ```
</CodeGroup>

### `set_rotation_speed_deg`

How fast the camera rotates while either look axis is non-idle, in degrees per latent frame.
Persistent state; applies at the next chunk boundary.

**Parameters:**

| Parameter            | Value / range         | Default |
| -------------------- | --------------------- | ------- |
| `rotation_speed_deg` | float, `0.0` – `30.0` | `5.0`   |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_rotation_speed_deg", { rotation_speed_deg: 10.0 });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setRotationSpeedDeg } = useLingbotWorld2();
  await setRotationSpeedDeg({ rotation_speed_deg: 10.0 });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_rotation_speed_deg", {"rotation_speed_deg": 10.0})
  ```
</CodeGroup>

### `set_camera_pose`

A native low-level camera layer: a flat list of per-frame motion **deltas**, length a multiple of 6,
`[rx, ry, rz, tx, ty, tz]` per frame (small Euler-radian rotation plus translation, in the
camera-local frame). This is a **velocity profile**, not a position path.

* **6 floats** = one delta broadcast to every frame of the chunk (constant velocity).
* **6 × chunk\_size** = one delta per latent frame.
* **Any other 6 × k** = resampled to the chunk size.

While active, the pose's **rotation overrides** `look_horizontal` / `look_vertical`, and its
**translation adds** on top of WASD movement. Send an empty list (or omit) to deactivate and hand
the camera back to the look axes. Inputs are sanitized (NaN/Inf → 0, rotations clamped to ±π,
translation to ±100), so any payload is safe. Keep rotation values small: they are per-frame
velocities, so a subtle-looking number compounds over a chunk.

Two conventions shape every payload. The vertical axis is **y-down**: up is negative `ty`. And each
chunk's translation is **max-norm normalized** (scaled by the chunk's largest per-frame norm), so
absolute translation magnitude is erased; only the direction and the within-chunk shape survive,
which makes a vertical motion's size its frame count, not its numbers. Rotation is not normalized.
The current chunk size is 3 latent frames (about 12 pixel frames).

<Tip>
  The pose layer is a **bias, not a rig**. LingBot is a world model with no ground-truth camera, so
  pose deltas only condition generation toward motion. If the prompt describes a locked, stationary
  subject, pose and prompt fight and the subject can drag along. Pair a camera move with a prompt
  sentence that says the camera moves while the subject stays still.
</Tip>

**Parameters:**

| Parameter     | Type      | Required | Description                                                   |
| ------------- | --------- | -------- | ------------------------------------------------------------- |
| `camera_pose` | number\[] | No       | Length a multiple of 6, max 1536. Empty / omitted deactivates |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  // Constant-velocity orbit: steady yaw with a lateral counter-drift.
  await reactor.sendCommand("set_camera_pose", { camera_pose: [0, 0.04, 0, -0.35, 0, 0] });

  // Hand the camera back to the look axes.
  await reactor.sendCommand("set_camera_pose", { camera_pose: [] });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setCameraPose } = useLingbotWorld2();
  await setCameraPose({ camera_pose: [0, 0.04, 0, -0.35, 0, 0] });
  await setCameraPose({ camera_pose: [] });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_camera_pose", {"camera_pose": [0, 0.04, 0, -0.35, 0, 0]})
  await reactor.send_command("set_camera_pose", {"camera_pose": []})
  ```
</CodeGroup>

### `set_attn_window`

Manual override for the DiT self-attention window. By default the model picks the window from
motion: still scenes use a **small** window, moving scenes a **large** one. Force it when the
automatic trigger reads a scene wrong: `small` locks the still window, `large` locks the moving
window. Applies at the next chunk boundary and can change at any time.

**Parameters:**

| Parameter     | Type                           | Required | Default  | Description                                              |
| ------------- | ------------------------------ | -------- | -------- | -------------------------------------------------------- |
| `attn_window` | `"auto" \| "small" \| "large"` | No       | `"auto"` | `auto` tracks motion; `small` / `large` force one window |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_attn_window", { attn_window: "large" });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setAttnWindow } = useLingbotWorld2();
  await setAttnWindow({ attn_window: "large" });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_attn_window", {"attn_window": "large"})
  ```
</CodeGroup>

### `set_kv_cache_reset`

Set the KV-cache / RoPE reset mode that keeps long sessions in-distribution. The default `auto`
resets the cache on a fixed window (about every 88 latent frames) and honors manual triggers on top;
`manual` turns the periodic reset off but keeps `trigger_kv_cache_reset` available; `off` disables
all resets, so RoPE positions grow without bound and quality drifts on long runs. Valid at any time;
takes effect at the next chunk boundary. When the mode leaves `off` after the window has grown past
the threshold, the first `auto` chunk resets at once. The reset itself is free at runtime (host-side
pointer bookkeeping, no CUDA-graph recapture). Emits `state`.

**Parameters:**

| Parameter | Type                          | Required | Default  | Description                                                                                                                                         |
| --------- | ----------------------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`    | `"off" \| "auto" \| "manual"` | No       | `"auto"` | `auto` = periodic reset plus manual triggers; `manual` = manual triggers only; `off` = no resets. The periodic interval is fixed at model load time |

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("set_kv_cache_reset", { mode: "manual" });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { setKvCacheReset } = useLingbotWorld2();
  await setKvCacheReset({ mode: "manual" });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("set_kv_cache_reset", {"mode": "manual"})
  ```
</CodeGroup>

### `trigger_kv_cache_reset`

Force a one-shot KV-cache / RoPE reset on the next chunk, without waiting for the periodic window to
fill. Use it at a hard scene or prompt cut to flush stale context. Honored in `auto` and `manual`
modes; rejected with `command_error` while the mode is `off`. Takes no arguments. Emits `state` on
success.

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("trigger_kv_cache_reset", {});
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { triggerKvCacheReset } = useLingbotWorld2();
  await triggerKvCacheReset();
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("trigger_kv_cache_reset", {})
  ```
</CodeGroup>

### `start`

Begin generating video on `main_video`. Requires both a prompt (via `set_prompt`) and a reference
image (via `set_image`); fails with `command_error` otherwise. Emits `generation_started` and
`state`. No effect while already generating.

### `pause`

Halt after the current chunk finishes (emits `generation_paused`). Valid only while generating.

### `resume`

Continue from the next chunk (emits `generation_resumed`). Valid only while paused.

### `reset`

Abort the run, clear the active prompt and reference image, and return to `WAITING` from any state.
After `reset`, call `set_prompt` and `set_image` again before `start`. Emits `generation_reset` and
`state`.

The lifecycle commands take no arguments:

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.sendCommand("start", {});
  await reactor.sendCommand("pause", {});
  await reactor.sendCommand("resume", {});
  await reactor.sendCommand("reset", {});
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  const { start, pause, resume, reset } = useLingbotWorld2();
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  await reactor.send_command("start", {})
  await reactor.send_command("pause", {})
  await reactor.send_command("resume", {})
  await reactor.send_command("reset", {})
  ```
</CodeGroup>

## Messages

LingBot World 2 emits the following messages. Every message is delivered as JSON
`{ "type": "<name>", "data": { … } }`.

| Event                 | When                                                                            | Payload                                                                                   |
| --------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `prompt_accepted`     | After `set_prompt`                                                              | `{ prompt: string }`                                                                      |
| `image_accepted`      | After `set_image` decodes                                                       | `{ width: int, height: int }`                                                             |
| `conditions_ready`    | After `set_prompt` or `set_image`                                               | `{ has_image: bool, has_prompt: bool }`                                                   |
| `generation_started`  | After `start`                                                                   | `{ prompt: string, chunk_num: int, frame_num: int }`                                      |
| `chunk_complete`      | After each chunk emits                                                          | `{ chunk_index: int, active_action: string, active_prompt: string, frames_emitted: int }` |
| `generation_paused`   | After `pause`                                                                   | `{ chunk_index: int }`                                                                    |
| `generation_resumed`  | After `resume`                                                                  | `{ chunk_index: int }`                                                                    |
| `generation_complete` | After all chunks of a run finish                                                | `{ total_chunks: int }`                                                                   |
| `generation_reset`    | After `reset`                                                                   | `{ reason: string }`                                                                      |
| `command_error`       | When a command is rejected                                                      | `{ command: string, reason: string }`                                                     |
| `state`               | On connect, after every state-mutating command, and after each `chunk_complete` | Full session snapshot (see below)                                                         |

### `state` payload

`state` is the single source of truth for driving UI. Subscribe once and treat it as the
authoritative session snapshot; you generally do not need to track individual commands and
`chunk_complete` events yourself.

| Field                | Type             | Meaning                                                                                                                              |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `running`            | `bool`           | `started and not paused`. Frames are actively streaming                                                                              |
| `started`            | `bool`           | True once `start` has been accepted; stays true through pauses. Cleared by `reset` (or after a non-restarting `generation_complete`) |
| `paused`             | `bool`           | True while paused via `pause`                                                                                                        |
| `has_image`          | `bool`           | True once a reference image has been set this session                                                                                |
| `has_prompt`         | `bool`           | True once a prompt has been set this session                                                                                         |
| `current_prompt`     | `string \| null` | The prompt currently driving generation, or `null` if none set                                                                       |
| `current_chunk`      | `int`            | Zero-based index of the last completed chunk; `0` before the first chunk and after `reset`                                           |
| `current_action`     | `string`         | `+`-joined composite of movement and look (e.g. `"w+a"`, `"left"`), or `"still"` when idle                                           |
| `move_longitudinal`  | `string`         | Current value of the `move_longitudinal` input                                                                                       |
| `move_lateral`       | `string`         | Current value of the `move_lateral` input                                                                                            |
| `look_horizontal`    | `string`         | Current value of the `look_horizontal` input                                                                                         |
| `look_vertical`      | `string`         | Current value of the `look_vertical` input                                                                                           |
| `rotation_speed_deg` | `float`          | Current rotation speed (0.0 – 30.0)                                                                                                  |
| `camera_pose_active` | `bool`           | True when a non-empty `camera_pose` is set                                                                                           |
| `seed`               | `int`            | Current seed value (effective only on the next `start`)                                                                              |

**Example handler:**

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  reactor.on("message", (msg) => {
    switch (msg.type) {
      case "state":
        console.log(`chunk ${msg.data.current_chunk} · action ${msg.data.current_action}`);
        break;
      case "generation_started":
        console.log(`run: ${msg.data.chunk_num} chunks`);
        break;
      case "command_error":
        console.error(`${msg.data.command} rejected: ${msg.data.reason}`);
        break;
    }
  });
  ```

  ```tsx React theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  import {
    useLingbotWorld2State,
    useLingbotWorld2CommandError,
  } from "@reactor-models/lingbot-world-2";

  function StateReadout() {
    useLingbotWorld2State((s) => console.log(`chunk ${s.current_chunk} · ${s.current_action}`));
    useLingbotWorld2CommandError((e) => console.error(`${e.command} rejected: ${e.reason}`));
    return null;
  }
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  @reactor.on_message
  def handle(msg):
      data = msg["data"]
      if msg["type"] == "state":
          print(f"chunk {data['current_chunk']} · action {data['current_action']}")
      elif msg["type"] == "command_error":
          print(f"{data['command']} rejected: {data['reason']}")
  ```
</CodeGroup>

## Complete example

Stage a reference image and prompt, wait for the image to decode, start, then drive the camera.

<CodeGroup>
  ```typescript JavaScript theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  import { LingbotWorld2Model } from "@reactor-models/lingbot-world-2";

  const lingbot = new LingbotWorld2Model();

  lingbot.onChunkComplete(({ chunk_index, active_action }) => {
    console.log(`chunk ${chunk_index}: ${active_action}`);
  });
  lingbot.onCommandError(({ command, reason }) => {
    console.error(`${command} rejected: ${reason}`);
  });

  await lingbot.connect(jwt);

  // Wait for the seed image to decode so the first chunk renders from it.
  const imageAccepted = new Promise<void>((resolve) => lingbot.onImageAccepted(() => resolve()));
  const ref = await lingbot.uploadFile(seedImageFile);
  await lingbot.setImage({ image: ref });
  await imageAccepted;

  await lingbot.setPrompt({
    prompt: "A reddish-brown ant on a dirt path between tall green grass blades, macro nature.",
  });
  await lingbot.start();

  // Drive the camera. Movement is two independent axes, so W+A is diagonal.
  await lingbot.setMoveLongitudinal({ move_longitudinal: "forward" });
  await lingbot.setMoveLateral({ move_lateral: "strafe_left" });
  ```

  ```python Python theme={"theme":{"light":"github-light","dark":"github-dark-high-contrast"}}
  import asyncio, os
  from reactor_sdk import Reactor

  async def main():
      reactor = Reactor(model_name="reactor/lingbot-world-2", api_key=os.environ["REACTOR_API_KEY"])

      image_accepted = asyncio.Event()

      @reactor.on_message("image_accepted")
      def _(msg):
          image_accepted.set()

      await reactor.connect()

      ref = await reactor.upload_file("seed.png")
      await reactor.send_command("set_image", {"image": ref})
      await image_accepted.wait()

      await reactor.send_command("set_prompt", {
          "prompt": "A reddish-brown ant on a dirt path between tall green grass blades, macro nature.",
      })
      await reactor.send_command("start", {})

      # Drive the camera.
      await reactor.send_command("set_move_longitudinal", {"move_longitudinal": "forward"})
      await asyncio.Event().wait()

  asyncio.run(main())
  ```
</CodeGroup>
