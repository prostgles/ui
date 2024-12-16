export const onMount: ProstglesOnMount = async ({ dbo }) => {
  if (!dbo.cities) {
    await dbo.sql(`
      CREATE EXTENSION IF NOT EXISTS postgis;

      CREATE TABLE airports (
        id BIGINT PRIMARY KEY,                -- Unique OSM ID
        name TEXT,                            -- Name of the airport
        iata_code TEXT,                 -- IATA code (3-letter code)
        icao_code TEXT,                 -- ICAO code (4-letter code)
        latitude DOUBLE PRECISION NOT NULL,            
        longitude DOUBLE PRECISION NOT NULL,           
        elevation TEXT,                       -- Elevation (in meters)
        operator TEXT,                        -- Airport operator
        capacity numeric,                     -- Passenger capacity (if available)
        opened_date TEXT,                     -- Date the airport opened
        country TEXT,                         -- Country where the airport is located
        runway_count numeric,                 -- Number of runways
        type TEXT ,                           -- Airport type (e.g., international, regional)
        geog GEOGRAPHY(POINT, 4326) generated always as (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) stored
      );

      CREATE INDEX airports_geog_idx ON airports USING GIST (geog);
      
      CREATE TABLE cities (
        id BIGINT PRIMARY KEY,
        name VARCHAR(100),
        name_en VARCHAR(100),
        capital TEXT,
        admin_level TEXT,
        official_status TEXT,
        population TEXT,
        population_date TEXT,
        start_date TEXT,

        note TEXT,
        website TEXT,
        addr_country TEXT,
        country_code TEXT,
        
        latitude DECIMAL(9,6) NOT NULL,
        longitude DECIMAL(9,6) NOT NULL,
        geog GEOGRAPHY(POINT, 4326) generated always as (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) stored,
        CONSTRAINT unique_city UNIQUE (latitude, longitude)
      );

      CREATE INDEX cities_geog_idx ON airports USING GIST (geog);

      CREATE TABLE weather_forecasts (
        id SERIAL PRIMARY KEY,
        city_id INT REFERENCES cities(id) ON DELETE CASCADE,
        forecast_time TIMESTAMPTZ NOT NULL,
        temperature DECIMAL(5,2),
        wind_speed DECIMAL(5,2),
        precipitation DECIMAL(5,2),
        pressure DECIMAL(7,2),
        humidity DECIMAL(5,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_forecast_per_city UNIQUE (city_id, forecast_time)
      );

      CREATE INDEX weather_forecasts_city_id_idx ON weather_forecasts(city_id);
    `);
  }

  const addForecasts = async () => {
    if (!dbo.weather_forecasts) return;
    const citiesCount = await dbo.cities.count();
    if (!+citiesCount) {
      const airports = await fetchAirports();
      await dbo.airports.insert(airports);

      const cities = await fetchCities();
      await dbo.cities.insert(cities);
    }
    const cities = await dbo.cities.find({
      name_en: {
        $in: [
          "London",
          "Amsterdam",
          "Athens",
          "Valencia",
          "Malaga",
          "Zagreb",
          "Valencia",
          "Copenhagen",
        ],
      },
    });

    const lastAdded = await dbo.weather_forecasts.findOne(
      {},
      { orderBy: [{ forecast_time: -1 }] },
    );
    if (
      lastAdded &&
      new Date().getTime() - new Date(lastAdded.forecast_time).getTime() < DAY
    ) {
      return;
    }
    for (const city of cities) {
      const weather = await getWeatherForCity(city.latitude, city.longitude);
      const forecasts = weather.properties.timeseries.map((entry) => ({
        city_id: city.id,
        // forecast_time: new Date(entry.time),
        forecast_time: entry.time,
        temperature: entry.data.instant.details.air_temperature,
        wind_speed: entry.data.instant.details.wind_speed,
        precipitation:
          entry.data.next_1_hours?.details.precipitation_amount ?? 0,
        pressure: entry.data.instant.details.air_pressure_at_sea_level,
        humidity: entry.data.instant.details.relative_humidity,
      }));

      await dbo.weather_forecasts.insert(forecasts);
    }
  };

  const DAY = 1000 * 3600 * 24;
  setTimeout(addForecasts, DAY); // Run every day
  await addForecasts();
};

type ForecastDetails = {
  air_temperature: number;
  wind_speed: number;
  precipitation_amount: number;
  air_pressure_at_sea_level: number;
  relative_humidity: number;
};

type TimeSeriesEntry = {
  time: string; // The timestamp
  data: {
    instant: {
      details: ForecastDetails;
    };
    next_1_hours?: {
      details: {
        precipitation_amount: number;
      };
      summary: {
        symbol_code: string;
      };
    };
  };
};

type ForecastResponse = {
  properties: {
    timeseries: TimeSeriesEntry[];
  };
};

const getWeatherForCity = async (
  lat: number | string,
  lon: number | string,
) => {
  const response = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
    {
      headers: {
        "User-Agent": "Prostgles-Demo", // YR requires a user agent header
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch weather for coordinates: ${lat}, ${lon}`);
  }

  const data: ForecastResponse = await response.json();
  return data;
};

const EUROPE_BBOX = "(34,-25,72,45)";
const fetchCities = async (): Promise<
  {
    id: number;
    lat: number;
    lon: number;
    name: string | null;
    name_en: string | null;
    capital: string | null;
    admin_level: string | null;
    official_status: string | null;
    population: string | null;
    population_date: string | null;
    start_date: string | null;
  }[]
> => {
  const overpassQuery = `
  [out:json];
  node["place"="city"]${EUROPE_BBOX};
  out body;
  `;

  const overpassUrl =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(overpassQuery);

  return fetch(overpassUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch cities");
      }
      return response;
    })
    .then((response) => response.json())
    .then((data) => {
      const cities = data.elements.map((element) => ({
        id: element.id,
        latitude: element.lat,
        longitude: element.lon,
        name: element.tags.name || null,
        name_en:
          element.tags["name:en"] ||
          (element.tags.name || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
        capital: element.tags.capital || null,
        admin_level: element.tags.admin_level || null,
        official_status: element.tags.official_status || null,
        population: element.tags.population || null,
        population_date: element.tags["population:date"] || null,
        start_date: element.tags.start_date || null,
        note: element.tags.note || null,
        website: element.tags.website || null,
        addr_country: element.tags["addr:country"] || null,
        country_code: element.tags["is_in:country_code"] || null,
      }));

      return cities;
    });
};

const fetchAirports = async () => {
  const overpassQuery = `
    [out:json][timeout:180]; 
    way["aeroway"="aerodrome"]["iata"]${EUROPE_BBOX}; 
    out center;
  `;
  const overpassUrl =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(overpassQuery);
  const response = await fetch(overpassUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Airports`);
  }
  const data = await response.json();

  return data.elements.map((element) => {
    return {
      id: element.id,
      name: element.tags.name || null,
      iata_code: element.tags["iata"] || null,
      icao_code: element.tags["icao"] || null,
      latitude: element.lat || (element.center ? element.center.lat : null),
      longitude: element.lon || (element.center ? element.center.lon : null),
      elevation: element.tags.ele || null,
      operator: element.tags.operator || null,
      capacity: element.tags.capacity || null,
      opened_date: element.tags["start_date"] || null,
      country: element.tags["addr:country"] || null,
      runway_count: element.tags.runways || null,
      type: element.tags["aeroway"] || null,
    };
  });
};
