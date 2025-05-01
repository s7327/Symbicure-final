import React from 'react';
import { assets } from '../assets/assets'; // Assuming you have an assets file
// You might need to install Heroicons or another icon library if you uncomment the icons
// For example: npm install @heroicons/react

// If you use Heroicons, import the specific icons you want:
// import { LightBulbIcon, ArrowsRightLeftIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const About = () => {
  return (
    <div className="bg-gradient-to-br from-gray-100 to-blue-50 py-20">
      <div className="container mx-auto px-6 md:px-12">
        {/* Section 1: Hero with Image Overlay */}
        <section className="relative overflow-hidden rounded-xl shadow-lg mb-16">
          <img
            className="w-full h-96 object-cover blur-sm transform scale-105"
            src={assets.about_image}
            alt="About SymbiCure"
          />
          <div className="absolute inset-0 bg-primary-500 bg-opacity-70 flex items-center justify-center text-center">
            <div className="px-8">
              <h2 className="text-4xl font-bold text-white mb-4">
                Discover More About <span className="text-primary-200">SymbiCure</span>
              </h2>
              <p className="text-lg text-white opacity-80 mb-8">
                Your innovative partner in managing your healthcare journey with ease and efficiency.
              </p>
              <button className="bg-primary-200 hover:bg-primary-300 text-primary-800 font-semibold py-3 px-6 rounded-full transition-colors duration-300">
                Learn More
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Our Story with Parallax Effect (Subtle) */}
        <section className="py-12 bg-white rounded-lg shadow-md mb-16">
          <div className="container mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="order-2 md:order-1">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                  Our Story: Bridging Healthcare and Technology
                </h3>
                <p className="text-gray-700 text-lg mb-6">
                  At SymbiCure, our journey began with a simple yet powerful idea: to
                  make healthcare more accessible, convenient, and personalized for everyone.
                  We recognized the challenges individuals face in navigating appointments,
                  managing health records, and connecting with the right healthcare providers.
                </p>
                <p className="text-gray-700 text-lg">
                  Driven by a passion for innovation and a commitment to well-being, we
                  leveraged the latest advancements in technology to build a platform that
                  puts you at the center of your healthcare experience.
                </p>
              </div>
              <div className="order-1 md:order-2">
                <div className="overflow-hidden rounded-lg shadow-md">
                  <img
                    className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500"
                    src={assets.about_image}
                    alt="Our Vision"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Why Choose Us - Modern Card Layout with Icons (Optional) */}
        <section className="py-12 bg-gray-50 rounded-lg shadow-md">
          <div className="container mx-auto px-6 md:px-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
              Why Choose <span className="text-primary-500">SymbiCure</span>?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-lg transition-shadow duration-300 text-center">
                {/* If using Heroicons: */}
                {/* <LightBulbIcon className="text-primary-500 w-10 h-10 mx-auto mb-4" /> */}
                <div className="text-primary-500 text-3xl mb-4">
                  {/* Placeholder for an icon - you can replace this with an actual icon component */}
                  💡
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Efficiency</h3>
                <p className="text-gray-600 text-sm">
                  Seamless appointment scheduling and management tools designed to save you valuable time.
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-lg transition-shadow duration-300 text-center">
                {/* If using Heroicons: */}
                {/* <ArrowsRightLeftIcon className="text-primary-500 w-10 h-10 mx-auto mb-4" /> */}
                <div className="text-primary-500 text-3xl mb-4">
                  {/* Placeholder for an icon */}
                  🔄
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Convenience</h3>
                <p className="text-gray-600 text-sm">
                  Access a wide network of trusted healthcare professionals from the comfort of your own home.
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-lg transition-shadow duration-300 text-center">
                {/* If using Heroicons: */}
                {/* <UserGroupIcon className="text-primary-500 w-10 h-10 mx-auto mb-4" /> */}
                <div className="text-primary-500 text-3xl mb-4">
                  {/* Placeholder for an icon */}
                  🧑‍🤝‍🧑
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Personalization</h3>
                <p className="text-gray-600 text-sm">
                  Tailored recommendations and health insights to help you stay informed and proactive about your well-being.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Our Vision - Text with Subtle Background */}
        <section className="py-16 bg-blue-50 rounded-lg shadow-md">
          <div className="container mx-auto px-6 md:px-12 text-center">
            <h2 className="text-2xl font-semibold text-primary-700 mb-6">Our Vision</h2>
            <p className="text-gray-700 text-lg">
              We envision a future where healthcare is seamlessly integrated into your life,
              empowering you to take control of your health journey with confidence.
              SymbiCure strives to be the cornerstone of this future, connecting patients and
              providers through a user-centric and innovative platform.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;