/** 
 * https://wiki.openstreetmap.org/wiki/Key:highway
 * https://wiki.openstreetmap.org/wiki/Key:amenity
 * https://wiki.openstreetmap.org/wiki/Key:building
 * https://wiki.openstreetmap.org/wiki/Key:natural
 * 
 
  let oTable = $0;
  let data = [...oTable.rows].map(t => {
    const [key, value, elemIcon, info] = [...t.children].map(u => u.innerText);
    return { key, value, info }
  }).filter(t => t.key === "highway");
  console.log(data);

 */
const highway = [
  {
    key: "highway",
    value: "motorway",
    info: "A restricted access major divided highway, normally with 2 or more running lanes plus emergency hard shoulder. Equivalent to the Freeway, Autobahn, etc..",
  },
  {
    key: "highway",
    value: "trunk",
    info: "The most important roads in a country's system that aren't motorways. (Need not necessarily be a divided highway.)",
  },
  {
    key: "highway",
    value: "primary",
    info: "The next most important roads in a country's system. (Often link larger towns.)",
  },
  {
    key: "highway",
    value: "secondary",
    info: "The next most important roads in a country's system. (Often link towns.)",
  },
  {
    key: "highway",
    value: "tertiary",
    info: "The next most important roads in a country's system. (Often link smaller towns and villages)",
  },
  {
    key: "highway",
    value: "unclassified",
    info: "The least important through roads in a country's system – i.e. minor roads of a lower classification than tertiary, but which serve a purpose other than access to properties. (Often link villages and hamlets.)\n\nThe word 'unclassified' is a historical artefact of the UK road system and does not mean that the classification is unknown; you can use highway=road for that.",
  },
  {
    key: "highway",
    value: "residential",
    info: "Roads which serve as an access to housing, without function of connecting settlements. Often lined with housing.",
  },
  {
    key: "highway",
    value: "motorway_link",
    info: "The link roads (sliproads/ramps) leading to/from a motorway from/to a motorway or lower class highway. Normally with the same motorway restrictions.",
  },
  {
    key: "highway",
    value: "trunk_link",
    info: "The link roads (sliproads/ramps) leading to/from a trunk road from/to a trunk road or lower class highway.",
  },
  {
    key: "highway",
    value: "primary_link",
    info: "The link roads (sliproads/ramps) leading to/from a primary road from/to a primary road or lower class highway.",
  },
  {
    key: "highway",
    value: "secondary_link",
    info: "The link roads (sliproads/ramps) leading to/from a secondary road from/to a secondary road or lower class highway.",
  },
  {
    key: "highway",
    value: "tertiary_link",
    info: "The link roads (sliproads/ramps) leading to/from a tertiary road from/to a tertiary road or lower class highway.",
  },
  {
    key: "highway",
    value: "living_street",
    info: "For living streets, which are residential streets where pedestrians have legal priority over cars, speeds are kept very low and this is can use for narrow roads that usually using for motorcycle roads.",
  },
  {
    key: "highway",
    value: "service",
    info: "For access roads to, or within an industrial estate, camp site, business park, car park, alleys, etc. Can be used in conjunction with service=* to indicate the type of usage and with access=* to indicate who can use it and in what circumstances.",
  },
  {
    key: "highway",
    value: "pedestrian",
    info: "For roads used mainly/exclusively for pedestrians in shopping and some residential areas which may allow access by motorised vehicles only for very limited periods of the day. To create a 'square' or 'plaza' create a closed way and tag as pedestrian and also with area=yes.",
  },
  {
    key: "highway",
    value: "track",
    info: "Roads for mostly agricultural or forestry uses. To describe the quality of a track, see tracktype=*. Note: Although tracks are often rough with unpaved surfaces, this tag is not describing the quality of a road but its use. Consequently, if you want to tag a general use road, use one of the general highway values instead of track.",
  },
  {
    key: "highway",
    value: "bus_guideway",
    info: "A busway where the vehicle guided by the way (though not a railway) and is not suitable for other traffic. Please note: this is not a normal bus lane, use access=no, psv=yes instead!",
  },
  {
    key: "highway",
    value: "escape",
    info: "For runaway truck ramps, runaway truck lanes, emergency escape ramps, or truck arrester beds. It enables vehicles with braking failure to safely stop.",
  },
  {
    key: "highway",
    value: "raceway",
    info: "A course or track for (motor) racing",
  },
  {
    key: "highway",
    value: "road",
    info: "A road/way/street/motorway/etc. of unknown type. It can stand for anything ranging from a footpath to a motorway. This tag should only be used temporarily until the road/way/etc. has been properly surveyed. If you do know the road type, do not use this value, instead use one of the more specific highway=* values.",
  },
  {
    key: "highway",
    value: "busway",
    info: "A dedicated roadway for bus rapid transit systems",
  },
  {
    key: "highway",
    value: "footway",
    info: "For designated footpaths; i.e., mainly/exclusively for pedestrians. This includes walking tracks and gravel paths. If bicycles are allowed as well, you can indicate this by adding a bicycle=yes tag. Should not be used for paths where the primary or intended usage is unknown. Use highway=pedestrian for pedestrianised roads in shopping or residential areas and highway=track if it is usable by agricultural or similar vehicles. For ramps (sloped paths without steps), combine this tag with incline=*.",
  },
  {
    key: "highway",
    value: "bridleway",
    info: "For horse riders. Pedestrians are usually also permitted, cyclists may be permitted depending on local rules/laws. Motor vehicles are forbidden.",
  },
  {
    key: "highway",
    value: "steps",
    info: "For flights of steps (stairs) on footways. Use with step_count=* to indicate the number of steps",
  },
  {
    key: "highway",
    value: "corridor",
    info: "For a hallway inside of a building.",
  },
  {
    key: "highway",
    value: "path",
    info: "A non-specific path. Use highway=footway for paths mainly for walkers, highway=cycleway for one also usable by cyclists, highway=bridleway for ones available to horse riders as well as walkers and highway=track for ones which is passable by agriculture or similar vehicles.",
  },
  {
    key: "highway",
    value: "via_ferrata",
    info: "A via ferrata is a route equipped with fixed cables, stemples, ladders, and bridges in order to increase ease and security for climbers. These via ferrata require equipment : climbing harness, shock absorber and two short lengths of rope, but do not require a long rope as for climbing.",
  },
  {
    key: "highway",
    value: "cycleway",
    info: "For designated cycleways. Add foot=*, though it may be avoided if default-access-restrictions do apply.",
  },
  {
    key: "highway",
    value: "proposed",
    info: "For planned roads, use with proposed=* and a value of the proposed highway value.",
  },
  {
    key: "highway",
    value: "construction",
    info: "For roads under construction. Use construction=* to hold the value for the completed road.",
  },
  {
    key: "highway",
    value: "bus_stop",
    info: "A small bus stop. Optionally one may also use public_transport=stop_position for the position where the vehicle stops and public_transport=platform for the place where passengers wait.",
  },
  {
    key: "highway",
    value: "crossing",
    info: "A.k.a. crosswalk. Pedestrians can cross a street here; e.g., zebra crossing",
  },
  {
    key: "highway",
    value: "cyclist_waiting_aid",
    info: "Street furniture for cyclists that are intended to make waiting at esp. traffic lights more comfortable.",
  },
  {
    key: "highway",
    value: "elevator",
    info: "An elevator or lift, used to travel vertically, providing passenger and freight access between pathways at different floor levels.",
  },
  {
    key: "highway",
    value: "emergency_bay",
    info: "An area beside a highway where you can safely stop your car in case of breakdown or emergency.",
  },
  {
    key: "highway",
    value: "emergency_access_point",
    info: "Sign number which can be used to define your current position in case of an emergency. Use with ref=NUMBER_ON_THE_SIGN. See also emergency=access_point",
  },
  {
    key: "highway",
    value: "give_way",
    info: 'A "give way," or "Yield" sign',
  },
  {
    key: "highway",
    value: "ladder",
    info: "A vertical or inclined set of steps or rungs intended for climbing or descending of a person with the help of hands.",
  },
  {
    key: "highway",
    value: "milestone",
    info: "Highway location marker",
  },
  {
    key: "highway",
    value: "mini_roundabout",
    info: "Similar to roundabouts, but at the center there is either a painted circle or a fully traversable island. In case of an untraversable center island, junction=roundabout should be used.\n\nRendered as anti-clockwise by default direction=anticlockwise. To render clockwise add the tag direction=clockwise.",
  },
  {
    key: "highway",
    value: "motorway_junction",
    info: "Indicates a junction (UK) or exit (US). ref=* should be set to the exit number or junction identifier. (Some roads – e.g., the A14 – also carry junction numbers, so the tag may be encountered elsewhere despite its name)",
  },
  {
    key: "highway",
    value: "passing_place",
    info: "The location of a passing space",
  },
  {
    key: "highway",
    value: "platform",
    info: "A platform at a bus stop or station.",
  },
  {
    key: "highway",
    value: "rest_area",
    info: "Place where drivers can leave the road to rest, but not refuel.",
  },
  {
    key: "highway",
    value: "services",
    info: "A service station to get food and eat something, often found at motorways",
  },
  {
    key: "highway",
    value: "speed_camera",
    info: "A fixed road-side or overhead speed camera.",
  },
  {
    key: "highway",
    value: "stop",
    info: "A stop sign",
  },
  {
    key: "highway",
    value: "street_lamp",
    info: "A street light, lamppost, street lamp, light standard, or lamp standard is a raised source of light on the edge of a road, which is turned on or lit at a certain time every night",
  },
  {
    key: "highway",
    value: "toll_gantry",
    info: "A toll gantry is a gantry suspended over a way, usually a motorway, as part of a system of electronic toll collection. For a toll booth with any kind of barrier or booth see: barrier=toll_booth",
  },
  {
    key: "highway",
    value: "traffic_mirror",
    info: "Mirror that reflects the traffic on one road when direct view is blocked.",
  },
  {
    key: "highway",
    value: "traffic_signals",
    info: "Lights that control the traffic",
  },
  {
    key: "highway",
    value: "trailhead",
    info: "Designated place to start on a trail or route",
  },
  {
    key: "highway",
    value: "turning_circle",
    info: "A turning circle is a rounded, widened area usually, but not necessarily, at the end of a road to facilitate easier turning of a vehicle. Also known as a cul de sac.",
  },
  {
    key: "highway",
    value: "turning_loop",
    info: "A widened area of a highway with a non-traversable island for turning around, often circular and at the end of a road.",
  },
  {
    key: "highway",
    value: "User Defined",
    info: "All commonly used values according to Taginfo",
  },
];

