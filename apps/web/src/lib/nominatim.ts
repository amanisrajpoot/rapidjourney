export interface NominatimPlace {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
    address?: any;
}

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (!res.ok) return "Unknown location";
        const data = await res.json();
        if (data.locality || data.city) {
            return `${data.locality || data.city}, ${data.principalSubdivision}`;
        }
        return data.countryName || "Unknown location";
    } catch (e) {
        console.error("Reverse geocode failed", e);
        return "Unknown location";
    }
}
