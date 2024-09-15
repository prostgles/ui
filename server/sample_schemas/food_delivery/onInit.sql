CREATE EXTENSION IF NOT EXISTS postgis;

SET statement_timeout TO 220e3;

DROP TABLE IF EXISTS  delivery_status_types , menu_items, menus, order_items, orders, 
ratings, restaurants, user_types, users, order_status_types, user_addresses,
order_updates, delivery_status_changes, addresses, _menu_items CASCADE;

SELECT row_number() over() as id, *
INTO _menu_items
FROM (
  VALUES 
    ('Drinks', 'Coke', '20 oz. Bottle', '4.09 USD'),
    ('Entrees', 'Pasta Marinara', 'Penne pasta topped with marinara and Parmesan Cheese.', '11.99 USD'),
    ('Veggie Cravings', 'Black Bean Chalupa Supreme®', 'A chewy chalupa shell filled with black beans, reduced-fat sour cream, lettuce, tomatoes, and three-cheese blend.', '5.03 USD'),
    ('Sandwiches', 'Sweet Onion Chicken Teriyaki Footlong Regular Sub', 'The Sweet Onion Chicken Teriyaki sub is one sah-weeet sub. It starts with Hearty Multigrain bread, add perfectly cooked grilled chicken strips, marinated in our NEW Sweet Onion Teriyaki Sauce, then pile on the crunch with lettuce, spinach, tomatoes, cucumbers, green peppers, red onions and top with another pass of our NEW Sweet Onion Teriyaki sauce.', '11.49 USD'),
    ('Breakfast Sides', 'Pancakes', '', '1.89 USD'),
    ('Chicken', 'Almond Chicken', 'Served with steamed rice or brown rice.', '14.95 USD'),
    ('Picked for you', 'Soft Drinks', 'Coca-Cola® products. ', '3.49 USD'),
    ('Menu ', 'Dry Wok Spicy Beef', '', '14.95 USD'),
    ('Hold-Me-Overs', 'Chili', 'cheddar, sour cream, scallions, garlic toast', '8.0 USD'),
    ('Burgers', 'Pastrami', 'Pastrami, Swiss cheese, spiked horseradish, and bavarian mustard sauce.', '16.0 USD'),
    ('Soup', 'Wonton Soup', 'Served with crispy noodles.', '5.99 USD'),
    ('Mains', '9. Pork Loin Katsu Curry Udon or Rice', 'Pork Loin Katsu with Japanese Curry.\nChoice of Udon or Rice', '14.99 USD'),
    ('Breakfast Sides', 'Smothered Home Fries', 'Served with onion and cheese.', '6.5 USD'),
    ('Beverages', 'Cappuccino', 'Regular (130 Cal.), Large (160 Cal.) Espresso with steamed milk, topped with a cap of foam. Allergens: Contains Milk', '4.99 USD'),
    ('Salad', 'Green Salad', '', '7.25 USD'),
    ('Sides', 'Steak Fries', 'Thick cut and fried to perfection with seasoning.', '3.49 USD'),
    ('Bowls', 'Supreme Fried Rice', 'Steak, chicken &amp; shrimp stir-fried with our signature fried rice recipe with carrots, green onions &amp; egg. ', '15.59 USD'),
    ('Goat Entries', 'Goat Mandhakini(Mutton Mandhakini)', 'Semi gravy goat cooked with onions,chillies and chopped boiled egg.\nThe entry is served with white rice on the side. Bread can add as on order.\n\n\n', '18.99 USD'),
    ('Appetizers', 'French Fries', 'Deep fried extra crispy cut potatoes.', '5.0 USD'),
    ('Starters', 'Veg Bonda', '', '7.0 USD'),
    ('Fresh Melts®', 'Meatball Marinara Melt Footlong Melt', 'Add some melty goodness to your Meatball Marinara sub. Make it a Fresh Melt™ and get craveable meatballs and tangy marinara sauce topped with American and parmesan, all grilled to cheesy perfection. Freshly made in front of you.', '10.79 USD'),
    ('Kids', 'Kids Crispy Chicken Tenders', 'Two or Three breaded chicken tenders.', '6.59 USD'),
    ('OTC INTERNAL', 'JARABE COUGH CONGEST LQ 8Z', 'Vicks Jarabe Cough and Congestion Cold Syrup – the same powerful cough and congestion relief you used at home, now available in the United States and brought to you by VICKS, the world’s #1 selling cough and cold brand. Vicks Jarabe coats and soothes your throat by providing a refreshing sensation. Each dose contains a cough suppressant that helps control and relieve cough (Dextromethorphan HBr) and an expectorant (Guaifenesin) that helps loosen phlegm (mucus).', '10.49 USD'),
    ('Dips &amp; Sauces', 'Ranch Dip (mild)', 'The coolest ranch deserves to go on a wing, not a chip. Luckily you already know how good it will be.', '0.5 USD'),
    ('Large Pizzas', 'LG Donkey Dog', 'Whole wheat dough, black bean dip, whole beans, sweet corn, mozzarella and cheddar cheese. Topped with shredded lettuce, pico de gallo and avocado. Served with taco sauce on the side.', '23.95 USD'),
    ('South/North Indian Tiffins', 'Pesarattu', 'Thin crepe made with green gram and rice.', '9.49 USD'),
    ('Specials', 'Chicken Enchiladas + Favoritos® Special', 'Two chicken enchiladas, your choice Mexicanas or chipotle, served with rice and beans, plus a favoritos® of your choice.', '10.61 USD'),
    ('Sandwiches &amp; Wraps', 'Tomato Pesto Grilled Cheese', 'Roasted tomatoes, pesto spread and melted white cheddar cheese between two pieces of toasted sourdough bread.', '0.0 USD'),
    ('MEZZE', 'RED PEPPER BABAGANOUSH + ZA''ATAR PITA', 'Creamy and flavorful smoked eggplant, roasted red peppers, tahini &amp; a blend of spices.   Served with a za''atar pita. Pint includes 2 pitas and a quart comes with 4 pitas.', '6.3 USD'),
    ('Dolce''s Stromboli', 'Regular Dolce Stromboli', 'Served with two toppings. Comes with one cup marinara sauce. Please contact the merchant for soda selection.', '8.99 USD'),
    ('Rice Entrees', 'P32 Spicy Pad Ped Nor Mai ****', 'Stir-fried bamboo shoot strips with garlic, Thai chili, basil and herbs. Hot and Spicy!', '13.0 USD'),
    ('LEGACY', 'FRY ME TO THE MOON', 'fries, waffle fries, cheddar, bacon, scallion (gringo dip or chipotle ranch)', '11.1 USD'),
    ('Sashimi', 'Freshwater Eel Sashimi (3 pcs)', 'Unagi', '9.99 USD'),
    ('Picked for you', 'Korean Tacos', '2 tacos.', '7.0 USD'),
    ('Picked for you', '10 Pack Traditional Wings', 'Our traditional wings are lightly breaded and cooked to perfection then tossed in your favorite sauce or dry rub.', '17.69 USD'),
    ('Breakfast', 'Egg White Omelet - Applewood Smoked Bacon', 'Contains: Cheddar, Applewood Smoked Bacon, Fresh Salsa, Spinach, Egg White Omelet, Tortilla Burrito', '4.59 USD'),
    ('Curtains & Window', 'Umbra® Cafe 84 to 120-Inch Adjustable Curtain Rod in Bronze', 'Lend your window style a welcoming, homey feel with the Cafe Adjustable Curtain Rod from Umbra. Perfectly crafted to accent your drapery, these window treatments inject a modern look with great functionality into your home.', '24.99 USD'),
    ('Popular Items', 'Nachos Tradicionales', 'Round yellow tortilla chips with nacho cheese.', '4.5 USD'),
    ('Desserts', 'Cheesecake', '', '4.89 USD'),
    ('Chinese Entrees Seafood Combo', 'Shrimp with Asparagus', 'Served with 2 crab cheese wonton, ham fried rice, and soup.', '15.95 USD'),
    ('Dipping Sauces', 'Marinara Dip', '', '0.88 USD'),
    ('Enjoy A Treat', 'Banana Berry Treat®', 'Bananas, Strawberries*, Raspberries, Papaya Juice Blend, Dairy Whey Blend\n*contains added sugar\n\n300 - 600 Calories\n\nAllergens:    Dairy Whey Blend (milk, egg)', '6.54 USD'),
    ('Fried Rice and Noodles', 'Thai Lo Mien', '', '12.0 USD'),
    ('Picked for you', 'Cinnamon Sugar Churros', 'Chocolate- and caramel-filled churros with chocolate dipping sauce.', '5.99 USD'),
    ('Picked for you', 'Cajun Pasta Combo with 6 Asian Wingz', 'Cajun Alfredo Pasta with sautéed trinity shrimp and crawfish tails and Texas toast. 6 Fried Wingz tossed in our Famous Asian Sauce. ', '27.49 USD'),
    ('Desserts', 'One Personal Square Original DC Sweet Potato Cake', '', '6.0 USD'),
    ('Bread & Bakery', 'Arnold · Potato Hot Dog Buns (8 buns)', '8 buns', '3.83 USD'),
    ('Burritos', 'El Toro''s Grilled Chicken Burrito', 'A burrito filled with grilled chicken, rice, beans, lettuce, tomatoes, cheese and sour cream', '17.5 USD'),
    ('Pizza', 'Loaded Tot-zza Pizza', 'Ranch sauce topped with 100% real Wisconsin mozzarella cheese, tater tots, applewood smoked bacon, green onions and drizzled with nacho cheese.', '0.0 USD'),
    ('Soups', 'Tom Yum Soups cup', '', '4.99 USD'),
    ('Regular FAVORITES', '#17 Ultimate Porker', 'HAM &amp; BACON lettuce, tomato &amp; mayo\n', '8.39 USD'),
    ('Energy &amp; Electrolyte Drinks', '5-Hour Energy Berry or Grape (1.93 oz)', '', '4.39 USD'),
    ('Picked for you', 'Dumplings (饺子) (6 pcs)', 'Steamed or pan-fried.', '8.35 USD'),
    ('Classic Roll or Hand Roll', 'Futo Maki', 'Crabstick, avocado, squash, cucumber, egg, and oshinko.', '9.0 USD'),
    ('The Sushi', 'The Tuna Roll', 'Tuna roll with sashimi grade tuna.', '11.99 USD'),
    ('Home Goods', 'Festive Voice Bird With Sound - 1.0 ea', 'Hear me Sing & Dance May be used indoors or in sheltered outdoor areas Motion sensor Requires two 1.5V LR03 (AAA) batteries Made in CHINA', '10.48 USD'),
    ('BLIZZARD® Treats', 'Choco Brownie Extreme BLIZZARD® Treat', 'Chewy brownie pieces, choco chunks and cocoa fudge blended with creamy DQ® vanilla soft serve to BLIZZARD® perfection.', '5.11 USD'),
    ('Full Menu', 'Trap Butter', 'Our special butter sauce with our gold seasoning at the bottom makes a great combination.', '1.2 USD'),
    ('Sandwiches', 'Baja Turkey Avocado 6 Inch Regular Sub', 'Oven-Roasted Turkey, Smashed Avocado, and crisp veggies, topped with Baja Chipotle sauce: this one is all about that bold, smoky and spicy flavor!', '11.25 USD'),
    ('Salad', 'Side Garden', '', '3.5 USD'),
    ('Vodka', 'Grey Goose Essences Strawberry &amp; Lemongrass (ABV30%)', '0-Carbs \n0-Sugar\nAll Natural Ingredients', '36.99 USD'),
    ('Home Health Care Solutions', 'Walgreens Diabetic Crew Socks for Women 6-10 - 1.0 pr', 'Dress For Comfort Walgreens Pharmacist Recommended√¢‚Ç¨¬† Non-Binding Extra Wide Top Helps Keep Feet Dry Smooth, Small Toe Seam Odor Resistant Women''s Shoe Size 6-10 Made in China √¢‚Ç¨¬†Walgreens Pharmacist Survey Study, November 2010.', '7.65 USD'),
    ('Drinks', 'Jarritos Pineapple', ' [Cal 140]', '3.85 USD'),
    ('Hamburgers', 'American Cheese Hamburger', 'Served with potatoes (servidos con papas).', '8.5 USD'),
    ('Beverages', '1/2 Gallon Beverage Bucket', 'Select an ice-cold beverage.', '4.79 USD'),
    ('Ice Cream to Share', 'Pre-Packed Quart', '24 oz. of your favorite ice cream flavor - enough to share...or not!', '0.0 USD'),
    ('Noodles &amp; Fried Rice', 'Yaki Soba', '', '8.95 USD'),
    ('Dessert', 'Hot Chocolate Cake', 'Served with mocha almond fudge ice cream and fennel seed brittle.', '11.0 USD'),
    ('Desserts', 'Chocolate Dipped Banana', 'Whole frozen banana dipped in dark chocolate and decorated with your choice of white chocolate drizzle, chopped almonds, or rainbow sprinkles served on a popsicle stick. ', '0.0 USD'),
    ('Tea &amp; Lemonade', 'Gold Peak Sweet Tea 18.5oz', 'Inspired by the comfort of home, to create delicious, naturally flavored iced teas and coffees. Explore Gold Peak® flavors and enjoy home-brewed taste today!', '0.0 USD'),
    ('Bites', 'The Wings', 'Pub favorite, traditional can be gluten-friendly. Traditional or boneless wings cooked to perfection and tossed in your choice of buffalo, garlic buffalo, honey sriracha, stout bbq, sweet Asian, lemon pepper, butter garlic parmesan, mango habanero, or a hot dry rub.', '11.0 USD'),
    ('Appetizers', 'Meatball sliders', '', '8.99 USD'),
    ('Chips &amp; Snacks', 'Slim Jim Giant Slim 0.97 oz', 'When it comes to snacking, they say size matters. That''s why slim jim giant mild flavor smoked meat stick has a big, meaty flavor that will please the ginormous meat-lover in you; with 6 grams of protein in each serving, this meat stick will easily please your need for beef. Slim jim giant smoked meat stick satisfy even the beefiest appetites. Individually wrapped so you can enjoy a king-size snack anywhere you want. So, go ahead and fill your kitchen''s pantry and please your carnivorous palate.', '1.99 USD'),
    ('SUB IN A BOWL', 'Double Chicken Cheese Steak', 'Double chicken &amp; provolone cheese with spring mix, onions, tomatoes, salt &amp; your choice of dressing', '14.35 USD'),
    ('Tandoori Special', 'Beef Chapli Kebab', 'Minced meat with chopped vegetable and spices.', '11.99 USD'),
    ('Rock and Raw', 'Red Tuna Nigiri', 'Comes with two pieces.', '4.45 USD'),
    ('Salad', 'Larb Gai', 'Chicken salad. Minced chicken mixed with red onions and chili flakes stirred with roasted grounded rice and cilantro tossed with spicy lime dressing.\n', '8.0 USD'),
    ('Pesce', 'Cacciucco', 'Mussels, clams, prawns, calamari, fish sauteed in a spicy tomato sauce.', '36.0 USD'),
    ('TO GO Sauce ', 'YUM YUM SAUCE', 'WHITE SAUCE FOR HIABCHI ', '0.25 USD'),
    ('Burritos', 'Beefy 5-Layer Burrito', 'A warm tortilla is covered in a layer of warm nacho cheese and topped with seasoned beef, refried beans, cool sour cream and shredded cheddar cheese. Then it''s wrapped creating a layer of nacho cheese all around the outside of the burrito.', '3.95 USD'),
    ('Traditional Wings', 'Traditional Bone-In Wings 6 Pcs', '6 pieces. Enjoy our juicy traditional wings in your choice of wing sauce. Comes with a side of ranch dipping sauce.\n', '9.89 USD'),
    ('Asian Street Noodles', 'Chow Fun with Chinese Broccoli', '', '15.95 USD'),
    ('Snacks', 'Hostess Donettes Frosted Chocolate 6 Count', 'Mini donuts frosted with chocolate', '3.09 USD'),
    ('Families, Groups &amp; Grocery', 'Project Sunrise Retail Coffee ', '12 oz bag of our Project Sunrise ground coffee. Buy a bag to support our female growers in Huila, Colombia!', '9.51 USD'),
    ('Specials', 'Handmade Ravioli', 'Handmade ravioli filled with artisan ricotta and organic spinach served with sage-infused butter and Parmigiano 24 months.', '15.9 USD'),
    ('Seafood', 'Fish Fajitas', 'Fish grilled with bell peppers, onions, and tomatoes. Served with a side of beans, guacamole salad, sour cream, and flour tortillas.', '14.99 USD'),
    ('Burgers for Breakfast', 'Triple Whopper Meal', '', '15.19 USD'),
    ('Picked for you', 'Vietnamese ice coffee', '', '4.95 USD'),
    ('SIDE - EXTRA ORDER', 'RAITA - 8OZ ', 'YOGURT WITH ONION AND SPICES - 16 OZ ', '4.99 USD'),
    ('Something Fried', 'Chicken Wing Basket (8 pcs)', '8 pieces. The basket comes with cajun fries.', '17.0 USD'),
    ('No Bready Bowls™', 'Black Forest Ham', 'A Footlong’s worth of protein? Yup! When you make it a Protein Bowl you’ll get all of the Black Forest ham you’d get on your favorite Footlong, piled high atop fresh lettuce, tomato, cucumber and more veggies.', '9.49 USD'),
    ('Diet & Nutrition', 'BOOST Original Nutritional Drink, Rich Chocolate, 6 CT', 'BOOST Original Rich Chocolate Flavored Nutritional Drink is a nutritional shake that provides balanced nutrition as part of your daily diet. This rich chocolate drink provides 10 grams of protein and 27 vitamins and minerals including vitamins C &amp; D, zinc, iron and selenium, key nutrients for immune support. Not only does this chocolate shake include calcium and Vitamin D to support strong bones, it is designed to provide energy with 240 nutrient-rich calories and B-vitamins to help convert food to energy. Each pack includes 6 nutritional drinks packaged in 8 fluid ounce reclosable bottles. Six pack of 8 fl oz bottles of BOOST Original Rich Chocolate Nutritional Drink Nutritional chocolate shake with a rich chocolate taste you&#39;ll love Nutrition shakes with 10 g of protein and 27 vitamins and minerals Designed to provide nutritional energy with 240 nutrient-rich calories and B-vitamins to help convert food to energy Nutritional shakes that provide essential nutrients with complete and balanced nutrition, and contain no artificial flavors, colors or sweeteners and are gluten free Now with 25%25 less sugars than the former drink, sugar content has been lowered from 20 g to 15 g per serving, all with great taste Packaged in easy to open and resealable plastic bottles ', '9.99 USD'),
    ('Beverages', 'Sunjoy® (1/2 Sweet Tea, 1/2 Lemonade)', 'A refreshing combination of our classic Chick-fil-A® Lemonade and freshly-brewed Sweetened Iced Tea. Also available with combinations of Chick-fil-A® Diet Lemonade or Unsweetened Iced Tea.', '3.09 USD'),
    ('Health & Beauty', 'Tylenol PM - 24 Count', '', '6.91 USD'),
    ('Specialty Sandwiches', 'Hot and Spicy Signature Recipes - Southwest Chipotle Turkey', 'Contains: Pepper Jack, Spinach, Fresh Salsa, Creamy Chipotle, Panini Bread, Meat', '8.39 USD'),
    ('Combinaciones', '#26 - 3 Crispy Tacos', 'Choice of meat: chicken, shredded beef or ground beef. Loaded with lettuce, tomato, and Cheddar cheese.', '14.99 USD'),
    ('Fruit Smoothies', 'Mixed Berry', '', '4.79 USD'),
    ('Allergy Season', 'Allegra Children''s 12HR Liquid Berry - 4.0 fl oz', 'Kid allergies are unpleasant. Taking their allergy medicine doesn''t have to be. Alleviate their worst allergy symptoms with Allegra Children''s Non-Drowsy Antihistamine Liquid Berry Flavor. Children''s Allegra for kids 2 years and older provides 12 full hours of non-drowsy relief from sneezing, runny nose, itchy and watery eyes, and itchy nose or throat. Use Allegra Children''s Liquid for indoor and outdoor allergies, including seasonal allergies and pet allergies. Best of all, this berry-flavored', '14.68 USD'),
    ('PARTY PACKS', '40 BONELESS WINGS', '40 Boneless wings with your choice of Classic Buffalo, This is Q''d Up, Honey Trap Mustard or Birthday Suit (Naked).', '56.0 USD'),
    ('Picked for you', 'Philly Chicken Wrap', '', '5.95 USD'),
    ('Pollo', 'Pollo Pesto', 'Chicken, grape tomatoes, and mushrooms in a creamy pesto sauce over penne.', '19.18 USD'),
    ('VITAMINS', 'ZARBEES CHLD SLEEP GUM50CT', 'Zarbee''s Naturals Children''s Melatonin 1mg is a drug-free, alcohol-free supplement for occasional sleeplessness in children ages 3 and up. Our natural kids’ supplement helps promote restful sleep without next day grogginess. Melatonin is a hormone the brain produces to help regulate sleep & wake cycles. Safe for occasional sleeplessness in children, Melatonin is non-habit forming and will help gently guide your child to sleep. We’ll BEE there! Check out our whole line of products made of handpicked wholesome ingredients.', '19.99 USD'),
    ('Sandwiches', 'Buffalo Chicken Footlong Pro (Double Protein)', 'When you’re looking to spice things up, do it with Frank’s RedHot® and buffalo chicken. Our Buffalo Chicken Footlong is made with everyone’s favorite hot sauce – Frank’s RedHot® and topped with peppercorn ranch. Try it with lettuce, tomatoes and cucumbers! Frank’s RedHot® is a registered trademark of McCormick &amp; Co. and used under license by Subway Franchisee Advertising Fund Trust Ltd.®/© Subway IP LLC 2021.', '14.19 USD'),
    ('Alternatives', 'Chai tea', '', '5.25 USD'),
    ('Asian Fusion Selections', 'Beef Broccoli', 'Served with miso soup and salad.', '23.25 USD'),
    ('Tenders &amp; Nuggets', '16 Tenders Family Bucket Meal', 'Feeds 7-8. 16 pieces of our freshly prepared Extra Crispy Tenders, 4 large sides of your choice, 8 biscuits and 8 dipping sauces.', '50.39 USD'),
    ('Frijoles Antojitos / Beans Appetizers', 'Frijoles Grandes de Bistec / Large order of Beans with grilled Steak', '', '8.99 USD'),
    ('Dinner Entrees', 'Fettucine Alfredo', 'A creamy Alfredo sauce over fettuccine noodles.', '7.99 USD'),
    ('Hamburgers', 'Bourbon Bacon Cheeseburger', 'A quarter-pound* of fresh, never-frozen beef topped with Applewood smoked bacon, American cheese, crispy onions, and a sweet, smoky bourbon bacon sauce that is, essentially, a sauce made with real bourbon and real bacon. Read that part about the sauce again, and we’ll see you soon.', '6.92 USD'),
    ('Salads', 'Baja Turkey Avocado', 'Spice up your salad with Oven-Roasted Turkey, and Smashed Avocado, on a bed of greens and crisp veggies and topped with Baja Chipotle sauce.', '11.99 USD'),
    ('Sandwiches, Wraps &amp; Burgers', 'The Ultimate Burger', 'Savory, choice gourmet burger, a mix of melted cheese, topped with lettuce, tomatoes, pickles, onions and your favorite sauce. Then choose from the custom list of additional options.', '12.49 USD'),
    ('Scotch Whiskey', 'BUCHANANS DELUXE 12YR 1L', '', '64.99 USD'),
    ('Sides', 'Side Chorizo', '', '4.0 USD'),
    ('Vegetarian Special ', 'Tofu Stir-Fried Vegetable', '', '14.99 USD'),
    ('Sake', 'Bacardi Classic Cocktails Drinks Strawberry Daiquiri,1.75L shake (15%ABV)', '', '21.99 USD'),
    ('Signature French Macarons', 'Birthday Cake French Macaron', '', '2.75 USD'),
    ('TOYS', 'DOUBLE SIX WHITE DOMINOES', 'Bring some old-fashioned family fun to game night with this high quality Dominoes set. Double Six Dominoes is perfect for beginners and experts. The starter piece enhances gameplay while the bright colored dots make gameplay easier. This Double Six Dominoes set includes 28 durable, color-coded, ivory-colored dominoes that stack neatly into a durable storage tin and a starter piece. Learn to play different variations with the included instructions.', '9.99 USD'),
    ('Spices', 'Derica 400g', '', '4.59 USD'),
    ('House Favorites', '1 Honey-Butter Biscuit', 'Scratch-made in small batches all day long, and drizzled with honey-butter the second they come out of the oven.', '0.99 USD'),
    ('Frozen', 'Stouffer''s', '', '5.48 USD'),
    ('Prepared Foods', 'Blount''s Family Kitchen · Uncle Teddy s Beef Chili with Beans (12 oz)', '12 oz', '8.78 USD'),
    ('FRUIT &amp; SIDES       ', 'Steamed Veggies ', 'A healthy blend of steamed broccoli, cauliflower, zucchini and organic baby carrots.', '2.95 USD'),
    ('Salads', 'Roast Beef', 'Level up your salad with NEW Choice Angus Roast Beef and a whole lot of crisp veggies.', '9.29 USD'),
    ('Burgers &amp; Sandwiches', 'Chili Cheese Dog', 'No one does hot-dogs better than your local DQ® restaurant! Order them plain or for the ultimate taste sensation, try our fabulous Chili Cheese dog.', '6.23 USD'),
    ('Featured', 'The Dragon Fruit Lemonade Refresher 16 oz', 'Apple, Lemon, Honey, Dragon Fruit, Coconut Water - Blended with Frozen Strawberries', '10.74 USD'),
    ('Drinks', 'FIJI - 1L', '', '5.04 USD'),
    ('Desserts', 'Chocolate Chip Cookies', 'fresh warm cookies', '3.5 USD'),
    ('A La Carte (pm)', 'Big Fish Sandwich', '', '4.79 USD'),
    ('BEVVIES ', 'Ginger Ale', '', '2.5 USD'),
    ('Candy', 'Kit Kat Duos Dark Chocolate Mint King Size 3oz', 'Turn your KIT KAT® break up a notch with New KIT KAT® Duos', '2.59 USD'),
    ('Veggies  (All vegetarian orders are cooked when ordered one hour before closing time)', 'Cabbage Roti', 'Dal Poori roti served with a choice steamed cabbage, curry potatoes or chunks (soy). Can either be served wrapped or unwrapped. Wait time of 35 mins.', '12.63 USD'),
    ('Appetizers', 'GB’s Chinese Chicken Salad', 'Chopped kale, marinated chicken, mandarin oranges, avocado, sliced peppers, roasted almonds, green onions, sesame seeds, and creamy sesame dressing (served on the side). (gluten-free)', '14.0 USD'),
    ('Side Attractions', 'Suya', 'Seasoned with hot spices and grilled to perfection topped with onions and hot pepper sauce.', '13.0 USD'),
    ('Lifestyle Bowls', 'Whole30® Salad Bowl', 'Supergreens Lettuce Blend, Chicken, Fajita Veggies, Fresh Tomato Salsa and Guacamole', '13.55 USD'),
    ('Cognac', 'COURVOISIER VS 375ML', '', '19.99 USD'),
    ('FILM/PHOTO', 'SANDISK 16G FLASH DRIVE', '16 GB USB Drive', '16.99 USD'),
    ('Craft Beer 21+only', 'Independence Austin Amber, 6pk-12oz can beer (6.0% ABV)', '', '14.99 USD'),
    ('Appetizers ', 'Zucchini Fritte', 'Hand-breaded, lightly fried and served with roasted garlic aioli ', '10.99 USD'),
    ('Picked for you', 'Shakes', 'Jumbo 20 oz. shake Made with fresh Milwaukee frozen custard. Includes 1 topping.', '8.75 USD'),
    ('Sides', 'Miss Vickie’s® Jalapeño', 'Made with jalapeño seasoning for enough heat to make things deliciously interesting. And every spicy bite is made with no artificial flavors or preservatives.', '1.29 USD'),
    ('Melts &amp; Handhelds ', 'Cali Club Sandwich', 'Turkey breast, ham, bacon, Swiss cheese, fresh avocado, sun-dried tomato mayo, lettuce and tomato on toasted 7-grain bread. Served with wavy-cut fries.\n', '14.34 USD'),
    ('Ice Cream', 'Haagen Dazs Vanilla Milk Chocolate Bar 3oz', 'Discover A Sweet Reward Bite By Bite With Haagen-Dazs Ice Cream', '2.5 USD'),
    ('Mariscos', 'Filete Empanizado', 'Breaded filet, rice, salad, and French fries.', '15.99 USD'),
    ('Out of This World Pizza', 'Big Bang Pepperoni Jalapeno Pizza', 'Pizza with pepperoni, jalapenos, and bell peppers', '12.04 USD'),
    ('Vodka', 'New Amsterdam 100 Proof, 750mL vodka (50.0% ABV)', 'New Amsterdam vodka was born from an uncompromising passion for great vodka. This commitment to excellence delivers a great-tasting vodka with unparalleled smoothness. 5 times distilled and 3 times filtered to deliver a clean crisp taste that is smooth enough to drink straight or complement any cocktail. Our 100 proof vodka has aromas of sweet frosting and light citrus with an impressively smooth, clean finish.', '19.19 USD'),
    ('FOOD', 'HOST HOT DOG BUNS 8CT', 'No hotdog is complete without the perfect bun. These soft white hotdog buns keep the flavors in your dog and your hands mess-free.', '3.29 USD'),
    ('Salads', 'Italian B.M.T. ® ', 'The Italian B.M.T. ® salad is the salad version of our popular sub. Crisp greens topped with Genoa salami, spicy pepperoni, and Black Forest ham. Meaty deliciousness, all in a salad. ', '8.79 USD'),
    ('Drinks', 'Coke 16oz', 'Crisp, delicious soft drinks flavoried with vanilla, cinnamon, and citrus.', '2.09 USD'),
    ('Drinks', 'Diet Coke 2L', 'Delicious, crisp tasting, no calorie sparkling cola.', '3.29 USD'),
    ('No Bready Bowls™', 'Chicken &amp; Bacon Ranch', 'Fuel your day with every last bite of Rotisserie-Style Chicken, Monterrey Cheddar Cheese, and Hickory-Smoked Bacon you’d get in a Footlong, now in a bowl with veggies and Peppercorn Ranch.', '10.99 USD'),
    ('Enchiladas', 'Charrito Enchiladas', 'Corn tortilla filled with your choice of meat ground beef, chicken, or picadillo. Topped with special enchilada sauce and cheese. Served with refried or rancho beans.', '12.5 USD'),
    ('Herbal', 'Mullein (1 oz)', 'A resilient herb, mullein is a powerful respiratory aid. Helps rid mucus from the respiratory system. Smokeable alternative to cigarettes, and great for lung health.', '10.0 USD'),
    ('Sandwiches', 'Premium Family Feast', 'A meal to feed the whole family. Includes 4 Half Sandwiches, 1 Whole Salad, 1 Quart of Soup, and 1 Whole French Baguette. Serves 4-6.', '49.19 USD'),
    ('Brunch Specialties', 'Crab Cake Benedict', 'Jumbo lump crab cakes on an English muffin, topped with poached eggs, andouille-infused hollandaise, red peppers and green onions.', '19.99 USD'),
    ('Grocery n'' Games', 'Pecan Log - 7oz.', 'An old-fashioned tradition. Our Pecan Logs are a handmade creation of rich nougat, dipped in creamy caramel, then hand-rolled in fresh chopped pecans. Great as a snack or slice a few to serve to guests.', '6.49 USD'),
    ('No Bready Bowls™', 'Turkey Italiano', ' Oven Roasted Turkey, with an Italian kick. We add in pepperoni and Genoa Salami, plus Monterey cheddar cheese. You add in your favorite veggies and fixings. Mangia.', '10.19 USD'),
    ('Frozen Treat - Italian Ice', 'Banana Italian Ice', '', '5.99 USD'),
    ('🥄Rice Dishes🥢', 'Popcorn chicken Don', 'Popcorn chicken, Green onions, Tonkatsu sauce, Spicy mayo and Cabbage.', '14.0 USD'),
    ('Combos', 'Smokehouse Combo', 'Two jumbo smoked sausage links served with 2 eggs* your way, hash browns &amp; 2 buttermilk pancakes.\n', '14.75 USD'),
    ('American Wagyu', 'Large American Wagyu Cheese Steak', 'Ultra-premium American wagyu beef, grilled with mushrooms, onions and white American cheese. Add hot or sweet peppers for even more flavor.', '23.99 USD'),
    ('Cocina / Kitchen Products  ⏲', 'I-Chef Narrow Spatula', '1 ct.', '3.39 USD'),
    ('Picked for you', 'General Tso''s Tofu', 'Hot and spicy. Served with white rice.', '8.75 USD'),
    ('Shareables', 'BBQ Pork Sliders (3)', 'Pork shoulder slowly cooked overnight, pulled apart and tossed in our homemade barbeque sauce, topped with Asian slaw and seved on a pretzel bun', '14.3 USD'),
    ('Melts &amp; Handhelds ', 'Nashville Hot Chicken Melt', 'A golden-fried chicken breast tossed in Nashville Hot sauce with Swiss cheese, tomato, pickles and mayo on grilled Texas toast.  Served with wavy-cut fries.', '15.38 USD'),
    ('Diet & Nutrition', 'CVS Health Pulse Oximeter', 'HSA/FSA Eligible Read from all sides One-button operation Adjustable brightness Automatic power off Includes 2 AAA batteries Measures: oxygen level, pulse rate The CVS Health Pulse Oximeter is designed to help you get easy, fast readings for your oxygen levels and pulse rate to help monitor a variety of conditions. This lightweight and reliable device features a comfortable, slip-resistant fit so it stays put as you take the reading. The unit also boasts a high definition display that''s easy to read so you can quickly check your oxygen level and pulse rate as needed. The convenient design of this pulse oximeter allows you to read it from all sides, and the one-button operation makes it a cinch to use. Adjustable brightness helps you see the numbers clearly even in low light. An automatic power-off feature turns the unit off to save battery power. It requires two AAA batteries, which are included. This item is Flexible Spending Account (FSA) eligible. When using your CVS Health Pulse Oximeter, keep your hands still in order to get the most accurate results. Place one of your fingers inside to the end, then press down on the switch button once, located on the front panel, to turn the unit on. This device includes a handy lanyard so you can hang it up for storage or take it with you anywhere. Simply tie the lanyard through the hole in the rear of the unit. Always read the instructions fully and carefully before use to ensure that you''re receiving the most accurate readings possible. Please contact your healthcare provider if your are experiencing any unusual symptoms related to breathing or if your readings are outside of ranges established by your healthcare provider.', '49.99 USD'),
    ('Salads &amp; Soups ', 'Wonton Soup Bowl', 'Savory broth, house-made pork wontons, shrimp, chicken', '10.5 USD'),
    ('Bread Sticks', 'Jalapeño Feta Bread Sticks', 'Classic with Jalapeño, Feta', '16.4 USD'),
    ('Pizza', 'Cheese Pizza', '', '9.0 USD'),
    ('A La Carte', 'Kung Pao Chicken', '', '0.0 USD'),
    ('Drinks', 'Soda', '', '1.99 USD'),
    ('Island Famous Signature Combos (Alcoholic) - Must be 21+ to order.', 'Rip Tide', 'Piña Colada, Hypnotic.', '8.5 USD'),
    ('Specialty Pizzas', 'Stampede Pizza-Small', 'Beef, pepperoni, Canadian bacon, Italian sausage, black olives, green olives, green peppers, mushrooms, and red onions.', '9.89 USD'),
    ('Pizzas', 'Hawaiian', 'Canadian bacon, pineapple, and mozzarella cheese on a bed of red sauce. 10" size.', '15.99 USD'),
    ('PASTA', 'TAGLIATELLE CHICKEN ALFREDO', '', '20.0 USD'),
    ('Chicken Dinners', 'Chicken Dinner (2 Pcs)', '', '8.49 USD'),
    ('Slush', 'Mango T-Slush ', 'Made with fresh fruit. 16 oz.  590Cal', '6.99 USD'),
    ('Beef', 'Pepper Steak (Entree)', '', '15.5 USD'),
    ('Combination', 'Chicken Chow Mein', 'Served with vegetable spring roll and fried rice.', '9.35 USD'),
    ('Breakfast', 'Egg &amp; Cheese 6 Inch with Regular Egg', 'A classic for a reason. Our Egg and Cheese is simply delicious. Enjoy a fluffy egg with melted cheese. Try it toasted - It''s unbeatable.', '6.09 USD'),
    ('Health & Beauty', 'Oral-B Soft Toothbrush', '', '3.28 USD'),
    ('Sides', 'Side of Sour Cream', '', '1.0 USD'),
    ('Bakery', 'Glazed Doughnut', 'Old-fashioned cake doughnut glazed with sweet icing. - VEGETARIAN', '2.85 USD'),
    ('Picked for you', 'Bacon King Sandwich', '', '11.49 USD'),
    ('Beverages', 'Lemonade - Gallon', '', '11.0 USD'),
    ('Drinks', 'Milk', '', '2.25 USD'),
    ('Small Plate', 'Blue Crab Fried Rice', 'Fried rice, lump crab, and spicy cod roe.', '15.75 USD'),
    ('Snacks', '7-Select Jack Link''s Beef & Cheese Stick 1.2oz', 'Crafted and seasoned beef and cheese sticks are individually wrapped for a quick and easy snack.', '2.09 USD'),
    ('Candy &amp; Gum', 'Trident Tropical Twist (14 Count)', '', '1.99 USD'),
    ('Other/ Liqueur', 'RumChata, 750mL liqueur (13.75% ABV)', '', '31.99 USD'),
    ('Sides', 'Side of Hot Sauce', '', '0.99 USD'),
    ('Burritos &amp; Bowls', 'New Mexico Chicken Burrito &amp; Bowl ', 'Grilled chicken, hickory-smoked bacon pieces, green peppers &amp; onions, tomatoes, queso sauce, shredded Jack &amp; Cheddar cheese, avocado and rice medley all wrapped up in a warm flour tortilla or layered in a bowl. Served with our salsa and choice of side.', '0.0 USD'),
    ('Chicken ''n Biscuits', 'Southern Fried Chicken Bucket', '12 generous pieces of chicken, hand-breaded with our signature seasoning, perfectly crispy on the outside, perfectly juicy on the inside. Comes with honey for drizzling, two large sides, and hand rolled Buttermilk Biscuits. \n', '39.99 USD'),
    ('Appetizers', 'Sushi Cake', 'Ahi Spicy tuna tower', '15.94 USD'),
    ('Desserts', 'Ultimate Chocolate Chip Cookie', 'Pizza night just got a whole lot sweeter. Freshly baked and warm from the oven, our cookie is packed with semi-sweet chocolate chips that melt in your mouth.', '8.18 USD'),
    ('Woodmont Famous Favorites', 'Shrimp Basket Platter', 'Served with French fries and coleslaw.\n', '15.99 USD'),
    ('Sides', 'Bacon', '', '3.99 USD'),
    ('Boneless Wings', 'Buffalo Bites Entrée ', 'The full meal size of our Buffalo Bites appetizer.\n12 oz. of hand-breaded, bite-sized versions of our boneless wings. Tossed in your favorite wing sauce and served with a side.', '13.5 USD'),
    ('Beverages', 'Pepsi', '', '2.29 USD'),
    ('Dinner Sides', 'Balsamic Portabellas', 'Flame grilled, sweet balsamic reduction, gluten-free, and vegetarian.', '6.0 USD'),
    ('Hot Coffees', 'Clover® Starbucks Reserve® Guatemala Santa Clara Estate', 'Four generations ago, the Zelaya family established their farm in Guatemala’s renowned Antigua Valley. Today, Ricardo Zelaya proudly continues his legacy, mentoring his three daughters while producing award-winning coffee. For the family, farming is about cultivating lasting relationships, and their passion for the community is evident in the exceptional quality of this cup that features notes of red currant and coconut.', '6.25 USD'),
    ('Tequila', 'Don Julio Blanco, 750mL tequila (40.0% ABV)', '', '67.58 USD'),
    ('Picked for you', 'Butter Chicken Peshawari', 'Chargrilled marinated chicken chunks simmered to perfection in a thick, rich, and creamy cashew and tomato sauce,  with warm spices. Served with a side of steamed long-grain rice.', '19.8 USD'),
    ('Stir-Fried', 'Vegetarian duck basil', 'Vegetarian mock duck, onion, bell pepper, and basil leave stir-fried in spicy chili and garlic sauce', '11.5 USD'),
    ('Ice Cream', 'Ben & Jerry''s The Tonight Dough Pint', 'This is an ice cream and cookie dough party you don''t want to miss!', '7.29 USD'),
    ('Salades &amp; Soupes', 'Romanoff Sauce (6 Ounces)', '', '5.15 USD'),
    ('Beverages', 'Medium Frozen Fanta® Wild Cherry', '', '2.19 USD'),
    ('Value Duets', 'Classic Grilled Cheese &amp; Creamy Tomato Soup', 'A half portion of our Classic Grilled Cheese served alongside a cup of Creamy Tomato Soup.', '6.99 USD'),
    ('Picked for you', 'Chicken Wings', 'Chicken Wings', '8.48 USD'),
    ('Salads &amp; Soups', 'Southern-Fried Chicken Tender Salad', 'With tomatoes, hard-boiled eggs, bacon and cheddar cheese with our Honey Mustard Dressing.', '12.99 USD'),
    ('Starters', 'Wings', 'The option of house buffalo BBQ, or garlic Parmesan sauce.', '16.0 USD'),
    ('Grocery', 'SmartSweets Sweet Fish - 1.8 oz', 'Sweet Fish are the #1 fish in the sea - for real they''re our most popular #KickSugar candy! Bursting with berry-goodness, its no wonder they''re the captain of Team Sweet. We''ve innovated plant-based Sweet Fish with our pinky promise: delicious candy free from sugar alcohols, artificial sweeteners and added sugar. NO GUESSWORK! ONE BAG = ONE SERVING, AND: 92%25 less sugar than other fish 3 grams of sugar for the whole bag! 44%25 less calories than the other fish 13 grams of plant-based fiber 3', '3.45 USD'),
    ('Hand-Crafted Melts', 'Philly Cheese Steak Stacker', 'Philly comes to you with grilled sirloin steak &amp; onions topped with melted American cheese on a grilled roll.', '12.75 USD'),
    ('McCafé', 'Medium French Vanilla Latte', '', '4.59 USD'),
    ('Fried Rice and Noodles', 'Roast Pork Lo Mein', '', '7.99 USD'),
    ('Fries', 'BBQ Chicken Fries', 'French fries topped with chicken, barbecue sauce, shredded cheese, sliced jalapenos and scallions.', '5.99 USD'),
    ('Add-Ons', 'Lettuce', '', '0.25 USD'),
    ('DL_SIDES', 'PICKLED RED ONION AND CABBAGE SIDE Regular', '', '7.0 USD'),
    ('Ice Cream', 'Mars Twix Ice Cream (3 oz)', '', '3.75 USD'),
    ('McCafé', 'Medium Caramel Hot Chocolate', '', '3.39 USD'),
    ('Chop Suey', 'Seafood Chop Suey', '', '7.75 USD'),
    ('Appetizers', 'Baby Corn Manchurian', 'Vegan &amp; Vegetarian- Crispy fried baby corn in a sweet and spicy thick Chinese sauce along with onions and bell pepper ', '12.99 USD'),
    ('Dessert', '12 Chocolate Chip Cookies', '12 of our signature chocolate chip cookies.', '6.35 USD'),
    ('Drinks', 'Strawberry Boba Smoothie', 'Fresh strawberry boba tea smoothie, served with tapioca boba balls.', '6.75 USD'),
    ('Hamburgers', 'Bourbon Bacon Cheeseburger Triple', 'Three-quarters of a pound* of fresh, never-frozen beef topped with Applewood smoked bacon, American cheese, crispy onions, and a sweet, smoky bourbon bacon sauce. That’s actual bourbon and actual bacon actually in the sauce. Break this one out only for special occasions—like lunch.', '9.62 USD'),
    ('Appetizers', 'The Rock Wings', 'Skillet baked and tossed with your choice of ranch season dry rub, hot sauce, sweet red chili sauce or BBQ sauce', '15.95 USD'),
    ('SKIN CARE', 'CETAPHIL MOIST LOTION 16Z', 'Hydrates for 48 hours & restores the skin barrier.', '14.99 USD'),
    ('Dessert', 'Coconut Cream Pie', '', '6.59 USD'),
    ('Salads', 'House Salad', 'Cucumbers, grape tomatoes, Cheddar cheese and croutons atop a bed of iceberg mix. Served with choice of dressing.\n', '7.78 USD'),
    ('McCafé', 'Medium Strawberry Banana Smoothie', '', '4.19 USD'),
    ('Dessert', 'Chocolate Baklava', 'A savory dessert, which features flaky phyllo dough wrapped around a blend of chopped walnuts and almonds in a sweet syrup mixture topped with ribbons of chocolate. Allergen: Wheat, Milk, and Tree Nuts.', '3.49 USD'),
    ('Appetizers', 'Stuffed Grape Leaves', 'Five pieces. Dolmas filled with rice, tomatoes, and onions. ', '5.49 USD'),
    ('Tenders', 'Handcrafted Tenders (8 Pcs)', 'Include three sauces', '25.19 USD'),
    ('DESSERTS            ', 'Texas Chocolate Cake     ', 'Moist chocolate cake covered in chocolate icing, topped with chopped pecans.', '2.61 USD'),
    ('Candy', 'Starburst Minis - Share Size', '', '1.52 USD'),
    ('Picked for you', '10 pc Buffalo Wings', 'Our Chicken is Antibiotic and Hormone Free as well as Halal. Hand tossed in your favorite sauce and Always Fresh and made to order ', '11.99 USD'),
    ('Desserts', 'Mango Ice Cream', '', '6.99 USD'),
    ('Signature Platters', '6. Beef &amp; Lamb Gyro Platter', 'Beef and Lamb Gyro + Saffron Basmati Rice + Chickpeas + Fries', '16.8 USD'),
    ('Breakfast Burritos', 'The One', '3 slices of crispy thick-cut bacon, sauteed chicken apple sausage, triple egg omelet, chili aioli, gooey American cheese, scallions, and fried potato tots seasoned with Nashville spices all encased in a toasted flour tortilla. \n', '14.01 USD'),
    ('CHEESESTEAKS', 'VEGGIE DELIGHT', 'Veggie lovers rejoice! Our Veggie Delight cheesesteak features grilled sliced mushrooms, crispy green peppers and savory onion grilled to perfection and served on a toasted roll. We top our Veggie Delight with smooth melted provolone, mellow shredded cheddar cheese, and sharp Swiss to enhance the flavors of our featured veggies. This is the veggie sandwich you’ve been waiting for.\nAll cheesesteaks come with optional creamy mayonnaise, juicy tomato, shredded lettuce, and crispy pickle. \nThe Veggie Delight pairs perfectly with Cheese Fries or an Original Real-Fruit Lemonade.\n', '7.19 USD'),
    ('Grocery', 'Quaker Express Maple & Brown Sugar 1.69oz', 'A breakfast that literally gives you sugar and spice and everything nice. This high-protein high-fiber meal is pure heaven!', '2.29 USD'),
    ('Family Size Pig Outs', 'Gallon of Lemonade', '', '6.76 USD'),
    ('BATTERIES', 'RA ALKALINE C 4PK', 'For your C battery powered needs choose Rite Aid Home Alkaline Batteries. They are dependable, long lasting, and affordable for whatever and whenever you need them.', '9.29 USD'),
    ('Picked for you', 'General Tso''s Chicken', 'Deep fried white meat chicken pieces blended with chef’s sauce.', '18.38 USD'),
    ('Specialty Sandwiches', 'Turkey Veggie Ranch', 'Contains: Multi Grain Bread, Swiss, Ranch Dressing, Tomato, Cucumbers, Spinach, Applewood Smoked Bacon, Oven Roasted Turkey', '6.89 USD'),
    ('Frozen', 'White Castle', '', '7.68 USD'),
    ('Starters and Salads', 'Grimaldi''s House Salad', 'Romaine Lettuce, Red Onion, Cherry Tomatoes, Oven Roasted Sweet Red Peppers, Mushrooms, Green Olives\nand Vinaigrette Dressing.', '10.0 USD'),
    ('Picked for you', 'NEW! Mozzarella Sticks', 'Lightly battered Mozzarella cheese, fried to perfection and served with marinara sauce.', '9.89 USD'),
    ('Picked for you', 'Spicy Chicken Sandwich Combo', 'Includes a choice of regular signature side and a drink.', '10.19 USD')
) AS result( "category","name","description","price");

