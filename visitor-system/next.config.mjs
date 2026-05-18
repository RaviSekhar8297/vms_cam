/** @type {import('next').NextConfig} */
const nextConfig = {
    // Silence Turbopack warning when custom webpack config is used
    turbopack: {},
    // Ignore folders from being watched to prevent Fast Refresh on new images
    webpack: (config) => {
        config.watchOptions = {
            ignored: [/node_modules/, /visitors_img/, /vms_capture_faces/],
        };
        return config;
    },
};

export default nextConfig;
