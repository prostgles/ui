
DROP TABLE IF EXISTS  countries;
CREATE TABLE countries (
  id BIGINT PRIMARY KEY,
  type    TEXT,
  name    TEXT,
  name_en TEXT,
  geom GEOGRAPHY
);

CREATE TABLE country_goejson (
  id BIGINT PRIMARY KEY,
  geojson JSON
);

COPY countries (id, type, name, name_en) FROM PROGRAM $$
  curl -d "[out:csv(::id, ::type, name, 'name:en'; false)];relation[admin_level=2][boundary=administrative][type!=multilinestring]; out;"  -X POST http://overpass-api.de/api/interpreter
$$;

COPY country_goejson (geojson) FROM PROGRAM $$
  curl -d "[out:json];relation[admin_level=2][boundary=administrative][type=boundary]; out geom;"  -X POST http://overpass-api.de/api/interpreter
$$;

COPY country_goejson (geojson) FROM PROGRAM $$
  curl -d "[out:json];rel[boundary=administrative][admin_level=2](9407); out geom;"  -X POST http://overpass-api.de/api/interpreter
$$;



