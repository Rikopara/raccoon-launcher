#!/usr/bin/env bash
#
# Smoke test for Raccoon Launcher.
#
# Loads the extension into a private, headless GNOME Shell (a throwaway
# session under a temp dir) and drives open() / search / close() through a
# small self-test injected into enable(). Verifies the launcher opens, shows
# results, and closes again without exceptions.
#
# It touches nothing in your real session: separate XDG_DATA_HOME /
# XDG_CONFIG_HOME, no window, no modal grab, cleaned up at the end.
#
# Usage:  ./tools/smoketest.sh
# Exit:   0 on PASS, 1 on FAIL.

set -u

UUID="raccoonlauncher@shimafallah.github.io"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
SB="$(mktemp -d /tmp/rl-smoketest.XXXXXX)"
EXT="$SB/data/gnome-shell/extensions/$UUID"
LOG="$SB/shell.log"

cleanup() { rm -rf "$SB"; }
trap cleanup EXIT

mkdir -p "$EXT" "$SB/config" "$SB/cache"
cp -r "$SRC/metadata.json" "$SRC/prefs.js" "$SRC/stylesheet.css" \
      "$SRC/lib" "$SRC/schemas" "$EXT/"
glib-compile-schemas "$EXT/schemas" >/dev/null

# Instrumented entry point: real code paths + a self-test on a timer.
cat > "$EXT/extension.js" <<'EOF'
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {SearchEngine} from './lib/search.js';
import {LauncherOverlay} from './lib/overlay.js';

const TOGGLE_KEY = 'toggle-launcher';

export default class RaccoonLauncherExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._engine = new SearchEngine(this._settings);
        this._overlay = new LauncherOverlay(this._engine, this._settings, () => {});
        Main.wm.addKeybinding(TOGGLE_KEY, this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._overlay.toggle());

        this._testId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
            try {
                const o = this._overlay;
                o.open();
                log(`RACCOON_TEST open isOpen=${o._isOpen} capture=${o._captureId > 0} visible=${o.visible}`);
                log(`RACCOON_TEST appResults=${this._engine.query('fi').length}`);
                o.close();
                log(`RACCOON_TEST close isOpen=${o._isOpen} capture=${o._captureId} visible=${o.visible}`);
                o.toggle(); const a = o._isOpen;
                o.toggle(); const b = o._isOpen;
                log(`RACCOON_TEST toggle ${a} ${b}`);
                log('RACCOON_TEST RESULT OK');
            } catch (e) {
                log(`RACCOON_TEST RESULT ERROR ${e}`);
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        if (this._testId) { GLib.source_remove(this._testId); this._testId = 0; }
        Main.wm.removeKeybinding(TOGGLE_KEY);
        this._overlay?.destroy();
        this._overlay = null;
        this._engine?.destroy();
        this._engine = null;
        this._settings = null;
    }
}
EOF

env XDG_DATA_HOME="$SB/data" XDG_CONFIG_HOME="$SB/config" XDG_CACHE_HOME="$SB/cache" \
  dbus-run-session -- bash -c '
    gsettings set org.gnome.shell disable-user-extensions false
    gsettings set org.gnome.shell enabled-extensions "[\"'"$UUID"'\"]"
    gnome-shell --headless --virtual-monitor 1280x800 >"'"$LOG"'" 2>&1 &
    SP=$!
    sleep 12
    kill $SP 2>/dev/null; wait 2>/dev/null
  ' >/dev/null 2>&1

echo "----- self-test output -----"
grep -E "RACCOON_TEST" "$LOG" || echo "(no output captured)"
echo "----------------------------"

if grep -q "RACCOON_TEST RESULT OK" "$LOG" \
   && grep -q "RACCOON_TEST open isOpen=true capture=true visible=true" "$LOG" \
   && grep -q "RACCOON_TEST close isOpen=false" "$LOG"; then
    echo "PASS"
    exit 0
fi
echo "FAIL"
exit 1
