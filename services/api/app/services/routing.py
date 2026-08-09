import httpx
from app.core.config import settings

ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-car"

async def calculate_route(start_lon: float, start_lat: float, end_lon: float, end_lat: float) -> dict:
    """
    Calls OpenRouteService to get route details between two points.
    Returns a dict with distance (meters), duration (seconds), and route geometry (GeoJSON LineString coords).
    """
    if not settings.OPEN_ROUTE_SERVICE_API_KEY:
        # Stub implementation if no API key
        return {
            "distance": 0,
            "duration": 0,
            "geometry": f"SRID=4326;LINESTRING({start_lon} {start_lat}, {end_lon} {end_lat})"
        }
        
    headers = {
        "Authorization": settings.OPEN_ROUTE_SERVICE_API_KEY,
        "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8"
    }
    
    params = {
        "start": f"{start_lon},{start_lat}",
        "end": f"{end_lon},{end_lat}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(ORS_BASE_URL, params=params, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            features = data.get("features", [])
            if not features:
                raise Exception("No route found")
                
            feature = features[0]
            properties = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            segments = properties.get("segments", [])
            
            distance = sum(segment.get("distance", 0) for segment in segments)
            duration = sum(segment.get("duration", 0) for segment in segments)
            
            # WKT string for PostGIS
            coords = geometry.get("coordinates", [])
            wkt_coords = ", ".join([f"{lon} {lat}" for lon, lat in coords])
            wkt_geom = f"SRID=4326;LINESTRING({wkt_coords})"
            
            return {
                "distance": int(distance),
                "duration": int(duration),
                "geometry": wkt_geom
            }
        else:
            raise Exception(f"Failed to fetch route: {response.text}")
