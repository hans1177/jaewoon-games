# Universal Web Touch Controls

`touch-controls.js` is injected into `/web-games/**` HTML responses by `_worker.js` on touch-capable devices.

- Left stick: movement or directional selection.
- A: primary action / selected game action.
- B: secondary interaction.
- Games with their own joystick (`#joy`, `#joystick`, `.joystick`, `.virtual-joystick`, `.touch-stick`, `[data-joystick]`, `[data-touch-stick]`) keep their native control and do not receive a duplicate overlay.
- Homepage game launch remains tap/click-first and does not require keyboard launch behavior.