DROP FUNCTION IF EXISTS on_order_updates() CASCADE;

DROP TABLE IF EXISTS fake_contacts CASCADE;
SELECT first_name, last_name, email, '07' || round(random()*1e9) as phone_number
INTO fake_contacts
FROM (
  VALUES 
    ('James', 'Butt', 'jbutt@gmail.com'),
    ('Josephine', 'Darakjy', 'josephine_darakjy@darakjy.org'),
    ('Art', 'Venere', 'art@venere.org'),
    ('Lenna', 'Paprocki', 'lpaprocki@hotmail.com'),
    ('Donette', 'Foller', 'donette.foller@cox.net'),
    ('Simona', 'Morasca', 'simona@morasca.com'),
    ('Mitsue', 'Tollner', 'mitsue_tollner@yahoo.com'),
    ('Leota', 'Dilliard', 'leota@hotmail.com'),
    ('Sage', 'Wieser', 'sage_wieser@cox.net'),
    ('Kris', 'Marrier', 'kris@gmail.com'),
    ('Minna', 'Amigon', 'minna_amigon@yahoo.com'),
    ('Abel', 'Maclead', 'amaclead@gmail.com'),
    ('Kiley', 'Caldarera', 'kiley.caldarera@aol.com'),
    ('Graciela', 'Ruta', 'gruta@cox.net'),
    ('Cammy', 'Albares', 'calbares@gmail.com'),
    ('Mattie', 'Poquette', 'mattie@aol.com'),
    ('Meaghan', 'Garufi', 'meaghan@hotmail.com'),
    ('Gladys', 'Rim', 'gladys.rim@rim.org'),
    ('Yuki', 'Whobrey', 'yuki_whobrey@aol.com'),
    ('Fletcher', 'Flosi', 'fletcher.flosi@yahoo.com'),
    ('Bette', 'Nicka', 'bette_nicka@cox.net'),
    ('Veronika', 'Inouye', 'vinouye@aol.com'),
    ('Willard', 'Kolmetz', 'willard@hotmail.com'),
    ('Maryann', 'Royster', 'mroyster@royster.com'),
    ('Alisha', 'Slusarski', 'alisha@slusarski.com'),
    ('Allene', 'Iturbide', 'allene_iturbide@cox.net'),
    ('Chanel', 'Caudy', 'chanel.caudy@caudy.org'),
    ('Ezekiel', 'Chui', 'ezekiel@chui.com'),
    ('Willow', 'Kusko', 'wkusko@yahoo.com'),
    ('Bernardo', 'Figeroa', 'bfigeroa@aol.com'),
    ('Ammie', 'Corrio', 'ammie@corrio.com'),
    ('Francine', 'Vocelka', 'francine_vocelka@vocelka.com'),
    ('Ernie', 'Stenseth', 'ernie_stenseth@aol.com'),
    ('Albina', 'Glick', 'albina@glick.com'),
    ('Alishia', 'Sergi', 'asergi@gmail.com'),
    ('Solange', 'Shinko', 'solange@shinko.com'),
    ('Jose', 'Stockham', 'jose@yahoo.com'),
    ('Rozella', 'Ostrosky', 'rozella.ostrosky@ostrosky.com'),
    ('Valentine', 'Gillian', 'valentine_gillian@gmail.com'),
    ('Kati', 'Rulapaugh', 'kati.rulapaugh@hotmail.com'),
    ('Youlanda', 'Schemmer', 'youlanda@aol.com'),
    ('Dyan', 'Oldroyd', 'doldroyd@aol.com'),
    ('Roxane', 'Campain', 'roxane@hotmail.com'),
    ('Lavera', 'Perin', 'lperin@perin.org'),
    ('Erick', 'Ferencz', 'erick.ferencz@aol.com'),
    ('Fatima', 'Saylors', 'fsaylors@saylors.org'),
    ('Jina', 'Briddick', 'jina_briddick@briddick.com'),
    ('Kanisha', 'Waycott', 'kanisha_waycott@yahoo.com'),
    ('Emerson', 'Bowley', 'emerson.bowley@bowley.org'),
    ('Blair', 'Malet', 'bmalet@yahoo.com'),
    ('Brock', 'Bolognia', 'bbolognia@yahoo.com'),
    ('Lorrie', 'Nestle', 'lnestle@hotmail.com'),
    ('Sabra', 'Uyetake', 'sabra@uyetake.org'),
    ('Marjory', 'Mastella', 'mmastella@mastella.com'),
    ('Karl', 'Klonowski', 'karl_klonowski@yahoo.com'),
    ('Tonette', 'Wenner', 'twenner@aol.com'),
    ('Amber', 'Monarrez', 'amber_monarrez@monarrez.org'),
    ('Shenika', 'Seewald', 'shenika@gmail.com'),
    ('Delmy', 'Ahle', 'delmy.ahle@hotmail.com'),
    ('Deeanna', 'Juhas', 'deeanna_juhas@gmail.com'),
    ('Blondell', 'Pugh', 'bpugh@aol.com'),
    ('Jamal', 'Vanausdal', 'jamal@vanausdal.org'),
    ('Cecily', 'Hollack', 'cecily@hollack.org'),
    ('Carmelina', 'Lindall', 'carmelina_lindall@lindall.com'),
    ('Maurine', 'Yglesias', 'maurine_yglesias@yglesias.com'),
    ('Tawna', 'Buvens', 'tawna@gmail.com'),
    ('Penney', 'Weight', 'penney_weight@aol.com'),
    ('Elly', 'Morocco', 'elly_morocco@gmail.com'),
    ('Ilene', 'Eroman', 'ilene.eroman@hotmail.com'),
    ('Vallie', 'Mondella', 'vmondella@mondella.com'),
    ('Kallie', 'Blackwood', 'kallie.blackwood@gmail.com'),
    ('Johnetta', 'Abdallah', 'johnetta_abdallah@aol.com'),
    ('Bobbye', 'Rhym', 'brhym@rhym.com'),
    ('Micaela', 'Rhymes', 'micaela_rhymes@gmail.com'),
    ('Tamar', 'Hoogland', 'tamar@hotmail.com'),
    ('Moon', 'Parlato', 'moon@yahoo.com'),
    ('Laurel', 'Reitler', 'laurel_reitler@reitler.com'),
    ('Delisa', 'Crupi', 'delisa.crupi@crupi.com'),
    ('Viva', 'Toelkes', 'viva.toelkes@gmail.com'),
    ('Elza', 'Lipke', 'elza@yahoo.com'),
    ('Devorah', 'Chickering', 'devorah@hotmail.com'),
    ('Timothy', 'Mulqueen', 'timothy_mulqueen@mulqueen.org'),
    ('Arlette', 'Honeywell', 'ahoneywell@honeywell.com'),
    ('Dominque', 'Dickerson', 'dominque.dickerson@dickerson.org'),
    ('Lettie', 'Isenhower', 'lettie_isenhower@yahoo.com'),
    ('Myra', 'Munns', 'mmunns@cox.net'),
    ('Stephaine', 'Barfield', 'stephaine@barfield.com'),
    ('Lai', 'Gato', 'lai.gato@gato.org'),
    ('Stephen', 'Emigh', 'stephen_emigh@hotmail.com'),
    ('Tyra', 'Shields', 'tshields@gmail.com'),
    ('Tammara', 'Wardrip', 'twardrip@cox.net'),
    ('Cory', 'Gibes', 'cory.gibes@gmail.com'),
    ('Danica', 'Bruschke', 'danica_bruschke@gmail.com'),
    ('Wilda', 'Giguere', 'wilda@cox.net'),
    ('Elvera', 'Benimadho', 'elvera.benimadho@cox.net'),
    ('Carma', 'Vanheusen', 'carma@cox.net'),
    ('Malinda', 'Hochard', 'malinda.hochard@yahoo.com'),
    ('Natalie', 'Fern', 'natalie.fern@hotmail.com'),
    ('Lisha', 'Centini', 'lisha@centini.org'),
    ('Arlene', 'Klusman', 'arlene_klusman@gmail.com'),
    ('Alease', 'Buemi', 'alease@buemi.com'),
    ('Louisa', 'Cronauer', 'louisa@cronauer.com'),
    ('Angella', 'Cetta', 'angella.cetta@hotmail.com'),
    ('Cyndy', 'Goldammer', 'cgoldammer@cox.net'),
    ('Rosio', 'Cork', 'rosio.cork@gmail.com'),
    ('Celeste', 'Korando', 'ckorando@hotmail.com'),
    ('Twana', 'Felger', 'twana.felger@felger.org'),
    ('Estrella', 'Samu', 'estrella@aol.com'),
    ('Donte', 'Kines', 'dkines@hotmail.com'),
    ('Tiffiny', 'Steffensmeier', 'tiffiny_steffensmeier@cox.net'),
    ('Edna', 'Miceli', 'emiceli@miceli.org'),
    ('Sue', 'Kownacki', 'sue@aol.com'),
    ('Jesusa', 'Shin', 'jshin@shin.com'),
    ('Rolland', 'Francescon', 'rolland@cox.net'),
    ('Pamella', 'Schmierer', 'pamella.schmierer@schmierer.org'),
    ('Glory', 'Kulzer', 'gkulzer@kulzer.org'),
    ('Shawna', 'Palaspas', 'shawna_palaspas@palaspas.org'),
    ('Brandon', 'Callaro', 'brandon_callaro@hotmail.com'),
    ('Scarlet', 'Cartan', 'scarlet.cartan@yahoo.com'),
    ('Oretha', 'Menter', 'oretha_menter@yahoo.com'),
    ('Ty', 'Smith', 'tsmith@aol.com'),
    ('Xuan', 'Rochin', 'xuan@gmail.com'),
    ('Lindsey', 'Dilello', 'lindsey.dilello@hotmail.com'),
    ('Devora', 'Perez', 'devora_perez@perez.org'),
    ('Herman', 'Demesa', 'hdemesa@cox.net'),
    ('Rory', 'Papasergi', 'rpapasergi@cox.net'),
    ('Talia', 'Riopelle', 'talia_riopelle@aol.com'),
    ('Van', 'Shire', 'van.shire@shire.com'),
    ('Lucina', 'Lary', 'lucina_lary@cox.net'),
    ('Bok', 'Isaacs', 'bok.isaacs@aol.com'),
    ('Rolande', 'Spickerman', 'rolande.spickerman@spickerman.com'),
    ('Howard', 'Paulas', 'hpaulas@gmail.com'),
    ('Kimbery', 'Madarang', 'kimbery_madarang@cox.net'),
    ('Thurman', 'Manno', 'thurman.manno@yahoo.com'),
    ('Becky', 'Mirafuentes', 'becky.mirafuentes@mirafuentes.com'),
    ('Beatriz', 'Corrington', 'beatriz@yahoo.com'),
    ('Marti', 'Maybury', 'marti.maybury@yahoo.com'),
    ('Nieves', 'Gotter', 'nieves_gotter@gmail.com'),
    ('Leatha', 'Hagele', 'lhagele@cox.net'),
    ('Valentin', 'Klimek', 'vklimek@klimek.org'),
    ('Melissa', 'Wiklund', 'melissa@cox.net'),
    ('Sheridan', 'Zane', 'sheridan.zane@zane.com'),
    ('Bulah', 'Padilla', 'bulah_padilla@hotmail.com'),
    ('Audra', 'Kohnert', 'audra@kohnert.com'),
    ('Daren', 'Weirather', 'dweirather@aol.com'),
    ('Fernanda', 'Jillson', 'fjillson@aol.com'),
    ('Gearldine', 'Gellinger', 'gearldine_gellinger@gellinger.com'),
    ('Chau', 'Kitzman', 'chau@gmail.com'),
    ('Theola', 'Frey', 'theola_frey@frey.com'),
    ('Cheryl', 'Haroldson', 'cheryl@haroldson.org'),
    ('Laticia', 'Merced', 'lmerced@gmail.com'),
    ('Carissa', 'Batman', 'carissa.batman@yahoo.com'),
    ('Lezlie', 'Craghead', 'lezlie.craghead@craghead.org'),
    ('Ozell', 'Shealy', 'oshealy@hotmail.com'),
    ('Arminda', 'Parvis', 'arminda@parvis.com'),
    ('Reita', 'Leto', 'reita.leto@gmail.com'),
    ('Yolando', 'Luczki', 'yolando@cox.net'),
    ('Lizette', 'Stem', 'lizette.stem@aol.com'),
    ('Gregoria', 'Pawlowicz', 'gpawlowicz@yahoo.com'),
    ('Carin', 'Deleo', 'cdeleo@deleo.com'),
    ('Chantell', 'Maynerich', 'chantell@yahoo.com'),
    ('Dierdre', 'Yum', 'dyum@yahoo.com'),
    ('Larae', 'Gudroe', 'larae_gudroe@gmail.com'),
    ('Latrice', 'Tolfree', 'latrice.tolfree@hotmail.com'),
    ('Kerry', 'Theodorov', 'kerry.theodorov@gmail.com'),
    ('Dorthy', 'Hidvegi', 'dhidvegi@yahoo.com'),
    ('Fannie', 'Lungren', 'fannie.lungren@yahoo.com'),
    ('Evangelina', 'Radde', 'evangelina@aol.com'),
    ('Novella', 'Degroot', 'novella_degroot@degroot.org'),
    ('Clay', 'Hoa', 'choa@hoa.org'),
    ('Jennifer', 'Fallick', 'jfallick@yahoo.com'),
    ('Irma', 'Wolfgramm', 'irma.wolfgramm@hotmail.com'),
    ('Eun', 'Coody', 'eun@yahoo.com'),
    ('Sylvia', 'Cousey', 'sylvia_cousey@cousey.org'),
    ('Nana', 'Wrinkles', 'nana@aol.com'),
    ('Layla', 'Springe', 'layla.springe@cox.net'),
    ('Joesph', 'Degonia', 'joesph_degonia@degonia.org'),
    ('Annabelle', 'Boord', 'annabelle.boord@cox.net'),
    ('Stephaine', 'Vinning', 'stephaine@cox.net'),
    ('Nelida', 'Sawchuk', 'nelida@gmail.com'),
    ('Marguerita', 'Hiatt', 'marguerita.hiatt@gmail.com'),
    ('Carmela', 'Cookey', 'ccookey@cookey.org'),
    ('Junita', 'Brideau', 'jbrideau@aol.com'),
    ('Claribel', 'Varriano', 'claribel_varriano@cox.net'),
    ('Benton', 'Skursky', 'benton.skursky@aol.com'),
    ('Hillary', 'Skulski', 'hillary.skulski@aol.com'),
    ('Merilyn', 'Bayless', 'merilyn_bayless@cox.net'),
    ('Teri', 'Ennaco', 'tennaco@gmail.com'),
    ('Merlyn', 'Lawler', 'merlyn_lawler@hotmail.com'),
    ('Georgene', 'Montezuma', 'gmontezuma@cox.net'),
    ('Jettie', 'Mconnell', 'jmconnell@hotmail.com'),
    ('Lemuel', 'Latzke', 'lemuel.latzke@gmail.com'),
    ('Melodie', 'Knipp', 'mknipp@gmail.com'),
    ('Candida', 'Corbley', 'candida_corbley@hotmail.com'),
    ('Karan', 'Karpin', 'karan_karpin@gmail.com'),
    ('Andra', 'Scheyer', 'andra@gmail.com'),
    ('Felicidad', 'Poullion', 'fpoullion@poullion.com'),
    ('Belen', 'Strassner', 'belen_strassner@aol.com'),
    ('Gracia', 'Melnyk', 'gracia@melnyk.com'),
    ('Jolanda', 'Hanafan', 'jhanafan@gmail.com'),
    ('Barrett', 'Toyama', 'barrett.toyama@toyama.org'),
    ('Helga', 'Fredicks', 'helga_fredicks@yahoo.com'),
    ('Ashlyn', 'Pinilla', 'apinilla@cox.net'),
    ('Fausto', 'Agramonte', 'fausto_agramonte@yahoo.com'),
    ('Ronny', 'Caiafa', 'ronny.caiafa@caiafa.org'),
    ('Marge', 'Limmel', 'marge@gmail.com'),
    ('Norah', 'Waymire', 'norah.waymire@gmail.com'),
    ('Aliza', 'Baltimore', 'aliza@aol.com'),
    ('Mozell', 'Pelkowski', 'mpelkowski@pelkowski.org'),
    ('Viola', 'Bitsuie', 'viola@gmail.com'),
    ('Franklyn', 'Emard', 'femard@emard.com'),
    ('Willodean', 'Konopacki', 'willodean_konopacki@konopacki.org'),
    ('Beckie', 'Silvestrini', 'beckie.silvestrini@silvestrini.com'),
    ('Rebecka', 'Gesick', 'rgesick@gesick.org'),
    ('Frederica', 'Blunk', 'frederica_blunk@gmail.com'),
    ('Glen', 'Bartolet', 'glen_bartolet@hotmail.com'),
    ('Freeman', 'Gochal', 'freeman_gochal@aol.com'),
    ('Vincent', 'Meinerding', 'vincent.meinerding@hotmail.com'),
    ('Rima', 'Bevelacqua', 'rima@cox.net'),
    ('Glendora', 'Sarbacher', 'gsarbacher@gmail.com'),
    ('Avery', 'Steier', 'avery@cox.net'),
    ('Cristy', 'Lother', 'cristy@lother.com'),
    ('Nicolette', 'Brossart', 'nicolette_brossart@brossart.com'),
    ('Tracey', 'Modzelewski', 'tracey@hotmail.com'),
    ('Virgina', 'Tegarden', 'virgina_tegarden@tegarden.com'),
    ('Tiera', 'Frankel', 'tfrankel@aol.com'),
    ('Alaine', 'Bergesen', 'alaine_bergesen@cox.net'),
    ('Earleen', 'Mai', 'earleen_mai@cox.net'),
    ('Leonida', 'Gobern', 'leonida@gobern.org'),
    ('Ressie', 'Auffrey', 'ressie.auffrey@yahoo.com'),
    ('Justine', 'Mugnolo', 'jmugnolo@yahoo.com'),
    ('Eladia', 'Saulter', 'eladia@saulter.com'),
    ('Chaya', 'Malvin', 'chaya@malvin.com'),
    ('Gwenn', 'Suffield', 'gwenn_suffield@suffield.org'),
    ('Salena', 'Karpel', 'skarpel@cox.net'),
    ('Yoko', 'Fishburne', 'yoko@fishburne.com'),
    ('Taryn', 'Moyd', 'taryn.moyd@hotmail.com'),
    ('Katina', 'Polidori', 'katina_polidori@aol.com'),
    ('Rickie', 'Plumer', 'rickie.plumer@aol.com'),
    ('Alex', 'Loader', 'alex@loader.com'),
    ('Lashon', 'Vizarro', 'lashon@aol.com'),
    ('Lauran', 'Burnard', 'lburnard@burnard.com'),
    ('Ceola', 'Setter', 'ceola.setter@setter.org'),
    ('My', 'Rantanen', 'my@hotmail.com'),
    ('Lorrine', 'Worlds', 'lorrine.worlds@worlds.com'),
    ('Peggie', 'Sturiale', 'peggie@cox.net'),
    ('Marvel', 'Raymo', 'mraymo@yahoo.com'),
    ('Daron', 'Dinos', 'daron_dinos@cox.net'),
    ('An', 'Fritz', 'an_fritz@hotmail.com'),
    ('Portia', 'Stimmel', 'portia.stimmel@aol.com'),
    ('Rhea', 'Aredondo', 'rhea_aredondo@cox.net'),
    ('Benedict', 'Sama', 'bsama@cox.net'),
    ('Alyce', 'Arias', 'alyce@arias.org'),
    ('Heike', 'Berganza', 'heike@gmail.com'),
    ('Carey', 'Dopico', 'carey_dopico@dopico.org'),
    ('Dottie', 'Hellickson', 'dottie@hellickson.org'),
    ('Deandrea', 'Hughey', 'deandrea@yahoo.com'),
    ('Kimberlie', 'Duenas', 'kimberlie_duenas@yahoo.com'),
    ('Martina', 'Staback', 'martina_staback@staback.com'),
    ('Skye', 'Fillingim', 'skye_fillingim@yahoo.com'),
    ('Jade', 'Farrar', 'jade.farrar@yahoo.com'),
    ('Charlene', 'Hamilton', 'charlene.hamilton@hotmail.com'),
    ('Geoffrey', 'Acey', 'geoffrey@gmail.com'),
    ('Stevie', 'Westerbeck', 'stevie.westerbeck@yahoo.com'),
    ('Pamella', 'Fortino', 'pamella@fortino.com'),
    ('Harrison', 'Haufler', 'hhaufler@hotmail.com'),
    ('Johnna', 'Engelberg', 'jengelberg@engelberg.org'),
    ('Buddy', 'Cloney', 'buddy.cloney@yahoo.com'),
    ('Dalene', 'Riden', 'dalene.riden@aol.com'),
    ('Jerry', 'Zurcher', 'jzurcher@zurcher.org'),
    ('Haydee', 'Denooyer', 'hdenooyer@denooyer.org'),
    ('Joseph', 'Cryer', 'joseph_cryer@cox.net'),
    ('Deonna', 'Kippley', 'deonna_kippley@hotmail.com'),
    ('Raymon', 'Calvaresi', 'raymon.calvaresi@gmail.com'),
    ('Alecia', 'Bubash', 'alecia@aol.com'),
    ('Ma', 'Layous', 'mlayous@hotmail.com'),
    ('Detra', 'Coyier', 'detra@aol.com'),
    ('Terrilyn', 'Rodeigues', 'terrilyn.rodeigues@cox.net'),
    ('Salome', 'Lacovara', 'slacovara@gmail.com'),
    ('Garry', 'Keetch', 'garry_keetch@hotmail.com'),
    ('Matthew', 'Neither', 'mneither@yahoo.com'),
    ('Theodora', 'Restrepo', 'theodora.restrepo@restrepo.com'),
    ('Noah', 'Kalafatis', 'noah.kalafatis@aol.com'),
    ('Carmen', 'Sweigard', 'csweigard@sweigard.com'),
    ('Lavonda', 'Hengel', 'lavonda@cox.net'),
    ('Junita', 'Stoltzman', 'junita@aol.com'),
    ('Herminia', 'Nicolozakes', 'herminia@nicolozakes.org'),
    ('Casie', 'Good', 'casie.good@aol.com'),
    ('Reena', 'Maisto', 'reena@hotmail.com'),
    ('Mirta', 'Mallett', 'mirta_mallett@gmail.com'),
    ('Cathrine', 'Pontoriero', 'cathrine.pontoriero@pontoriero.com'),
    ('Filiberto', 'Tawil', 'ftawil@hotmail.com'),
    ('Raul', 'Upthegrove', 'rupthegrove@yahoo.com'),
    ('Sarah', 'Candlish', 'sarah.candlish@gmail.com'),
    ('Lucy', 'Treston', 'lucy@cox.net'),
    ('Judy', 'Aquas', 'jaquas@aquas.com'),
    ('Yvonne', 'Tjepkema', 'yvonne.tjepkema@hotmail.com'),
    ('Kayleigh', 'Lace', 'kayleigh.lace@yahoo.com'),
    ('Felix', 'Hirpara', 'felix_hirpara@cox.net'),
    ('Tresa', 'Sweely', 'tresa_sweely@hotmail.com'),
    ('Kristeen', 'Turinetti', 'kristeen@gmail.com'),
    ('Jenelle', 'Regusters', 'jregusters@regusters.com'),
    ('Renea', 'Monterrubio', 'renea@hotmail.com'),
    ('Olive', 'Matuszak', 'olive@aol.com'),
    ('Ligia', 'Reiber', 'lreiber@cox.net'),
    ('Christiane', 'Eschberger', 'christiane.eschberger@yahoo.com'),
    ('Goldie', 'Schirpke', 'goldie.schirpke@yahoo.com'),
    ('Loreta', 'Timenez', 'loreta.timenez@hotmail.com'),
    ('Fabiola', 'Hauenstein', 'fabiola.hauenstein@hauenstein.org'),
    ('Amie', 'Perigo', 'amie.perigo@yahoo.com'),
    ('Raina', 'Brachle', 'raina.brachle@brachle.org'),
    ('Erinn', 'Canlas', 'erinn.canlas@canlas.com'),
    ('Cherry', 'Lietz', 'cherry@lietz.com'),
    ('Kattie', 'Vonasek', 'kattie@vonasek.org'),
    ('Lilli', 'Scriven', 'lilli@aol.com'),
    ('Whitley', 'Tomasulo', 'whitley.tomasulo@aol.com'),
    ('Barbra', 'Adkin', 'badkin@hotmail.com'),
    ('Hermila', 'Thyberg', 'hermila_thyberg@hotmail.com'),
    ('Jesusita', 'Flister', 'jesusita.flister@hotmail.com'),
    ('Caitlin', 'Julia', 'caitlin.julia@julia.org'),
    ('Roosevelt', 'Hoffis', 'roosevelt.hoffis@aol.com'),
    ('Helaine', 'Halter', 'hhalter@yahoo.com'),
    ('Lorean', 'Martabano', 'lorean.martabano@hotmail.com'),
    ('France', 'Buzick', 'france.buzick@yahoo.com'),
    ('Justine', 'Ferrario', 'jferrario@hotmail.com'),
    ('Adelina', 'Nabours', 'adelina_nabours@gmail.com'),
    ('Derick', 'Dhamer', 'ddhamer@cox.net'),
    ('Jerry', 'Dallen', 'jerry.dallen@yahoo.com'),
    ('Leota', 'Ragel', 'leota.ragel@gmail.com'),
    ('Jutta', 'Amyot', 'jamyot@hotmail.com'),
    ('Aja', 'Gehrett', 'aja_gehrett@hotmail.com'),
    ('Kirk', 'Herritt', 'kirk.herritt@aol.com'),
    ('Leonora', 'Mauson', 'leonora@yahoo.com'),
    ('Winfred', 'Brucato', 'winfred_brucato@hotmail.com'),
    ('Tarra', 'Nachor', 'tarra.nachor@cox.net'),
    ('Corinne', 'Loder', 'corinne@loder.org'),
    ('Dulce', 'Labreche', 'dulce_labreche@yahoo.com'),
    ('Kate', 'Keneipp', 'kate_keneipp@yahoo.com'),
    ('Kaitlyn', 'Ogg', 'kaitlyn.ogg@gmail.com'),
    ('Sherita', 'Saras', 'sherita.saras@cox.net'),
    ('Lashawnda', 'Stuer', 'lstuer@cox.net'),
    ('Ernest', 'Syrop', 'ernest@cox.net'),
    ('Nobuko', 'Halsey', 'nobuko.halsey@yahoo.com'),
    ('Lavonna', 'Wolny', 'lavonna.wolny@hotmail.com'),
    ('Lashaunda', 'Lizama', 'llizama@cox.net'),
    ('Mariann', 'Bilden', 'mariann.bilden@aol.com'),
    ('Helene', 'Rodenberger', 'helene@aol.com'),
    ('Roselle', 'Estell', 'roselle.estell@hotmail.com'),
    ('Samira', 'Heintzman', 'sheintzman@hotmail.com'),
    ('Margart', 'Meisel', 'margart_meisel@yahoo.com'),
    ('Kristofer', 'Bennick', 'kristofer.bennick@yahoo.com'),
    ('Weldon', 'Acuff', 'wacuff@gmail.com'),
    ('Shalon', 'Shadrick', 'shalon@cox.net'),
    ('Denise', 'Patak', 'denise@patak.org'),
    ('Louvenia', 'Beech', 'louvenia.beech@beech.com'),
    ('Audry', 'Yaw', 'audry.yaw@yaw.org'),
    ('Kristel', 'Ehmann', 'kristel.ehmann@aol.com'),
    ('Vincenza', 'Zepp', 'vzepp@gmail.com'),
    ('Elouise', 'Gwalthney', 'egwalthney@yahoo.com'),
    ('Venita', 'Maillard', 'venita_maillard@gmail.com'),
    ('Kasandra', 'Semidey', 'kasandra_semidey@semidey.com'),
    ('Xochitl', 'Discipio', 'xdiscipio@gmail.com'),
    ('Maile', 'Linahan', 'mlinahan@yahoo.com'),
    ('Krissy', 'Rauser', 'krauser@cox.net'),
    ('Pete', 'Dubaldi', 'pdubaldi@hotmail.com'),
    ('Linn', 'Paa', 'linn_paa@paa.com'),
    ('Paris', 'Wide', 'paris@hotmail.com'),
    ('Wynell', 'Dorshorst', 'wynell_dorshorst@dorshorst.org'),
    ('Quentin', 'Birkner', 'qbirkner@aol.com'),
    ('Regenia', 'Kannady', 'regenia.kannady@cox.net'),
    ('Sheron', 'Louissant', 'sheron@aol.com'),
    ('Izetta', 'Funnell', 'izetta.funnell@hotmail.com'),
    ('Rodolfo', 'Butzen', 'rodolfo@hotmail.com'),
    ('Zona', 'Colla', 'zona@hotmail.com'),
    ('Serina', 'Zagen', 'szagen@aol.com'),
    ('Paz', 'Sahagun', 'paz_sahagun@cox.net'),
    ('Markus', 'Lukasik', 'markus@yahoo.com'),
    ('Jaclyn', 'Bachman', 'jaclyn@aol.com'),
    ('Cyril', 'Daufeldt', 'cyril_daufeldt@daufeldt.com'),
    ('Gayla', 'Schnitzler', 'gschnitzler@gmail.com'),
    ('Erick', 'Nievas', 'erick_nievas@aol.com'),
    ('Jennie', 'Drymon', 'jennie@cox.net'),
    ('Mitsue', 'Scipione', 'mscipione@scipione.com'),
    ('Ciara', 'Ventura', 'cventura@yahoo.com'),
    ('Galen', 'Cantres', 'galen@yahoo.com'),
    ('Truman', 'Feichtner', 'tfeichtner@yahoo.com'),
    ('Gail', 'Kitty', 'gail@kitty.com'),
    ('Dalene', 'Schoeneck', 'dalene@schoeneck.org'),
    ('Gertude', 'Witten', 'gertude.witten@gmail.com'),
    ('Lizbeth', 'Kohl', 'lizbeth@yahoo.com'),
    ('Glenn', 'Berray', 'gberray@gmail.com'),
    ('Lashandra', 'Klang', 'lashandra@yahoo.com'),
    ('Lenna', 'Newville', 'lnewville@newville.com'),
    ('Laurel', 'Pagliuca', 'laurel@yahoo.com'),
    ('Mireya', 'Frerking', 'mireya.frerking@hotmail.com'),
    ('Annelle', 'Tagala', 'annelle@yahoo.com'),
    ('Dean', 'Ketelsen', 'dean_ketelsen@gmail.com'),
    ('Levi', 'Munis', 'levi.munis@gmail.com'),
    ('Sylvie', 'Ryser', 'sylvie@aol.com'),
    ('Sharee', 'Maile', 'sharee_maile@aol.com'),
    ('Cordelia', 'Storment', 'cordelia_storment@aol.com'),
    ('Mollie', 'Mcdoniel', 'mollie_mcdoniel@yahoo.com'),
    ('Brett', 'Mccullan', 'brett.mccullan@mccullan.com'),
    ('Teddy', 'Pedrozo', 'teddy_pedrozo@aol.com'),
    ('Tasia', 'Andreason', 'tasia_andreason@yahoo.com'),
    ('Hubert', 'Walthall', 'hubert@walthall.org'),
    ('Arthur', 'Farrow', 'arthur.farrow@yahoo.com'),
    ('Vilma', 'Berlanga', 'vberlanga@berlanga.com'),
    ('Billye', 'Miro', 'billye_miro@cox.net'),
    ('Glenna', 'Slayton', 'glenna_slayton@cox.net'),
    ('Mitzie', 'Hudnall', 'mitzie_hudnall@yahoo.com'),
    ('Bernardine', 'Rodefer', 'bernardine_rodefer@yahoo.com'),
    ('Staci', 'Schmaltz', 'staci_schmaltz@aol.com'),
    ('Nichelle', 'Meteer', 'nichelle_meteer@meteer.com'),
    ('Janine', 'Rhoden', 'jrhoden@yahoo.com'),
    ('Ettie', 'Hoopengardner', 'ettie.hoopengardner@hotmail.com'),
    ('Eden', 'Jayson', 'eden_jayson@yahoo.com'),
    ('Lynelle', 'Auber', 'lynelle_auber@gmail.com'),
    ('Merissa', 'Tomblin', 'merissa.tomblin@gmail.com'),
    ('Golda', 'Kaniecki', 'golda_kaniecki@yahoo.com'),
    ('Catarina', 'Gleich', 'catarina_gleich@hotmail.com'),
    ('Virgie', 'Kiel', 'vkiel@hotmail.com'),
    ('Jolene', 'Ostolaza', 'jolene@yahoo.com'),
    ('Keneth', 'Borgman', 'keneth@yahoo.com'),
    ('Rikki', 'Nayar', 'rikki@nayar.com'),
    ('Elke', 'Sengbusch', 'elke_sengbusch@yahoo.com'),
    ('Hoa', 'Sarao', 'hoa@sarao.org'),
    ('Trinidad', 'Mcrae', 'trinidad_mcrae@yahoo.com'),
    ('Mari', 'Lueckenbach', 'mari_lueckenbach@yahoo.com'),
    ('Selma', 'Husser', 'selma.husser@cox.net'),
    ('Antione', 'Onofrio', 'aonofrio@onofrio.com'),
    ('Luisa', 'Jurney', 'ljurney@hotmail.com'),
    ('Clorinda', 'Heimann', 'clorinda.heimann@hotmail.com'),
    ('Dick', 'Wenzinger', 'dick@yahoo.com'),
    ('Ahmed', 'Angalich', 'ahmed.angalich@angalich.com'),
    ('Iluminada', 'Ohms', 'iluminada.ohms@yahoo.com'),
    ('Joanna', 'Leinenbach', 'joanna_leinenbach@hotmail.com'),
    ('Caprice', 'Suell', 'caprice@aol.com'),
    ('Stephane', 'Myricks', 'stephane_myricks@cox.net'),
    ('Quentin', 'Swayze', 'quentin_swayze@yahoo.com'),
    ('Annmarie', 'Castros', 'annmarie_castros@gmail.com'),
    ('Shonda', 'Greenbush', 'shonda_greenbush@cox.net'),
    ('Cecil', 'Lapage', 'clapage@lapage.com'),
    ('Jeanice', 'Claucherty', 'jeanice.claucherty@yahoo.com'),
    ('Josphine', 'Villanueva', 'josphine_villanueva@villanueva.com'),
    ('Daniel', 'Perruzza', 'dperruzza@perruzza.com'),
    ('Cassi', 'Wildfong', 'cassi.wildfong@aol.com'),
    ('Britt', 'Galam', 'britt@galam.org'),
    ('Adell', 'Lipkin', 'adell.lipkin@lipkin.com'),
    ('Jacqueline', 'Rowling', 'jacqueline.rowling@yahoo.com'),
    ('Lonny', 'Weglarz', 'lonny_weglarz@gmail.com'),
    ('Lonna', 'Diestel', 'lonna_diestel@gmail.com'),
    ('Cristal', 'Samara', 'cristal@cox.net'),
    ('Kenneth', 'Grenet', 'kenneth.grenet@grenet.org'),
    ('Elli', 'Mclaird', 'emclaird@mclaird.com'),
    ('Alline', 'Jeanty', 'ajeanty@gmail.com'),
    ('Sharika', 'Eanes', 'sharika.eanes@aol.com'),
    ('Nu', 'Mcnease', 'nu@gmail.com'),
    ('Daniela', 'Comnick', 'dcomnick@cox.net'),
    ('Cecilia', 'Colaizzo', 'cecilia_colaizzo@colaizzo.com'),
    ('Leslie', 'Threets', 'leslie@cox.net'),
    ('Nan', 'Koppinger', 'nan@koppinger.com'),
    ('Izetta', 'Dewar', 'idewar@dewar.com'),
    ('Tegan', 'Arceo', 'tegan.arceo@arceo.org'),
    ('Ruthann', 'Keener', 'ruthann@hotmail.com'),
    ('Joni', 'Breland', 'joni_breland@cox.net'),
    ('Vi', 'Rentfro', 'vrentfro@cox.net'),
    ('Colette', 'Kardas', 'colette.kardas@yahoo.com'),
    ('Malcolm', 'Tromblay', 'malcolm_tromblay@cox.net'),
    ('Ryan', 'Harnos', 'ryan@cox.net'),
    ('Jess', 'Chaffins', 'jess.chaffins@chaffins.org'),
    ('Sharen', 'Bourbon', 'sbourbon@yahoo.com'),
    ('Nickolas', 'Juvera', 'nickolas_juvera@cox.net'),
    ('Gary', 'Nunlee', 'gary_nunlee@nunlee.org'),
    ('Diane', 'Devreese', 'diane@cox.net'),
    ('Roslyn', 'Chavous', 'roslyn.chavous@chavous.org'),
    ('Glory', 'Schieler', 'glory@yahoo.com'),
    ('Rasheeda', 'Sayaphon', 'rasheeda@aol.com'),
    ('Alpha', 'Palaia', 'alpha@yahoo.com'),
    ('Refugia', 'Jacobos', 'refugia.jacobos@jacobos.com'),
    ('Shawnda', 'Yori', 'shawnda.yori@yahoo.com'),
    ('Mona', 'Delasancha', 'mdelasancha@hotmail.com'),
    ('Gilma', 'Liukko', 'gilma_liukko@gmail.com'),
    ('Janey', 'Gabisi', 'jgabisi@hotmail.com'),
    ('Lili', 'Paskin', 'lili.paskin@cox.net'),
    ('Loren', 'Asar', 'loren.asar@aol.com'),
    ('Dorothy', 'Chesterfield', 'dorothy@cox.net'),
    ('Gail', 'Similton', 'gail_similton@similton.com'),
    ('Catalina', 'Tillotson', 'catalina@hotmail.com'),
    ('Lawrence', 'Lorens', 'lawrence.lorens@hotmail.com'),
    ('Carlee', 'Boulter', 'carlee.boulter@hotmail.com'),
    ('Thaddeus', 'Ankeny', 'tankeny@ankeny.org'),
    ('Jovita', 'Oles', 'joles@gmail.com'),
    ('Alesia', 'Hixenbaugh', 'alesia_hixenbaugh@hixenbaugh.org'),
    ('Lai', 'Harabedian', 'lai@gmail.com'),
    ('Brittni', 'Gillaspie', 'bgillaspie@gillaspie.com'),
    ('Raylene', 'Kampa', 'rkampa@kampa.org'),
    ('Flo', 'Bookamer', 'flo.bookamer@cox.net'),
    ('Jani', 'Biddy', 'jbiddy@yahoo.com'),
    ('Chauncey', 'Motley', 'chauncey_motley@aol.com')
) AS result("first_name","last_name","email");


