<h1 id="table_view"> Table view </h1> 

The table view allows you to explore, filter, and edit your Postgres data with ease.
Instantly sort and search, build computed columns, pull in linked data through automatic joins, and create charts, maps, and cross-filtered views in a couple of clicks.
With smart forms for row editing, rich column controls, and deep schema-aware features, the table view turns your database into an interactive workspace for analysis, tooling, and rapid iteration.


## Features

- **Smart filtering**: Use the smart filter bar to quickly filter your data based on column types and values.
- **Computed columns**: Add calculations or transformations of existing data.
- **Automatic joins**: Show related data from linked tables with automatic joins and summarise if needed.
- **Charts and maps**: Timechart and map visualisations with multi-layer support.
- **Cross-filtered views**: Create additional table or chart views that are cross-filtered by the current table.
- **Smart forms**: Edit rows using smart forms that adapt to your schema and data types.
- **Conditional styling**: Style your columns based on row data.

<img src="./screenshots/table.svgif.svg" alt="Table view screenshot" style="border: 1px solid; margin: 1em 0;" />

## Components

  - **Header section**: Contains menu button, title and window minimise/fullscreen controls.  
    - **Quick actions**: Quick actions for the view, providing easy access to charting and joins.  
      - **Toggle filter bar**: Shows or hides the filter bar, allowing users to filter the data displayed in the table.  
      - **Add cross-filtered table**: Adds a new table view that is cross-filtered by the current table. This allows you to explore related data in a new table view.  
      - **Add timechart**: Adds a timechart visualization based on the current table. Visible only when the current table (or any linked table) has a timestamp/date column.  
      - **Add map**: Adds a map visualization based on the current data. Visible only when the current table (or any linked table) has a geometry/geography column (postgis extension must be enabled).  
    - **View title. Drag to re-arrange layout**: The name of the table/view together with the number of records matching the current filters.   
    - **Collapse the view**: Collapses the view, minimizing it to temporarily save space on the dashboard.   
    - **Fullscreen**: Expands the view to fill the entire screen.  
    - **Remove view**: Removes the view from the dashboard.  
    - <a href="#table_menu">Table menu</a>: Opens the table menu, allowing users to manage the table view.  
  - <a href="#table_toolbar">Table Toolbar</a>: Filtering and data add/edit interface for database tables and views.  
  - **Table**: The main table view displaying the data from the database. It allows users to interact with the data, including sorting, filtering, and editing.  
    - **Table header**: The header of the table, which contains the column names and allows users to sort the data by clicking on the column headers.  
      - **Add column menu**: Opens the add column menu, allowing users to add computed columns, create new columns, add linked fields.  
        - **Add Computed Field**: Opens a popup to create a computed column - calculations or transformations based on existing data using functions like aggregations, date formatting, string operations, etc.  
          - **Function selector**: Choose a function to apply to the selected column (e.g., aggregates (min/max/avg/count), date formatting, string operations).  
          - **Column selection**: List of applicable columns to apply functions to. Columns from foreign tables are also shown with the join path in the header.  
          - **Column name**: Name for the new computed column. Auto-generated based on the function and column.  
          - **Add to position**: Choose whether to add the computed column at the start or end of the column list.  
          - **Add computed column**: Confirms and adds the new computed column to the table based on the selected function and parameters.  
        - **Add Linked Data**: Opens a popup to display data from related tables via foreign key relationships. Disabled if no foreign keys exist or when using aggregates with nested columns.  
          - **Join path selector**: Select which related table to join to via foreign key relationships. Shows available join paths from the current table.  
          - **Column label**: Custom name/label for this linked column field in the table. Defaults to the related table name.  
          - **Linked column selection**: Choose which columns from the related table to display in this linked field.  
          - **Quick add computed column**: Add a single computed column from the linked table. E.g., count, sum, avg.  
          - **More options**: Additional configuration for linked columns including layout, join type, filters, and limits.  
            - **Layout mode**: Choose how to display the linked data: as rows, columns, or without headers.  
            - **Join type**: Select between inner join (discards parent rows without matches) or left join (keeps all parent rows).  
            - **Limit**: Maximum number of linked records to display (0-30). Optional.  
            - **Filters and sorting**: Apply filters and sorting to the linked table data.  
        - **Create New Column**: Opens a popup to create a new physical column in the database table. Disabled for views or users without SQL privileges.  
          - **Column editor**: Configure column properties including name, data type, constraints, default values, and foreign key references.  
          - **Foreign key reference**: Optionally set up a foreign key relationship to another table/column in the database.  
          - **Data type selection**: Appears after typing the column name. Choose the data type for the new column (e.g., integer, text, date, boolean, etc.).  
          - **Show create column SQL**: Generates and displays the SQL query that will be executed to create the new column in the database.  
            - **Generated SQL query**: The generated ALTER TABLE SQL query to create the new column based on the specified properties.  
            - **Execute create column**: Runs the generated ALTER TABLE query to create the new column in the database.  
        - **Create New File Column**: Opens a popup to create a new column for handling file uploads and attachments. Requires file storage to be enabled.  
          - **New column name**: Name for the new file column.  
          - **Optional**: Whether the file column should allow NULL values (optional) or require a file (NOT NULL).  
          - **File column configuration**: Configure accepted file types and other file handling options. Appears after entering the column name.  
            - **Maximum file size in megabytes**: Set the maximum allowed file size for uploads in megabytes. Default is 1 MB. 0 means no limit.  
            - **Content filter mode**: Choose how to filter accepted files: by file extension, basic content type (e.g., image, audio, vide), by specific content type (e.g., image/png), by specific extension (jpg, png, pdf).  
          - **Create file column**: Confirms and creates the new file column.  
      - **Column menu**: Opens the column menu, allowing users to change styling, render mode, view quick stats and other column related options.  
        - **Sort**: Sort the table data based on the values in this column, either in ascending or descending order. Table can also be sorted by multiple columns by holding shift while clicking column headers.  
        - **Style**: Customize the appearance of this column, including text color and cell background. You can also set conditional formatting rules to highlight specific data patterns.  
        - **Display format**: Choose how the data in this column is displayed, such as date formats, number formats, or custom render modes.  
        - **Filter**: Open the filter panel to set up filters based on this column's values, helping you to quickly narrow down the data displayed in the table.  
        - **Quick stats**: View quick statistics about the data in this column, such as count, unique values, and distribution.  
          - **Column Quick Stats**: The Column Quick Stats panel provides a summary of key statistics for the selected column, including distinct count, min/max values, and value distribution. You can also sort the distribution and add filters directly from this panel.  
            - **Add filter**: Add a filter based on the selected value from top values list.  
        - **Columns**: Shortcut to the column management panel to add, remove, or rearrange columns in the table.  
        - **Add Computed Column**: Add a computed field based on calculations or transformations of existing data in this column.  
        - **Apply function**: Apply a function to the data in this column, such as aggregations, string manipulations, or date transformations.  
        - **Add Linked Columns**: Add linked data from related tables based on foreign key relationships.  
        - **Alter**: Alter the column's properties, such as data type, default value, or constraints.  
        - **Hide**: Hide this column from the table view without deleting it, allowing you to focus on the most relevant data.  
        - **Hide Others**: Hide all other columns except this one, providing a focused view of the data in this column.  
      - **Column header**: Pressing the header will toggle sorting state (if the column is sortable). Right clicking (or long press on mobile) will open column menu. Dragging the header will allow reordering the columns.  
      - **Resize column**: Allows users to resize the column width by dragging the handle.  
      - <a href="#view/edit_data">View/edit data</a>: Opens the row card, allowing users to view/edit/delete the selected row.  
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

