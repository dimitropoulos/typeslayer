On Linux (Ubuntu/Debian), you may need to install build-time packages for the screenshots dependency (xcap):

```bash
sudo apt-get update
sudo apt-get install -y \
	pkg-config libclang-dev \
	libxcb1-dev libxrandr-dev libdbus-1-dev \
	libpipewire-0.3-dev libwayland-dev \
	libegl1-mesa-dev
```

Why: https://github.com/nashaofu/xcap

Notes:
- These are build-time headers; end-users of the final binary do NOT need the -dev packages.
- On Wayland sessions, runtime screen capture requires PipeWire and the desktop portal services (commonly preinstalled on modern Ubuntu). On X11 sessions, PipeWire isn’t required for capture.
- You can verify PipeWire is discoverable by pkg-config with:

```bash
pkg-config --modversion libpipewire-0.3
```
