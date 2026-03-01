import { useWeather } from '@/hooks/useWeather';
import { BentoCard } from './bento-grid';

export const WeatherCard = () => {
  const { weather, isLoading, icon, condition } = useWeather();

  return (
    <BentoCard className="col-span-1" loading={isLoading}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Jenin, Palestine</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {weather?.temperature ?? '--'}°
            </span>
            <span className="text-lg">{icon}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{condition}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            H: {weather?.high ?? '--'}° L: {weather?.low ?? '--'}°
          </p>
        </div>
      </div>
    </BentoCard>
  );
};
