/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import EventEmitter from './EventEmitter';
import i18n from 'i18next';
import { sprintfPostprocessor } from '../Utils/Localization';
import LocalizationCache from '../Localization/Cache';
import { initReactI18next } from 'react-i18next';
import {
    PluralRules_Arabic,
    PluralRules_Balkan,
    PluralRules_Breton,
    PluralRules_Czech,
    PluralRules_French,
    PluralRules_Langi,
    PluralRules_Latvian,
    PluralRules_Lithuanian,
    PluralRules_Macedonian,
    PluralRules_Maltese,
    PluralRules_None,
    PluralRules_One,
    PluralRules_Polish,
    PluralRules_Romanian,
    PluralRules_Serbian,
    PluralRules_Slovenian,
    PluralRules_Tachelhit,
    PluralRules_Two,
    PluralRules_Welsh,
    PluralRules_Zero,
    QuantityEnum
} from '../Utils/Localization';
import en from '../Resources/en/translation.json';
import ru from '../Resources/ru/translation.json';
import it from '../Resources/it/translation.json';
import es from '../Resources/it/translation.json';
import pl from '../Resources/it/translation.json';
import TdLibController from '../Controllers/TdLibController';

const fallbackLng = 'en';
const defaultNS = 'translation';
const lng = localStorage.getItem('i18next') || fallbackLng;

i18n
    .use(initReactI18next)
    .use(sprintfPostprocessor)
    .init({
        ns: [defaultNS, 'local'],
        defaultNS,
        fallbackNS: ['local'],
        resources: {
            en: { local: en },
            ru: { local: ru },
            it: { local: it },
            es: { local: es },
            pl: { local: pl },
        },
        lng,
        fallbackLng,
        interpolation: {
            escapeValue: false
        },
        react: {
            wait: false
        }
    });

const cache = new LocalizationCache(null, {
    enabled: true,
    prefix: 'i18next_res_',
    expirationTime: Infinity
});

const defaultResources = cache.read(fallbackLng, defaultNS, (err, data) => data);
const currentResources = cache.read(lng, defaultNS, (err, data) => data);

i18n.addResourceBundle(fallbackLng, defaultNS, defaultResources);
i18n.addResourceBundle(lng, defaultNS, currentResources);

class LocalizationStore extends EventEmitter {
    constructor() {
        super();

        this.fallbackLng = fallbackLng;
        this.i18n = i18n;
        this.cache = cache;
        this.allRules = new Map();

        this.addRules(["bem", "brx", "da", "de", "el", "en", "eo", "es", "et", "fi", "fo", "gl", "he", "iw", "it", "nb",
            "nl", "nn", "no", "sv", "af", "bg", "bn", "ca", "eu", "fur", "fy", "gu", "ha", "is", "ku",
            "lb", "ml", "mr", "nah", "ne", "om", "or", "pa", "pap", "ps", "so", "sq", "sw", "ta", "te",
            "tk", "ur", "zu", "mn", "gsw", "chr", "rm", "pt", "an", "ast"], new PluralRules_One())
        this.addRules(["cs", "sk"], new PluralRules_Czech());
        this.addRules(["ff", "fr", "kab"], new PluralRules_French());
        this.addRules(["ru", "uk", "be", "sh"], new PluralRules_Balkan());
        this.addRules(["sr", "hr", "bs"], new PluralRules_Serbian());
        this.addRules(["lv"], new PluralRules_Latvian());
        this.addRules(["lt"], new PluralRules_Lithuanian());
        this.addRules(["pl"], new PluralRules_Polish());
        this.addRules(["ro", "mo"], new PluralRules_Romanian());
        this.addRules(["sl"], new PluralRules_Slovenian());
        this.addRules(["ar"], new PluralRules_Arabic());
        this.addRules(["mk"], new PluralRules_Macedonian());
        this.addRules(["cy"], new PluralRules_Welsh());
        this.addRules(["br"], new PluralRules_Breton());
        this.addRules(["lag"], new PluralRules_Langi());
        this.addRules(["shi"], new PluralRules_Tachelhit());
        this.addRules(["mt"], new PluralRules_Maltese());
        this.addRules(["ga", "se", "sma", "smi", "smj", "smn", "sms"], new PluralRules_Two());
        this.addRules(["ak", "am", "bh", "fil", "tl", "guw", "hi", "ln", "mg", "nso", "ti", "wa"], new PluralRules_Zero());
        this.addRules(["az", "bm", "fa", "ig", "hu", "ja", "kde", "kea", "ko", "my", "ses", "sg", "to",
            "tr", "vi", "wo", "yo", "zh", "bo", "dz", "id", "jv", "jw", "ka", "km", "kn", "ms", "th", "in"], new PluralRules_None());

        const langCode = lng.indexOf('-') !== -1 ? lng.substring(0, lng.indexOf('-')) : lng;
        this.currentPluralRules = this.allRules.get(langCode) || this.allRules.get(fallbackLng);
        this.recreateFormatters();

        this.addTdLibListener();
    }

