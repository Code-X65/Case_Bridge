import emailjs from '@emailjs/browser';

// EmailJS Configuration
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;

export const initEmailJS = () => {
    if (PUBLIC_KEY) {
        emailjs.init(PUBLIC_KEY);
    }
};

export const sendEmail = async (templateId: string, templateParams: Record<string, any>) => {
    try {
        if (!SERVICE_ID) throw new Error('EmailJS Service ID is not configured');
        const response = await emailjs.send(SERVICE_ID, templateId, templateParams);
        return response;
    } catch (error) {
        console.error('EmailJS Error:', error);
        throw error;
    }
};
