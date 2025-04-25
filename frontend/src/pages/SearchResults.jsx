import React from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapMarkerAlt, faStethoscope, faRoad } from "@fortawesome/free-solid-svg-icons";
import hos1 from '../assets/hos1.jpg';
import hos2 from '../assets/hos2.jpg';
import hos3 from '../assets/hos3.jpg';
import hos4 from '../assets/hos4.jpg';
import hos5 from '../assets/hos5.jpg';
import hos6 from '../assets/hos6.jpg';

const SearchResults = () => {
  const location = useLocation();
  const doctors = location.state?.results || [];

  // Predefined images for doctors
  const doctorImages = [hos1, hos2, hos3, hos4, hos5, hos6];

  // Function to get the corresponding image for each doctor
  const getDoctorImage = (index) => {
    return doctorImages[index % doctorImages.length]; // Loops if doctors exceed available images
  };

  // Generate a random rating between 4.0 and 5.0
  const generateRating = () => {
    return (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 bg-gray-50">
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-6 rounded-xl shadow-lg mb-10">
        <h2 className="text-4xl font-bold text-center">Nearby Doctors</h2>
        <p className="text-center mt-2 text-blue-100">Find the best medical professionals near you</p>
      </div>

      {doctors.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-xl shadow-md">
          <p className="text-gray-500 text-xl">
            No doctors found in your area. Please try a different location or specialist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map((doctor, index) => (
            <div
              key={doctor.id}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-3xl"
            >
              <div className="relative">
                <img
                  src={getDoctorImage(index)}
                  alt={`Dr. ${doctor.name}`}
                  className="w-full h-56 object-cover object-center"
                  onError={(e) => (e.target.src = hos1)} // Fallback image
                />
                <div className="absolute top-4 right-4 bg-yellow-400 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {generateRating()} ★
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">{doctor.name}</h3>

                <div className="space-y-3 text-gray-600 mb-4">
                  <p className="flex items-center">
                    <FontAwesomeIcon icon={faStethoscope} className="mr-3 text-blue-500" />
                    {doctor.speciality}
                  </p>
                  <p className="flex items-center">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-3 text-blue-500" />
                    {doctor.address}
                  </p>
                </div>

                <div className="flex space-x-4">
                  <a
                    href={doctor.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300"
                  >
                    View on Map
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
