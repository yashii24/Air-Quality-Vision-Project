import pandas as pd
import numpy as np



def preprocess_data(df):

    print("🔹 Starting preprocessing...")
    print(f"📌 Initial DF shape: {df.shape}")

    df1 = df.copy()

    # -------------------------------
    # Normalize pollutant column names
    # -------------------------------
    df1.columns = df1.columns.str.replace("pollutants.", "", regex=False)

    df1.rename(columns={
        "PM2.5": "PM25",
        "pm2.5": "PM25",
        "PM_2_5": "PM25",
        "pm25": "PM25",
    }, inplace=True)

    # -------------------------------
    # Timestamp handling
    # -------------------------------
    if "timestamp" in df1.columns and "Timestamp" not in df1.columns:
        df1["Timestamp"] = df1["timestamp"]

    if "Timestamp" not in df1.columns:
        raise ValueError("❌ Missing Timestamp column")

    df1["Timestamp"] = pd.to_datetime(df1["Timestamp"], errors="coerce", utc=True)
    df1 = df1.dropna(subset=["Timestamp"])

    # -------------------------------
    # Ensure PM25 exists
    # -------------------------------
    if "PM25" not in df1.columns:
        raise ValueError("❌ PM25 column missing after normalization")

    # Convert pollutants to numeric
    pollutant_cols = ["PM25", "PM10", "NO2", "O3", "SO2", "CO", "AQI"]
    pollutant_cols = [c for c in pollutant_cols if c in df1.columns]

    for col in pollutant_cols:
        df1[col] = pd.to_numeric(df1[col], errors="coerce")

    # -------------------------------
    # Time features
    # -------------------------------
    df1 = df1.sort_values("Timestamp")

    df1["hour"] = df1["Timestamp"].dt.hour
    df1["day_of_week"] = df1["Timestamp"].dt.dayofweek
    df1["month"] = df1["Timestamp"].dt.month

    df1["PM25_month_weight"] = df1["month"].map({
        1: 1.0, 2: 0.8, 3: 0.6, 4: 0.4, 5: 0.2, 6: 0.1,
        7: 0.1, 8: 0.1, 9: 0.2, 10: 0.6, 11: 0.9, 12: 1.0
    })
    df1["PM25_hour_weight"] = 0.9 - abs(12 - df1["hour"]) * 0.05

    # -------------------------------
    # Lag features (PER STATION)
    # -------------------------------
    if "station" in df1.columns:
        df1["station_original"] = df1["station"]
        df1 = df1.sort_values(["station", "Timestamp"])

        df1["lag_1d"] = df1.groupby("station")["PM25"].shift(24)
        df1["lag_2d"] = df1.groupby("station")["PM25"].shift(48)
        df1["lag_3d"] = df1.groupby("station")["PM25"].shift(72)
    else:
        df1["lag_1d"] = df1["PM25"].shift(24)
        df1["lag_2d"] = df1["PM25"].shift(48)
        df1["lag_3d"] = df1["PM25"].shift(72)

    # Drop rows without valid lags
    df1 = df1.dropna(subset=["PM25"])

    df1["lag_1d"].fillna(df1["PM25"], inplace=True)
    df1["lag_2d"].fillna(df1["PM25"], inplace=True)
    df1["lag_3d"].fillna(df1["PM25"], inplace=True)

    # -------------------------------
    # One-hot encode stations
    # -------------------------------
    if "station" in df1.columns:
        df1 = pd.get_dummies(df1, columns=["station"], prefix="station")
    elif "station_original" in df1.columns:
        df1 = pd.get_dummies(df1, columns=["station_original"], prefix="station")

    print("✅ Final shape:", df1.shape)
    print("📌 Final columns:", df1.columns.tolist())
    print(df1.head())

    return df1