CREATE OR REPLACE VIEW random_fake_contacts AS
SELECT first_name, last_name, email, phone_number, row_number() over() as rnum
FROM fake_contacts;


CREATE OR REPLACE FUNCTION setof_fake_contacts(num int4) RETURNS SETOF random_fake_contacts AS $$
  SELECT first_name, last_name, replace(email, '@', round(extract('epoch' from now()) - 1722705653) || '_' || rnum || '@') as email, phone_number, rnum
  FROM (
    SELECT fc.*, row_number() over() as rnum
    FROM (
      SELECT first_name, last_name, email, phone_number
      FROM random_fake_contacts
    ) fc,
    generate_series(1, ceil(num::float/500)::int4) 
    ORDER BY random()
    LIMIT num
  ) t
$$ LANGUAGE SQL; 

CREATE TABLE user_types (
  id TEXT PRIMARY KEY, 
  description TEXT
);  

INSERT INTO user_types (id, description) 
VALUES ('customer', 'Places orders for delivery'), 
  ('restaurant_manager', 'Represents a restaurant and manages menu items and orders'),
  ('support', 'Provides customer support for the food delivery service'),
  ('rider', 'Delivers orders for the food delivery service');

CREATE TABLE addresses (
  id  BIGSERIAL PRIMARY KEY,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(255) NOT NULL,
  geog GEOGRAPHY
);

