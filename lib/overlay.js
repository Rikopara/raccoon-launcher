import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export const LauncherOverlay = GObject.registerClass(
class LauncherOverlay extends St.Widget {
    _init(engine) {
        super._init({
            style_class: 'raccoon-overlay',
            reactive: true,
            visible: false,
            layout_manager: new Clutter.BinLayout(),
        });

        this._engine = engine;
        this._results = [];
        this._selected = -1;
        this._grab = null;
        this._isOpen = false;

        Main.layoutManager.addChrome(this);

        // Click on the dimmed background closes the launcher.
        this.connect('button-press-event', () => {
            this.close();
            return Clutter.EVENT_STOP;
        });

        // The centered panel.
        this._box = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style_class: 'raccoon-box',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.START,
        });
        // Clicks inside the panel must not close the launcher.
        this._box.connect('button-press-event', () => Clutter.EVENT_STOP);
        this.add_child(this._box);

        this._entry = new St.Entry({
            style_class: 'raccoon-entry',
            hint_text: 'Search apps, do math, "g something", lock\u2026',
            can_focus: true,
            x_expand: true,
        });
        this._box.add_child(this._entry);

        this._scroll = new St.ScrollView({style_class: 'raccoon-scroll'});
        this._scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);
        this._resultsBox = new St.BoxLayout({
            vertical: true,
            style_class: 'raccoon-results',
        });
        this._scroll.set_child(this._resultsBox);
        this._box.add_child(this._scroll);

        this._entry.clutter_text.connect('text-changed',
            () => this._onTextChanged());
        this._entry.clutter_text.connect('key-press-event',
            (_a, event) => this._onKeyPress(event));
    }

    toggle() {
        if (this._isOpen)
            this.close();
        else
            this.open();
    }

    open() {
        if (this._isOpen)
            return;

        const monitor = Main.layoutManager.primaryMonitor;
        this.set_position(monitor.x, monitor.y);
        this.set_size(monitor.width, monitor.height);
        this.show();

        this._grab = Main.pushModal(this, {actionMode: Shell.ActionMode.NORMAL});
        if (!this._grab.get_seat_state()) {
            Main.popModal(this._grab);
            this._grab = null;
            this.hide();
            return;
        }

        this._isOpen = true;
        this._entry.set_text('');
        this._entry.grab_key_focus();
        this._renderResults([]);
    }

    close() {
        if (!this._isOpen)
            return;
        this._isOpen = false;

        if (this._grab) {
            Main.popModal(this._grab);
            this._grab = null;
        }
        this.hide();
        this._resultsBox.destroy_all_children();
        this._results = [];
        this._selected = -1;
    }

    _onTextChanged() {
        const text = this._entry.get_text();
        this._renderResults(this._engine.query(text));
    }

    _onKeyPress(event) {
        const symbol = event.get_key_symbol();
        switch (symbol) {
        case Clutter.KEY_Escape:
            this.close();
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Down:
            this._move(1);
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Up:
            this._move(-1);
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Return:
        case Clutter.KEY_KP_Enter:
            this._activate(this._selected);
            return Clutter.EVENT_STOP;
        default:
            return Clutter.EVENT_PROPAGATE;
        }
    }

    _move(delta) {
        const n = this._results.length;
        if (n === 0)
            return;
        this._selected = (this._selected + delta + n) % n;
        this._updateSelection();
    }

    _renderResults(results) {
        this._resultsBox.destroy_all_children();
        this._results = results;
        this._selected = results.length > 0 ? 0 : -1;

        results.forEach((result, index) => {
            const row = new St.Button({
                style_class: 'raccoon-result',
                x_expand: true,
                can_focus: false,
            });

            const box = new St.BoxLayout({style_class: 'raccoon-result-box'});

            const icon = result.gicon
                ? new St.Icon({gicon: result.gicon, style_class: 'raccoon-result-icon'})
                : new St.Icon({
                    icon_name: result.iconName || 'application-x-executable-symbolic',
                    style_class: 'raccoon-result-icon',
                });
            box.add_child(icon);

            const textBox = new St.BoxLayout({vertical: true, x_expand: true});
            textBox.add_child(new St.Label({
                text: result.name,
                style_class: 'raccoon-result-name',
            }));
            if (result.description) {
                textBox.add_child(new St.Label({
                    text: result.description,
                    style_class: 'raccoon-result-desc',
                }));
            }
            box.add_child(textBox);

            row.set_child(box);
            row.connect('clicked', () => this._activate(index));
            this._resultsBox.add_child(row);
        });

        this._updateSelection();
    }

    _updateSelection() {
        const rows = this._resultsBox.get_children();
        rows.forEach((row, index) => {
            if (index === this._selected)
                row.add_style_class_name('selected');
            else
                row.remove_style_class_name('selected');
        });
    }

    _activate(index) {
        const result = this._results[index];
        if (!result)
            return;
        this.close();
        try {
            result.activate();
        } catch (e) {
            logError(e, 'RaccoonLauncher: failed to activate result');
        }
    }

    destroy() {
        if (this._grab) {
            Main.popModal(this._grab);
            this._grab = null;
        }
        Main.layoutManager.removeChrome(this);
        super.destroy();
    }
});
