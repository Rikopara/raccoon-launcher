# Raccoon Launcher

A fast, keyboard-driven launcher overlay for GNOME Shell. Hit a hotkey, type,
and launch apps, do quick math, run web searches, or trigger system actions —
all from one box.

Built as a GNOME Shell extension (GJS), targeting **GNOME 48–50**
(Ubuntu 24.04 through 26.04).

## Features

- **App search** — fuzzy search and launch any installed application.
- **Calculator** — type an expression like `(12+3)*4^2` and press Enter to copy the result.
- **Web search** — prefix shortcuts: `g`, `ddg`, `yt`, `wiki`, `gh`
  (e.g. `g wayland tips`).
- **System actions** — `lock`, `log out`, `suspend`, `restart`, `power off`.

Default shortcut: <kbd>Super</kbd>+<kbd>Space</kbd> (configurable in preferences).

## Install from source

```bash
make install
gnome-extensions enable raccoonlauncher@shimafallah.github.io
```

On Wayland (the default on Ubuntu 22.04+), log out and back in so GNOME Shell
picks up the new extension. To iterate without logging out, run a nested shell:

```bash
make nested        # opens GNOME Shell in a window
```

Watch logs while testing:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Preferences

```bash
gnome-extensions prefs raccoonlauncher@shimafallah.github.io
```

Toggle individual providers, change the maximum result count, and rebind the
shortcut.

## Packaging for extensions.gnome.org

```bash
make pack          # produces raccoonlauncher@shimafallah.github.io.shell-extension.zip
```

Upload the zip at <https://extensions.gnome.org/upload/>.

## Project layout

```
metadata.json                 extension metadata + supported shell versions
extension.js                  enable()/disable(), registers the hotkey
prefs.js                      GTK4/libadwaita preferences window
stylesheet.css                overlay styling
schemas/                      GSettings schema (shortcut + toggles)
lib/
  overlay.js                  the search overlay UI
  search.js                   dispatcher: queries providers, ranks results
  util.js                     fuzzy matcher
  providers/
    apps.js                   installed applications
    calc.js                   arithmetic evaluator
    web.js                    web search shortcuts
    system.js                 system actions
```

## License

GPL-2.0-or-later