const amenities = [
  {
    key: "amenity",
    value: "bar",
    info: "Bar is a purpose-built commercial establishment that sells alcoholic drinks to be consumed on the premises. They are characterised by a noisy and vibrant atmosphere, similar to a party and usually don't sell food. See also the description of the tags amenity=pub;bar;restaurant for a distinction between these.",
  },
  {
    key: "amenity",
    value: "biergarten",
    info: "Biergarten or beer garden is an open-air area where alcoholic beverages along with food is prepared and served. See also the description of the tags amenity=pub;bar;restaurant. A biergarten can commonly be found attached to a beer hall, pub, bar, or restaurant. In this case, you can use biergarten=yes additional to amenity=pub;bar;restaurant.",
  },
  {
    key: "amenity",
    value: "cafe",
    info: "Cafe is generally an informal place that offers casual meals and beverages; typically, the focus is on coffee or tea. Also known as a coffeehouse/shop, bistro or sidewalk cafe. The kind of food served may be mapped with the tags cuisine=* and diet:*=*. See also the tags amenity=restaurant;bar;fast_food.",
  },
  {
    key: "amenity",
    value: "fast_food",
    info: "Fast food restaurant (see also amenity=restaurant). The kind of food served can be tagged with cuisine=* and diet:*=*.",
  },
  {
    key: "amenity",
    value: "food_court",
    info: "An area with several different restaurant food counters and a shared eating area. Commonly found in malls, airports, etc.",
  },
  {
    key: "amenity",
    value: "ice_cream",
    info: "Ice cream shop or ice cream parlour. A place that sells ice cream and frozen yoghurt over the counter",
  },
  {
    key: "amenity",
    value: "pub",
    info: "A place selling beer and other alcoholic drinks; may also provide food or accommodation (UK). See description of amenity=bar and amenity=pub for distinction between bar and pub",
  },
  {
    key: "amenity",
    value: "restaurant",
    info: "Restaurant (not fast food, see amenity=fast_food). The kind of food served can be tagged with cuisine=* and diet:*=*.",
  },
  {
    key: "amenity",
    value: "college",
    info: "Campus or buildings of an institute of Further Education (aka continuing education)",
  },
  {
    key: "amenity",
    value: "dancing_school",
    info: "A dancing school or dance studio",
  },
  {
    key: "amenity",
    value: "driving_school",
    info: "Driving School which offers motor vehicle driving lessons",
  },
  {
    key: "amenity",
    value: "first_aid_school",
    info: "A place where people can go for first aid courses.",
  },
  {
    key: "amenity",
    value: "kindergarten",
    info: "For children too young for a regular school (also known as preschool, playschool or nursery school), in some countries including afternoon supervision of primary school children.",
  },
  {
    key: "amenity",
    value: "language_school",
    info: "Language School: an educational institution where one studies a foreign language.",
  },
  {
    key: "amenity",
    value: "library",
    info: "A public library (municipal, university, …) to borrow books from.",
  },
  {
    key: "amenity",
    value: "surf_school",
    info: "A surf school is an establishment that teaches surfing.",
  },
  {
    key: "amenity",
    value: "toy_library",
    info: "A place to borrow games and toys, or play with them on site.",
  },
  {
    key: "amenity",
    value: "research_institute",
    info: "An establishment endowed for doing research.",
  },
  {
    key: "amenity",
    value: "training",
    info: "Public place where you can get training.",
  },
  {
    key: "amenity",
    value: "music_school",
    info: "A music school, an educational institution specialized in the study, training, and research of music.",
  },
  {
    key: "amenity",
    value: "school",
    info: "School and grounds - primary, middle and seconday schools",
  },
  {
    key: "amenity",
    value: "traffic_park",
    info: "Juvenile traffic schools",
  },
  {
    key: "amenity",
    value: "university",
    info: "An university campus: an institute of higher education",
  },
  {
    key: "amenity",
    value: "bicycle_parking",
    info: "Parking for bicycles",
  },
  {
    key: "amenity",
    value: "bicycle_repair_station",
    info: "General tools for self-service bicycle repairs, usually on the roadside; no service",
  },
  {
    key: "amenity",
    value: "bicycle_rental",
    info: "Rent a bicycle",
  },
  {
    key: "amenity",
    value: "bicycle_wash",
    info: "Clean a bicycle",
  },
  {
    key: "amenity",
    value: "boat_rental",
    info: "Rent a Boat",
  },
  {
    key: "amenity",
    value: "boat_sharing",
    info: "Share a Boat",
  },
  {
    key: "amenity",
    value: "bus_station",
    info: "May also be tagged as public_transport=station.",
  },
  {
    key: "amenity",
    value: "car_rental",
    info: "Rent a car",
  },
  {
    key: "amenity",
    value: "car_sharing",
    info: "Share a car",
  },
  {
    key: "amenity",
    value: "car_wash",
    info: "Wash a car",
  },
  {
    key: "amenity",
    value: "compressed_air",
    info: "A device to inflate tires/tyres (e.g. motorcar, bicycle)",
  },
  {
    key: "amenity",
    value: "vehicle_inspection",
    info: "Government vehicle inspection",
  },
  {
    key: "amenity",
    value: "charging_station",
    info: "Charging facility for electric vehicles",
  },
  {
    key: "amenity",
    value: "driver_training",
    info: "A place for driving training on a closed course",
  },
  {
    key: "amenity",
    value: "ferry_terminal",
    info: "Ferry terminal/stop. A place where people/cars/etc. can board and leave a ferry.",
  },
  {
    key: "amenity",
    value: "fuel",
    info: "Petrol station; gas station; marine fuel; … Streets to petrol stations are often tagged highway=service.",
  },
  {
    key: "amenity",
    value: "grit_bin",
    info: "A container that holds grit or a mixture of salt and grit.",
  },
  {
    key: "amenity",
    value: "motorcycle_parking",
    info: "Parking for motorcycles",
  },
  {
    key: "amenity",
    value: "parking",
    info: "Car park. Nodes and areas (without access tag) will get a parking symbol. Areas will be coloured. Streets on car parking are often tagged highway=service and service=parking_aisle.",
  },
  {
    key: "amenity",
    value: "parking_entrance",
    info: "An entrance or exit to an underground or multi-storey parking facility. Group multiple parking entrances together with a relation using the tags type=site and site=parking. Do not mix with amenity=parking.",
  },
  {
    key: "amenity",
    value: "parking_space",
    info: "A single parking space. Group multiple parking spaces together with a relation using the tags type=site and site=parking. Do not mix with amenity=parking.",
  },
  {
    key: "amenity",
    value: "taxi",
    info: "A place where taxis wait for passengers.",
  },
  {
    key: "amenity",
    value: "weighbridge",
    info: "A large weight scale to weigh vehicles and goods",
  },
  {
    key: "amenity",
    value: "atm",
    info: "ATM or cash point: a device that provides the clients of a financial institution with access to financial transactions.",
  },
  {
    key: "amenity",
    value: "payment_terminal",
    info: "Self-service payment kiosk/terminal",
  },
  {
    key: "amenity",
    value: "bank",
    info: "Bank or credit union: a financial establishment where customers can deposit and withdraw money, take loans, make investments and transfer funds.",
  },
  {
    key: "amenity",
    value: "bureau_de_change",
    info: "Bureau de change, money changer, currency exchange, Wechsel, cambio – a place to change foreign bank notes and travellers cheques.",
  },
  {
    key: "amenity",
    value: "money_transfer",
    info: "A place that offers money transfers, especially cash to cash",
  },
  {
    key: "amenity",
    value: "payment_centre",
    info: "A non-bank place, where people can pay bills of public and private services and taxes.",
  },
  {
    key: "amenity",
    value: "baby_hatch",
    info: "A place where a baby can be, out of necessity, anonymously left to be safely cared for and perhaps adopted.",
  },
  {
    key: "amenity",
    value: "clinic",
    info: "A medium-sized medical facility or health centre.",
  },
  {
    key: "amenity",
    value: "dentist",
    info: "A dentist practice / surgery.",
  },
  {
    key: "amenity",
    value: "doctors",
    info: "A doctor's practice / surgery.",
  },
  {
    key: "amenity",
    value: "hospital",
    info: "A hospital providing in-patient medical treatment. Often used in conjunction with emergency=* to note whether the medical centre has emergency facilities (A&E (brit.) or ER (am.))",
  },
  {
    key: "amenity",
    value: "nursing_home",
    info: "Discouraged tag for a home for disabled or elderly persons who need permanent care. Use amenity=social_facility + social_facility=nursing_home now.",
  },
  {
    key: "amenity",
    value: "pharmacy",
    info: "Pharmacy: a shop where a pharmacist sells medications\ndispensing=yes/no - availability of prescription-only medications",
  },
  {
    key: "amenity",
    value: "social_facility",
    info: "A facility that provides social services: group & nursing homes, workshops for the disabled, homeless shelters, etc.",
  },
  {
    key: "amenity",
    value: "veterinary",
    info: "A place where a veterinary surgeon, also known as a veterinarian or vet, practices.",
  },
  {
    key: "amenity",
    value: "arts_centre",
    info: "A venue where a variety of arts are performed or conducted",
  },
  {
    key: "amenity",
    value: "brothel",
    info: "An establishment specifically dedicated to prostitution",
  },
  {
    key: "amenity",
    value: "casino",
    info: "A gambling venue with at least one table game(e.g. roulette, blackjack) that takes bets on sporting and other events at agreed upon odds.",
  },
  {
    key: "amenity",
    value: "cinema",
    info: "A place where films are shown (US: movie theater)",
  },
  {
    key: "amenity",
    value: "community_centre",
    info: "A place mostly used for local events, festivities and group activities; including special interest and special age groups. .",
  },
  {
    key: "amenity",
    value: "conference_centre",
    info: "A large building that is used to hold a convention",
  },
  {
    key: "amenity",
    value: "events_venue",
    info: "A building specifically used for organising events",
  },
  {
    key: "amenity",
    value: "exhibition_centre",
    info: "An exhibition centre",
  },
  {
    key: "amenity",
    value: "fountain",
    info: "A fountain for cultural / decorational / recreational purposes.",
  },
  {
    key: "amenity",
    value: "gambling",
    info: "A place for gambling, not being a shop=bookmaker, shop=lottery, amenity=casino, or leisure=adult_gaming_centre.\n\nGames that are covered by this definition include bingo and pachinko.",
  },
  {
    key: "amenity",
    value: "love_hotel",
    info: "A love hotel is a type of short-stay hotel operated primarily for the purpose of allowing guests privacy for sexual activities.",
  },
  {
    key: "amenity",
    value: "music_venue",
    info: "An indoor place to hear contemporary live music.",
  },
  {
    key: "amenity",
    value: "nightclub",
    info: 'A place to drink and dance (nightclub). The German word is "Disco" or "Discothek". Please don\'t confuse this with the German "Nachtclub" which is most likely amenity=stripclub.',
  },
  {
    key: "amenity",
    value: "planetarium",
    info: "A planetarium.",
  },
  {
    key: "amenity",
    value: "public_bookcase",
    info: "A street furniture containing books. Take one or leave one.",
  },
  {
    key: "amenity",
    value: "social_centre",
    info: "A place for free and not-for-profit activities.",
  },
  {
    key: "amenity",
    value: "stage",
    info: "A raised platform for performers.",
  },
  {
    key: "amenity",
    value: "stripclub",
    info: "A place that offers striptease or lapdancing (for sexual services use amenity=brothel).",
  },
  {
    key: "amenity",
    value: "studio",
    info: "TV radio or recording studio",
  },
  {
    key: "amenity",
    value: "swingerclub",
    info: "A club where people meet to have a party and group sex.",
  },
  {
    key: "amenity",
    value: "theatre",
    info: "A theatre or opera house where live performances occur, such as plays, musicals and formal concerts. Use amenity=cinema for movie theaters.",
  },
  {
    key: "amenity",
    value: "courthouse",
    info: "A building home to a court of law, where justice is dispensed",
  },
  {
    key: "amenity",
    value: "fire_station",
    info: "A station of a fire brigade",
  },
  {
    key: "amenity",
    value: "police",
    info: "A police station where police officers patrol from and that is a first point of contact for civilians",
  },
  {
    key: "amenity",
    value: "post_box",
    info: "A box for the reception of mail. Alternative mail-carriers can be tagged via operator=*",
  },
  {
    key: "amenity",
    value: "post_depot",
    info: "Post depot or delivery office, where letters and parcels are collected and sorted prior to delivery.",
  },
  {
    key: "amenity",
    value: "post_office",
    info: "Post office building with postal services",
  },
  {
    key: "amenity",
    value: "prison",
    info: "A prison or jail where people are incarcerated before trial or after conviction",
  },
  {
    key: "amenity",
    value: "ranger_station",
    info: "National Park visitor headquarters: official park visitor facility with police, visitor information, permit services, etc",
  },
  {
    key: "amenity",
    value: "townhall",
    info: "Building where the administration of a village, town or city may be located, or just a community meeting place",
  },
  {
    key: "amenity",
    value: "bbq",
    info: "BBQ or Barbecue is a permanently built grill for cooking food, which is most typically used outdoors by the public. For example these may be found in city parks or at beaches. Use the tag fuel=* to specify the source of heating, such as fuel=wood;electric;charcoal. For mapping nearby table and chairs, see also the tag tourism=picnic_site. For mapping campfires and firepits, instead use the tag leisure=firepit.",
  },
  {
    key: "amenity",
    value: "bench",
    info: "A bench to sit down and relax a bit",
  },
  {
    key: "amenity",
    value: "dog_toilet",
    info: "Area designated for dogs to urinate and excrete.",
  },
  {
    key: "amenity",
    value: "dressing_room",
    info: "Area designated for changing clothes.",
  },
  {
    key: "amenity",
    value: "drinking_water",
    info: "Drinking water is a place where humans can obtain potable water for consumption. Typically, the water is used for only drinking. Also known as a drinking fountain or bubbler.",
  },
  {
    key: "amenity",
    value: "give_box",
    info: "A small facility where people drop off and pick up various types of items in the sense of free sharing and reuse.",
  },
  {
    key: "amenity",
    value: "mailroom",
    info: "A mailroom for receiving packages or letters.",
  },
  {
    key: "amenity",
    value: "parcel_locker",
    info: "Machine for picking up and sending parcels",
  },
  {
    key: "amenity",
    value: "shelter",
    info: "A small shelter against bad weather conditions. To additionally describe the kind of shelter use shelter_type=*.",
  },
  {
    key: "amenity",
    value: "shower",
    info: "Public shower.",
  },
  {
    key: "amenity",
    value: "telephone",
    info: "Public telephone",
  },
  {
    key: "amenity",
    value: "toilets",
    info: "Public toilets (might require a fee)",
  },
  {
    key: "amenity",
    value: "water_point",
    info: "Place where you can get large amounts of drinking water",
  },
  {
    key: "amenity",
    value: "watering_place",
    info: "Place where water is contained and animals can drink",
  },
  {
    key: "amenity",
    value: "sanitary_dump_station",
    info: "A place for depositing human waste from a toilet holding tank.",
  },
  {
    key: "amenity",
    value: "recycling",
    info: "Recycling facilities (bottle banks, etc.). Combine with recycling_type=container for containers or recycling_type=centre for recycling centres.",
  },
  {
    key: "amenity",
    value: "waste_basket",
    info: "A single small container for depositing garbage that is easily accessible for pedestrians.",
  },
  {
    key: "amenity",
    value: "waste_disposal",
    info: "A medium or large disposal bin, typically for bagged up household or industrial waste.",
  },
  {
    key: "amenity",
    value: "waste_transfer_station",
    info: "A waste transfer station is a location that accepts, consolidates and transfers waste in bulk.",
  },
  {
    key: "amenity",
    value: "animal_boarding",
    info: "A facility where you, paying a fee, can bring your animal for a limited period of time (e.g. for holidays)",
  },
  {
    key: "amenity",
    value: "animal_breeding",
    info: "A facility where animals are bred, usually to sell them",
  },
  {
    key: "amenity",
    value: "animal_shelter",
    info: "A shelter that recovers animals in trouble",
  },
  {
    key: "amenity",
    value: "animal_training",
    info: "A facility used for non-competitive animal training",
  },
  {
    key: "amenity",
    value: "baking_oven",
    info: "An oven used for baking bread and similar, for example inside a building=bakehouse.",
  },
  {
    key: "amenity",
    value: "clock",
    info: "A public visible clock",
  },
  {
    key: "amenity",
    value: "crematorium",
    info: "A place where dead human bodies are burnt",
  },
  {
    key: "amenity",
    value: "dive_centre",
    info: "A dive center is the base location where sports divers usually start scuba diving or make dive guided trips at new locations.",
  },
  {
    key: "amenity",
    value: "funeral_hall",
    info: "A place for holding a funeral ceremony, other than a place of worship.",
  },
  {
    key: "amenity",
    value: "grave_yard",
    info: "A (smaller) place of burial, often you'll find a church nearby. Large places should be landuse=cemetery instead.",
  },
  {
    key: "amenity",
    value: "hunting_stand",
    info: "A hunting stand: an open or enclosed platform used by hunters to place themselves at an elevated height above the terrain",
  },
  {
    key: "amenity",
    value: "internet_cafe",
    info: "A place whose principal role is providing internet services to the public.",
  },
  {
    key: "amenity",
    value: "kitchen",
    info: "A public kitchen in a facility to use by everyone or customers",
  },
  {
    key: "amenity",
    value: "kneipp_water_cure",
    info: "Outdoor foot bath facility. Usually this is a pool with cold water and handrail. Popular in German speaking countries.",
  },
  {
    key: "amenity",
    value: "lounger",
    info: "An object for people to lie down.",
  },
  {
    key: "amenity",
    value: "marketplace",
    info: "A marketplace where goods and services are traded daily or weekly.",
  },
  {
    key: "amenity",
    value: "monastery",
    info: "Monastery is the location of a monastery or a building in which monks and nuns live.",
  },
  {
    key: "amenity",
    value: "mortuary",
    info: "A morgue or funeral home, used for the storage of human corpses.",
  },
  {
    key: "amenity",
    value: "photo_booth",
    info: "A stand to create instant photos.",
  },
  {
    key: "amenity",
    value: "place_of_mourning",
    info: "A room or building where families and friends can come, before the funeral, and view the body of the person who has died.",
  },
  {
    key: "amenity",
    value: "place_of_worship",
    info: "A church, mosque, or temple, etc. Note that you also need religion=*, usually denomination=* and preferably name=* as well as amenity=place_of_worship. See the article for details.",
  },
  {
    key: "amenity",
    value: "public_bath",
    info: "A location where the public may bathe in common, etc. japanese onsen, turkish bath, hot spring",
  },
  {
    key: "amenity",
    value: "public_building",
    info: "A generic public building. Don't use! See office=government.",
  },
  {
    key: "amenity",
    value: "refugee_site",
    info: "A human settlement sheltering refugees or internally displaced persons",
  },
  {
    key: "amenity",
    value: "vending_machine",
    info: "A machine selling goods – food, tickets, newspapers, etc. Add type of goods using vending=*",
  },
  {
    key: "amenity",
    value: "user defined",
    info: "All commonly used values according to Taginfo",
  },
];

