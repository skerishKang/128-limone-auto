import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 더미 날씨 데이터 (실제 API 연동 시 OpenWeatherMap 등 사용)
      const mockWeather: WeatherData = {
        location: "Seoul, KR",
        temperature: 15,
        condition: "맑음",
        humidity: 65,
        windSpeed: 3.5,
        icon: "☀️"
      };
      
      setWeather(mockWeather);
    } catch (err) {
      setError('Failed to load weather data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
    // 30분마다 새로고침
    const interval = setInterval(loadWeather, 1800000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div
      onClick={loadWeather}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-sky-500
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          🌤️ 날씨
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {weather && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{weather.icon}</span>
              <div>
                <p className="text-2xl font-bold text-sky-600">{weather.temperature}°C</p>
                <p className="text-sm text-gray-600">{weather.location}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700">{weather.condition}</p>
          </div>
          
          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">습도</p>
              <p className="text-sm font-medium">{weather.humidity}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">바람</p>
              <p className="text-sm font-medium">{weather.windSpeed} m/s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
