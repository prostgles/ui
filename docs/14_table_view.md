<h3 id="table_view"> Table view </h3> 

The table view displays data from a database table or view, allowing users to interact with the data, including sorting, filtering, and editing.
It supports computed columns, linked fields, and various actions for managing the data.
<picture>
<source srcset="/screenshots/dark/table.svg" media="(prefers-color-scheme: dark)">
<img src="/screenshots/table.svg" alt="Table view screenshot" />
</picture>

  - **View header**: Contains menu button, title and window minimise/fullscreen controls.  
    - **Quick actions**: Quick actions for the view, providing easy access to charting and joins.  
      - **Toggle filter bar**: Shows or hides the filter bar, allowing users to filter the data displayed in the table.  
      - **Add cross-filtered table**: Adds a new table view that is cross-filtered by the current table. This allows you to explore related data in a new table view.  
      - **Add timechart**: Adds a timechart visualization based on the current table. Visible only when the current table (or any linked table) has a timestamp/date column.  
      - **Add map**: Adds a map visualization based on the current data. Visible only when the current table (or any linked table) has a geometry/geography column (postgis extension must be enabled).  
    - **View title. Drag to re-arrange layout**: The name of the table/view together with the number of records matching the current filters.   
    - **Collapse the view**: Collapses the view, minimizing it to temporarily save space on the dashboard.   
    - **Fullscreen**: Expands the view to fill the entire screen.  
    - **Close view**: Closes the view.  
    - <a href="#table_menu">Table menu</a>: Opens the table menu, allowing users to manage the table view.  
  - <a href="#table_toolbar">Table Toolbar</a>: Filtering and data add/edit interface for database tables and views.  
  - **Table**: The main table view displaying the data from the database. It allows users to interact with the data, including sorting, filtering, and editing.  
    - **Table header**: The header of the table, which contains the column names and allows users to sort the data by clicking on the column headers.  
      - **Add column menu**: Opens the column menu, allowing users to add computed columns, create new columns, add linked fields.  
      - **Column header**: Pressing the header will toggle sorting state (if the column is sortable). Right clicking (or long press on mobile) will open column menu. Dragging the header will allow reordering the columns.  
      - **Drag handle**: Allows users to resize the column width by dragging the handle.  
      - **Edit row**: Opens the row edit menu, allowing users to view/edit/delete the selected row.  
      - **Insert row**: Opens the row insert menu, allowing users to add new rows to the table.  
  - **Pagination Controls**: Navigation controls for paginated data.  
    - **First Page**: Navigate to the first page of results.  
    - **Previous Page**: Navigate to the previous page of results.  
    - **Page Number**: Current page number. You can type a specific page number to jump directly to that page.  
    - **Next Page**: Navigate to the next page of results.  
    - **Last Page**: Navigate to the last page of results.  
    - **Page Size**: Select how many rows to display per page. Changing this may adjust the current page if it would exceed the total number of pages.  
    - **Page Count Information**: Displays the total number of pages and rows in the current dataset.  

<h4 id="table_menu"> Table menu </h4> 

The table menu provides options for managing the table view, including viewing table info, editing columns, and managing data refresh rates.

  - **Table info**: Postgres specific table/view details.  
    - **Table name**: Displays the name of the table with option to rename it.  
      - **Edit name**: Opens SQL editor to rename the table.  
    - **Comment**: Displays and allows editing of the table comment.  
      - **Edit comment**: Opens SQL editor to modify the table comment.  
    - **OID**: Displays the object identifier of the table in the database.  
    - **Type**: Shows whether this is a table or view.  
    - **Owner**: Displays the database user who owns this table/view.  
    - **Size information**: Provides details about the table's size and row count.  
      - **Actual Size**: The physical size of the table data on disk.  
      - **Index Size**: The size of all indexes associated with this table.  
      - **Total Size**: The combined size of table data and indexes.  
      - **Row count**: The total number of rows in the table.  
    - **View definition**: Shows the SQL definition for views. Only visible for views, not tables.  
    - **Vacuum**: Performs garbage collection and optionally analyzes the database. Only available for tables.  
    - **Vacuum Full**: Performs a more thorough vacuum that can reclaim more space but takes longer and locks the table. Only available for tables.  
    - **Drop**: Deletes the table or view from the database after confirmation.  
  - **Columns**: Allows editing, reordering and toggling table columns.  
    - **Columns list**: Allows editing, reordering and toggling table columns.  
      - **Alter column**: Opens a popup to edit the column properties.  
      - **Edit linked field**: Opens a popup to edit the linked field properties.  
      - **Remove computed column**: Removes a computed column from the table. Only visible for computed columns.  
  - **Data refresh**: Allows setting subscriptions or data refresh rates. By default every table subscribes to data changes.  
  - **Triggers**: Allows managing triggers.   
  - **Constraints**: Allows managing constraints.  
  - **Indexes**: Allows managing indexes.  
  - **Policies**: Allows managing policies.  
  - **Access rules**: Allows managing prostgles access rules.  
  - **Current query**: Allows viewing the SQL and data/layout info for the current table view.  
  - **Display options**: Layout preferences.  

<h4 id="table_toolbar"> Table Toolbar </h4> 

Table toolbar can be toggled through the show/hide filtering button (top left corner). 
It provides a user-friendly interface to add filters, search for data, and perform various actions on the table data.

<picture>
<source srcset="/screenshots/dark/smart_filter_bar.svg" media="(prefers-color-scheme: dark)">
<img src="/screenshots/smart_filter_bar.svg" alt="Smart Filter Bar screenshot" />
</picture>

  - **Add Filter**: Allows adding a filter by chosing a column from the current table or from linked tables.  
    - **Include Linked Columns**: Toggle to include columns from linked tables in the column list.  
    - **Join To**: Toggles join view to specify which tables a join path to a specific table from which to select a column to filter by.  
    - **Filterable Columns**: List of columns available for filtering. Click to add a filter.  
  - **Search Bar**: Quick search functionality across the table data.  
    - **Search Input**: Type to search across all searchable fields in the table. The search is a simple contains search. Selecting a result will add a filter to the table.  
    - **Match Case**: Toggle to match the case of the search term with the data.  
  - **Table actions**: Additional table data actions.  
    - **Show additional actions**: Opens a menu with additional actions for the table data.  
    - **Delete action**: Opens a menu to delete the selected rows from the table.  
    - **Update action**: Opens a menu to update the selected rows in the table.  
    - **Insert row**: Opens the row insert menu, allowing users to add new rows to the table.  
  - **Filters**: Filters applied to the data  
  - **Having Filters**: Filters applied after aggregation (HAVING clause in SQL).  