<img src="./screenshots/smart_filter_bar.svg" alt="Smart Filter Bar screenshot" style="border: 1px solid; margin: 1em 0;" />

  - **Add Filter**: Allows adding a filter by chosing a column from the current table or from linked tables.  
    - **Include Linked Columns**: Toggle to include columns from linked tables in the column list.  
    - **Join To**: Toggles join view to specify which tables a join path to a specific table from which to select a column to filter by.  
    - **Filterable Columns**: List of columns available for filtering. Click to add a filter.  
  - **Search Bar**: Quick search functionality across the table data.  
    - **Search**: Type to search across all searchable fields in the table. The search is a simple contains search. Selecting a result will add a filter to the table.  
    - **Match Case**: Toggle to match the case of the search term with the data.  
  - **Table actions**: Additional table data actions.  
    - **Show additional actions**: Opens a menu with additional actions for the table data.  
    - **Delete action**: Opens a menu to delete the selected rows from the table.  
    - **Update action**: Opens a menu to update the selected rows in the table.  
    - **Insert row**: Opens the row insert menu, allowing users to add new rows to the table.  
  - **Filters**: Filters applied to the data  
  - **Having Filters**: Filters applied after aggregation (HAVING clause in SQL).  

<h1 id="view/edit_data"> Row card </h1> 

