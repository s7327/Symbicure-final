import React from 'react'
import { assets } from '../assets/assets'

const Contact = () => {
  return (
    <div>

      <div className='text-center text-2xl pt-10 text-[#707070]'>
        <p>CONTACT <span className='text-gray-700 font-semibold'>US</span></p>
      </div>

      <div className='my-10 flex flex-col justify-center md:flex-row gap-10 mb-28 text-sm'>
        <img className='w-full md:max-w-[360px]' src={assets.contact_image} alt="" />
        <div className='flex flex-col justify-center items-start gap-6'>
          <p className=' font-semibold text-lg text-gray-600'>OUR OFFICE</p>
          <p className=' text-gray-500'>Ayan Jain<br /> SUHRC, Pune</p>
          <p className=' text-gray-500'>Tel: +91 9313314717 <br /> Email: ayan.jain.a320@gmail.com</p>
          <p className=' font-semibold text-lg text-gray-600'>Career at SymbiCure</p>
          <p className=' text-gray-500'>Learn more about our teams and job openings.</p>
          <button className='border border-black px-8 py-4 text-sm hover:bg-black hover:text-white transition-all duration-500'>Explore Jobs</button>
        </div>
      </div>
      {/* Google Map Embed */}
      <div className='w-full flex justify-center mb-10'>
        <iframe 
          className='w-full h-[450px] md:max-w-[1250px] rounded-lg border-0'
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.255900857557!2d73.726903!3d18.5401013!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bf2e67bf7e47%3A0x50efd384303f6cbb!2sSymbiosis%20Institute%20of%20Technology%20-%20SIT%20Pune!5e0!3m2!1sen!2sin!4v1699297183685!5m2!1sen!2sin"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
      
    </div>


  )
}

export default Contact
