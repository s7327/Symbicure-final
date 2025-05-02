import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets'; // Import assets for default icon and upload icon

const MyProfile = () => {
    const { token, backendUrl, userData, loadUserProfileData } = useContext(AppContext); // Removed setUserData - don't mutate context directly from form

    // Use the default avatar from assets
    const defaultProfileIcon = assets.default_avatar;

    // Local state for form data
    const [profileData, setProfileData] = useState({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        gender: 'Not Selected',
        dob: '',
    });
    const [imageFile, setImageFile] = useState(null); // State for the selected image file
    const [imagePreview, setImagePreview] = useState(null); // State for the image preview URL
    const [isEdit, setIsEdit] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Loading state for submit

    // Effect to populate local form state when userData from context loads/changes
    useEffect(() => {
        if (userData) {
            setProfileData({
                name: userData.name || '',
                // email: userData.email || '', // Email usually not editable, display directly
                phone: userData.phone || '',
                addressLine1: userData.address?.line1 || '', // Use optional chaining
                addressLine2: userData.address?.line2 || '', // Use optional chaining
                gender: userData.gender || 'Not Selected',
                dob: userData.dob || '',
            });
            // Set initial image preview (user's current image or default) when NOT editing
             if (!isEdit) {
                 setImagePreview(userData.image || defaultProfileIcon);
             }
        }
    }, [userData, isEdit]); // Rerun when userData loads or edit mode changes

     // Effect to create image preview URL when imageFile changes
     useEffect(() => {
         if (imageFile) {
             const objectUrl = URL.createObjectURL(imageFile);
             setImagePreview(objectUrl);
             // Clean up the object URL when the component unmounts or file changes
             return () => URL.revokeObjectURL(objectUrl);
         } else {
             // If file is removed or wasn't selected, fall back to user's image or default
             setImagePreview(userData?.image || defaultProfileIcon);
         }
     }, [imageFile, userData?.image, defaultProfileIcon]);


    // Handler for input changes -> updates LOCAL state
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    // Handler for address changes -> updates LOCAL state
    const handleAddressChange = (e) => {
         const { name, value } = e.target; // name should be 'addressLine1' or 'addressLine2'
         setProfileData(prev => ({ ...prev, [name]: value }));
     };


    // Handler for image file selection
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    // Function to handle profile update submission
    const handleProfileUpdate = async (e) => {
        e.preventDefault(); // Prevent default form submission
        if (!token || !backendUrl) {
            toast.error("Authentication error. Please log in again.");
            return;
        }
        setIsLoading(true);

        try {
            const formData = new FormData();

            // Append data from the LOCAL profileData state
            formData.append('name', profileData.name);
            formData.append('phone', profileData.phone);
            // Construct address object before stringifying
            const address = { line1: profileData.addressLine1, line2: profileData.addressLine2 };
            formData.append('address', JSON.stringify(address));
            formData.append('gender', profileData.gender);
            formData.append('dob', profileData.dob);

            // Append the image file if one was selected
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const { data } = await axios.post(`${backendUrl}/api/user/update-profile`, formData, { headers: { token } });

            if (data.success) {
                toast.success(data.message || "Profile updated successfully!");
                await loadUserProfileData(token); // Refresh context data from backend
                setIsEdit(false); // Exit edit mode
                setImageFile(null); // Clear selected file state
                // Image preview will reset via useEffect dependency on userData
            } else {
                toast.error(data.message || "Failed to update profile.");
            }

        } catch (error) {
            console.error("Update Profile Error:", error.response || error);
            toast.error(error.response?.data?.message || "An error occurred while updating profile.");
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading indicator if userData hasn't loaded yet
    if (!userData) {
        return <div className='text-center my-20 text-gray-500'>Loading profile...</div>;
    }

    return (
        <div className='max-w-lg mx-auto flex flex-col gap-4 text-sm my-10 p-6 border rounded-lg shadow-md bg-white'>
            <h1 className="text-2xl font-semibold text-center mb-4 text-gray-700">My Profile</h1>

            {/* Use form element for semantics and submission */}
            <form onSubmit={handleProfileUpdate}>

                {/* --- Image Section --- */}
                <div className='flex flex-col items-center mb-6'>
                    <div className='relative'>
                        <img
                            className='w-24 h-24 rounded-full object-cover border-2 border-gray-300 bg-gray-200' // Added bg color
                            // Use preview state which falls back correctly
                            src={imagePreview || defaultProfileIcon}
                            alt="Profile Avatar"
                            onError={(e) => { e.target.onerror = null; e.target.src = defaultProfileIcon; }} // Fallback on error
                        />
                        {isEdit && (
                             <label htmlFor='image-upload' className='absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5 cursor-pointer hover:bg-blue-700 transition-colors shadow'>
                                 <img src={assets.upload_icon} alt="Upload" className='w-4 h-4 invert'/> {/* Assuming upload icon needs inversion on dark bg */}
                                 <input id="image-upload" type="file" onChange={handleImageChange} accept="image/*" hidden />
                             </label>
                        )}
                    </div>
                </div>

                {/* --- Name Section --- */}
                <div className='mb-4'>
                     <label className='block text-gray-600 text-xs font-medium mb-1'>Name</label>
                    {isEdit
                        ? <input
                            className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
                            type="text"
                            name="name" // Add name attribute
                            onChange={handleInputChange} // Use local state handler
                            value={profileData.name} // Use local state value
                            required
                          />
                        : <p className='font-medium text-2xl text-gray-800'>{userData.name || '-'}</p> // Display from context
                    }
                </div>


                 <hr className='my-5 border-gray-200' />

                {/* --- Contact Information --- */}
                 <div>
                    <p className='text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3'>Contact Information</p>
                    <div className='space-y-3 text-gray-700'>
                        <div className='grid grid-cols-[80px_1fr] items-center'>
                            <p className='font-medium text-gray-600'>Email:</p>
                             {/* Email is usually not editable */}
                             <p className='text-blue-600'>{userData.email}</p>
                        </div>
                        <div className='grid grid-cols-[80px_1fr] items-center'>
                            <p className='font-medium text-gray-600'>Phone:</p>
                            {isEdit
                                ? <input
                                    className='w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
                                    type="tel" // Use type="tel" for phone numbers
                                    name="phone" // Add name attribute
                                    onChange={handleInputChange}
                                    value={profileData.phone}
                                    placeholder="e.g., 1234567890"
                                  />
                                : <p className='text-gray-800'>{userData.phone || 'Not provided'}</p>
                            }
                        </div>
                        <div className='grid grid-cols-[80px_1fr] items-start'> {/* items-start for multiline address */}
                             <p className='font-medium text-gray-600 mt-1'>Address:</p>
                            {isEdit
                                ? <div className='space-y-1.5'>
                                    <input
                                        className='w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
                                        type="text"
                                        name="addressLine1" // Name matches state key
                                        placeholder="Address Line 1"
                                        onChange={handleAddressChange} // Use specific handler or generic one
                                        value={profileData.addressLine1}
                                    />
                                    <input
                                        className='w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
                                        type="text"
                                        name="addressLine2" // Name matches state key
                                        placeholder="Address Line 2 (Optional)"
                                        onChange={handleAddressChange}
                                        value={profileData.addressLine2}
                                    />
                                  </div>
                                : <p className='text-gray-800'>
                                     {userData.address?.line1 || 'Not provided'}
                                     {userData.address?.line2 && <br />}
                                     {userData.address?.line2}
                                  </p>
                            }
                        </div>
                    </div>
                 </div>

                <hr className='my-5 border-gray-200' />

                {/* --- Basic Information --- */}
                 <div>
                     <p className='text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3'>Basic Information</p>
                     <div className='space-y-3 text-gray-700'>
                         <div className='grid grid-cols-[80px_1fr] items-center'>
                             <p className='font-medium text-gray-600'>Gender:</p>
                            {isEdit
                                ? <select
                                     className='w-auto px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white' // Added bg-white
                                     name="gender" // Add name attribute
                                     onChange={handleInputChange}
                                     value={profileData.gender}
                                   >
                                    <option value="Not Selected">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                                : <p className='text-gray-800'>{userData.gender || 'Not Selected'}</p>
                            }
                         </div>
                         <div className='grid grid-cols-[80px_1fr] items-center'>
                            <p className='font-medium text-gray-600'>Birthday:</p>
                            {isEdit
                                ? <input
                                    className='w-auto px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
                                    type='date'
                                    name="dob" // Add name attribute
                                    onChange={handleInputChange}
                                    value={profileData.dob} // Ensure backend stores/retrieves in YYYY-MM-DD format
                                    max={new Date().toISOString().split("T")[0]} // Prevent future dates
                                  />
                                : <p className='text-gray-800'>{userData.dob || 'Not provided'}</p>
                            }
                        </div>
                     </div>
                 </div>

                 {/* --- Action Buttons --- */}
                <div className='mt-8 flex justify-end gap-3'>
                    {isEdit
                        ? <>
                            <button type="button" onClick={() => {setIsEdit(false); setImageFile(null); /* Reset local state from userData? */ }} className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors'>
                                Cancel
                            </button>
                            <button type="submit" disabled={isLoading} className='px-6 py-2 border border-primary bg-primary text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50'>
                                {isLoading ? 'Saving...' : 'Save'}
                            </button>
                          </>
                        : <button type="button" onClick={() => setIsEdit(true)} className='px-6 py-2 border border-primary text-primary rounded-md hover:bg-blue-50 transition-colors'>
                            Edit Profile
                          </button>
                    }
                </div>

            </form>
        </div>
    );
};

export default MyProfile;