Smart form is an intelligent, auto-generated form system that adapts to your database schema.
It provides a user-friendly interface for inserting and updating data with automatic validation,
foreign key handling, and support for complex data types.

<img src="./screenshots/smart_form.svgif.svg" alt="SmartForm screenshot" style="border: 1px solid; margin: 1em 0;" />

## Features
- **Auto-generated fields** based on table schema
- **Data type validation** (text, numbers, dates, JSON, etc.)
- **Foreign key support** with searchable dropdowns
- **File upload** for media and document columns
- **Linked data management** - insert related records inline
- **JSON/JSONB editor** with syntax highlighting
- **Geometry/Geography** support for spatial data
- **Array types** with dynamic add/remove
- **Default values** and constraints enforcement
- **Required field** indicators
- **Custom field rendering** based on column configuration

## Field Types
- Text inputs (single/multi-line)
- Number inputs (integer, decimal)
- Date/Time/Timestamp pickers
- Boolean checkboxes
- Select dropdowns (enums, foreign keys)
- File upload fields
- JSON/JSONB editors
- Geometry/Geography mappers
- Array editors

  - **Smart Form**: The smart form displays the details of a single row from the table, allowing users to view and edit the data in a structured format.  
    - **Table icon in header**: Table icon and table name. Table icon is configurable through the table menu settings.  
    - **Previous row button**: Navigate to the previous row in the dataset. Only shown for tables with primary key. Disabled when there is no previous row available.  
    - **Next row button**: Navigate to the next row in the dataset. Only shown for tables with primary key. Disabled when there is no next row available.  
    - **Fullscreen toggle button**: Toggles the fullscreen mode of the SmartForm popup for an expanded view.  
    - **Close button**: Closes the SmartForm popup without saving any data.  
    - **Form field**: Each form field represents a column from the table, displaying the column name and the corresponding value for the selected row. Users can edit the value if the field is editable.  
      - **Field label**: Displays the name of the column.  
      - **Field input area**: The input area where users can view and edit the value of the column. The input type varies based on the column's data type.  
      - **Field hint**: Additional information or guidance about the field, displayed below the input area.  
      - **View more linked records**: For foreign key fields a 'View more' button appears to open a detailed list of all linked records in a separate popup. This is useful to browse and search all columns from the referenced table.  
      - **Insert linked record**: If the column is a foreign key a 'Insert new record' button will appear on hover which allows inserting data into the referenced table. Useful when the desired value does not exist yet (foreign key columns only show existing values).  
      - **Clear field value button**: Clear the current value of the field, resetting it to null. Only shown if the field is nullable and the user is allowed to update it.  
    - **Joined records section**: If the current table has other tables referencing it via foreign keys, a section will appear at the bottom of the form showing lists of those related records. This allows users to view and manage data that is linked to the current row.  
      - **Toggle joined records section**: Expand or collapse the joined records section to show or hide the list of related records.  
      - **View more joined records**: Open a detailed list of all joined records in a separate popup. Useful to browse and search all columns from the joined table.  
      - **Add joined record**: Open the SmartForm to insert a new joined record into the related table, automatically linking it to the current row.  
      - **Toggle fullscreen mode**: Expand the section to fullscreen for better visibility and interaction with the joined records.  