CREATE INDEX idx_addresses ON addresses USING gist (geog);


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL ,
  password VARCHAR(100) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  type TEXT NOT NULL REFERENCES user_types, 
  location GEOGRAPHY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

create index idx_users_email on users (email);
create index idx_users_id_email on users (id, email);
create index idx_users_id_type on users (id, type);
create index idx_users_type on users (type);

CREATE TABLE user_addresses (
  user_id INTEGER NOT NULL REFERENCES users,
  address_id BIGINT NOT NULL REFERENCES addresses,
  UNIQUE(user_id, address_id)
);
 
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(100) NOT NULL,
  logo BYTEA,
  address_id BIGINT NOT NULL REFERENCES addresses,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurants_address_id ON restaurants ( address_id );
CREATE INDEX idx_restaurants_id_address_id ON restaurants ( id, address_id );

CREATE TABLE restaurant_managers (
  restaurant_id INTEGER REFERENCES restaurants(id),
  manager_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(8,2) NOT NULL,
  description TEXT NOT NULL,
  photo BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_status_types (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

INSERT INTO delivery_status_types(id, description)
VALUES 
  ('started', 'A rider picked up the order'),
  ('arriving', 'The rider is 2 minutes away from destination'),
  ('delivered', 'The order has been delivered');

CREATE TABLE order_status_types (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

INSERT INTO order_status_types(id, description)
VALUES 
  ('pending', 'Waiting for restaurant approval'),
  ('preparing', 'The restaurant is preparing the order'),
  ('prepared', 'The restaurant has finished preparing the order and is waiting for the deliverer to pick it up'),
  ('picked_up', 'The order has been picked by the deliverer'),
  ('delivered', 'The order has been delivered');

 
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  customer_address_id INTEGER NOT NULL,
    FOREIGN KEY (customer_id, customer_address_id)  
    REFERENCES user_addresses(user_id, address_id),
  deliverer_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' REFERENCES order_status_types,
  delivery_fee NUMERIC(8,2) NOT NULL,
  service_fee NUMERIC(8,2) NOT NULL,
  total_price NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON orders (restaurant_id);
CREATE INDEX ON orders (customer_id);
CREATE INDEX ON orders (deliverer_id);
CREATE INDEX ON orders (created_at);
CREATE INDEX ON orders (status, created_at);
CREATE INDEX ON orders (customer_id, created_at);
CREATE INDEX ON orders (deliverer_id, created_at);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_updates (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders,
  change JSONB NOT NULL,
  changed_by INTEGER REFERENCES users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_status_changes (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders,
  delivery_status TEXT NOT NULL REFERENCES delivery_status_types,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CREATE FUNCTION on_order_updates()
--   RETURNS TRIGGER AS $func$ 
-- BEGIN
--   INSERT INTO order_updates (order_id, change, changed_by, created_at)
--   SELECT new.id, 
--     json_object_agg(pre.key, post.value) as change,
--     old.customer_id,
--     now()
--   FROM jsonb_each(to_jsonb(OLD)) AS pre
--   CROSS JOIN jsonb_each(to_jsonb(NEW)) AS post
--   WHERE pre.key = post.key 
--     AND pre.value IS DISTINCT FROM post.value;
--   -- VALUES(new.id)
--   RETURN NULL;
-- END;
-- $func$ LANGUAGE plpgsql;

-- CREATE TRIGGER order_updates 
-- AFTER UPDATE
-- ON orders
-- REFERENCING NEW TABLE AS new OLD TABLE AS old
-- FOR EACH ROW 
-- EXECUTE PROCEDURE on_order_updates();
 
-- DROP TABLE IF EXISTS temp_json;
-- CREATE TABLE temp_json (values text);
/** 
  // Roads
  const body = `[out:json];(way(51.31087184032102,-0.33782958984375,51.723200166800346,0.053558349609375)[highway=motorway];); out;`;
  await (await fetch(`http://overpass-api.de/api/interpreter`, { method: "POST", body })).json();

  https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
  Use 'out count;' to get count 

  To get full data
  curl -d "[out:json];(node(51.31087184032102,-0.33782958984375,51.723200166800346,0.053558349609375)[amenity=pub];); out;"  -X POST http://overpass-api.de/api/interpreter
  
  to get csv:
  curl -d "[out:csv(::id, ::type, ::lat, ::lon, name)];(node(51.31087184032102,-0.33782958984375,51.723200166800346,0.053558349609375)[amenity=pub];); out;"  -X POST http://overpass-api.de/api/interpreter
*/

DROP TABLE IF EXISTS "london_restaurants.geojson";
CREATE TABLE IF NOT EXISTS "london_restaurants.geojson" (
  id BIGINT PRIMARY KEY,
  type TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lon NUMERIC NOT NULL,
  /* calculated */
  name TEXT,
  postcode TEXT,
  amenity TEXT,
  website TEXT,
  geometry GEOMETRY
);

CREATE INDEX IF NOT EXISTS idx_london 
ON "london_restaurants.geojson" USING gist (geometry);

/* 
  To include tag values in the CSV must ensure add "out meta" or "out body"
  https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#CSV_output_mode 
*/
COPY "london_restaurants.geojson" (id, "type", lat, lon, name, postcode, amenity, website) FROM PROGRAM $$
  curl -d "[out:csv(::id, ::type, ::lat, ::lon, name, \"addr:postcode\", amenity, website; false)];(node(51.31087184032102,-0.33782958984375,51.723200166800346,0.053558349609375)[amenity~\"pub|restaurant|bar|cafe|fast_food\"][name];); out meta;"  -X POST http://overpass-api.de/api/interpreter
$$;

UPDATE "london_restaurants.geojson"
SET geometry = st_point(lon, lat, 4326);


CREATE TABLE IF NOT EXISTS "roads.geojson" (
  id BIGINT PRIMARY KEY,
  geog GEOGRAPHY,
  deliverer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  geometry JSONB
);

/* Create ~14k restaurants in London */
WITH raddr as (
  SELECT name, st_centroid(geometry)::GEOGRAPHY AS geog, 'restaurant' as type, postcode
  FROM "london_restaurants.geojson"
  WHERE name IS NOT NULL
  -- AND postcode IS NOT NULL
),  
iaddr as (
  INSERT INTO addresses (street, city, country, state, postal_code, geog)
  SELECT name, 'London', 'UK', 'England', postcode, geog
  FROM raddr
  RETURNING *
), 
ires AS (
  INSERT INTO restaurants (name, address, address_id)
  SELECT r.name, 'London', a.id
  FROM iaddr a
  INNER JOIN raddr r 
    ON a.geog::TEXT = r.geog::TEXT
  RETURNING *, id as restaurant_id
),
new_users AS (
  SELECT fk.*, 'pwd' as pwd, 'restaurant_manager' as type
  FROM (
    SELECT *, row_number() OVER() as rnum
    FROM ires
  ) r
  INNER JOIN setof_fake_contacts((SELECT COUNT(*) FROM ires)::int4) fk
    ON fk.rnum = r.rnum
),
uins AS (
  INSERT INTO users (email, password, first_name, last_name, phone_number, type, created_at)
  SELECT email, pwd, first_name, last_name, phone_number, type,  now() - (random() * "interval"('1 year'))
  FROM new_users
  RETURNING *
)
SELECT *
FROM uins;


CREATE OR REPLACE PROCEDURE mock_users(number_of_users INTEGER DEFAULT 1e3, period INTERVAL DEFAULT '1 day')
LANGUAGE plpgsql
AS $$  
  DECLARE 
    number_of_riders INTEGER;
BEGIN

  WITH uadd as (
    INSERT INTO addresses (street, city, state, postal_code, country, geog)
    SELECT 'West street', 'London', 'UK', 'England', postal_code,
      (
        st_dump( 
          st_generatepoints(
            st_buffer(geog::GEOMETRY, 0.05, 'quad_segs=8'), 
            100
          )
        )
      ).geom::GEOGRAPHY
    FROM addresses a
    WHERE EXISTS (
      SELECT * 
      FROM restaurants r
      WHERE r.address_id = a.id
    )
    ORDER BY random()
    LIMIT number_of_users
    RETURNING *
  ), 
  new_users AS (
    SELECT fk.*, 'pwd' as pwd, 'customer' as type, 
      geog, id as address_id
    FROM (
      SELECT *, row_number() OVER() as rnum
      FROM uadd
    ) u
    INNER JOIN setof_fake_contacts(number_of_users) fk
      ON fk.rnum = u.rnum
  ),
  uins AS (
    INSERT INTO users (email, password, first_name, last_name, phone_number, type, created_at)
    SELECT email, pwd, first_name, last_name, phone_number, type,  now() - (random() * period)
    FROM new_users
    RETURNING *
  )
  -- , 
  -- uains AS (
    INSERT INTO user_addresses (user_id, address_id)
    SELECT u.id, nu.address_id 
    FROM uins u 
    INNER JOIN new_users nu
      ON u.email = nu.email
  --   RETURNING *
  -- )
  -- SELECT * FROM uains
  ;

  number_of_riders := GREATEST(CEIL(number_of_users / 5), 1);

  /* Create 20% riders */
  INSERT INTO users (email, password, first_name, last_name, phone_number, type, created_at)
  SELECT email, 'pwd', first_name, last_name, phone_number, 'rider', now() - (random() * period)
  FROM setof_fake_contacts(number_of_riders)
  LIMIT number_of_riders;
END $$;

CALL mock_users(1e5::integer, '1 year');

CREATE OR REPLACE VIEW v_users AS
WITH order_stats AS (
  SELECT customer_id, max(created_at) as last_order, count(*) as total_orders
  FROM orders
  GROUP BY 1 -- customer_id, deliverer_id
)
  SELECT u.*, geog, a.id as address_id
    , oc.*
  FROM users u
  LEFT JOIN user_addresses ua
    ON u.id = ua.user_id
  LEFT JOIN addresses a
    ON a.id = ua.address_id
  LEFT JOIN order_stats oc
    ON oc.customer_id = u.id
  WHERE u.type = 'customer';

CREATE OR REPLACE VIEW v_riders AS
WITH order_stats AS (
  SELECT deliverer_id, max(created_at) as last_order, count(*) as total_orders
  FROM orders
  GROUP BY 1 
)
  SELECT u.*  
    , o_r.last_order as last_delivery
    , o_r.total_orders as total_delivered
  FROM users u
  LEFT JOIN order_stats o_r
    ON o_r.deliverer_id = u.id
  WHERE u.type = 'rider';

CREATE OR REPLACE  VIEW v_restaurants AS
  SELECT r.*, geog 
  FROM restaurants r
  INNER JOIN addresses a
    ON r.address_id = a.id;


/* Create 50 menu items per restaurant */
INSERT INTO menu_items ( restaurant_id, name, category, description, price )
SELECT restaurant_id,  name, category, description, replace(price, 'USD', '')::numeric
FROM (
  SELECT 
    r.id as restaurant_id,   
    row_number() OVER( partition by r.id order by random() ) as rnum, mi.*
  FROM restaurants r
  CROSS JOIN (
    SELECT *--, row_number() OVER( order by random()) as rnum
    FROM _menu_items
    order by random()
    LIMIT 100
  ) mi
) t
WHERE rnum < 50; --number of menu items per restaurant



CREATE OR REPLACE PROCEDURE mock_orders(number_of_orders INTEGER DEFAULT 1e4, period INTERVAL DEFAULT '1 second')
LANGUAGE plpgsql
AS $$  
BEGIN
 
  INSERT INTO orders (
    customer_id, 
    customer_address_id, 
    restaurant_id, 
    deliverer_id, 
    status, 
    delivery_fee, 
    service_fee, 
    total_price, 
    created_at
  )
  SELECT 
    u.id as customer_id, 
    u.address_id as customer_address_id, 
    r.id as restaurant_id, 
    rider.id as deliverer_id,  
    CASE WHEN random() < 0.5 THEN 'preparing' ELSE 'picked_up' END as order_status,
    round(r.dist/1000) as delivery_fee, 
    1 as service_fee, 
    round(random() * 100) as total_price, 
    now() - (random() * period) as created_at
  FROM (
    SELECT *, row_number() over() as rnum
    FROM (
      SELECT *
      FROM v_users
      ORDER BY last_order
      LIMIT number_of_orders
    ) unested
  ) u
  INNER JOIN ( 
    SELECT *, row_number() over(ORDER BY random()) as rnum
    FROM v_riders, 
      generate_series(
        1, 
        greatest(ceil(number_of_orders/(select count(*) from v_riders)), 1)::BIGINT
      )
    LIMIT number_of_orders
  ) rider
  ON rider.rnum = u.rnum
  LEFT JOIN LATERAL (
    SELECT *
      , st_distance(u.geog, ri.geog) as dist
    FROM v_restaurants ri
    WHERE st_distance(u.geog, ri.geog) < 7000
    ORDER BY u.geog <-> ri.geog
    LIMIT 1
  ) r ON TRUE; 
 

  /* Create 5 items per order  */
  INSERT INTO order_items (order_id, menu_item_id, quantity, price, created_at)
  SELECT id, item_id, 1, price, now() - (random() * period)
  FROM (
    SELECT  o.id, o.restaurant_id, mi.id as item_id, mi.price, row_number() over(PARTITION BY o.id ) as urnum
    FROM orders o
    INNER JOIN (
      SELECT id, restaurant_id, price
      FROM menu_items
      ORDER BY random()
    ) mi
    ON mi.restaurant_id = o.restaurant_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM order_items
      WHERE o.id = order_id
    )
  ) tt
  WHERE urnum < 6;

  /* Prepared */
  UPDATE orders
  SET status = 'prepared'
  WHERE status = 'preparing'
  AND age(now(), created_at) > '15 minutes'::INTERVAL;

  /* Picked up  */
  UPDATE orders
  SET status = 'picked_up'
  WHERE status = 'prepared'
  AND deliverer_id IS NOT NULL
  AND age(now(), created_at) > '2 minutes'::INTERVAL;

  /* Delivered  */
  UPDATE orders
  SET status = 'delivered'
  WHERE status = 'picked_up'
  AND age(now(), created_at) > '10 minutes'::INTERVAL;

END $$;

CALL mock_orders(1e5::INTEGER, '1 year'::INTERVAL);
CALL mock_orders(35e3::INTEGER, '1 hour'::INTERVAL);





CREATE OR REPLACE PROCEDURE mock_locations()
LANGUAGE plpgsql
AS $$ 
  DECLARE
    end_time timestamptz := now() + '60 seconds'::INTERVAL;
    progress NUMERIC := 0.1;
BEGIN

  WITH 
    ordrs  AS (
      SELECT o.id,
        o.deliverer_id, 
        a.geog as user_geog
      FROM orders o
      INNER JOIN user_addresses ua
        ON ua.user_id = o.customer_id 
        AND ua.address_id = o.customer_address_id  
      INNER JOIN addresses a
        ON a.id = ua.address_id
      WHERE o.status = 'picked_up'
    ), 
    locations AS (
      SELECT DISTINCT ON (o.id)
        o.id as order_id, 
        o.deliverer_id, 
        r.id as road_id, 
        r.geog <-> o.user_geog 
      FROM ordrs o
      JOIN LATERAL (
        SELECT *
        FROM "roads.geojson" r
        -- WHERE properties::TEXT not ilike '%footway%'
        -- AND st_isempty(geog::GEOMETRY) = false 
        -- AND st_length(geog) > 100
        ORDER BY r.geog <-> o.user_geog
        LIMIT 1
      ) as r
      ON TRUE
      ORDER BY o.id, 
        o.deliverer_id, 
        r.id, 
        r.geog <-> o.user_geog
    )
  UPDATE "roads.geojson" r
  SET deliverer_id = l.deliverer_id
  FROM locations l
  WHERE r.id = l.road_id;

  WHILE now() < end_time AND progress < 1 LOOP

    UPDATE users u
    SET location = st_lineinterpolatepoint(r.geog, progress - (random() * 0.1), true)
    FROM "roads.geojson" r
    WHERE u.id = r.deliverer_id;
    
    COMMIT;

    progress := progress + random() * 0.1;
    PERFORM pg_sleep(random() * 1);  
  END LOOP;
END $$; 