const buildings = [
  {
    key: "building",
    value: "apartments",
    info: "",
  },
  {
    key: "building",
    value: "barracks",
    info: "",
  },
  {
    key: "building",
    value: "bungalow",
    info: "",
  },
  {
    key: "building",
    value: "cabin",
    info: "",
  },
  {
    key: "building",
    value: "detached",
    info: "",
  },
  {
    key: "building",
    value: "dormitory",
    info: "",
  },
  {
    key: "building",
    value: "farm",
    info: "",
  },
  {
    key: "building",
    value: "ger",
    info: "",
  },
  {
    key: "building",
    value: "hotel",
    info: "",
  },
  {
    key: "building",
    value: "house",
    info: "",
  },
  {
    key: "building",
    value: "houseboat",
    info: "",
  },
  {
    key: "building",
    value: "residential",
    info: "",
  },
  {
    key: "building",
    value: "semidetached_house",
    info: "",
  },
  {
    key: "building",
    value: "static_caravan",
    info: "",
  },
  {
    key: "building",
    value: "stilt_house",
    info: "",
  },
  {
    key: "building",
    value: "terrace",
    info: "",
  },
  {
    key: "building",
    value: "tree_house",
    info: "",
  },
  {
    key: "building",
    value: "trullo",
    info: "",
  },
  {
    key: "building",
    value: "commercial",
    info: "",
  },
  {
    key: "building",
    value: "industrial",
    info: "",
  },
  {
    key: "building",
    value: "kiosk",
    info: "",
  },
  {
    key: "building",
    value: "office",
    info: "",
  },
  {
    key: "building",
    value: "retail",
    info: "",
  },
  {
    key: "building",
    value: "supermarket",
    info: "",
  },
  {
    key: "building",
    value: "warehouse",
    info: "",
  },
  {
    key: "building",
    value: "religious",
    info: "",
  },
  {
    key: "building",
    value: "cathedral",
    info: "",
  },
  {
    key: "building",
    value: "chapel",
    info: "",
  },
  {
    key: "building",
    value: "church",
    info: "",
  },
  {
    key: "building",
    value: "kingdom_hall",
    info: "",
  },
  {
    key: "building",
    value: "monastery",
    info: "",
  },
  {
    key: "building",
    value: "mosque",
    info: "",
  },
  {
    key: "building",
    value: "presbytery",
    info: "",
  },
  {
    key: "building",
    value: "shrine",
    info: "",
  },
  {
    key: "building",
    value: "synagogue",
    info: "",
  },
  {
    key: "building",
    value: "temple",
    info: "",
  },
  {
    key: "building",
    value: "bakehouse",
    info: "",
  },
  {
    key: "building",
    value: "bridge",
    info: "",
  },
  {
    key: "building",
    value: "civic",
    info: "",
  },
  {
    key: "building",
    value: "college",
    info: "",
  },
  {
    key: "building",
    value: "fire_station",
    info: "",
  },
  {
    key: "building",
    value: "government",
    info: "",
  },
  {
    key: "building",
    value: "gatehouse",
    info: "",
  },
  {
    key: "building",
    value: "hospital",
    info: "",
  },
  {
    key: "building",
    value: "kindergarten",
    info: "",
  },
  {
    key: "building",
    value: "museum",
    info: "",
  },
  {
    key: "building",
    value: "public",
    info: "",
  },
  {
    key: "building",
    value: "school",
    info: "",
  },
  {
    key: "building",
    value: "toilets",
    info: "",
  },
  {
    key: "building",
    value: "train_station",
    info: "",
  },
  {
    key: "building",
    value: "transportation",
    info: "",
  },
  {
    key: "building",
    value: "university",
    info: "",
  },
  {
    key: "building",
    value: "barn",
    info: "",
  },
  {
    key: "building",
    value: "conservatory",
    info: "",
  },
  {
    key: "building",
    value: "cowshed",
    info: "",
  },
  {
    key: "building",
    value: "farm_auxiliary",
    info: "",
  },
  {
    key: "building",
    value: "greenhouse",
    info: "",
  },
  {
    key: "building",
    value: "slurry_tank",
    info: "",
  },
  {
    key: "building",
    value: "stable",
    info: "",
  },
  {
    key: "building",
    value: "sty",
    info: "",
  },
  {
    key: "building",
    value: "livestock",
    info: "",
  },
  {
    key: "building",
    value: "grandstand",
    info: "",
  },
  {
    key: "building",
    value: "pavilion",
    info: "",
  },
  {
    key: "building",
    value: "riding_hall",
    info: "",
  },
  {
    key: "building",
    value: "sports_hall",
    info: "",
  },
  {
    key: "building",
    value: "sports_centre",
    info: "",
  },
  {
    key: "building",
    value: "stadium",
    info: "",
  },
  {
    key: "building",
    value: "allotment_house",
    info: "",
  },
  {
    key: "building",
    value: "boathouse",
    info: "",
  },
  {
    key: "building",
    value: "hangar",
    info: "",
  },
  {
    key: "building",
    value: "hut",
    info: "",
  },
  {
    key: "building",
    value: "shed",
    info: "",
  },
  {
    key: "building",
    value: "carport",
    info: "",
  },
  {
    key: "building",
    value: "garage",
    info: "",
  },
  {
    key: "building",
    value: "garages",
    info: "",
  },
  {
    key: "building",
    value: "parking",
    info: "",
  },
  {
    key: "building",
    value: "digester",
    info: "",
  },
  {
    key: "building",
    value: "service",
    info: "",
  },
  {
    key: "building",
    value: "tech_cab",
    info: "",
  },
  {
    key: "building",
    value: "transformer_tower",
    info: "",
  },
  {
    key: "building",
    value: "water_tower",
    info: "",
  },
  {
    key: "building",
    value: "storage_tank",
    info: "",
  },
  {
    key: "building",
    value: "silo",
    info: "",
  },
  {
    key: "building",
    value: "beach_hut",
    info: "",
  },
  {
    key: "building",
    value: "bunker",
    info: "",
  },
  {
    key: "building",
    value: "castle",
    info: "",
  },
  {
    key: "building",
    value: "construction",
    info: "",
  },
  {
    key: "building",
    value: "container",
    info: "",
  },
  {
    key: "building",
    value: "guardhouse",
    info: "",
  },
  {
    key: "building",
    value: "military",
    info: "",
  },
  {
    key: "building",
    value: "outbuilding",
    info: "",
  },
  {
    key: "building",
    value: "pagoda",
    info: "",
  },
  {
    key: "building",
    value: "quonset_hut",
    info: "",
  },
  {
    key: "building",
    value: "roof",
    info: "",
  },
  {
    key: "building",
    value: "ruins",
    info: "",
  },
  {
    key: "building",
    value: "tent",
    info: "",
  },
  {
    key: "building",
    value: "tower",
    info: "",
  },
  {
    key: "building",
    value: "windmill",
    info: "",
  },
  {
    key: "building",
    value: "yes",
    info: "",
  },
  {
    key: "building",
    value: "user defined",
    info: "",
  },
];

