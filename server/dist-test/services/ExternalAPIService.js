const fetch = require('node-fetch');
class ExternalAPIService {
    constructor(logger) {
        this.logger = logger;
    }
    providers() {
        return {
            wikipedia_search: {
                info: 'Wikipedia OpenSearch',
                handler: async ({ term }) => {
                    if (!term)
                        throw new Error('term required');
                    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=10&namespace=0&format=json`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            virustotal_url: {
                info: 'VirusTotal URL report (requires apiKey)',
                handler: async ({ url }) => {
                    if (!url)
                        throw new Error('url required');
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('virustotal');
                    if (!apiKey)
                        throw new Error('API key for virustotal not configured');
                    const resp = await fetch('https://www.virustotal.com/api/v3/urls', {
                        method: 'POST',
                        headers: { 'x-apikey': apiKey, 'content-type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ url })
                    });
                    const data = await resp.json();
                    const id = data?.data?.id;
                    if (!id)
                        return data;
                    const rep = await fetch(`https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(id)}`, { headers: { 'x-apikey': apiKey } });
                    return await rep.json();
                }
            },
            openweather_current: {
                info: 'OpenWeather current weather (requires apiKey)',
                handler: async ({ q, lat, lon }) => {
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('openweather');
                    if (!apiKey)
                        throw new Error('API key for openweather not configured');
                    let url = `https://api.openweathermap.org/data/2.5/weather?appid=${encodeURIComponent(apiKey)}&units=metric`;
                    if (q)
                        url += `&q=${encodeURIComponent(q)}`;
                    if (lat != null && lon != null)
                        url += `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            shodan_host: {
                info: 'Shodan host information (requires apiKey)',
                handler: async ({ ip }) => {
                    if (!ip)
                        throw new Error('ip required');
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('shodan');
                    if (!apiKey)
                        throw new Error('API key for shodan not configured');
                    const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(apiKey)}`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            greynoise_ip: {
                info: 'GreyNoise IP context (requires apiKey)',
                handler: async ({ ip }) => {
                    if (!ip)
                        throw new Error('ip required');
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('greynoise');
                    if (!apiKey)
                        throw new Error('API key for greynoise not configured');
                    const res = await fetch(`https://api.greynoise.io/v3/community/${encodeURIComponent(ip)}`, { headers: { 'key': apiKey } });
                    return await res.json();
                }
            },
            hibp_breach: {
                info: 'HaveIBeenPwned breached account (requires apiKey)',
                handler: async ({ account }) => {
                    if (!account)
                        throw new Error('account required');
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('hibp');
                    if (!apiKey)
                        throw new Error('API key for hibp not configured');
                    const res = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(account)}`, {
                        headers: { 'hibp-api-key': apiKey, 'user-agent': 'IntelGraph/1.0' }
                    });
                    if (res.status === 404)
                        return []; // not found is normal
                    return await res.json();
                }
            },
            opencage_geocode: {
                info: 'OpenCage geocoding (requires apiKey)',
                handler: async ({ q }) => {
                    if (!q)
                        throw new Error('q required');
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('opencage');
                    if (!apiKey)
                        throw new Error('API key for opencage not configured');
                    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(q)}&key=${encodeURIComponent(apiKey)}`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            gnews_search: {
                info: 'GNews search (requires apiKey)',
                handler: async ({ q }) => {
                    if (!q)
                        throw new Error('q required');
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('gnews');
                    if (!apiKey)
                        throw new Error('API key for gnews not configured');
                    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${encodeURIComponent(apiKey)}`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            wikidata_search: {
                info: 'Wikidata search entities',
                handler: async ({ term }) => {
                    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(term)}&language=en&format=json`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            urlhaus_recent: {
                info: 'URLhaus recent URLs',
                handler: async () => {
                    const res = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/');
                    return await res.json();
                }
            },
            nvd_recent: {
                info: 'NVD recent CVEs',
                handler: async ({ resultsPerPage = 10 }) => {
                    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=${encodeURIComponent(resultsPerPage)}`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            nominatim_search: {
                info: 'OpenStreetMap Nominatim geocode',
                handler: async ({ q }) => {
                    if (!q)
                        throw new Error('q required');
                    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
                    const res = await fetch(url, { headers: { 'User-Agent': 'IntelGraph/1.0' } });
                    return await res.json();
                }
            },
            open_meteo_air: {
                info: 'Open-Meteo Air Quality (no auth)',
                handler: async ({ latitude, longitude }) => {
                    if (latitude == null || longitude == null)
                        throw new Error('latitude and longitude required');
                    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=UTC`;
                    const res = await fetch(url);
                    return await res.json();
                }
            },
            spacex_launches: {
                info: 'SpaceX latest launches',
                handler: async () => {
                    const res = await fetch('https://api.spacexdata.com/v5/launches/latest');
                    return await res.json();
                }
            },
            nasa_apod: {
                info: 'NASA Astronomy Picture of the Day (apiKey required)',
                handler: async ({ date }) => {
                    const KeyVaultService = require('./KeyVaultService');
                    const kv = new KeyVaultService();
                    const apiKey = await kv.getApiKey('nasa_apod');
                    if (!apiKey)
                        throw new Error('API key for nasa_apod not configured');
                    const url = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}${date ? `&date=${encodeURIComponent(date)}` : ''}`;
                    const res = await fetch(url);
                    return await res.json();
                }
            }
        };
    }
    async query(provider, params = {}) {
        const map = this.providers();
        if (!map[provider])
            throw new Error('Unknown provider');
        const out = await map[provider].handler(params || {});
        return { provider, params, result: out };
    }
}
module.exports = ExternalAPIService;
//# sourceMappingURL=ExternalAPIService.js.map