    recreateFormatters() {
        this.formatterDay = 'H:mm';
        this.formatterDayMonth = 'd MMM';
        this.formatterYear = 'dd.MM.yy';
    }

    addRules(languages, rules) {
        languages.forEach(x => this.allRules.set(x, rules));
    }

    stringForQuantity(quantity) {
        switch (quantity) {
            case QuantityEnum.QUANTITY_ZERO:
                return 'Z';
            case QuantityEnum.QUANTITY_ONE:
                return 'O';
            case QuantityEnum.QUANTITY_TWO:
                return 'T';
            case QuantityEnum.QUANTITY_FEW:
                return 'F';
            case QuantityEnum.QUANTITY_MANY:
                return 'M';
            default:
                return 'OT';
        }
    }

    formatPluralString(key, plural) {
        if (!key || !this.currentPluralRules) {
            return 'LOC_ERR: ' + key;
        }

        const pluralKey = key + this.stringForQuantity(this.currentPluralRules.quantityForNumber(plural));

        return this.formatString(pluralKey, plural);
    }

    formatString(key, ...args) {
        return i18n.t(key, { postProcess: 'sprintf', sprintf: args });
    }

    getString(key) {
        return i18n.t(key);
    }

    addTdLibListener = () => {
        TdLibController.on('update', this.onUpdate);
        TdLibController.on('clientUpdate', this.onClientUpdate);
    };

    removeTdLibListener = () => {
        TdLibController.off('update', this.onUpdate);
        TdLibController.off('clientUpdate', this.onClientUpdate);
    };

    onUpdate = async update => {
        switch (update['@type']) {
            case 'updateAuthorizationState': {
                switch (update.authorization_state['@type']) {
                    case 'authorizationStateWaitTdlibParameters':
                        TdLibController.send({
                            '@type': 'setOption',
                            name: 'localization_target',
                            value: { '@type': 'optionValueString', value: 'android' }
                        });

                        TdLibController.send({
                            '@type': 'setOption',
                            name: 'language_pack_id',
                            value: { '@type': 'optionValueString', value: lng }
                        });

                        this.info = await TdLibController.send({
                            '@type': 'getLocalizationTargetInfo',
                            only_local: false
                        });

                        TdLibController.clientUpdate({
                            '@type': 'clientUpdateLanguageChange',
                            language: lng
                        });
                        break;
                }
                break;
            }
            case 'updateLanguagePackStrings': {
                // add/remove new strings

                this.emit('updateLanguagePackStrings', update);
                break;
            }
        }
    };

    onClientUpdate = async update => {
        switch (update['@type']) {
            case 'clientUpdateLanguageChange': {
                let { language } = update;

                let langCode = language;
                const countryCodeIndex = language.indexOf('-');
                if (countryCodeIndex !== -1) {
                    langCode = language.substring(0, countryCodeIndex);
                    language = langCode + language.substr(countryCodeIndex).toUpperCase();
                }

                await this.loadLanguage(language);

                localStorage.setItem('i18next', language);

                await i18n.changeLanguage(language);

                this.currentPluralRules = this.allRules.get(langCode) || this.allRules.get(fallbackLng)
                this.recreateFormatters();

                TdLibController.send({
                    '@type': 'setOption',
                    name: 'language_pack_id',
                    value: { '@type': 'optionValueString', value: language }
                });

                this.emit('clientUpdateLanguageChange', update);
                break;
            }
        }
    };

    processStrings = (lng, languagePackStrings) => {
        if (!languagePackStrings) return {};
        const { strings } = languagePackStrings;
        if (!strings) return {};

        let result = {};
        for (let i = 0; i < strings.length; i++) {
            const { value } = strings[i];
            switch (value['@type']) {
                case 'languagePackStringValueOrdinary': {
                    result[strings[i].key] = value.value;
                    break;
                }
                case 'languagePackStringValuePluralized': {
                    if (value.zero_value) {
                        result[strings[i].key + 'Z'] = value.zero_value;
                    }
                    if (value.one_value) {
                        result[strings[i].key + 'O'] = value.one_value;
                    }
                    if (value.two_value) {
                        result[strings[i].key + 'T'] = value.two_value;
                    }
                    if (value.few_value) {
                        result[strings[i].key + 'F'] = value.few_value;
                    }
                    if (value.many_value) {
                        result[strings[i].key + 'M'] = value.many_value;
                    }
                    if (value.other_value) {
                        result[strings[i].key + 'OT'] = value.other_value;
                    }
                    break;
                }
                case 'languagePackStringValueDeleted': {
                    break;
                }
            }
        }

        return result;
    };

    loadLanguage = async language => {
        const result = await TdLibController.send({
            '@type': 'getLanguagePackStrings',
            language_pack_id: language.toLowerCase(),
            keys: []
        });

        const resources = this.processStrings(language, result);
        this.cache.save(language, defaultNS, resources);
        i18n.addResourceBundle(language, defaultNS, resources);
    };
}

const store = new LocalizationStore();
window.localization = store;
export default store;
