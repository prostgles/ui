const fetchCountryBoundary = async (countryName: string) => {
  // Define the Overpass API query to get the boundary of a specific country in GeoJSON format
  const overpassQuery = `
      [out:json];
      relation["type"="boundary"]["boundary"="administrative"]["admin_level"="2"]["name:en"="${countryName}"];
      out body;
      >;
      out skel qt;
  `;

  // Encode the query for the Overpass API request
  const overpassUrl =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(overpassQuery);

  try {
    // Fetch data from the Overpass API
    const response = await fetch(overpassUrl);
    const data = await response.json();

    // Filter for the relation that contains the boundary and the name in English
    const relation = data.elements.find(
      (element) => element.type === "relation" && element.tags["name:en"],
    );

    if (!relation) {
      throw new Error(`Boundary for country '${countryName}' not found`);
    }

    // Create a mapping of node IDs to coordinates (lat, lon)
    const nodeMap: Record<string, [number, number]> = {};
    data.elements.forEach((element) => {
      if (element.type === "node") {
        nodeMap[element.id] = [element.lon, element.lat]; // Store longitude and latitude as a pair
      }
    });

    // Extract the ways that form the polygon and their respective nodes
    const coordinates = relation.members
      .filter((member) => member.type === "way")
      .map((way) => way.ref)
      .map((ref) =>
        data.elements
          .find((element) => element.type === "way" && element.id === ref)
          .nodes.map((nodeId) => nodeMap[nodeId]),
      );

    // Construct the GeoJSON object
    const geojson = {
      type: "Feature",
      properties: {
        name: relation.tags["name:en"] || relation.tags.name || "Unknown",
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates.flat()],
      },
    };

    return geojson;
  } catch (error) {
    console.error("Error fetching country boundary:", error);
  }
};

// Example usage:
fetchCountryBoundary("Germany")
  .then((geojson) => {
    console.log("Country Boundary GeoJSON:", geojson);
  })
  .catch((error) => {
    console.error(error);
  });
