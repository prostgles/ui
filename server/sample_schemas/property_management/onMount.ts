export const onMount: ProstglesOnMount = async ({ dbo }) => {
  const createData = async () => {
    await dbo.sql(
      `
    -- Create Property Listings Table
    CREATE TABLE property_listings (
        property_id SERIAL PRIMARY KEY,
        address VARCHAR(255) NOT NULL,
        property_type VARCHAR(100) NOT NULL,
        status VARCHAR(100) NOT NULL,
        price NUMERIC(12, 2) NOT NULL
    );
    
    -- Create Tenant Information Table
    CREATE TABLE tenant_information (
        tenant_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lease_start DATE NOT NULL,
        lease_end DATE NOT NULL,
        monthly_rent NUMERIC(12, 2) NOT NULL
    );
    
    -- Create Maintenance Requests Table
    CREATE TABLE maintenance_requests (
        request_id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES property_listings(property_id),
        issue VARCHAR(255) NOT NULL,
        status VARCHAR(100) NOT NULL,
        reported_date DATE NOT NULL
    );
    
    -- Insert Dummy Data into Property Listings
    INSERT INTO property_listings (address, property_type, status, price) VALUES 
    ('123 Main St, Anytown, USA', 'Apartment', 'Available', 1200.00),
    ('456 Elm St, Anytown, USA', 'House', 'Rented', 1500.00),
    ('789 Oak St, Anytown, USA', 'Condo', 'Available', 1100.00);
    
    -- Insert Dummy Data into Tenant Information
    INSERT INTO tenant_information (name, lease_start, lease_end, monthly_rent) VALUES 
    ('John Doe', '2023-01-01', '2023-12-31', 1200.00),
    ('Jane Smith', '2023-02-01', '2023-12-31', 1500.00),
    ('Bob Johnson', '2023-03-01', '2023-12-31', 1100.00);
    
    -- Insert Dummy Data into Maintenance Requests

    
    `,
      {},
      { returnType: "rows" },
    );
  };
  await createData();
};
