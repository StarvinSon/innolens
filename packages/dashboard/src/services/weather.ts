import { injectableConstructor, singleton } from '@innolens/resolver/web';

import icon50 from '../images/50.png';
import icon51 from '../images/51.png';
import icon52 from '../images/52.png';
import icon53 from '../images/53.png';
import icon54 from '../images/54.png';
import icon60 from '../images/60.png';
import icon61 from '../images/61.png';
import icon62 from '../images/62.png';
import icon63 from '../images/63.png';
import icon64 from '../images/64.png';
import icon65 from '../images/65.png';
import icon70 from '../images/70.png';
import icon71 from '../images/71.png';
import icon72 from '../images/72.png';
import icon73 from '../images/73.png';
import icon74 from '../images/74.png';
import icon75 from '../images/75.png';
import icon76 from '../images/76.png';
import icon77 from '../images/77.png';
import { stringTag } from '../utils/class';


export interface CurrentWeather {
  readonly temperature: CurrentWeatherTemperature;
  readonly icon: string;
}

export interface CurrentWeatherTemperature {
  place: string;
  value: number;
  unit: string;
}

const icons: Record<string, string> = {
  icon50,
  icon51,
  icon52,
  icon53,
  icon54,
  icon60,
  icon61,
  icon62,
  icon63,
  icon64,
  icon65,
  icon70,
  icon71,
  icon72,
  icon73,
  icon74,
  icon75,
  icon76,
  icon77
};

@injectableConstructor()
@singleton()
@stringTag()
export class WeatherService {
  public constructor() {
    if (process.env.NODE_ENV === 'development') {
      (globalThis as any).weatherService = this;
    }
  }

  public async getCurrentWeather(): Promise<CurrentWeather> {
    const res = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en');
    if (!res.ok) {
      throw new Error('Open data server responds not ok');
    }
    const resData = (await res.json());
    const results = {
      temperature: resData.temperature.data.find((data: CurrentWeatherTemperature) => data.place === 'Hong Kong Park'),
      icon: resData.icon.map((icon: string) => icons[`icon${icon}`] ?? icons.icon50)
    };
    return results;
  }
}
