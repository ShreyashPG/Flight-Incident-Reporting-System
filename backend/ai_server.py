from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
from prophet import Prophet
from pymongo import MongoClient
from datetime import datetime, timedelta
import os

app = FastAPI()

# MongoDB Connection
client = MongoClient("mongodb://localhost:27017")
db = client["flight_incidents"]
incidents_collection = db["incidents"]

# Load external data
weather_data = pd.read_csv("data/weather_data.csv")
maintenance_data = pd.read_csv("data/maintenance_data.csv")

class PredictionInput(BaseModel):
    flight_number: str
    route: str  # e.g., "DEL-MUM"
    incident_type: str  # e.g., "Turbulence"

@app.post("/predict_risk")
async def predict_risk(input: PredictionInput):
    # Aggregate incident data
    pipeline = [
        {"$match": {
            "flightNumber": input.flight_number,
            "incidentType": input.incident_type,
            "location.airportCode": {"$in": input.route.split("-")}
        }},
        {"$group": {
            "_id": {
                "year": {"$year": "$dateTime"},
                "month": {"$month": "$dateTime"},
                "day": {"$dayOfMonth": "$dateTime"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]
    incident_counts = list(incidents_collection.aggregate(pipeline))

    # Create time-series DataFrame
    df = pd.DataFrame([
        {
            "ds": datetime(r["_id"]["year"], r["_id"]["month"], r["_id"]["day"]),
            "y": r["count"]
        }
        for r in incident_counts
    ])

    # If no data, return low risk
    if df.empty:
        return {"risk": 0.05, "message": "Insufficient data, assuming low risk"}

    # Add external features (weather, maintenance)
    df = df.merge(weather_data, how="left", left_on="ds", right_on="date")
    df = df.merge(maintenance_data, how="left", left_on="flight_number", right_on="flight_number")
    df.fillna({"temperature": 25, "wind_speed": 10, "precipitation": 0, "aircraft_age": 5}, inplace=True)

    # Train Prophet model
    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=True)
    model.add_regressor("temperature")
    model.add_regressor("wind_speed")
    model.add_regressor("precipitation")
    model.add_regressor("aircraft_age")
    model.fit(df)

    # Predict for next 7 days
    future = model.make_future_dataframe(periods=7)
    future["flight_number"] = input.flight_number
    future = future.merge(weather_data, how="left", left_on="ds", right_on="date")
    future = future.merge(maintenance_data, how="left", left_on="flight_number", right_on="flight_number")
    future.fillna({"temperature": 25, "wind_speed": 10, "precipitation": 0, "aircraft_age": 5}, inplace=True)
    forecast = model.predict(future)

    # Calculate risk (average predicted incidents / max possible)
    future_incidents = forecast[forecast["ds"] > datetime.now()][["ds", "yhat"]]
    risk = min(1.0, max(0.0, future_incidents["yhat"].mean() / 5.0))  # Normalize to 0-1

    return {"risk": round(risk, 2), "message": f"{int(risk*100)}% chance of {input.incident_type} in next 7 days"}