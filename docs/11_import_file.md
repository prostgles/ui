<h4 id="import_file"> Import file </h4> 

Import files into the current database. Supported file types include CSV, GeoJSON, and JSON.
The import process allows you to specify the table name, infer column data types, and choose how to insert JSON/GeoJSON data into the table.
<img src="/screenshots/file_importer.svg" alt="File Importer screenshot" />

  - **Import file**: Input field for selecting a file to import. Supported types: csv/geojson/json.  
  - **Table name**: New/existing table name into which data is to be imported.  
  - **Try to infer and apply column data types**: Checkbox for inferring and applying column data types during import. If checked, the system will attempt to determine the appropriate data types for each column based on the imported file. If unchecked, TEXT data type will be used for all columns.  
  - **Drop table if exists**: Checkbox for dropping the table if it already exists in the database. If checked, the existing table will be deleted before importing the new file.  
  - **Insert as**: Select list for choosing the method of inserting JSON/GeoJSON data into the table. Options include: Single text value, JSONB rows, and Properties with geometry.  
  - **Import**: Button to initiate the import process. Click to start importing the selected file into the specified table.  

