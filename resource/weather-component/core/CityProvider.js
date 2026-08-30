/**
 * 数据源基类
 */
export class CityProvider {
    async getWeather() { throw new Error('getWeather() must be implemented'); }
}

/**
 * 自动定位（基于 IP）
 */
export class AutoCityProvider extends CityProvider {
    constructor(apiUrl = 'https://ipapi.co/json/') {
        super();
        this.apiUrl = apiUrl;
    }

    async getWeather() {
        const res = await fetch(this.apiUrl);
        const data = await res.json();
        // 接入真实天气 API 后，这里根据 data.city 查询天气类型
        const types = ['thunderstorm', 'snow', 'thunderstorm', 'snow'];
        return {
            city: data.city || 'Unknown',
            weather: types[Math.floor(Math.random() * types.length)]
        };
    }
}

/**
 * 手动指定城市 + 固定天气
 */
export class ManualCityProvider extends CityProvider {
    constructor(city, weather) {
        super();
        this._city = city;
        this._weather = weather;
    }

    async getWeather() {
        return { city: this._city, weather: this._weather };
    }

    setCity(city)   { this._city = city; }
    setWeather(w)   { this._weather = w; }
}