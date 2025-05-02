// frontend/src/config/tourSteps.js

// Defines the steps for the react-joyride tour.
// Each object corresponds to one step in the tour.
export const tourSteps = [
    {
        target: '[data-tour-id="navbar-all-doctors"]', // CSS Selector for the target element
        content: 'Browse our extensive list of trusted doctors here.', // Text shown in the tooltip
        placement: 'bottom', // Position of the tooltip relative to the target
        title: 'Find Doctors', // Optional title for the tooltip
        disableBeacon: true, // Set to true to start the tour directly on this step without the pulsing beacon
    },
    {
        target: '[data-tour-id="home-speciality-menu"]',
        content: 'You can easily search for doctors based on their specialty.',
        placement: 'bottom',
        title: 'Search by Specialty',
    },
    {
        target: '[data-tour-id="navbar-nearby-doctors"]',
        content: 'Find doctors located conveniently near your current location.',
        placement: 'bottom',
        title: 'Nearby Doctors',
    },
    {
        target: '[data-tour-id="navbar-ai-analyzer"]',
        content: 'Upload medical reports or images for an AI-powered analysis.',
        placement: 'bottom',
        title: 'AI Health Analyzer',
    },
     {
         target: '[data-tour-id="chatbot-icon"]', // Ensure the chatbot component has this data-tour-id
         content: 'Disease prediction model based on symptoms, type your symptoms!',
         placement: 'top', // Adjust placement based on icon position
         title: 'AI Chat Assistant',
     },
    {
        target: '[data-tour-id="navbar-user-dropdown"]', // Target the div wrapping the user avatar/dropdown icon
        content: 'Access your profile and appointments from here.',
        placement: 'bottom',
        title: 'Your Account',
    },
    {
        target: '[data-tour-id="navbar-my-appointments"]', // Target the "My Appointments" link *inside* the dropdown
        content: 'View your scheduled appointments and manage them.',
        placement: 'right', // Adjust as needed based on actual dropdown layout
        title: 'Your Appointments',
        // Note: Ensure the dropdown is open or this step might fail if target isn't visible
        // More advanced usage might involve controlling dropdown state during the tour.
    },
    {
        target: '[data-tour-id="appointment-chat-button"]', // Target the first chat button on MyAppointments page
        content: 'After an appointment, you can chat directly with your doctor here.',
        placement: 'top', // Adjust placement as needed
        title: 'Chat with Doctor',
        // This step assumes the user navigates to MyAppointments or the tour targets elements across pages.
        // For multi-page tours, react-joyride needs careful state management.
    },
    // Add more steps for other features you want to highlight
];