const natural = [
  {
    key: "natural",
    value: "fell",
    info: "Habitat above the tree line covered with grass, dwarf shrubs and mosses.",
  },
  {
    key: "natural",
    value: "grassland",
    info: "Areas where the vegetation is dominated by grasses (Poaceae) and other herbaceous (non-woody) plants. For mown/managed grass see landuse=grass, for hay/pasture see landuse=meadow.",
  },
  {
    key: "natural",
    value: "heath",
    info: 'A dwarf-shrub habitat, characterised by open, low growing woody vegetation, often dominated by plants of the Ericaceae.\nNote. This is not for parks whose name contains the word "heath".',
  },
  {
    key: "natural",
    value: "moor",
    info: "Don't use, see wikipage. Upland areas, characterised by low-growing vegetation on acidic soils.",
  },
  {
    key: "natural",
    value: "scrub",
    info: "Uncultivated land covered with shrubs, bushes or stunted trees.",
  },
  {
    key: "natural",
    value: "shrubbery",
    info: "An area of shrubbery that is actively maintained or pruned by humans. A slightly wilder look is also possible",
  },
  {
    key: "natural",
    value: "tree",
    info: "A single tree.",
  },
  {
    key: "natural",
    value: "tree_row",
    info: "A line of trees.",
  },
  {
    key: "natural",
    value: "tree_stump",
    info: "A tree stump, the remains of a cut down or broken tree.",
  },
  {
    key: "natural",
    value: "tundra",
    info: "Habitat above tree line in alpine and subpolar regions, principally covered with uncultivated grass, low growing shrubs and mosses and sometimes grazed.",
  },
  {
    key: "natural",
    value: "wood",
    info: "Tree-covered area (a 'forest' or 'wood'). Also see landuse=forest. For more detail, one can use leaf_type=* and leaf_cycle=*.",
  },
  {
    key: "natural",
    value: "bay",
    info: "An area of water mostly surrounded by land but with a level connection to the ocean or a lake.",
  },
  {
    key: "natural",
    value: "beach",
    info: "landform along a body of water which consists of sand, shingle or other loose material",
  },
  {
    key: "natural",
    value: "blowhole",
    info: "An opening to a sea cave which has grown landwards resulting in blasts of water from the opening due to the wave action",
  },
  {
    key: "natural",
    value: "cape",
    info: "A piece of elevated land sticking out into the sea or large lake. Includes capes, heads, headlands and (water) promontories.",
  },
  {
    key: "natural",
    value: "coastline",
    info: "The mean high water springs line between the sea and land (with the water on the right side of the way.)",
  },
  {
    key: "natural",
    value: "crevasse",
    info: "A large crack in a glacier",
  },
  {
    key: "natural",
    value: "geyser",
    info: "A spring characterized by intermittent discharge of water ejected turbulently and accompanied by steam.",
  },
  {
    key: "natural",
    value: "glacier",
    info: "A permanent body of ice formed naturally from snow that is moving under its own weight.",
  },
  {
    key: "natural",
    value: "hot_spring",
    info: "A spring of geothermally heated groundwater",
  },
  {
    key: "natural",
    value: "isthmus",
    info: "A narrow strip of land, bordered by water on both sides and connecting two larger land masses.",
  },
  {
    key: "natural",
    value: "mud",
    info: "Area covered with mud: water saturated fine grained soil without significant plant growth. Also see natural=wetland + wetland=*.",
  },
  {
    key: "natural",
    value: "peninsula",
    info: "A piece of land projecting into water from a larger land mass, nearly surrounded by water",
  },
  {
    key: "natural",
    value: "reef",
    info: "A feature (rock, sandbar, coral, etc) lying beneath the surface of the water",
  },
  {
    key: "natural",
    value: "shingle",
    info: "An accumulation of rounded rock fragments on a beach or riverbed",
  },
  {
    key: "natural",
    value: "shoal",
    info: "An area of the sea floor near the sea surface (literally, becomes shallow) and exposed at low tide. See natural=sand as well.",
  },
  {
    key: "natural",
    value: "spring",
    info: "A place where ground water flows naturally from the ground (Other languages).",
  },
  {
    key: "natural",
    value: "strait",
    info: "A narrow area of water surrounded by land on two sides and by water on two other sides.",
  },
  {
    key: "natural",
    value: "water",
    info: "Any body of water, from natural such as a lake or pond to artificial like moat or canal. Also see waterway=riverbank",
  },
  {
    key: "natural",
    value: "wetland",
    info: "A natural area subject to inundation or with waterlogged ground, further specified with wetland=*",
  },
  {
    key: "natural",
    value: "arch",
    info: "A rock arch naturally formed by erosion, with an opening underneath.",
  },
  {
    key: "natural",
    value: "arete",
    info: "An arête, a thin, almost knife-like, ridge of rock which is typically formed when two glaciers erode parallel U-shaped valleys.",
  },
  {
    key: "natural",
    value: "bare_rock",
    info: "An area with sparse/no soil or vegetation, so that the bedrock becomes visible.",
  },
  {
    key: "natural",
    value: "natural=blockfield",
    info: "A surface covered with boulders or block-sized rocks, usually the result of volcanic activity or associated with alpine and subpolar climates and ice ages.",
  },
  {
    key: "natural",
    value: "cave_entrance",
    info: "The entrance to a cave: a natural underground space large enough for a human to enter.",
  },
  {
    key: "natural",
    value: "cliff",
    info: "A vertical or almost vertical natural drop in terrain, usually with a bare rock surface (leave the lower face to the right of the way).",
  },
  {
    key: "natural",
    value: "dune",
    info: "A hill of sand formed by wind, covered with no or very little vegetation. See also natural=sand and natural=beach",
  },
  {
    key: "natural",
    value: "earth_bank",
    info: "Large erosion gully or steep earth bank",
  },
  {
    key: "natural",
    value: "fumarole",
    info: "A fumarole is an opening in a planet's crust, which emits steam and gases",
  },
  {
    key: "natural",
    value: "gully",
    info: "Small scale cut in relief created by water erosion",
  },
  {
    key: "natural",
    value: "hill",
    info: "A hill.",
  },
  {
    key: "natural",
    value: "peak",
    info: "The top (summit) of a hill or mountain.",
  },
  {
    key: "natural",
    value: "ridge",
    info: "A mountain or hill linear landform with a continuous elevated crest",
  },
  {
    key: "natural",
    value: "rock",
    info: "A notable rock or group of rocks attached to the underlying bedrock.",
  },
  {
    key: "natural",
    value: "saddle",
    info: "The lowest point along a ridge or between two mountain tops",
  },
  {
    key: "natural",
    value: "sand",
    info: "An area covered by sand with no or very little vegetation. See natural=beach and natural=dune as well.",
  },
  {
    key: "natural",
    value: "scree",
    info: "Unconsolidated angular rocks formed by rockfall and weathering from adjacent rockfaces.",
  },
  {
    key: "natural",
    value: "sinkhole",
    info: "A natural depression or hole in the surface topography.",
  },
  {
    key: "natural",
    value: "stone",
    info: "A single notable freestanding rock, which may differ from the composition of the terrain it lies in.; e.g., glacial erratic.",
  },
  {
    key: "natural",
    value: "valley",
    info: "A natural depression flanked by ridges or ranges of mountains or hills",
  },
  {
    key: "natural",
    value: "volcano",
    info: "An opening exposed on the earth's surface where volcanic material is emitted.",
  },
  {
    key: "natural",
    value: "user defined",
    info: "All commonly used values according to Taginfo",
  },
];

