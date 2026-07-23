import {AppsProvider} from './providers/apps.js';
import {CalcProvider} from './providers/calc.js';
import {WebProvider} from './providers/web.js';
import {SystemProvider} from './providers/system.js';

const CYR_TO_LAT = {
    'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
    'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",
    'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.',
    'Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P',
    'Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L',
    'Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M',
};

function hasCyrillic(text) {
    return /[а-яА-Я]/.test(text);
}

function transliterate(text) {
    return [...text].map(c => CYR_TO_LAT[c] ?? c).join('');
}

// Routes a query to every enabled provider, merges the results,
// and returns them ranked by score (highest first).
export class SearchEngine {
    constructor(settings) {
        this._settings = settings;
        this._providers = [
            {key: 'enable-calc', provider: new CalcProvider()},
            {key: 'enable-web', provider: new WebProvider()},
            {key: 'enable-system', provider: new SystemProvider()},
            {key: 'enable-apps', provider: new AppsProvider()},
        ];
    }

    query(text) {
        text = (text || '').trim();
        if (!text)
            return [];

        // Apply transliteration if the text contains Cyrillic characters
        if (hasCyrillic(text)) {
            text = transliterate(text);
        }

        let results = [];
        for (const {key, provider} of this._providers) {
            if (!this._settings.get_boolean(key))
                continue;
            try {
                results.push(...provider.query(text));
            } catch (e) {
                logError(e, `RaccoonLauncher: provider "${key}" failed`);
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, this._settings.get_int('max-results'));
    }

    destroy() {
        for (const {provider} of this._providers)
            provider.destroy?.();
        this._providers = [];
    }
}
