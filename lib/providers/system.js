import Gio from 'gi://Gio';

import {fuzzyScore} from '../util.js';

const ACTIONS = [
    {
        name: 'Lock Screen',
        icon: 'system-lock-screen-symbolic',
        keywords: ['lock', 'lock screen'],
        cmd: ['loginctl', 'lock-session'],
    },
    {
        name: 'Log Out',
        icon: 'system-log-out-symbolic',
        keywords: ['log out', 'logout', 'sign out'],
        cmd: ['gnome-session-quit', '--logout', '--no-prompt'],
    },
    {
        name: 'Suspend',
        icon: 'weather-clear-night-symbolic',
        keywords: ['suspend', 'sleep'],
        cmd: ['systemctl', 'suspend'],
    },
    {
        name: 'Restart',
        icon: 'system-reboot-symbolic',
        keywords: ['restart', 'reboot'],
        cmd: ['systemctl', 'reboot'],
    },
    {
        name: 'Power Off',
        icon: 'system-shutdown-symbolic',
        keywords: ['power off', 'poweroff', 'shutdown'],
        cmd: ['systemctl', 'poweroff'],
    },
];

// Quick system actions (lock, log out, suspend, restart, power off).
export class SystemProvider {
    query(text) {
        const out = [];
        for (const action of ACTIONS) {
            let best = -1;
            for (const kw of action.keywords)
                best = Math.max(best, fuzzyScore(text, kw));
            if (best < 0)
                continue;

            out.push({
                id: `sys-${action.name}`,
                name: action.name,
                description: 'System action',
                iconName: action.icon,
                score: 900 + best * 0.01,
                activate: () => {
                    Gio.Subprocess.new(action.cmd, Gio.SubprocessFlags.NONE);
                },
            });
        }
        return out;
    }
}
