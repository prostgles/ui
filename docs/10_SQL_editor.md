<h1 id="sql_editor"> SQL editor </h1> 

The SQL editor is a powerful tool for executing SQL queries against your database. It supports syntax highlighting, auto-completion, and various options for managing queries.

<picture>
<source srcset="/screenshots/dark/sql_editor.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/sql_editor.svg" alt="SQL editor screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - **View header**: Contains menu button, title and window minimise/fullscreen controls.  
    - **Quick actions**: Quick actions for the view, providing easy access to charting and joins.  
      - **Add timechart**: Adds a timechart visualization based on the current SQL statement. Visible only when the last executed statement returned at least one timestamp column.  
      - **Add map**: Adds a map visualization based on the current SQL statement. Visible only when the last executed statement returned at least one geometry/geography column (postgis extension must be enabled).  
    - **View title. Drag to re-arrange layout**: SQL editor query name, editable in the menu.  
    - **Collapse the view**: Collapses the view, minimizing it to temporarily save space on the dashboard.   
    - **Fullscreen**: Expands the view to fill the entire screen.  
    - **Remove view**: Removes the SQL editor from the dashboard. If there are unsaved changes, a confirmation dialog will appear.  
    - <a href="#sql_editor_menu">SQL editor menu</a>: The SQL editor menu provides access to various options and settings for the SQL editor.  
  - **SQL editor component**: The main component for the SQL editor. It contains the SQL editor and statement action buttons. Being bsed on Monaco editor, it supports syntax highlighting, auto-completion and other editing functionality like multi-cursor editing.  
    - **SQL editor input**: The input field for writing SQL queries. It supports syntax highlighting and auto-completion.  
    - **Execute current statement**: Executes the current SQL statement highlighted by the blue vertical line to the left of the code. This button is only visible when the cursor is within a statement.  
    - **Add timechart**: Adds a timechart visualization based on the current SQL statement. This button is only visible when the cursor is within a statement that returns at least one timestamp column.  
    - **Add map**: Adds a map visualization based on the current SQL statement. This button is only visible when the cursor is within a statement that returns at least one geometry/geography column (postgis extension must be enabled).  
  - **SQL editor toolbar**: The toolbar provides various options for executing and managing SQL queries.  
    - **Run query**: Executes the current SQL query. The result will be displayed in the query results section.  
    - **Limit**: Sets the maximum number of rows to return in the query results. This is useful for limiting the amount of data returned, especially for large datasets.  
    - **Cancel query**: Cancels the currently running query. This button is only visible when a query is running.  
    - **Terminate query**: Forcefully terminates the currently running query. This is more aggressive than cancel and is only visible when a query is running.  
    - **Stop LISTEN**: Stops the active LISTEN operation. This button is only visible when a LISTEN query is active.  
    - **Row count**: Displays the number of rows fetched by the query and the total number of rows if available.  
    - **Toggle table visibility**: Shows or hides the results table for the executed query.  
    - **Toggle code editor**: Shows or hides the SQL code editor, allowing users to focus on query results when needed.  
    - **Toggle notices**: Shows or hides database notices. When enabled, it displays notifications from the database system.  
    - **Query duration**: Displays the execution time of the last completed query or the current running time for an active query.  
    - **Copy results**: Copy/download query results as: CSV, TSV, JSON, Typescript definition, SQL SELECT INTO  
    - **SQL error**: Displays any errors that occurred during the execution of the SQL query. This is useful for debugging and correcting SQL syntax.  
  - **Query results**: Displays the results of the executed SQL query. Results can be displayed as a table (default), JSON or CSV. Users can interact with the results, such as sorting and filtering.  
    - **Results table**: The results table displays the data returned by the executed SQL query. It supports sorting, filtering, and pagination.  
    - **Chart**: Timechart/Map visualization of the SQL query results.  

<h4 id="sql_editor_menu"> SQL editor menu </h4> 

The SQL editor menu provides access to various options and settings for the SQL editor.

  - **General**: General settings for the SQL editor.  
    - **Query name**: The name of the current SQL query. This is used for saving and managing queries.  
    - **Result display mode**: The mode in which the results of the SQL query will be displayed. Options include table, JSON, and CSV.  
    - **Save query as file**: Saves the current SQL query to a file. This can also be accomplished by pressing Ctrl+S.  
    - **Open SQL file**: This allows loading the contents of an SQL file into the current query.  
    - **Delete query**: Deletes the current SQL query. If it has contents a confirmation dialog will appear.  
  - **Editor options**: Settings for the SQL editor's appearance and behavior.  
    - **Editor settings**: Settings for the SQL editor's appearance and behavior. This includes font size, theme, and other preferences.  
  - **Hotkeys**: Keyboard shortcuts for common actions in the SQL editor. This includes executing queries, saving files, and more.  

