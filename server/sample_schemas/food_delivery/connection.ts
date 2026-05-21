const table_options = {
  users: {
    icon: "Account",
  },
  orders: {
    icon: "FormatListBulletedSquare",
  },
  ratings: {
    icon: "StarCheckOutline",
  },
  addresses: {
    icon: "MapMarker",
  },
  menu_items: {
    icon: "Food",
  },
  order_items: {
    icon: "ClipboardListOutline",
  },
  restaurants: {
    icon: "SilverwareForkKnife",
  },
  user_addresses: {
    icon: "MapMarkerAccount",
  },
  order_status_types: {
    icon: "TimerMarkerOutline",
  },
  restaurant_managers: {
    icon: "AccountStar",
  },
  customers: {
    icon: "AccountCashOutline",
  },
} satisfies typeof import("../../../common/DBGeneratedSchema");

export default {
  table_options,
};
