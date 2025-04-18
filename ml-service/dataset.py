import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Create sample data
np.random.seed(42)
random.seed(42)

# Possible airports with coordinates (simplified list)
airports = [
    ('LAX', 33.9416, -118.4085),  # Los Angeles
    ('JFK', 40.6413, -73.7781),   # New York
    ('ORD', 41.9786, -87.9049),   # Chicago
    ('ATL', 33.6367, -84.4281),   # Atlanta
    ('DFW', 32.8969, -97.0380),   # Dallas
    ('DEN', 39.8561, -104.6722),  # Denver
]

# Possible incident descriptions
descriptions = [
    "Engine vibration reported during takeoff",
    "Bird strike during climb",
    "Cabin pressure fluctuation",
    "Landing gear warning light",
    "Electrical failure in cockpit",
    "Hydraulic system warning",
    "Fuel imbalance alert",
    "Brake temperature warning",
    "Air traffic control miscommunication",
    "Runway incursion reported",
    "Autopilot disengagement",
    "Wind shear encountered",
    "Ice accumulation warning",
    "Cargo door warning",
    "Evacuation slide deployed in-flight",
    "Cabin depressurization",
    "In-flight turbulence incident",
    "Engine oil pressure low",
    "Tyre blowout during landing",
    "Security threat reported onboard"
]

# Generate data
data = []
start_date = datetime(2023, 1, 1)
end_date = datetime(2024, 4, 19)

for _ in range(1000):
    # Flight number (e.g., AA123)
    airline = random.choice(['AA', 'UA', 'DL', 'WN', 'UA', 'AS', 'UA', 'UA', 'UA', 'UA'])
    flight_number = airline + str(random.randint(100, 999))
    
    # Random datetime between start and end date
    delta = end_date - start_date
    random_days = np.random.randint(0, delta.days)
    incident_time = start_date + timedelta(days=random_days)
    
    # Random airport selection with coordinates
    airport_code, lat, long = random.choice(airports)
    
    # Add slight variation to coordinates (±0.1 degrees)
    latitude = round(lat + np.random.normal(0, 0.1), 5)
    longitude = round(long + np.random.normal(0, 0.1), 5)
    
    # Get random description
    incident_desc = random.choice(descriptions)
    
    # Severity distribution (70% Low, 20% Medium, 10% High)
    severity = np.random.choice(['Low', 'Medium', 'High'], p=[0.7, 0.2, 0.1])
    
    data.append([
        flight_number,
        incident_time.strftime("%Y-%m-%d %H:%M:%S"),
        latitude,
        longitude,
        airport_code,
        incident_desc,
        severity
    ])

# Create DataFrame and save to CSV
df = pd.DataFrame(data, columns=[
    'Flight Number', 'datetime', 'Latitude', 
    'Longitude', 'Airport Code', 'Description', 'Severity'])
df.to_csv('flight_incident_dataset.csv', index=False)