const boundaries = [
  {
    key: "boundary",
    value: "aboriginal_lands",
    info: "A boundary representing official reservation boundaries of recognized aboriginal / indigenous / native peoples.",
  },
  {
    key: "boundary",
    value: "administrative",
    info: "An administrative boundary. Subdivisions of areas/territories/jurisdictions recognised by governments or other organisations for administrative purposes. These range from large groups of nation states right down to small administrative districts and suburbs, as indicated by the 'admin_level=*' combo tag.",
  },
  {
    key: "boundary",
    value: "border_zone",
    info: "A border zone is an area near the border where special restrictions on movement apply. Usually a permit is required for visiting.",
  },
  {
    key: "boundary",
    value: "forest",
    info: "A delimited forest is a land which is predominantly wooded and which is, for this reason, given defined boundaries. It may cover different tree stands, non-wooded areas, highways… but all the area within the boundaries are considered and managed as a single forest.",
  },
  {
    key: "boundary",
    value: "forest_compartment",
    info: "A forest compartment is a numbered sub-division within a delimited forest, physically materialized with visible, typically cleared, boundaries.",
  },
  {
    key: "boundary",
    value: "hazard",
    info: "A designated hazardous area, with a potential source of damage to health, life, property, or any other interest of value.",
  },
  {
    key: "boundary",
    value: "maritime",
    info: "Maritime boundaries which are not administrative boundaries: the Baseline, Contiguous Zone and EEZ (Exclusive Economic Zone).",
  },
  {
    key: "boundary",
    value: "marker",
    info: "A boundary marker, border marker, boundary stone, or border stone is a robust physical marker that identifies the start of a land boundary or the change in a boundary, especially a change in direction of a boundary. See also historic=boundary_stone",
  },
  {
    key: "boundary",
    value: "national_park",
    info: "Area of outstanding natural beauty, set aside for conservation and for recreation (Other languages).",
  },
  {
    key: "boundary",
    value: "place",
    info: "boundary=place is commonly used to map the boundaries of a place=*, when these boundaries can be defined but these are not administrative boundaries.",
  },
  {
    key: "boundary",
    value: "political",
    info: "Electoral boundaries",
  },
  {
    key: "boundary",
    value: "postal_code",
    info: "Postal code boundaries",
  },
  {
    key: "boundary",
    value: "protected_area",
    info: "Protected areas, such as for national parks, marine protection areas, heritage sites, wilderness, cultural assets and similar.",
  },
  {
    key: "boundary",
    value: "special_economic_zone",
    info: "A government-defined area in which business and trade laws are different.",
  },
  {
    key: "boundary",
    value: "disputed",
    info: "An area of landed claimed by two or more parties (use with caution). See also Disputed territories.",
  },
  {
    key: "boundary",
    value: "user defined",
    info: "All commonly used values according to Taginfo",
  },
];

export const predefinedOsmQueries = {
  amenities: {
    nodeType: `node`,
    subTypeTag: `amenity`,
    subTypes: amenities,
  },
  roads: {
    nodeType: "way",
    subTypeTag: "highway",
    subTypes: highway,
  },
  buildings: {
    nodeType: `way`,
    subTypeTag: `building`,
    subTypes: buildings,
  },
  natural: {
    nodeType: `node`,
    subTypeTag: `natural`,
    subTypes: natural,
  },
  boundaries: {
    nodeType: `relation`,
    subTypeTag: `boundary`,
    subTypes: boundaries,
  },
  country_boundary: `relation["boundary"="administrative"]["admin_level"="2"]`,
  boundary_3: `relation["boundary"="administrative"]["admin_level"="3"]`,
  boundary_4: `relation["boundary"="administrative"]["admin_level"="4"]`,
  boundary_5: `relation["boundary"="administrative"]["admin_level"="5"]`,
};
