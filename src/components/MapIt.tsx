import { useEffect, useState } from "react";
import {
  Globe,
  MapPin,
  Loader2,
  WifiOff,
  Navigation,
  AlertTriangle,
  Compass
} from "lucide-react";

type Place = {
  name: string;
  lat: number;
  lon: number;
  type: string;
  distance?: number;
  direction?: string;
};

export default function MapIt() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => alert("Location access denied")
    );

    const updateStatus = () => setOffline(!navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    
    const handleOrientation = (e: any) => {
      if (e.alpha !== null) {
        setHeading(360 - e.alpha);
      }
    };

    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    navigator.onLine ? fetchPlaces() : loadFromCache();
  }, [location]);

  const fetchPlaces = async () => {
    if (!location) return;

    setLoading(true);
    try {
      const query = `
        [out:json];
        (
          node["amenity"="hospital"](around:3000,${location.lat},${location.lon});
          node["amenity"="police"](around:3000,${location.lat},${location.lon});
          node["railway"="station"](around:3000,${location.lat},${location.lon});
        );
        out;
      `;

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });

      const data = await res.json();

      const parsed: Place[] = data.elements.map((el: any) => {
        const dist = parseFloat(getDistance(location.lat, location.lon, el.lat, el.lon));
        return {
          name: el.tags?.name || "Unknown",
          lat: el.lat,
          lon: el.lon,
          type: Object.keys(el.tags)[0],
          distance: dist,
          direction: getDirection(location.lat, location.lon, el.lat, el.lon),
        };
      });

      parsed.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setPlaces(parsed);

      localStorage.setItem("sathi_map_cache", JSON.stringify({ places: parsed }));
    } catch {
      loadFromCache();
    } finally {
      setLoading(false);
    }
  };

  const loadFromCache = () => {
    const cache = localStorage.getItem("sathi_map_cache");
    if (!cache) return;
    const parsed = JSON.parse(cache);
    setPlaces(parsed.places || []);
  };

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
  }

  function getDirection(lat1: number, lon1: number, lat2: number, lon2: number) {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    if (Math.abs(dLat) > Math.abs(dLon)) {
      return dLat > 0 ? "North" : "South";
    } else {
      return dLon > 0 ? "East" : "West";
    }
  }

  const getDistanceColor = (d: number) => {
    if (d < 1) return "text-green-400";
    if (d < 2) return "text-amber-400";
    return "text-red-400";
  };

  const nearest = places[0];

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">

      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />

      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <Globe className="text-amber-400" />
            <h1 className="text-lg sm:text-2xl font-black tracking-wide bg-gradient-to-r from-amber-400 to-orange-600 text-transparent bg-clip-text">
              MAP INTELLIGENCE
            </h1>
          </div>

          {offline && (
            <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/20 px-3 py-1 rounded-full">
              <WifiOff size={14} /> OFFLINE
            </div>
          )}
        </div>

        
        <div className="flex justify-center mb-8">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-white/10 flex items-center justify-center">
            <Compass
              className="text-amber-400 transition-transform duration-300"
              style={{ transform: `rotate(${heading}deg)` }}
            />
          </div>
        </div>

        
        {nearest && (
          <div className="mb-8 relative">
            <img
              src={`https://static-maps.yandex.ru/1.x/?ll=${nearest.lon},${nearest.lat}&size=650,300&z=15&l=map&pt=${nearest.lon},${nearest.lat},pm2rdm`}
              className="w-full h-40 sm:h-48 md:h-56 object-cover rounded-2xl border border-white/10"
            />

            <button
              onClick={() =>
                window.open(`https://www.google.com/maps?q=${nearest.lat},${nearest.lon}`)
              }
              className="absolute bottom-3 right-3 px-3 py-2 text-xs rounded-lg bg-black/70 border border-white/10"
            >
              Open Maps
            </button>
          </div>
        )}

        
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 mb-6">
            <Loader2 className="animate-spin" size={16} />
            Scanning nearby...
          </div>
        )}

        
        {nearest && (
          <div className="mb-8 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5">
            <h2 className="text-lg sm:text-xl font-bold">{nearest.name}</h2>
            <p className={`text-sm ${getDistanceColor(nearest.distance!)}`}>
              {nearest.distance} km • {nearest.direction}
            </p>
          </div>
        )}

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {places.slice(1, 7).map((p, i) => (
            <div key={i} className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-white/[0.02]">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold text-sm sm:text-base">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.type}</p>
                </div>
                <MapPin className="text-amber-400" />
              </div>

              <div className="mt-4 flex justify-between items-center text-xs sm:text-sm">
                <span className={getDistanceColor(p.distance!)}>
                  {p.distance} km • {p.direction}
                </span>

                <button
                  onClick={() =>
                    window.open(`https://www.google.com/maps?q=${p.lat},${p.lon}`)
                  }
                  className="text-amber-400 flex items-center gap-1"
                >
                  <Navigation size={12} />
                  Route
                </button>
              </div>
            </div>
          ))}
        </div>

        {!loading && places.length === 0 && (
          <div className="text-center mt-16 text-gray-500">
            <AlertTriangle size={40} className="mx-auto mb-4 opacity-30" />
            No locations found
          </div>
        )}
      </div>
    </div>
  );
}