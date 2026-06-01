const table_options = {
  users: {
    card: {
      headerColumn: "email",
    },
    icon: "AccountMultiple",
    label: "Users",
    columns: {
      id: {
        icon: "Identifier",
      },
      type: {
        icon: "AccountCog",
      },
      email: {
        icon: "Email",
        renderAs: {
          type: "Email",
        },
      },
      password: {
        icon: "Lock",
      },
      last_name: {
        icon: "AccountOutline",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      first_name: {
        icon: "Account",
      },
      phone_number: {
        icon: "Phone",
        renderAs: {
          type: "Tel",
        },
      },
      rider_location: {
        icon: "CrosshairsGps",
      },
    },
  },
  orders: {
    card: {
      headerColumn: "id",
    },
    icon: "ReceiptText",
    label: "Orders",
    columns: {
      id: {
        icon: "Identifier",
      },
      status: {
        icon: "ProgressClock",
        style: {
          type: "Conditional",
          conditions: [
            {
              operator: "=",
              chipColor: "#f59e0b",
              condition: "pending",
              textColor: "#78350f",
            },
            {
              operator: "=",
              chipColor: "#ef4444",
              condition: "cancelled",
              textColor: "#7f1d1d",
            },
            {
              operator: "=",
              chipColor: "#22c55e",
              condition: "completed",
              textColor: "#000000",
            },
          ],
        },
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      updated_at: {
        icon: "Update",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      customer_id: {
        icon: "Account",
      },
      service_fee: {
        icon: "CashPlus",
        renderAs: {
          type: "Currency",
          params: {
            mode: "Fixed",
            currencyCode: "GBP",
          },
        },
      },
      total_price: {
        icon: "Cash",
        style: {
          type: "Barchart",
          barColor: "#10b981",
          textColor: "#111827",
        },
        renderAs: {
          type: "Currency",
          params: {
            mode: "Fixed",
            currencyCode: "GBP",
          },
        },
      },
      deliverer_id: {
        icon: "Bike",
      },
      delivery_fee: {
        icon: "TruckDelivery",
        renderAs: {
          type: "Currency",
          params: {
            mode: "Fixed",
            currencyCode: "GBP",
          },
        },
      },
      restaurant_id: {
        icon: "Storefront",
      },
      customer_address_id: {
        icon: "HomeMapMarker",
      },
    },
  },
  routes: {
    card: {
      headerColumn: "id",
    },
    icon: "MapMarkerPath",
    label: "Routes",
    columns: {
      id: {
        icon: "Identifier",
      },
      geog: {
        icon: "MapMarkerDistance",
      },
      geometry: {
        icon: "VectorPolyline",
      },
      deliverer_id: {
        icon: "Bike",
      },
    },
  },
  ratings: {
    card: {
      headerColumn: "id",
    },
    icon: "StarBox",
    label: "Ratings",
    columns: {
      id: {
        icon: "Identifier",
      },
      rating: {
        icon: "Star",
        style: {
          type: "Conditional",
          conditions: [
            {
              operator: ">=",
              chipColor: "#16a34a",
              condition: 4,
              textColor: "#166534",
            },
            {
              operator: "<=",
              chipColor: "#ef4444",
              condition: 2,
              textColor: "#7f1d1d",
            },
          ],
        },
      },
      review: {
        icon: "MessageText",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      customer_id: {
        icon: "Account",
      },
      restaurant_id: {
        icon: "Storefront",
      },
    },
  },
  v_riders: {
    card: {
      headerColumn: "email",
    },
    icon: "BikeFast",
    label: "Riders",
    columns: {
      id: {
        icon: "Identifier",
      },
      type: {
        icon: "Bike",
      },
      email: {
        icon: "Email",
        renderAs: {
          type: "Email",
        },
      },
      password: {
        icon: "Lock",
      },
      last_name: {
        icon: "AccountOutline",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      first_name: {
        icon: "Account",
      },
      phone_number: {
        icon: "Phone",
        renderAs: {
          type: "Tel",
        },
      },
      last_delivery: {
        icon: "ClockOutline",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      rider_location: {
        icon: "CrosshairsGps",
      },
      total_delivered: {
        icon: "TruckDelivery",
        style: {
          type: "Barchart",
          barColor: "#8b5cf6",
          textColor: "#111827",
        },
      },
    },
  },
  addresses: {
    card: {
      headerColumn: "street",
    },
    icon: "MapMarker",
    label: "Addresses",
    columns: {
      city: {
        icon: "City",
      },
      geog: {
        icon: "MapMarkerRadius",
      },
      state: {
        icon: "Map",
      },
      street: {
        icon: "Road",
      },
      country: {
        icon: "Earth",
      },
      postal_code: {
        icon: "Mail",
      },
    },
  },
  customers: {
    card: {
      headerColumn: "email",
    },
    icon: "AccountGroup",
    label: "Customers",
    columns: {
      id: {
        icon: "Identifier",
      },
      geog: {
        icon: "MapMarkerRadius",
      },
      type: {
        icon: "Account",
      },
      email: {
        icon: "Email",
        renderAs: {
          type: "Email",
        },
      },
      password: {
        icon: "Lock",
      },
      last_name: {
        icon: "AccountOutline",
      },
      address_id: {
        icon: "HomeMapMarker",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      first_name: {
        icon: "Account",
      },
      last_order: {
        icon: "ClockOutline",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      customer_id: {
        icon: "Identifier",
      },
      phone_number: {
        icon: "Phone",
        renderAs: {
          type: "Tel",
        },
      },
      total_orders: {
        icon: "Basket",
        style: {
          type: "Barchart",
          barColor: "#3b82f6",
          textColor: "#111827",
        },
      },
      rider_location: {
        icon: "CrosshairsGps",
      },
    },
  },
  menu_items: {
    card: {
      headerColumn: "name",
    },
    icon: "Food",
    label: "Menu Items",
    columns: {
      id: {
        icon: "Identifier",
      },
      name: {
        icon: "FoodOutline",
      },
      photo: {
        icon: "Image",
      },
      price: {
        icon: "Cash",
        style: {
          type: "Barchart",
          barColor: "#10b981",
          textColor: "#111827",
        },
        renderAs: {
          type: "Currency",
          params: {
            mode: "Fixed",
            currencyCode: "GBP",
          },
        },
      },
      category: {
        icon: "Shape",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      description: {
        icon: "TextLong",
      },
      restaurant_id: {
        icon: "Storefront",
      },
    },
  },
  user_types: {
    card: {
      headerColumn: "id",
    },
    icon: "AccountCog",
    label: "User Types",
    columns: {
      id: {
        icon: "Tag",
      },
    },
  },
  _menu_items: {
    card: {
      headerColumn: "name",
    },
    icon: "Archive",
    label: "Legacy Menu Items",
    columns: {
      id: {
        icon: "Identifier",
      },
      name: {
        icon: "FoodOutline",
      },
      price: {
        icon: "Cash",
      },
      category: {
        icon: "Shape",
      },
      description: {
        icon: "TextLong",
      },
    },
  },
  order_items: {
    card: {
      headerColumn: "id",
    },
    icon: "CartVariant",
    label: "Order Items",
    columns: {
      id: {
        icon: "Identifier",
      },
      price: {
        icon: "Cash",
        renderAs: {
          type: "Currency",
          params: {
            mode: "Fixed",
            currencyCode: "GBP",
          },
        },
      },
      order_id: {
        icon: "Receipt",
      },
      quantity: {
        icon: "Counter",
        style: {
          type: "Barchart",
          barColor: "#3b82f6",
          textColor: "#111827",
        },
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      menu_item_id: {
        icon: "Food",
      },
    },
  },
  restaurants: {
    card: {
      headerColumn: "name",
    },
    icon: "Storefront",
    label: "Restaurants",
    columns: {
      id: {
        icon: "Identifier",
      },
      logo: {
        icon: "Image",
      },
      name: {
        icon: "SilverwareForkKnife",
      },
      type: {
        icon: "Shape",
      },
      address: {
        icon: "MapMarker",
      },
      website: {
        icon: "Web",
        renderAs: {
          type: "URL",
        },
      },
      address_id: {
        icon: "HomeMapMarker",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      is_popular: {
        icon: "Star",
        style: {
          type: "Conditional",
          conditions: [
            {
              operator: "=",
              chipColor: "#16a34a",
              condition: true,
              textColor: "#ffffff",
            },
            {
              operator: "=",
              chipColor: "#9ca3af",
              condition: false,
              textColor: "#ffffff",
            },
          ],
        },
      },
    },
  },
  order_updates: {
    card: {
      headerColumn: "id",
    },
    icon: "ClipboardTextClock",
    label: "Order Updates",
    columns: {
      id: {
        icon: "Identifier",
      },
      change: {
        icon: "CodeJson",
      },
      order_id: {
        icon: "Receipt",
      },
      changed_by: {
        icon: "AccountEdit",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
    },
  },
  v_restaurants: {
    card: {
      headerColumn: "name",
    },
    icon: "MapSearch",
    label: "Restaurant Locations",
    columns: {
      id: {
        icon: "Identifier",
      },
      geog: {
        icon: "MapMarkerRadius",
      },
      logo: {
        icon: "Image",
      },
      name: {
        icon: "SilverwareForkKnife",
      },
      type: {
        icon: "Shape",
      },
      address: {
        icon: "MapMarker",
      },
      website: {
        icon: "Web",
        renderAs: {
          type: "URL",
        },
      },
      address_id: {
        icon: "HomeMapMarker",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      is_popular: {
        icon: "Star",
        style: {
          type: "Conditional",
          conditions: [
            {
              operator: "=",
              chipColor: "#16a34a",
              condition: true,
              textColor: "#ffffff",
            },
            {
              operator: "=",
              chipColor: "#9ca3af",
              condition: false,
              textColor: "#ffffff",
            },
          ],
        },
      },
    },
  },
  customers_info: {
    card: {
      headerColumn: "email",
    },
    icon: "AccountMultiplePlus",
    label: "Imported Customers",
    columns: {
      email: {
        icon: "Email",
        renderAs: {
          type: "Email",
        },
      },
      last_name: {
        icon: "AccountOutline",
      },
      first_name: {
        icon: "Account",
      },
      phone_number: {
        icon: "Phone",
        renderAs: {
          type: "Tel",
        },
      },
    },
  },
  user_addresses: {
    card: {
      headerColumn: "address_id",
    },
    icon: "HomeAccount",
    label: "User Addresses",
    columns: {
      user_id: {
        icon: "Account",
      },
      address_id: {
        icon: "HomeMapMarker",
      },
    },
  },
  order_status_types: {
    card: {
      headerColumn: "id",
    },
    icon: "ProgressClock",
    label: "Order Status Types",
    columns: {
      id: {
        icon: "Tag",
      },
      description: {
        icon: "TextLong",
      },
    },
  },
  customers_info_view: {
    card: {
      headerColumn: "email",
    },
    icon: "ViewList",
    label: "Imported Customers View",
    columns: {
      rnum: {
        icon: "Numeric",
      },
      email: {
        icon: "Email",
        renderAs: {
          type: "Email",
        },
      },
      last_name: {
        icon: "AccountOutline",
      },
      first_name: {
        icon: "Account",
      },
      phone_number: {
        icon: "Phone",
        renderAs: {
          type: "Tel",
        },
      },
    },
  },
  restaurant_managers: {
    card: {
      headerColumn: "manager_id",
    },
    icon: "AccountTieHat",
    label: "Restaurant Managers",
    columns: {
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      manager_id: {
        icon: "AccountTie",
      },
      restaurant_id: {
        icon: "Storefront",
      },
    },
  },
  delivery_status_types: {
    card: {
      headerColumn: "id",
    },
    icon: "TruckDeliveryOutline",
    label: "Delivery Status Types",
    columns: {
      id: {
        icon: "Tag",
      },
      description: {
        icon: "TextLong",
      },
    },
  },
  delivery_status_changes: {
    card: {
      headerColumn: "id",
    },
    icon: "TimelineClock",
    label: "Delivery Status Changes",
    columns: {
      id: {
        icon: "Identifier",
      },
      order_id: {
        icon: "Receipt",
      },
      created_at: {
        icon: "Calendar",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      delivery_status: {
        icon: "TruckFast",
      },
    },
  },
  "london_restaurants.geojson": {
    card: {
      headerColumn: "name",
    },
    icon: "Map",
    label: "London Restaurants GeoJSON",
    columns: {
      id: {
        icon: "Identifier",
      },
      lat: {
        icon: "Latitude",
      },
      lon: {
        icon: "Longitude",
      },
      name: {
        icon: "SilverwareForkKnife",
      },
      type: {
        icon: "Shape",
      },
      amenity: {
        icon: "Store",
      },
      website: {
        icon: "Web",
        renderAs: {
          type: "URL",
        },
      },
      geometry: {
        icon: "VectorPolygon",
      },
      postcode: {
        icon: "Mail",
      },
    },
  },
  hygiene_ratings: {
    card: {
      headerColumn: "business_name",
    },
    icon: "ShieldCheck",
    label: "Restaurant Hygiene Ratings",
    columns: {
      id: {
        icon: "Identifier",
      },
      source: {
        icon: "Database",
      },
      fhrs_id: {
        icon: "CardAccountDetails",
      },
      postcode: {
        icon: "Mail",
      },
      fetched_at: {
        icon: "Download",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      rating_key: {
        icon: "Key",
      },
      updated_at: {
        icon: "Update",
        renderAs: {
          type: "Age",
          params: {
            variant: "short",
          },
        },
      },
      match_score: {
        icon: "Target",
        style: {
          type: "Scale",
          maxColor: "#16a34a",
          minColor: "#fee2e2",
          textColor: "#111827",
        },
      },
      rating_date: {
        icon: "Calendar",
      },
      raw_payload: {
        icon: "CodeJson",
      },
      scheme_type: {
        icon: "Sitemap",
      },
      matched_name: {
        icon: "Rename",
      },
      rating_value: {
        icon: "ShieldStar",
        style: {
          type: "Conditional",
          conditions: [
            {
              operator: "in",
              chipColor: "#16a34a",
              condition: ["5", "Pass", "Very Good"],
              textColor: "#166534",
            },
            {
              operator: "in",
              chipColor: "#dc2626",
              condition: ["0", "1", "Major Improvement Necessary"],
              textColor: "#7f1d1d",
            },
          ],
        },
      },
      business_name: {
        icon: "SilverwareForkKnife",
      },
      business_type: {
        icon: "Store",
      },
      restaurant_id: {
        icon: "Storefront",
      },
      address_line_1: {
        icon: "MapMarker",
      },
      address_line_2: {
        icon: "MapMarkerOutline",
      },
      address_line_3: {
        icon: "MapMarkerOutline",
      },
      address_line_4: {
        icon: "MapMarkerOutline",
      },
      matched_method: {
        icon: "SourceBranch",
      },
      scores_hygiene: {
        icon: "Bacteria",
        style: {
          type: "Scale",
          maxColor: "#166534",
          minColor: "#dcfce7",
          textColor: "#111827",
        },
      },
      matched_address: {
        icon: "Map",
      },
      business_type_id: {
        icon: "Numeric",
      },
      matched_postcode: {
        icon: "Mail",
      },
      scores_structural: {
        icon: "OfficeBuildingCog",
        style: {
          type: "Scale",
          maxColor: "#1d4ed8",
          minColor: "#dbeafe",
          textColor: "#111827",
        },
      },
      local_authority_code: {
        icon: "BadgeAccount",
      },
      local_authority_name: {
        icon: "Domain",
      },
      scores_confidence_in_management: {
        icon: "AccountTie",
        style: {
          type: "Scale",
          maxColor: "#d97706",
          minColor: "#fef3c7",
          textColor: "#111827",
        },
      },
    },
  },
} satisfies typeof import("../../../common/DBGeneratedSchema");

export default {
  table_options,
};
