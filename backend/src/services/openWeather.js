import { config } from '../config/index.js';

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export async function getForecast(lat, lon) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${config.openWeather.apiKey}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather error: ${res.status}`);

  const data = await res.json();

  return data.list
    .filter((_, i) => i % 8 === 0)
    .slice(0, 5)
    .map((day) => ({
      date: day.dt_txt,
      temp: day.main.temp,
      humidity: day.main.humidity,
      rain: day.pop,
      description: day.weather[0].description,
      icon: day.weather[0].icon,
    }));
}
