import React from 'react';
import Header from '../components/Header';
import SpecialityMenu from '../components/SpecialityMenu'; // Assuming this component exists
import TopDoctors from '../components/TopDoctors';
import Banner from '../components/Banner';

const Home = () => {
  return (
    <div>
      <Header />

      {/* --- Joyride Target Container for Speciality Menu --- */}
      {/* Add the data-tour-id to a container wrapping the component */}
      {/* Make sure SpecialityMenu component renders content that can be targeted */}
      <div data-tour-id="home-speciality-menu" className="my-8 md:my-12"> {/* Added margin for spacing */}
        {/* You might need to add a title or section header here too */}
         <h2 className="text-2xl font-semibold text-center mb-4 text-gray-700">Search by Speciality</h2>
        <SpecialityMenu />
      </div>
      {/* --- End Target Container --- */}

      <TopDoctors />
      <Banner />
    </div>
  );
};

export default Home;