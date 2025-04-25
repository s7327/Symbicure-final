import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserMd, faMapMarkerAlt, faSearch, faCalendarDays } from "@fortawesome/free-solid-svg-icons";

const NearbyDoctorsForm = () => {
  const [searchData, setSearchData] = useState({
    specialist: "",
    location: "",
    availabilitySlot: null,
  });

  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setSearchData((prevState) => ({
      ...prevState,
      availabilitySlot: date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDoctors([]);

    try {
      let lat, lon;
      if (searchData.location) {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchData.location)}`
        );
        const geoData = await geoResponse.json();
        if (geoData.length > 0) {
          lat = geoData[0].lat;
          lon = geoData[0].lon;
        } else {
          throw new Error("Location not found.");
        }
      } else {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              lat = position.coords.latitude;
              lon = position.coords.longitude;
              resolve();
            },
            (err) => reject(err)
          );
        });
      }

      const radius = 12000;
      const overpassQuery = `[out:json]; node[amenity=hospital](around:${radius},${lat},${lon}); out;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.elements.length) {
        setError("No doctors found in this area.");
        setLoading(false);
        return;
      }

      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const toRadians = (deg) => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      let filteredDoctors = data.elements.map((doctor) => ({
        id: doctor.id,
        name: doctor.tags?.name || "Unknown Doctor",
        speciality: searchData.specialist || "General Practitioner",
        lat: doctor.lat,
        lon: doctor.lon,
        address: doctor.tags?.["addr:street"] || "Unknown Location",
        mapLink: `https://www.google.com/maps?q=${doctor.lat},${doctor.lon}`,
        distance: calculateDistance(lat, lon, doctor.lat, doctor.lon),
      }));

      filteredDoctors = filteredDoctors.sort((a, b) => a.distance - b.distance).slice(0, 12);
      navigate("/search-results", { state: { results: filteredDoctors } });
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setError("Error fetching doctors. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-blue-600 flex items-center justify-center">
          <FontAwesomeIcon icon={faUserMd} className="mr-3 text-blue-500 text-3xl" />
          Find Nearby Doctors
        </h2>
        <p className="text-gray-500 mt-2">Search doctors near you</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 flex items-center">
            <FontAwesomeIcon icon={faUserMd} className="mr-2 text-blue-500" />
            Specialist
          </label>
          <select
            name="specialist"
            value={searchData.specialist}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-300"
          >
            <option value="">Select Specialist</option>
            <option value="Pediatrician">Pediatrician</option>
            <option value="Gynecologist">Gynecologist</option>
            <option value="Dermatologist">Dermatologist</option>
            <option value="Neurologist">Neurologist</option>
            <option value="General Physician">General Physician</option>
            <option value="Gastroenterologist">Gastroenterologist</option>
          </select>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 flex items-center">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-blue-500" />
            Location
          </label>
          <input
            type="text"
            name="location"
            value={searchData.location}
            onChange={handleChange}
            placeholder="Enter area or city"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-300"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
          disabled={loading}
        >
          <FontAwesomeIcon icon={faSearch} className="mr-2" />
          {loading ? "Searching..." : "Search Doctors"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </div>
  );
};

export default NearbyDoctorsForm;
